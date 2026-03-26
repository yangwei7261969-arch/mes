import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 批次管理与自动补货API
 * 
 * 功能：
 * • 面料批次管理
 * • 批次追溯
 * • 库存预警
 * • 自动补货建议
 * • 采购计划生成
 */

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';

    switch (action) {
      case 'list':
        return await listBatches(client, searchParams);
      case 'detail':
        return await getBatchDetail(client, searchParams);
      case 'trace':
        return await traceBatch(client, searchParams);
      case 'inventory':
        return await getInventoryStatus(client, searchParams);
      case 'alerts':
        return await getInventoryAlerts(client, searchParams);
      case 'reorder-suggestions':
        return await getReorderSuggestions(client, searchParams);
      case 'purchase-plan':
        return await getPurchasePlan(client, searchParams);
      case 'usage-analysis':
        return await analyzeUsage(client, searchParams);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Batch API error:', error);
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
        return await createBatch(client, data);
      case 'receive':
        return await receiveBatch(client, data);
      case 'issue':
        return await issueBatch(client, data);
      case 'transfer':
        return await transferBatch(client, data);
      case 'adjust':
        return await adjustInventory(client, data);
      case 'create-purchase':
        return await createPurchaseOrder(client, data);
      case 'approve-reorder':
        return await approveReorder(client, data);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Batch operation error:', error);
    return NextResponse.json({ success: false, error: '操作失败' }, { status: 500 });
  }
}

/**
 * 批次列表
 */
async function listBatches(client: any, searchParams: URLSearchParams) {
  const materialId = searchParams.get('material_id');
  const status = searchParams.get('status');
  const warehouse = searchParams.get('warehouse');

  let query = client
    .from('material_batches')
    .select(`
      *,
      materials (id, code, name, unit)
    `)
    .order('created_at', { ascending: false });

  if (materialId) {
    query = query.eq('material_id', materialId);
  }
  if (status) {
    query = query.eq('status', status);
  }
  if (warehouse) {
    query = query.eq('warehouse', warehouse);
  }

  const { data, error } = await query;

  if (error) throw error;

  // 统计
  const stats = {
    total: data?.length || 0,
    inStock: data?.filter((b: any) => b.status === 'in_stock').length || 0,
    lowStock: data?.filter((b: any) => b.status === 'low_stock').length || 0,
    expired: data?.filter((b: any) => {
      if (!b.expiry_date) return false;
      return new Date(b.expiry_date) < new Date();
    }).length || 0
  };

  return NextResponse.json({
    success: true,
    data: {
      batches: data || [],
      stats
    }
  });
}

/**
 * 批次详情
 */
async function getBatchDetail(client: any, searchParams: URLSearchParams) {
  const id = searchParams.get('id');
  const batchNo = searchParams.get('batch_no');

  if (!id && !batchNo) {
    return NextResponse.json({ success: false, error: '缺少批次ID或批次号' }, { status: 400 });
  }

  let query = client
    .from('material_batches')
    .select(`
      *,
      materials (id, code, name, unit, unit_price),
      batch_transactions (*),
      quality_inspections (*)
    `);

  if (id) {
    query = query.eq('id', id);
  } else {
    query = query.eq('batch_no', batchNo);
  }

  const { data: batch, error } = await query.single();

  if (error || !batch) {
    return NextResponse.json({ success: false, error: '批次不存在' }, { status: 404 });
  }

  // 使用记录
  const { data: usageRecords } = await client
    .from('material_usage')
    .select(`
      *,
      production_orders (order_no)
    `)
    .eq('batch_id', batch.id);

  return NextResponse.json({
    success: true,
    data: {
      batch,
      usageRecords: usageRecords || [],
      summary: {
        initialQuantity: batch.initial_quantity,
        currentQuantity: batch.current_quantity,
        usedQuantity: batch.initial_quantity - batch.current_quantity,
        usageRate: batch.initial_quantity > 0 
          ? Math.round(((batch.initial_quantity - batch.current_quantity) / batch.initial_quantity) * 100) 
          : 0
      }
    }
  });
}

/**
 * 批次追溯
 */
async function traceBatch(client: any, searchParams: URLSearchParams) {
  const batchId = searchParams.get('batch_id');
  const orderId = searchParams.get('order_id');
  const trackingCode = searchParams.get('tracking_code');

  if (batchId) {
    return await traceFromBatch(client, batchId);
  }

  if (orderId) {
    return await traceFromOrder(client, orderId);
  }

  if (trackingCode) {
    return await traceFromTrackingCode(client, trackingCode);
  }

  return NextResponse.json({ success: false, error: '缺少追溯参数' }, { status: 400 });
}

/**
 * 库存状态
 */
async function getInventoryStatus(client: any, searchParams: URLSearchParams) {
  const warehouse = searchParams.get('warehouse');
  const category = searchParams.get('category');
  const alertLevel = searchParams.get('alert_level'); // low, critical, all

  let query = client
    .from('material_inventory')
    .select(`
      *,
      materials (id, code, name, category, unit, safety_stock, reorder_point)
    `);

  if (warehouse) {
    query = query.eq('warehouse', warehouse);
  }
  if (category) {
    query = query.eq('materials.category', category);
  }

  const { data, error } = await query;

  if (error) throw error;

  // 计算库存状态
  const inventoryWithStatus = (data || []).map((item: any) => {
    const quantity = item.quantity || 0;
    const safetyStock = item.materials?.safety_stock || 0;
    const reorderPoint = item.materials?.reorder_point || 0;

    let status: 'normal' | 'low' | 'critical' = 'normal';
    if (quantity <= safetyStock) {
      status = 'critical';
    } else if (quantity <= reorderPoint) {
      status = 'low';
    }

    return {
      ...item,
      status,
      daysOfSupply: item.daily_usage ? Math.round(quantity / item.daily_usage) : null
    };
  });

  // 过滤告警级别
  let filtered = inventoryWithStatus;
  if (alertLevel === 'low') {
    filtered = inventoryWithStatus.filter((i: any) => i.status === 'low');
  } else if (alertLevel === 'critical') {
    filtered = inventoryWithStatus.filter((i: any) => i.status === 'critical');
  } else if (alertLevel === 'all') {
    filtered = inventoryWithStatus.filter((i: any) => i.status !== 'normal');
  }

  // 统计
  const stats = {
    totalItems: inventoryWithStatus.length,
    normal: inventoryWithStatus.filter((i: any) => i.status === 'normal').length,
    low: inventoryWithStatus.filter((i: any) => i.status === 'low').length,
    critical: inventoryWithStatus.filter((i: any) => i.status === 'critical').length,
    totalValue: inventoryWithStatus.reduce((sum: number, i: any) => sum + (i.quantity || 0) * (i.materials?.unit_price || 0), 0)
  };

  return NextResponse.json({
    success: true,
    data: {
      inventory: filtered,
      allInventory: inventoryWithStatus,
      stats
    }
  });
}

/**
 * 库存告警
 */
async function getInventoryAlerts(client: any, searchParams: URLSearchParams) {
  const type = searchParams.get('type') || 'all';
  const days = parseInt(searchParams.get('days') || '7');

  const alerts: any[] = [];

  // 低库存告警
  if (type === 'all' || type === 'low_stock') {
    const { data: lowStock } = await client
      .from('material_inventory')
      .select(`
        *,
        materials (id, code, name, unit, reorder_point, safety_stock)
      `)
      .lte('quantity', client.raw('reorder_point'));

    lowStock?.forEach((item: any) => {
      alerts.push({
        type: 'low_stock',
        severity: item.quantity <= (item.materials?.safety_stock || 0) ? 'critical' : 'warning',
        materialId: item.material_id,
        materialCode: item.materials?.code,
        materialName: item.materials?.name,
        currentQuantity: item.quantity,
        reorderPoint: item.materials?.reorder_point,
        message: `库存不足：当前${item.quantity}${item.materials?.unit}，低于补货点${item.materials?.reorder_point}${item.materials?.unit}`,
        createdAt: new Date().toISOString()
      });
    });
  }

  // 即将过期告警
  if (type === 'all' || type === 'expiring') {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    const { data: expiring } = await client
      .from('material_batches')
      .select(`
        *,
        materials (id, code, name, unit)
      `)
      .lte('expiry_date', expiryDate.toISOString())
      .gt('current_quantity', 0);

    expiring?.forEach((batch: any) => {
      const daysUntilExpiry = Math.ceil(
        (new Date(batch.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      alerts.push({
        type: 'expiring',
        severity: daysUntilExpiry <= 3 ? 'critical' : 'warning',
        batchId: batch.id,
        batchNo: batch.batch_no,
        materialCode: batch.materials?.code,
        materialName: batch.materials?.name,
        quantity: batch.current_quantity,
        expiryDate: batch.expiry_date,
        daysUntilExpiry,
        message: `即将过期：${daysUntilExpiry}天后过期，剩余${batch.current_quantity}${batch.materials?.unit}`,
        createdAt: new Date().toISOString()
      });
    });
  }

  // 使用异常告警
  if (type === 'all' || type === 'usage_anomaly') {
    const { data: usage } = await client
      .from('material_usage_stats')
      .select('*')
      .gt('deviation_rate', 0.2);

    usage?.forEach((u: any) => {
      alerts.push({
        type: 'usage_anomaly',
        severity: 'warning',
        materialId: u.material_id,
        deviationRate: u.deviation_rate,
        message: `用量异常：实际用量与标准用量偏差${Math.round(u.deviation_rate * 100)}%`,
        createdAt: new Date().toISOString()
      });
    });
  }

  // 排序
  alerts.sort((a: any, b: any) => {
    const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity as string] - severityOrder[b.severity as string];
  });

  return NextResponse.json({
    success: true,
    data: {
      alerts,
      summary: {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        warning: alerts.filter(a => a.severity === 'warning').length,
        byType: {
          lowStock: alerts.filter(a => a.type === 'low_stock').length,
          expiring: alerts.filter(a => a.type === 'expiring').length,
          usageAnomaly: alerts.filter(a => a.type === 'usage_anomaly').length
        }
      }
    }
  });
}

/**
 * 自动补货建议
 */
async function getReorderSuggestions(client: any, searchParams: URLSearchParams) {
  const urgent = searchParams.get('urgent') === 'true';

  // 获取低库存物料
  const { data: inventory } = await client
    .from('material_inventory')
    .select(`
      *,
      materials (id, code, name, category, unit, unit_price, safety_stock, reorder_point, reorder_quantity, lead_time)
    `);

  // 获取在途数量
  const { data: inTransit } = await client
    .from('purchase_orders')
    .select('material_id, quantity')
    .in('status', ['pending', 'confirmed', 'shipped']);

  const inTransitMap: Record<string, number> = {};
  inTransit?.forEach((p: any) => {
    inTransitMap[p.material_id] = (inTransitMap[p.material_id] || 0) + p.quantity;
  });

  // 计算补货建议
  const suggestions = (inventory || [])
    .filter((item: any) => {
      const reorderPoint = item.materials?.reorder_point || 0;
      const inTransitQty = inTransitMap[item.material_id] || 0;
      const effectiveQuantity = (item.quantity || 0) + inTransitQty;
      return effectiveQuantity <= reorderPoint;
    })
    .map((item: any) => {
      const material = item.materials;
      const currentStock = item.quantity || 0;
      const inTransitQty = inTransitMap[item.material_id] || 0;
      const safetyStock = material?.safety_stock || 0;
      const reorderPoint = material?.reorder_point || 0;
      const reorderQuantity = material?.reorder_quantity || safetyStock * 2;
      const leadTime = material?.lead_time || 7;
      const dailyUsage = item.daily_usage || 10;

      // 计算建议采购量
      const daysOfStock = dailyUsage > 0 ? currentStock / dailyUsage : 999;
      const stockDuringLead = dailyUsage * leadTime;
      const suggestedQuantity = Math.max(
        reorderQuantity,
        safetyStock + stockDuringLead - currentStock - inTransitQty
      );

      // 紧急程度
      let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (currentStock <= safetyStock) {
        urgency = 'critical';
      } else if (currentStock <= reorderPoint * 0.5) {
        urgency = 'high';
      } else if (currentStock <= reorderPoint) {
        urgency = 'medium';
      }

      return {
        materialId: material?.id,
        materialCode: material?.code,
        materialName: material?.name,
        category: material?.category,
        currentStock,
        inTransit: inTransitQty,
        safetyStock,
        reorderPoint,
        daysOfStock: Math.round(daysOfStock),
        dailyUsage,
        leadTime,
        suggestedQuantity: Math.ceil(suggestedQuantity),
        estimatedCost: Math.ceil(suggestedQuantity) * (material?.unit_price || 0),
        urgency,
        lastPurchaseDate: item.last_purchase_date,
        suggestedOrderDate: new Date(Date.now() + (daysOfStock - leadTime - 3) * 24 * 60 * 60 * 1000).toISOString()
      };
    });

  // 过滤紧急
  const filtered = urgent 
    ? suggestions.filter((s: any) => s.urgency === 'critical' || s.urgency === 'high')
    : suggestions;

  // 排序
  filtered.sort((a: any, b: any) => {
    const urgencyOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return urgencyOrder[a.urgency as string] - urgencyOrder[b.urgency as string];
  });

  return NextResponse.json({
    success: true,
    data: {
      suggestions: filtered,
      summary: {
        total: filtered.length,
        critical: filtered.filter((s: any) => s.urgency === 'critical').length,
        high: filtered.filter((s: any) => s.urgency === 'high').length,
        totalCost: filtered.reduce((sum: number, s: any) => sum + s.estimatedCost, 0)
      }
    }
  });
}

/**
 * 采购计划
 */
async function getPurchasePlan(client: any, searchParams: URLSearchParams) {
  const startDate = searchParams.get('start_date') || new Date().toISOString().split('T')[0];
  const endDate = searchParams.get('end_date') || 
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // 直接获取建议数据
  const suggestionsData = await fetchReorderSuggestionsData(client, searchParams);

  // 获取即将到期的订单
  const { data: pendingOrders } = await client
    .from('purchase_orders')
    .select(`
      *,
      suppliers (id, name),
      materials (code, name)
    `)
    .in('status', ['pending', 'confirmed', 'shipped'])
    .gte('expected_date', startDate)
    .lte('expected_date', endDate);

  // 获取生产计划需求
  const { data: productionDemand } = await client
    .from('production_demand')
    .select('*')
    .gte('required_date', startDate)
    .lte('required_date', endDate);

  // 汇总采购计划
  const plan = {
    period: { startDate, endDate },
    immediate: suggestionsData.suggestions.filter((s: any) => s.urgency === 'critical'),
    shortTerm: suggestionsData.suggestions.filter((s: any) => s.urgency === 'high'),
    pendingOrders: pendingOrders || [],
    demandForecast: productionDemand || [],
    summary: {
      totalPurchaseNeeded: suggestionsData.summary.totalCost,
      pendingOrdersValue: pendingOrders?.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0,
      criticalCount: suggestionsData.summary.critical,
      highCount: suggestionsData.summary.high
    }
  };

  return NextResponse.json({
    success: true,
    data: plan
  });
}

/**
 * 用量分析
 */
async function analyzeUsage(client: any, searchParams: URLSearchParams) {
  const materialId = searchParams.get('material_id');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const groupBy = searchParams.get('group_by') || 'day'; // day, week, month

  let query = client
    .from('material_usage')
    .select(`
      *,
      materials (id, code, name, unit),
      production_orders (order_no)
    `)
    .order('used_at', { ascending: false });

  if (materialId) {
    query = query.eq('material_id', materialId);
  }
  if (startDate) {
    query = query.gte('used_at', startDate);
  }
  if (endDate) {
    query = query.lte('used_at', endDate);
  }

  const { data: usage, error } = await query;

  if (error) throw error;

  // 按时间分组
  const groupedUsage: Record<string, { total: number; count: number }> = {};
  usage?.forEach((u: any) => {
    let key: string;
    const date = new Date(u.used_at);

    switch (groupBy) {
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = date.toISOString().slice(0, 7);
        break;
      default:
        key = date.toISOString().split('T')[0];
    }

    if (!groupedUsage[key]) {
      groupedUsage[key] = { total: 0, count: 0 };
    }
    groupedUsage[key].total += u.quantity || 0;
    groupedUsage[key].count++;
  });

  // 计算统计数据
  const totalUsage = usage?.reduce((sum: number, u: any) => sum + (u.quantity || 0), 0) || 0;
  const avgUsage = usage?.length ? totalUsage / usage.length : 0;
  const maxUsage = Math.max(...(usage?.map((u: any) => u.quantity || 0) || [0]));
  const minUsage = Math.min(...(usage?.map((u: any) => u.quantity || 0) || [0]));

  // 趋势分析
  const trend = calculateTrend(groupedUsage);

  return NextResponse.json({
    success: true,
    data: {
      usage: usage || [],
      groupedUsage,
      statistics: {
        totalUsage,
        avgUsage: Math.round(avgUsage * 100) / 100,
        maxUsage,
        minUsage,
        count: usage?.length || 0
      },
      trend
    }
  });
}

/**
 * 创建批次
 */
async function createBatch(client: any, data: any) {
  const batch = {
    batch_no: data.batchNo || `B${Date.now().toString(36).toUpperCase()}`,
    material_id: data.materialId,
    supplier_id: data.supplierId,
    initial_quantity: data.quantity,
    current_quantity: data.quantity,
    unit_price: data.unitPrice,
    warehouse: data.warehouse,
    location: data.location,
    production_date: data.productionDate,
    expiry_date: data.expiryDate,
    quality_status: data.qualityStatus || 'pending',
    status: 'in_stock',
    notes: data.notes,
    created_at: new Date().toISOString()
  };

  const { data: created, error } = await client
    .from('material_batches')
    .insert(batch)
    .select()
    .single();

  if (error) throw error;

  // 更新库存
  await client
    .from('material_inventory')
    .upsert({
      material_id: data.materialId,
      warehouse: data.warehouse,
      quantity: data.quantity,
      last_purchase_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

  return NextResponse.json({
    success: true,
    data: created,
    message: '批次创建成功'
  });
}

/**
 * 入库
 */
async function receiveBatch(client: any, data: any) {
  const { batchId, quantity, qualityStatus, notes } = data;

  const { data: batch } = await client
    .from('material_batches')
    .select('*')
    .eq('id', batchId)
    .single();

  if (!batch) {
    return NextResponse.json({ success: false, error: '批次不存在' }, { status: 404 });
  }

  // 更新批次
  const { data: updated, error } = await client
    .from('material_batches')
    .update({
      current_quantity: (batch.current_quantity || 0) + quantity,
      quality_status: qualityStatus || batch.quality_status,
      status: qualityStatus === 'passed' ? 'in_stock' : 'quarantine',
      received_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', batchId)
    .select()
    .single();

  if (error) throw error;

  // 记录交易
  await client
    .from('batch_transactions')
    .insert({
      batch_id: batchId,
      type: 'receive',
      quantity,
      notes,
      created_at: new Date().toISOString()
    });

  return NextResponse.json({
    success: true,
    data: updated,
    message: '入库成功'
  });
}

/**
 * 出库
 */
async function issueBatch(client: any, data: any) {
  const { batchId, quantity, orderId, notes } = data;

  const { data: batch } = await client
    .from('material_batches')
    .select('*')
    .eq('id', batchId)
    .single();

  if (!batch) {
    return NextResponse.json({ success: false, error: '批次不存在' }, { status: 404 });
  }

  if ((batch.current_quantity || 0) < quantity) {
    return NextResponse.json({ 
      success: false, 
      error: `库存不足，当前${batch.current_quantity}，需要${quantity}` 
    }, { status: 400 });
  }

  // 更新批次
  const newQuantity = (batch.current_quantity || 0) - quantity;
  const { data: updated, error } = await client
    .from('material_batches')
    .update({
      current_quantity: newQuantity,
      status: newQuantity <= 0 ? 'depleted' : 'in_stock',
      updated_at: new Date().toISOString()
    })
    .eq('id', batchId)
    .select()
    .single();

  if (error) throw error;

  // 更新库存
  await client
    .from('material_inventory')
    .update({
      quantity: client.raw('quantity - ?', [quantity]),
      updated_at: new Date().toISOString()
    })
    .eq('material_id', batch.material_id);

  // 记录交易
  await client
    .from('batch_transactions')
    .insert({
      batch_id: batchId,
      type: 'issue',
      quantity,
      order_id: orderId,
      notes,
      created_at: new Date().toISOString()
    });

  // 记录使用
  await client
    .from('material_usage')
    .insert({
      material_id: batch.material_id,
      batch_id: batchId,
      order_id: orderId,
      quantity,
      used_at: new Date().toISOString()
    });

  return NextResponse.json({
    success: true,
    data: updated,
    message: '出库成功'
  });
}

/**
 * 调拨
 */
async function transferBatch(client: any, data: any) {
  const { batchId, fromWarehouse, toWarehouse, quantity, notes } = data;

  const { data: batch } = await client
    .from('material_batches')
    .select('*')
    .eq('id', batchId)
    .single();

  if (!batch) {
    return NextResponse.json({ success: false, error: '批次不存在' }, { status: 404 });
  }

  // 创建调拨记录
  await client
    .from('inventory_transfers')
    .insert({
      batch_id: batchId,
      from_warehouse: fromWarehouse,
      to_warehouse: toWarehouse,
      quantity,
      status: 'completed',
      notes,
      created_at: new Date().toISOString()
    });

  // 更新库存
  await client
    .from('material_inventory')
    .update({
      quantity: client.raw('quantity - ?', [quantity]),
      updated_at: new Date().toISOString()
    })
    .eq('material_id', batch.material_id)
    .eq('warehouse', fromWarehouse);

  await client
    .from('material_inventory')
    .upsert({
      material_id: batch.material_id,
      warehouse: toWarehouse,
      quantity,
      updated_at: new Date().toISOString()
    });

  return NextResponse.json({
    success: true,
    message: '调拨成功'
  });
}

/**
 * 库存调整
 */
async function adjustInventory(client: any, data: any) {
  const { batchId, adjustment, reason } = data;

  const { data: batch } = await client
    .from('material_batches')
    .select('*')
    .eq('id', batchId)
    .single();

  if (!batch) {
    return NextResponse.json({ success: false, error: '批次不存在' }, { status: 404 });
  }

  const newQuantity = Math.max(0, (batch.current_quantity || 0) + adjustment);

  const { data: updated, error } = await client
    .from('material_batches')
    .update({
      current_quantity: newQuantity,
      updated_at: new Date().toISOString()
    })
    .eq('id', batchId)
    .select()
    .single();

  if (error) throw error;

  // 记录调整
  await client
    .from('inventory_adjustments')
    .insert({
      batch_id: batchId,
      previous_quantity: batch.current_quantity,
      adjustment,
      new_quantity: newQuantity,
      reason,
      created_at: new Date().toISOString()
    });

  return NextResponse.json({
    success: true,
    data: updated,
    message: '库存调整成功'
  });
}

/**
 * 创建采购订单
 */
async function createPurchaseOrder(client: any, data: any) {
  const { items, supplierId, expectedDate, notes } = data;

  const orderNo = `PO${Date.now().toString(36).toUpperCase()}`;
  const totalAmount = items.reduce((sum: number, item: any) => sum + item.quantity * item.unitPrice, 0);

  const order = {
    order_no: orderNo,
    supplier_id: supplierId,
    items,
    total_amount: totalAmount,
    expected_date: expectedDate,
    status: 'pending',
    notes,
    created_at: new Date().toISOString()
  };

  const { data: created, error } = await client
    .from('purchase_orders')
    .insert(order)
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: created,
    message: '采购订单创建成功'
  });
}

/**
 * 批准补货
 */
async function approveReorder(client: any, data: any) {
  const { suggestions, autoCreateOrder } = data;

  if (autoCreateOrder) {
    // 按供应商分组
    const bySupplier: Record<string, any[]> = {};
    suggestions.forEach((s: any) => {
      if (!bySupplier[s.supplierId]) {
        bySupplier[s.supplierId] = [];
      }
      bySupplier[s.supplierId].push(s);
    });

    // 创建采购订单
    const orders = [];
    for (const [supplierId, items] of Object.entries(bySupplier)) {
      const order = await createPurchaseOrder(client, {
        items: items.map(i => ({
          materialId: i.materialId,
          quantity: i.suggestedQuantity,
          unitPrice: i.unitPrice
        })),
        supplierId,
        expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
      orders.push(order);
    }

    return NextResponse.json({
      success: true,
      data: { orders, count: orders.length },
      message: `已创建${orders.length}个采购订单`
    });
  }

  return NextResponse.json({
    success: true,
    message: '补货计划已批准'
  });
}

// 辅助函数
async function traceFromBatch(client: any, batchId: string) {
  const { data: batch } = await client
    .from('material_batches')
    .select(`
      *,
      materials (*),
      suppliers (*),
      batch_transactions (*)
    `)
    .eq('id', batchId)
    .single();

  // 获取使用该批次的订单
  const { data: usage } = await client
    .from('material_usage')
    .select(`
      *,
      production_orders (order_no, styles(style_no, style_name))
    `)
    .eq('batch_id', batchId);

  return NextResponse.json({
    success: true,
    data: {
      batch,
      usage: usage || [],
      trace: buildForwardTrace(batch, usage)
    }
  });
}

async function traceFromOrder(client: any, orderId: string) {
  const { data: order } = await client
    .from('production_orders')
    .select('*')
    .eq('id', orderId)
    .single();

  const { data: usage } = await client
    .from('material_usage')
    .select(`
      *,
      material_batches (batch_no, production_date, suppliers(name))
    `)
    .eq('order_id', orderId);

  return NextResponse.json({
    success: true,
    data: {
      order,
      materials: usage || [],
      trace: buildBackwardTrace(order, usage)
    }
  });
}

async function traceFromTrackingCode(client: any, trackingCode: string) {
  const { data: item } = await client
    .from('tracking_items')
    .select('*')
    .eq('tracking_code', trackingCode)
    .single();

  if (!item) {
    return NextResponse.json({ success: false, error: '追踪码不存在' }, { status: 404 });
  }

  // 获取相关订单
  const { data: order } = await client
    .from('production_orders')
    .select('*')
    .eq('id', item.order_id)
    .single();

  // 获取物料使用
  const { data: usage } = await client
    .from('material_usage')
    .select(`
      *,
      material_batches (batch_no, production_date)
    `)
    .eq('order_id', item.order_id);

  return NextResponse.json({
    success: true,
    data: {
      trackingItem: item,
      order,
      materials: usage || []
    }
  });
}

function buildForwardTrace(batch: any, usage: any[]): any {
  return {
    type: 'forward',
    origin: {
      type: 'batch',
      id: batch?.id,
      batchNo: batch?.batch_no,
      materialName: batch?.materials?.name
    },
    destinations: (usage || []).map(u => ({
      type: 'order',
      orderId: u.order_id,
      orderNo: u.production_orders?.order_no,
      quantity: u.quantity
    }))
  };
}

function buildBackwardTrace(order: any, usage: any[]): any {
  return {
    type: 'backward',
    origin: {
      type: 'order',
      id: order?.id,
      orderNo: order?.order_no
    },
    sources: (usage || []).map(u => ({
      type: 'batch',
      batchId: u.batch_id,
      batchNo: u.material_batches?.batch_no,
      material: u.material_batches?.material_name,
      quantity: u.quantity
    }))
  };
}

function calculateTrend(groupedUsage: Record<string, { total: number; count: number }>): any {
  const entries = Object.entries(groupedUsage).sort((a, b) => a[0].localeCompare(b[0]));
  
  if (entries.length < 2) {
    return { direction: 'stable', change: 0 };
  }

  const recent = entries.slice(-7);
  const previous = entries.slice(-14, -7);

  const recentAvg = recent.reduce((sum, [_, v]) => sum + v.total, 0) / recent.length;
  const previousAvg = previous.length > 0 
    ? previous.reduce((sum, [_, v]) => sum + v.total, 0) / previous.length 
    : recentAvg;

  const change = previousAvg > 0 ? (recentAvg - previousAvg) / previousAvg : 0;

  return {
    direction: change > 0.1 ? 'increasing' : change < -0.1 ? 'decreasing' : 'stable',
    change: Math.round(change * 100)
  };
}

/**
 * 获取补货建议数据（内部函数）
 */
async function fetchReorderSuggestionsData(client: any, searchParams: URLSearchParams): Promise<any> {
  const urgent = searchParams.get('urgent') === 'true';

  // 获取低库存物料
  const { data: inventory } = await client
    .from('material_inventory')
    .select(`
      *,
      materials (id, code, name, category, unit, unit_price, safety_stock, reorder_point, reorder_quantity, lead_time)
    `);

  // 获取在途数量
  const { data: inTransit } = await client
    .from('purchase_orders')
    .select('material_id, quantity')
    .in('status', ['pending', 'confirmed', 'shipped']);

  const inTransitMap: Record<string, number> = {};
  inTransit?.forEach((p: any) => {
    inTransitMap[p.material_id] = (inTransitMap[p.material_id] || 0) + p.quantity;
  });

  // 计算补货建议
  const suggestions = (inventory || [])
    .filter((item: any) => {
      const reorderPoint = item.materials?.reorder_point || 0;
      const inTransitQty = inTransitMap[item.material_id] || 0;
      const effectiveQuantity = (item.quantity || 0) + inTransitQty;
      return effectiveQuantity <= reorderPoint;
    })
    .map((item: any) => {
      const material = item.materials;
      const currentStock = item.quantity || 0;
      const inTransitQty = inTransitMap[item.material_id] || 0;
      const safetyStock = material?.safety_stock || 0;
      const reorderPoint = material?.reorder_point || 0;
      const reorderQuantity = material?.reorder_quantity || safetyStock * 2;
      const leadTime = material?.lead_time || 7;
      const dailyUsage = item.daily_usage || 10;

      // 计算建议采购量
      const daysOfStock = dailyUsage > 0 ? currentStock / dailyUsage : 999;
      const stockDuringLead = dailyUsage * leadTime;
      const suggestedQuantity = Math.max(
        reorderQuantity,
        safetyStock + stockDuringLead - currentStock - inTransitQty
      );

      // 紧急程度
      let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (currentStock <= safetyStock) {
        urgency = 'critical';
      } else if (currentStock <= reorderPoint * 0.5) {
        urgency = 'high';
      } else if (currentStock <= reorderPoint) {
        urgency = 'medium';
      }

      return {
        materialId: material?.id,
        materialCode: material?.code,
        materialName: material?.name,
        category: material?.category,
        currentStock,
        inTransit: inTransitQty,
        safetyStock,
        reorderPoint,
        daysOfStock: Math.round(daysOfStock),
        dailyUsage,
        leadTime,
        suggestedQuantity: Math.ceil(suggestedQuantity),
        estimatedCost: Math.ceil(suggestedQuantity) * (material?.unit_price || 0),
        urgency,
        lastPurchaseDate: item.last_purchase_date,
        suggestedOrderDate: new Date(Date.now() + (daysOfStock - leadTime - 3) * 24 * 60 * 60 * 1000).toISOString()
      };
    });

  // 过滤紧急
  const filtered = urgent 
    ? suggestions.filter((s: any) => s.urgency === 'critical' || s.urgency === 'high')
    : suggestions;

  // 排序
  filtered.sort((a: any, b: any) => {
    const urgencyOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return urgencyOrder[a.urgency as string] - urgencyOrder[b.urgency as string];
  });

  return {
    suggestions: filtered,
    summary: {
      total: filtered.length,
      critical: filtered.filter((s: any) => s.urgency === 'critical').length,
      high: filtered.filter((s: any) => s.urgency === 'high').length,
      totalCost: filtered.reduce((sum: number, s: any) => sum + s.estimatedCost, 0)
    }
  };
}
