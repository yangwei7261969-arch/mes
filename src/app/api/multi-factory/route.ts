import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 多工厂协同API
 * 
 * 功能：
 * • 多工厂管理
 * • 订单拆分分配
 * • 工厂进度同步
 * • 工厂结算
 * • 外发加工管理
 */

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';

    switch (action) {
      case 'list':
        return await listFactories(client, searchParams);
      case 'detail':
        return await getFactoryDetail(client, searchParams);
      case 'capacity':
        return await getFactoryCapacity(client, searchParams);
      case 'allocations':
        return await listAllocations(client, searchParams);
      case 'progress':
        return await getSyncProgress(client, searchParams);
      case 'settlements':
        return await listSettlements(client, searchParams);
      case 'recommend':
        return await recommendFactories(client, searchParams);
      case 'external-orders':
        return await listExternalOrders(client, searchParams);
      case 'material-tracking':
        return await trackMaterials(client, searchParams);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Multi-factory API error:', error);
    return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'create':
        return await createFactory(client, data);
      case 'allocate':
        return await allocateOrder(client, data);
      case 'update-progress':
        return await updateProgress(client, data);
      case 'settle':
        return await createSettlement(client, data);
      case 'external-order':
        return await createExternalOrder(client, data);
      case 'issue-material':
        return await issueMaterial(client, data);
      case 'receive-product':
        return await receiveProduct(client, data);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Multi-factory operation error:', error);
    return NextResponse.json({ success: false, error: '操作失败' }, { status: 500 });
  }
}

/**
 * 工厂列表
 */
async function listFactories(client: any, searchParams: URLSearchParams) {
  const status = searchParams.get('status');
  const type = searchParams.get('type'); // internal, external

  let query = client
    .from('factories')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }
  if (type) {
    query = query.eq('factory_type', type);
  }

  const { data, error } = await query;

  if (error) throw error;

  // 计算各工厂当前产能占用
  const factoriesWithLoad = await Promise.all(
    (data || []).map(async (factory: any) => {
      const { data: allocations } = await client
        .from('order_allocations')
        .select('quantity, completed_quantity')
        .eq('factory_id', factory.id)
        .in('status', ['allocated', 'in_production']);

      const totalAllocated = allocations?.reduce((sum: number, a: any) => sum + (a.quantity || 0), 0) || 0;
      const loadRate = factory.daily_capacity > 0 
        ? Math.round((totalAllocated / (factory.daily_capacity * 30)) * 100) 
        : 0;

      return {
        ...factory,
        currentLoad: totalAllocated,
        loadRate: Math.min(loadRate, 100)
      };
    })
  );

  return NextResponse.json({
    success: true,
    data: factoriesWithLoad
  });
}

/**
 * 工厂详情
 */
async function getFactoryDetail(client: any, searchParams: URLSearchParams) {
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, error: '缺少工厂ID' }, { status: 400 });
  }

  const { data: factory, error } = await client
    .from('factories')
    .select(`
      *,
      production_lines (*),
      employees (count)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;

  // 获取当前订单
  const { data: currentOrders } = await client
    .from('order_allocations')
    .select(`
      *,
      production_orders (order_no, style_no, delivery_date),
      styles (style_name)
    `)
    .eq('factory_id', id)
    .in('status', ['allocated', 'in_production']);

  // 获取产能统计
  const capacityStats = await calculateCapacityStats(client, id);

  return NextResponse.json({
    success: true,
    data: {
      factory,
      currentOrders: currentOrders || [],
      capacityStats
    }
  });
}

/**
 * 工厂产能
 */
async function getFactoryCapacity(client: any, searchParams: URLSearchParams) {
  const factoryId = searchParams.get('factory_id');
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

  if (factoryId) {
    return await getSingleFactoryCapacity(client, factoryId, month);
  }

  // 所有工厂产能
  const { data: factories } = await client
    .from('factories')
    .select('id, name, factory_code, daily_capacity, status')
    .eq('status', 'active');

  const capacities = await Promise.all(
    (factories || []).map(async (f: any) => {
      const stats = await calculateCapacityStats(client, f.id, month);
      return { ...f, ...stats };
    })
  );

  // 汇总
  const summary = {
    totalCapacity: capacities.reduce((sum: number, f: any) => sum + (f.dailyCapacity || 0) * 30, 0),
    totalAllocated: capacities.reduce((sum: number, f: any) => sum + (f.allocated || 0), 0),
    totalCompleted: capacities.reduce((sum: number, f: any) => sum + (f.completed || 0), 0),
    avgUtilization: 0
  };

  if (summary.totalCapacity > 0) {
    summary.avgUtilization = Math.round((summary.totalAllocated / summary.totalCapacity) * 100);
  }

  return NextResponse.json({
    success: true,
    data: {
      factories: capacities,
      summary,
      month
    }
  });
}

/**
 * 订单分配列表
 */
async function listAllocations(client: any, searchParams: URLSearchParams) {
  const orderId = searchParams.get('order_id');
  const factoryId = searchParams.get('factory_id');
  const status = searchParams.get('status');

  let query = client
    .from('order_allocations')
    .select(`
      *,
      factories (id, name, factory_code),
      production_orders (order_no, style_no, delivery_date),
      styles (style_no, style_name)
    `)
    .order('created_at', { ascending: false });

  if (orderId) {
    query = query.eq('order_id', orderId);
  }
  if (factoryId) {
    query = query.eq('factory_id', factoryId);
  }
  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: data || []
  });
}

/**
 * 进度同步
 */
async function getSyncProgress(client: any, searchParams: URLSearchParams) {
  const orderId = searchParams.get('order_id');
  const factoryId = searchParams.get('factory_id');

  let query = client
    .from('order_allocations')
    .select(`
      *,
      factories (id, name, factory_code),
      production_orders (order_no, style_no, delivery_date, quantity)
    `);

  if (orderId) {
    query = query.eq('order_id', orderId);
  }
  if (factoryId) {
    query = query.eq('factory_id', factoryId);
  }

  const { data: allocations } = await query;

  // 计算进度
  const progressList = (allocations || []).map((a: any) => {
    const progress = a.quantity > 0 ? Math.round((a.completed_quantity || 0) / a.quantity * 100) : 0;
    const remaining = a.quantity - (a.completed_quantity || 0);
    const daysUntilDelivery = a.production_orders?.delivery_date 
      ? Math.ceil((new Date(a.production_orders.delivery_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (daysUntilDelivery !== null && daysUntilDelivery <= 7 && progress < 80) {
      riskLevel = 'high';
    } else if (daysUntilDelivery !== null && daysUntilDelivery <= 14 && progress < 60) {
      riskLevel = 'medium';
    }

    return {
      ...a,
      progress,
      remaining,
      daysUntilDelivery,
      riskLevel,
      isOnSchedule: progress >= (1 - (daysUntilDelivery || 30) / 30) * 100
    };
  });

  // 汇总
  const summary = {
    totalAllocations: progressList.length,
    totalQuantity: progressList.reduce((sum: number, a: any) => sum + (a.quantity || 0), 0),
    totalCompleted: progressList.reduce((sum: number, a: any) => sum + (a.completed_quantity || 0), 0),
    highRisk: progressList.filter((a: any) => a.riskLevel === 'high').length,
    onSchedule: progressList.filter((a: any) => a.isOnSchedule).length
  };

  return NextResponse.json({
    success: true,
    data: {
      progress: progressList,
      summary
    }
  });
}

/**
 * 结算列表
 */
async function listSettlements(client: any, searchParams: URLSearchParams) {
  const factoryId = searchParams.get('factory_id');
  const status = searchParams.get('status');
  const month = searchParams.get('month');

  let query = client
    .from('factory_settlements')
    .select(`
      *,
      factories (id, name, factory_code),
      production_orders (order_no)
    `)
    .order('created_at', { ascending: false });

  if (factoryId) {
    query = query.eq('factory_id', factoryId);
  }
  if (status) {
    query = query.eq('status', status);
  }
  if (month) {
    query = query.gte('period_start', `${month}-01`).lt('period_start', `${month}-32`);
  }

  const { data, error } = await query;

  if (error) throw error;

  // 统计
  const stats = {
    total: data?.length || 0,
    pending: data?.filter((s: any) => s.status === 'pending').length || 0,
    completed: data?.filter((s: any) => s.status === 'completed').length || 0,
    totalAmount: data?.reduce((sum: number, s: any) => sum + (s.settlement_amount || 0), 0) || 0
  };

  return NextResponse.json({
    success: true,
    data: {
      settlements: data || [],
      stats
    }
  });
}

/**
 * 推荐工厂
 */
async function recommendFactories(client: any, searchParams: URLSearchParams) {
  const orderId = searchParams.get('order_id');
  const quantity = parseInt(searchParams.get('quantity') || '1000');
  const category = searchParams.get('category');
  const deliveryDays = parseInt(searchParams.get('delivery_days') || '30');

  // 获取活跃工厂
  const { data: factories } = await client
    .from('factories')
    .select('*')
    .eq('status', 'active');

  if (!factories || factories.length === 0) {
    return NextResponse.json({
      success: true,
      data: { recommendations: [], message: '暂无可用工厂' }
    });
  }

  // 获取各工厂当前负载
  const recommendations = await Promise.all(
    factories.map(async (f: any) => {
      const { data: allocations } = await client
        .from('order_allocations')
        .select('quantity, completed_quantity')
        .eq('factory_id', f.id)
        .in('status', ['allocated', 'in_production']);

      const currentLoad = allocations?.reduce((sum: number, a: any) => sum + (a.quantity || 0), 0) || 0;
      const capacityPerPeriod = f.daily_capacity * deliveryDays;
      const availableCapacity = Math.max(0, capacityPerPeriod - currentLoad);

      // 计算匹配度分数
      let score = 100;

      // 产能匹配度
      if (availableCapacity < quantity) {
        score -= 30;
      } else if (availableCapacity < quantity * 1.5) {
        score -= 10;
      }

      // 品类专长匹配
      if (category && f.specialties?.includes(category)) {
        score += 20;
      }

      // 历史表现
      score += (f.quality_rating || 0) * 5;
      score += (f.on_time_rate || 0) * 0.2;

      // 价格竞争力
      score -= (f.price_level || 3) * 5;

      return {
        factory: f,
        availableCapacity,
        canFulfill: availableCapacity >= quantity,
        score,
        recommendation: score >= 80 ? '强烈推荐' : score >= 60 ? '推荐' : '备选'
      };
    })
  );

  // 按分数排序
  recommendations.sort((a: any, b: any) => b.score - a.score);

  return NextResponse.json({
    success: true,
    data: {
      recommendations,
      orderInfo: { orderId, quantity, category, deliveryDays }
    }
  });
}

/**
 * 外发订单列表
 */
async function listExternalOrders(client: any, searchParams: URLSearchParams) {
  const factoryId = searchParams.get('factory_id');
  const status = searchParams.get('status');

  let query = client
    .from('external_orders')
    .select(`
      *,
      factories (id, name, factory_code),
      styles (style_no, style_name)
    `)
    .order('created_at', { ascending: false });

  if (factoryId) {
    query = query.eq('factory_id', factoryId);
  }
  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) throw error;

  // 统计
  const stats = {
    total: data?.length || 0,
    pending: data?.filter((o: any) => o.status === 'pending').length || 0,
    inProduction: data?.filter((o: any) => o.status === 'in_production').length || 0,
    completed: data?.filter((o: any) => o.status === 'completed').length || 0
  };

  return NextResponse.json({
    success: true,
    data: {
      orders: data || [],
      stats
    }
  });
}

/**
 * 物料追踪
 */
async function trackMaterials(client: any, searchParams: URLSearchParams) {
  const externalOrderId = searchParams.get('external_order_id');
  const factoryId = searchParams.get('factory_id');

  let query = client
    .from('material_issuances')
    .select(`
      *,
      factories (id, name),
      external_orders (order_no),
      materials (code, name, unit)
    `)
    .order('issued_at', { ascending: false });

  if (externalOrderId) {
    query = query.eq('external_order_id', externalOrderId);
  }
  if (factoryId) {
    query = query.eq('factory_id', factoryId);
  }

  const { data: issuances, error } = await query;

  if (error) throw error;

  // 获取回收记录
  const { data: returns } = await client
    .from('material_returns')
    .select('*')
    .in('issuance_id', issuances?.map((i: any) => i.id) || []);

  // 计算差异
  const tracking = (issuances || []).map((i: any) => {
    const relatedReturns = returns?.filter((r: any) => r.issuance_id === i.id) || [];
    const returnedQty = relatedReturns.reduce((sum: number, r: any) => sum + (r.quantity || 0), 0);
    const usedQty = (i.quantity || 0) - returnedQty;
    const expectedUsage = i.expected_usage || 0;
    const variance = usedQty - expectedUsage;

    return {
      ...i,
      returnedQuantity: returnedQty,
      usedQuantity: usedQty,
      variance,
      varianceRate: expectedUsage > 0 ? Math.round((variance / expectedUsage) * 100) : 0
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      issuances: tracking,
      summary: {
        totalIssued: tracking.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0),
        totalReturned: tracking.reduce((sum: number, i: any) => sum + (i.returnedQuantity || 0), 0),
        abnormalCount: tracking.filter((i: any) => Math.abs(i.varianceRate) > 5).length
      }
    }
  });
}

/**
 * 创建工厂
 */
async function createFactory(client: any, data: any) {
  const factory = {
    name: data.name,
    factory_code: data.factoryCode || data.factory_code || `F${Date.now().toString(36).toUpperCase()}`,
    factory_type: data.factoryType || data.factory_type || 'internal',
    contact_person: data.contactPerson || data.contact_person,
    contact_phone: data.contactPhone || data.contact_phone,
    address: data.address,
    daily_capacity: data.dailyCapacity || data.daily_capacity || 1000,
    specialties: data.specialties || [],
    quality_rating: data.qualityRating || data.quality_rating || 3,
    on_time_rate: data.onTimeRate || data.on_time_rate || 80,
    price_level: data.priceLevel || data.price_level || 3,
    status: data.status || 'active',
    created_at: new Date().toISOString()
  };

  const { data: created, error } = await client
    .from('factories')
    .insert(factory)
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: created,
    message: '工厂创建成功'
  });
}

/**
 * 分配订单到工厂
 */
async function allocateOrder(client: any, data: any) {
  const { orderId, factoryId, quantity, unitPrice, deliveryDate, notes } = data;

  // 检查订单
  const { data: order } = await client
    .from('production_orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (!order) {
    return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 });
  }

  // 检查工厂
  const { data: factory } = await client
    .from('factories')
    .select('*')
    .eq('id', factoryId)
    .single();

  if (!factory) {
    return NextResponse.json({ success: false, error: '工厂不存在' }, { status: 404 });
  }

  // 创建分配记录
  const allocation = {
    order_id: orderId,
    factory_id: factoryId,
    style_id: order.style_id,
    quantity,
    unit_price: unitPrice,
    total_amount: quantity * (unitPrice || 0),
    delivery_date: deliveryDate,
    status: 'allocated',
    notes,
    created_at: new Date().toISOString()
  };

  const { data: created, error } = await client
    .from('order_allocations')
    .insert(allocation)
    .select()
    .single();

  if (error) throw error;

  // 更新订单分配数量
  await client
    .from('production_orders')
    .update({
      allocated_quantity: (order.allocated_quantity || 0) + quantity,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId);

  return NextResponse.json({
    success: true,
    data: {
      allocation: created,
      factory,
      message: `已分配${quantity}件到${factory.name}`
    }
  });
}

/**
 * 更新进度
 */
async function updateProgress(client: any, data: any) {
  const { allocationId, completedQuantity, stage, notes } = data;

  const { data: allocation } = await client
    .from('order_allocations')
    .select('*')
    .eq('id', allocationId)
    .single();

  if (!allocation) {
    return NextResponse.json({ success: false, error: '分配记录不存在' }, { status: 404 });
  }

  // 更新进度
  const update: any = {
    completed_quantity: completedQuantity,
    updated_at: new Date().toISOString()
  };

  if (stage) {
    update.current_stage = stage;
  }

  // 检查是否完成
  if (completedQuantity >= allocation.quantity) {
    update.status = 'completed';
    update.completed_at = new Date().toISOString();
  } else if (completedQuantity > 0) {
    update.status = 'in_production';
  }

  const { data: updated, error } = await client
    .from('order_allocations')
    .update(update)
    .eq('id', allocationId)
    .select()
    .single();

  if (error) throw error;

  // 同步更新主订单
  if (completedQuantity > (allocation.completed_quantity || 0)) {
    const increment = completedQuantity - (allocation.completed_quantity || 0);
    await client
      .from('production_orders')
      .update({
        completed_quantity: client.rpc('increment', { amount: increment }),
        updated_at: new Date().toISOString()
      })
      .eq('id', allocation.order_id);
  }

  // 记录进度日志
  await client
    .from('allocation_progress_logs')
    .insert({
      allocation_id: allocationId,
      previous_quantity: allocation.completed_quantity || 0,
      new_quantity: completedQuantity,
      stage,
      notes,
      logged_at: new Date().toISOString()
    });

  return NextResponse.json({
    success: true,
    data: updated,
    message: '进度已更新'
  });
}

/**
 * 创建结算
 */
async function createSettlement(client: any, data: any) {
  const { factoryId, periodStart, periodEnd, notes } = data;

  // 获取期间内完成的分配
  const { data: allocations } = await client
    .from('order_allocations')
    .select('*')
    .eq('factory_id', factoryId)
    .eq('status', 'completed')
    .gte('completed_at', periodStart)
    .lte('completed_at', periodEnd);

  // 计算结算金额
  const totalQuantity = allocations?.reduce((sum: number, a: any) => sum + (a.completed_quantity || 0), 0) || 0;
  const totalAmount = allocations?.reduce((sum: number, a: any) => sum + (a.total_amount || 0), 0) || 0;

  const settlement = {
    factory_id: factoryId,
    period_start: periodStart,
    period_end: periodEnd,
    total_quantity: totalQuantity,
    total_amount: totalAmount,
    settlement_amount: totalAmount,
    status: 'pending',
    notes,
    created_at: new Date().toISOString()
  };

  const { data: created, error } = await client
    .from('factory_settlements')
    .insert(settlement)
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: {
      settlement: created,
      details: allocations,
      message: '结算单已创建'
    }
  });
}

/**
 * 创建外发订单
 */
async function createExternalOrder(client: any, data: any) {
  const order = {
    factory_id: data.factoryId || data.factory_id,
    style_id: data.styleId || data.style_id,
    order_no: data.orderNo || data.order_no || `EXT${Date.now().toString(36).toUpperCase()}`,
    quantity: data.quantity,
    unit_price: data.unitPrice || data.unit_price,
    delivery_date: data.deliveryDate || data.delivery_date,
    status: 'pending',
    notes: data.notes,
    created_at: new Date().toISOString()
  };

  const { data: created, error } = await client
    .from('external_orders')
    .insert(order)
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: created,
    message: '外发订单已创建'
  });
}

/**
 * 发料
 */
async function issueMaterial(client: any, data: any) {
  const issuance = {
    external_order_id: data.externalOrderId || data.external_order_id,
    factory_id: data.factoryId || data.factory_id,
    material_id: data.materialId || data.material_id,
    quantity: data.quantity,
    expected_usage: data.expectedUsage || data.expected_usage,
    issued_by: data.issuedBy || data.issued_by,
    issued_at: new Date().toISOString(),
    notes: data.notes
  };

  const { data: created, error } = await client
    .from('material_issuances')
    .insert(issuance)
    .select()
    .single();

  if (error) throw error;

  // 更新库存
  await client
    .from('materials')
    .update({
      stock_quantity: client.rpc('decrement', { amount: data.quantity }),
      updated_at: new Date().toISOString()
    })
    .eq('id', issuance.material_id);

  return NextResponse.json({
    success: true,
    data: created,
    message: '物料已发放'
  });
}

/**
 * 收货
 */
async function receiveProduct(client: any, data: any) {
  const { externalOrderId, quantity, qualityStatus, notes } = data;

  // 更新外发订单
  const { data: order } = await client
    .from('external_orders')
    .update({
      received_quantity: quantity,
      status: quantity >= (await client.from('external_orders').select('quantity').eq('id', externalOrderId).single()).data?.quantity 
        ? 'completed' 
        : 'partial_received',
      received_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', externalOrderId)
    .select()
    .single();

  // 记录收货日志
  await client
    .from('external_receipts')
    .insert({
      external_order_id: externalOrderId,
      quantity,
      quality_status: qualityStatus,
      notes,
      received_at: new Date().toISOString()
    });

  return NextResponse.json({
    success: true,
    data: order,
    message: '收货已记录'
  });
}

// 辅助函数
async function calculateCapacityStats(client: any, factoryId: string, month?: string) {
  const currentMonth = month || new Date().toISOString().slice(0, 7);
  const startDate = `${currentMonth}-01`;
  const endDate = `${currentMonth}-31`;

  const { data: allocations } = await client
    .from('order_allocations')
    .select('quantity, completed_quantity')
    .eq('factory_id', factoryId)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  const { data: factory } = await client
    .from('factories')
    .select('daily_capacity')
    .eq('id', factoryId)
    .single();

  const dailyCapacity = factory?.daily_capacity || 0;
  const monthlyCapacity = dailyCapacity * 30;

  const allocated = allocations?.reduce((sum: number, a: any) => sum + (a.quantity || 0), 0) || 0;
  const completed = allocations?.reduce((sum: number, a: any) => sum + (a.completed_quantity || 0), 0) || 0;

  return {
    dailyCapacity,
    monthlyCapacity,
    allocated,
    completed,
    utilizationRate: monthlyCapacity > 0 ? Math.round((allocated / monthlyCapacity) * 100) : 0,
    completionRate: allocated > 0 ? Math.round((completed / allocated) * 100) : 0
  };
}

async function getSingleFactoryCapacity(client: any, factoryId: string, month: string) {
  const stats = await calculateCapacityStats(client, factoryId, month);
  
  // 按周统计
  const weeks = [];
  const [year, mon] = month.split('-').map(Number);
  const firstDay = new Date(year, mon - 1, 1);
  const lastDay = new Date(year, mon, 0);
  
  for (let d = firstDay; d <= lastDay; d.setDate(d.getDate() + 7)) {
    const weekStart = new Date(d);
    const weekEnd = new Date(Math.min(d.getTime() + 6 * 24 * 60 * 60 * 1000, lastDay.getTime()));
    
    const { data: weekAllocations } = await client
      .from('order_allocations')
      .select('quantity')
      .eq('factory_id', factoryId)
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString());

    weeks.push({
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0],
      allocated: weekAllocations?.reduce((sum: number, a: any) => sum + (a.quantity || 0), 0) || 0
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      ...stats,
      weeks,
      month
    }
  });
}
