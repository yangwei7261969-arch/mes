import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 齐套管理系统API
 * 
 * 核心功能：
 * • 生产前物料齐套检查
 * • 面料/辅料/包材库存核对
 * • 缺料清单自动生成
 * • 未齐套禁止开工
 * • 缺料预警与采购联动
 */

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'check';

    switch (action) {
      case 'check':
        return await checkCompleteSet(client, searchParams);
      case 'batch-check':
        return await batchCheckCompleteSet(client, searchParams);
      case 'shortage-list':
        return await getShortageList(client, searchParams);
      case 'material-status':
        return await getMaterialStatus(client, searchParams);
      case 'history':
        return await getCheckHistory(client, searchParams);
      case 'dashboard':
        return await getDashboard(client);
      default:
        return await checkCompleteSet(client, searchParams);
    }
  } catch (error) {
    console.error('Complete set check error:', error);
    return NextResponse.json({ success: false, error: '齐套检查失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();

    const { action, data } = body;

    switch (action) {
      case 'confirm':
        return await confirmCompleteSet(client, data);
      case 'override':
        return await overrideCompleteSet(client, data);
      case 'update-stock':
        return await updateMaterialStock(client, data);
      case 'request-purchase':
        return await requestPurchase(client, data);
      case 'reserve':
        return await reserveMaterials(client, data);
      case 'release-reserve':
        return await releaseReserve(client, data);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Complete set operation error:', error);
    return NextResponse.json({ success: false, error: '齐套操作失败' }, { status: 500 });
  }
}

/**
 * 齐套检查（核心）
 */
async function checkCompleteSet(client: any, searchParams: URLSearchParams) {
  const orderId = searchParams.get('order_id');

  if (!orderId) {
    return NextResponse.json({ 
      success: false, 
      error: '缺少订单ID' 
    }, { status: 400 });
  }

  // 获取订单BOM
  const { data: orderBom } = await client
    .from('order_bom')
    .select(`
      id,
      material_id,
      material_name,
      material_type,
      color,
      required_quantity,
      unit,
      wastage_rate,
      materials (
        id,
        material_code,
        current_stock,
        reserved_stock,
        available_stock,
        unit,
        safety_stock
      )
    `)
    .eq('order_id', orderId);

  if (!orderBom || orderBom.length === 0) {
    return NextResponse.json({ 
      success: false, 
      error: '该订单没有BOM数据' 
    }, { status: 400 });
  }

  // 检查每项物料
  const checkResults = orderBom.map((item: any) => {
    const material = item.materials;
    const requiredQty = item.required_quantity * (1 + (item.wastage_rate || 0) / 100);
    const availableQty = material?.available_stock || 0;
    const shortageQty = Math.max(0, requiredQty - availableQty);
    const isSufficient = shortageQty === 0;
    const isNearShortage = !isSufficient && availableQty > requiredQty * 0.5;

    return {
      materialId: item.material_id,
      materialCode: material?.material_code,
      materialName: item.material_name,
      materialType: item.material_type,
      color: item.color,
      requiredQuantity: requiredQty,
      currentStock: material?.current_stock || 0,
      reservedStock: material?.reserved_stock || 0,
      availableStock: availableQty,
      shortageQuantity: shortageQty,
      unit: item.unit,
      isSufficient,
      status: isSufficient ? 'sufficient' : (isNearShortage ? 'near_shortage' : 'shortage'),
      safetyStock: material?.safety_stock || 0
    };
  });

  // 按类型分组
  const grouped = {
    fabric: checkResults.filter((item: any) => item.materialType === 'fabric'),
    lining: checkResults.filter((item: any) => item.materialType === 'lining'),
    accessory: checkResults.filter((item: any) => item.materialType === 'accessory'),
    thread: checkResults.filter((item: any) => item.materialType === 'thread'),
    label: checkResults.filter((item: any) => item.materialType === 'label'),
    packaging: checkResults.filter((item: any) => item.materialType === 'packaging')
  };

  // 计算总体状态
  const totalItems = checkResults.length;
  const sufficientItems = checkResults.filter((item: any) => item.isSufficient).length;
  const shortageItems = totalItems - sufficientItems;

  const isComplete = shortageItems === 0;
  const completionRate = totalItems > 0 ? Math.round(sufficientItems / totalItems * 100) : 0;

  // 生成缺料清单
  const shortageList = checkResults
    .filter((item: any) => !item.isSufficient)
    .map((item: any) => ({
      materialId: item.materialId,
      materialCode: item.materialCode,
      materialName: item.materialName,
      materialType: item.materialType,
      shortageQuantity: item.shortageQuantity,
      unit: item.unit,
      currentStock: item.currentStock,
      requiredQuantity: item.requiredQuantity
    }));

  // 检查是否可以开工
  const canStart = isComplete;
  const blockReason = !canStart ? `缺少 ${shortageItems} 种物料` : null;

  // 记录检查结果
  await client
    .from('complete_set_checks')
    .insert({
      order_id: orderId,
      check_time: new Date().toISOString(),
      total_items: totalItems,
      sufficient_items: sufficientItems,
      shortage_items: shortageItems,
      completion_rate: completionRate,
      is_complete: isComplete,
      check_details: checkResults,
      shortage_list: shortageList
    });

  return NextResponse.json({
    success: true,
    data: {
      orderId,
      isComplete,
      canStart,
      blockReason,
      completionRate,
      summary: {
        totalItems,
        sufficientItems,
        shortageItems
      },
      grouped,
      checkResults,
      shortageList
    }
  });
}

/**
 * 批量齐套检查
 */
async function batchCheckCompleteSet(client: any, searchParams: URLSearchParams) {
  const orderIds = searchParams.get('order_ids')?.split(',') || [];

  if (orderIds.length === 0) {
    return NextResponse.json({ 
      success: false, 
      error: '缺少订单ID' 
    }, { status: 400 });
  }

  const results = await Promise.all(
    orderIds.map(async (orderId) => {
      // 获取订单BOM
      const { data: orderBom } = await client
        .from('order_bom')
        .select(`
          material_id,
          required_quantity,
          wastage_rate,
          materials (available_stock)
        `)
        .eq('order_id', orderId);

      let sufficientItems = 0;
      let shortageItems = 0;

      orderBom?.forEach((item: any) => {
        const requiredQty = item.required_quantity * (1 + (item.wastage_rate || 0) / 100);
        const availableQty = item.materials?.available_stock || 0;
        if (availableQty >= requiredQty) {
          sufficientItems++;
        } else {
          shortageItems++;
        }
      });

      const isComplete = shortageItems === 0;

      return {
        orderId,
        isComplete,
        totalItems: orderBom?.length || 0,
        sufficientItems,
        shortageItems,
        completionRate: orderBom && orderBom.length > 0 
          ? Math.round(sufficientItems / orderBom.length * 100) 
          : 0
      };
    })
  );

  const summary = {
    total: results.length,
    complete: results.filter(r => r.isComplete).length,
    incomplete: results.filter(r => !r.isComplete).length
  };

  return NextResponse.json({
    success: true,
    data: {
      results,
      summary
    }
  });
}

/**
 * 获取缺料清单
 */
async function getShortageList(client: any, searchParams: URLSearchParams) {
  const status = searchParams.get('status') || 'all';
  const materialType = searchParams.get('material_type');

  // 获取所有未齐套订单的缺料
  let query = client
    .from('complete_set_checks')
    .select(`
      id,
      order_id,
      check_time,
      shortage_items,
      shortage_list,
      production_orders (
        id,
        order_code,
        delivery_date,
        status,
        customers (name)
      )
    `)
    .eq('is_complete', false)
    .order('check_time', { ascending: false });

  if (status !== 'all') {
    query = query.eq('production_orders.status', status);
  }

  const { data: checks, error } = await query;

  if (error) throw error;

  // 汇总所有缺料
  const shortageSummary: Record<string, {
    materialId: string;
    materialCode: string;
    materialName: string;
    materialType: string;
    totalShortage: number;
    unit: string;
    orders: any[];
  }> = {};

  checks?.forEach((check: any) => {
    check.shortage_list?.forEach((item: any) => {
      const key = item.materialId || item.materialCode;
      if (!shortageSummary[key]) {
        shortageSummary[key] = {
          materialId: item.materialId,
          materialCode: item.materialCode,
          materialName: item.materialName,
          materialType: item.materialType,
          totalShortage: 0,
          unit: item.unit,
          orders: []
        };
      }
      shortageSummary[key].totalShortage += item.shortageQuantity;
      shortageSummary[key].orders.push({
        orderId: check.order_id,
        orderCode: check.production_orders?.order_code,
        customer: check.production_orders?.customers?.name,
        shortageQty: item.shortageQuantity,
        deliveryDate: check.production_orders?.delivery_date
      });
    });
  });

  // 按类型过滤
  let result = Object.values(shortageSummary);
  if (materialType && materialType !== 'all') {
    result = result.filter(item => item.materialType === materialType);
  }

  // 按缺料数量排序
  result.sort((a, b) => b.totalShortage - a.totalShortage);

  // 检查采购状态
  const materialIds = result.map(item => item.materialId).filter(Boolean);
  
  if (materialIds.length > 0) {
    const { data: purchaseOrders } = await client
      .from('purchase_orders')
      .select(`
        id,
        material_id,
        quantity,
        expected_arrival,
        status
      `)
      .in('material_id', materialIds)
      .in('status', ['pending', 'confirmed', 'in_transit']);

    const purchaseMap = new Map();
    purchaseOrders?.forEach((po: any) => {
      if (!purchaseMap.has(po.material_id)) {
        purchaseMap.set(po.material_id, []);
      }
      purchaseMap.get(po.material_id).push(po);
    });

    result.forEach((item: any) => {
      if (item.materialId) {
        item.purchaseOrders = purchaseMap.get(item.materialId) || [];
      }
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      shortageList: result,
      affectedOrders: checks?.length || 0,
      summary: {
        totalMaterials: result.length,
        byType: {
          fabric: result.filter(i => i.materialType === 'fabric').length,
          lining: result.filter(i => i.materialType === 'lining').length,
          accessory: result.filter(i => i.materialType === 'accessory').length,
          packaging: result.filter(i => i.materialType === 'packaging').length
        }
      }
    }
  });
}

/**
 * 获取物料状态
 */
async function getMaterialStatus(client: any, searchParams: URLSearchParams) {
  const materialId = searchParams.get('material_id');

  if (!materialId) {
    return NextResponse.json({ 
      success: false, 
      error: '缺少物料ID' 
    }, { status: 400 });
  }

  // 获取物料基本信息
  const { data: material } = await client
    .from('materials')
    .select(`
      *,
      suppliers (name)
    `)
    .eq('id', materialId)
    .single();

  // 获取使用该物料的订单
  const { data: usageOrders } = await client
    .from('order_bom')
    .select(`
      required_quantity,
      wastage_rate,
      production_orders (
        id,
        order_code,
        status,
        delivery_date,
        customers (name)
      )
    `)
    .eq('material_id', materialId);

  // 计算需求
  const totalRequired = usageOrders?.reduce((sum: number, item: any) => {
    return sum + item.required_quantity * (1 + (item.wastage_rate || 0) / 100);
  }, 0) || 0;

  // 获取采购在途
  const { data: inTransit } = await client
    .from('purchase_orders')
    .select('quantity, expected_arrival, status')
    .eq('material_id', materialId)
    .in('status', ['confirmed', 'in_transit']);

  const inTransitTotal = inTransit?.reduce((sum: number, po: any) => sum + po.quantity, 0) || 0;

  // 获取预留记录
  const { data: reserves } = await client
    .from('material_reserves')
    .select(`
      quantity,
      reserved_at,
      production_orders (order_code)
    `)
    .eq('material_id', materialId)
    .eq('status', 'active');

  const reservedTotal = reserves?.reduce((sum: number, r: any) => sum + r.quantity, 0) || 0;

  // 计算可用量
  const availableStock = material?.current_stock || 0;
  const netAvailable = availableStock - reservedTotal;
  const shortage = Math.max(0, totalRequired - netAvailable - inTransitTotal);

  return NextResponse.json({
    success: true,
    data: {
      material,
      stock: {
        current: availableStock,
        reserved: reservedTotal,
        available: netAvailable,
        inTransit: inTransitTotal
      },
      demand: {
        totalRequired,
        orders: usageOrders?.map((item: any) => ({
          orderId: item.production_orders?.id,
          orderCode: item.production_orders?.order_code,
          customer: item.production_orders?.customers?.name,
          required: item.required_quantity * (1 + (item.wastage_rate || 0) / 100),
          status: item.production_orders?.status,
          deliveryDate: item.production_orders?.delivery_date
        }))
      },
      analysis: {
        shortage,
        isSufficient: shortage === 0,
        daysOfSupply: netAvailable > 0 && totalRequired > 0 
          ? Math.floor(netAvailable / (totalRequired / 30)) 
          : 0
      },
      reserves,
      purchaseOrders: inTransit
    }
  });
}

/**
 * 确认齐套
 */
async function confirmCompleteSet(client: any, data: any) {
  const { orderId, confirmedBy, notes } = data;

  // 获取最新检查结果
  const { data: latestCheck } = await client
    .from('complete_set_checks')
    .select('*')
    .eq('order_id', orderId)
    .order('check_time', { ascending: false })
    .limit(1)
    .single();

  if (!latestCheck) {
    return NextResponse.json({ 
      success: false, 
      error: '请先进行齐套检查' 
    }, { status: 400 });
  }

  if (!latestCheck.is_complete) {
    return NextResponse.json({ 
      success: false, 
      error: '物料不齐，无法确认' 
    }, { status: 400 });
  }

  // 更新订单状态
  await client
    .from('production_orders')
    .update({
      complete_set_status: 'confirmed',
      complete_set_confirmed_at: new Date().toISOString(),
      complete_set_confirmed_by: confirmedBy
    })
    .eq('id', orderId);

  // 预留物料
  const { data: orderBom } = await client
    .from('order_bom')
    .select('material_id, required_quantity, wastage_rate')
    .eq('order_id', orderId);

  if (orderBom && orderBom.length > 0) {
    await client
      .from('material_reserves')
      .insert(orderBom.map((item: any) => ({
        order_id: orderId,
        material_id: item.material_id,
        quantity: item.required_quantity * (1 + (item.wastage_rate || 0) / 100),
        reserved_at: new Date().toISOString(),
        reserved_by: confirmedBy,
        status: 'active'
      })));

    // 更新物料库存
    for (const item of orderBom) {
      await client.rpc('update_material_reserve', {
        p_material_id: item.material_id,
        p_quantity: item.required_quantity * (1 + (item.wastage_rate || 0) / 100)
      });
    }
  }

  // 记录日志
  await client
    .from('complete_set_confirmations')
    .insert({
      order_id: orderId,
      check_id: latestCheck.id,
      confirmed_by: confirmedBy,
      confirmed_at: new Date().toISOString(),
      notes
    });

  return NextResponse.json({
    success: true,
    message: '齐套已确认，可以开工'
  });
}

/**
 * 强制放行（管理员权限）
 */
async function overrideCompleteSet(client: any, data: any) {
  const { orderId, overrideBy, reason, notes } = data;

  // 更新订单状态
  await client
    .from('production_orders')
    .update({
      complete_set_status: 'overridden',
      complete_set_overridden_at: new Date().toISOString(),
      complete_set_overridden_by: overrideBy,
      complete_set_override_reason: reason
    })
    .eq('id', orderId);

  // 记录日志
  await client
    .from('complete_set_overrides')
    .insert({
      order_id: orderId,
      overridden_by: overrideBy,
      reason,
      notes,
      overridden_at: new Date().toISOString()
    });

  return NextResponse.json({
    success: true,
    message: '已强制放行'
  });
}

/**
 * 更新物料库存
 */
async function updateMaterialStock(client: any, data: any) {
  const { materialId, quantity, operation, updatedBy, notes } = data;

  // 获取当前库存
  const { data: material } = await client
    .from('materials')
    .select('current_stock')
    .eq('id', materialId)
    .single();

  if (!material) {
    return NextResponse.json({ 
      success: false, 
      error: '物料不存在' 
    }, { status: 404 });
  }

  let newStock = material.current_stock;
  if (operation === 'add') {
    newStock += quantity;
  } else if (operation === 'subtract') {
    newStock = Math.max(0, newStock - quantity);
  } else if (operation === 'set') {
    newStock = quantity;
  }

  // 更新库存
  await client
    .from('materials')
    .update({
      current_stock: newStock,
      updated_at: new Date().toISOString()
    })
    .eq('id', materialId);

  // 记录库存变动
  await client
    .from('material_stock_logs')
    .insert({
      material_id: materialId,
      operation,
      quantity,
      previous_stock: material.current_stock,
      new_stock: newStock,
      updated_by: updatedBy,
      notes
    });

  return NextResponse.json({
    success: true,
    data: {
      previousStock: material.current_stock,
      newStock
    }
  });
}

/**
 * 申请采购
 */
async function requestPurchase(client: any, data: any) {
  const { materialId, quantity, urgency, requiredDate, orderId, requestedBy, notes } = data;

  // 创建采购申请
  const { data: purchaseRequest, error } = await client
    .from('purchase_requests')
    .insert({
      material_id: materialId,
      quantity,
      urgency,
      required_date: requiredDate,
      order_id: orderId,
      requested_by: requestedBy,
      status: 'pending',
      notes
    })
    .select()
    .single();

  if (error) throw error;

  // 如果紧急，发送通知
  if (urgency === 'urgent' || urgency === 'critical') {
    await client
      .from('notifications')
      .insert({
        type: 'purchase_request',
        title: `紧急采购申请: ${materialId}`,
        content: `需要 ${quantity}，要求日期 ${requiredDate}`,
        priority: urgency === 'critical' ? 'high' : 'medium',
        reference_id: purchaseRequest.id
      });
  }

  return NextResponse.json({
    success: true,
    data: purchaseRequest,
    message: '采购申请已提交'
  });
}

/**
 * 预留物料
 */
async function reserveMaterials(client: any, data: any) {
  const { orderId, items, reservedBy } = data;

  const reserves = items.map((item: any) => ({
    order_id: orderId,
    material_id: item.materialId,
    quantity: item.quantity,
    reserved_at: new Date().toISOString(),
    reserved_by: reservedBy,
    status: 'active'
  }));

  const { error } = await client
    .from('material_reserves')
    .insert(reserves);

  if (error) throw error;

  return NextResponse.json({
    success: true,
    message: '物料已预留'
  });
}

/**
 * 释放预留
 */
async function releaseReserve(client: any, data: any) {
  const { orderId, releasedBy, reason } = data;

  // 获取预留记录
  const { data: reserves } = await client
    .from('material_reserves')
    .select('*')
    .eq('order_id', orderId)
    .eq('status', 'active');

  if (reserves && reserves.length > 0) {
    // 更新预留状态
    await client
      .from('material_reserves')
      .update({
        status: 'released',
        released_at: new Date().toISOString(),
        released_by: releasedBy,
        release_reason: reason
      })
      .eq('order_id', orderId)
      .eq('status', 'active');

    // 恢复物料可用库存
    for (const reserve of reserves) {
      await client.rpc('release_material_reserve', {
        p_material_id: reserve.material_id,
        p_quantity: reserve.quantity
      });
    }
  }

  return NextResponse.json({
    success: true,
    message: '预留已释放'
  });
}

/**
 * 获取检查历史
 */
async function getCheckHistory(client: any, searchParams: URLSearchParams) {
  const orderId = searchParams.get('order_id');
  const limit = parseInt(searchParams.get('limit') || '10');

  let query = client
    .from('complete_set_checks')
    .select(`
      *,
      production_orders (
        order_code,
        customers (name)
      )
    `)
    .order('check_time', { ascending: false })
    .limit(limit);

  if (orderId) {
    query = query.eq('order_id', orderId);
  }

  const { data: history, error } = await query;

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: history
  });
}

/**
 * 获取仪表盘数据
 */
async function getDashboard(client: any) {
  const today = new Date().toISOString().split('T')[0];

  // 统计齐套状态
  const { data: orderStatus } = await client
    .from('production_orders')
    .select('complete_set_status')
    .in('status', ['confirmed', 'in_production']);

  const statusCounts = {
    pending: 0,
    checking: 0,
    confirmed: 0,
    overridden: 0,
    incomplete: 0
  };

  orderStatus?.forEach((order: any) => {
    const status = order.complete_set_status || 'pending';
    if (status in statusCounts) {
      statusCounts[status as keyof typeof statusCounts]++;
    }
  });

  // 今日检查次数
  const { count: todayChecks } = await client
    .from('complete_set_checks')
    .select('*', { count: 'exact', head: true })
    .gte('check_time', `${today}T00:00:00Z`);

  // 今日确认次数
  const { count: todayConfirmations } = await client
    .from('complete_set_confirmations')
    .select('*', { count: 'exact', head: true })
    .gte('confirmed_at', `${today}T00:00:00Z`);

  // 缺料预警（库存低于安全库存）
  const { data: lowStockMaterials } = await client
    .from('materials')
    .select('id, material_code, material_name, current_stock, safety_stock')
    .lt('current_stock', client.raw('safety_stock'));

  // 即将到期但未齐套的订单
  const threeDaysLater = new Date();
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);

  const { data: urgentOrders } = await client
    .from('production_orders')
    .select(`
      id,
      order_code,
      delivery_date,
      complete_set_status,
      customers (name)
    `)
    .lte('delivery_date', threeDaysLater.toISOString().split('T')[0])
    .neq('complete_set_status', 'confirmed')
    .in('status', ['confirmed', 'in_production']);

  return NextResponse.json({
    success: true,
    data: {
      statusCounts,
      todayChecks: todayChecks || 0,
      todayConfirmations: todayConfirmations || 0,
      lowStockCount: lowStockMaterials?.length || 0,
      lowStockMaterials: lowStockMaterials?.slice(0, 10),
      urgentOrders: urgentOrders?.slice(0, 10)
    }
  });
}
