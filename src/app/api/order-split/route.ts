import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 订单拆分/合并API
 * 
 * 实战刚需功能：
 * • 子订单管理（分车间/分批生产）
 * • 合单生产
 * • 分批出货
 * • 进度汇总
 */

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';

    switch (action) {
      case 'list':
        return await getSubOrders(client, searchParams);
      case 'detail':
        return await getSubOrderDetail(client, searchParams.get('id'));
      case 'merge-candidates':
        return await getMergeCandidates(client, searchParams);
      case 'shipment-schedule':
        return await getShipmentSchedule(client, searchParams);
      case 'progress-summary':
        return await getProgressSummary(client, searchParams);
      case 'split-history':
        return await getSplitHistory(client, searchParams);
      default:
        return await getSubOrders(client, searchParams);
    }
  } catch (error) {
    console.error('Order split error:', error);
    return NextResponse.json({ success: false, error: '获取订单数据失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();

    const { action, data } = body;

    switch (action) {
      case 'split':
        return await splitOrder(client, data);
      case 'merge':
        return await mergeOrders(client, data);
      case 'update-sub':
        return await updateSubOrder(client, data);
      case 'create-shipment':
        return await createShipment(client, data);
      case 'complete-shipment':
        return await completeShipment(client, data);
      case 'cancel-split':
        return await cancelSplit(client, data);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Order split operation error:', error);
    return NextResponse.json({ success: false, error: '订单操作失败' }, { status: 500 });
  }
}

/**
 * 获取子订单列表
 */
async function getSubOrders(client: any, searchParams: URLSearchParams) {
  const parentOrderId = searchParams.get('parent_order_id');
  const status = searchParams.get('status') || 'all';
  const lineId = searchParams.get('line_id');

  let query = client
    .from('sub_orders')
    .select(`
      id,
      sub_order_no,
      parent_order_id,
      quantity,
      completed_quantity,
      progress,
      status,
      production_line_id,
      planned_start_date,
      planned_end_date,
      actual_start_date,
      actual_end_date,
      created_at,
      production_orders (
        id,
        order_code,
        total_quantity,
        delivery_date,
        customers (name),
        styles (style_no, style_name)
      ),
      production_lines (
        id,
        name
      )
    `)
    .order('created_at', { ascending: false });

  if (parentOrderId) {
    query = query.eq('parent_order_id', parentOrderId);
  }

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  if (lineId) {
    query = query.eq('production_line_id', lineId);
  }

  const { data: subOrders, error } = await query;

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: subOrders
  });
}

/**
 * 拆分订单
 */
async function splitOrder(client: any, data: any) {
  const {
    parentOrderId,
    splitType, // 'by_line' | 'by_batch' | 'by_quantity'
    splitConfig,
    createdBy
  } = data;

  // 获取原订单
  const { data: parentOrder } = await client
    .from('production_orders')
    .select('*')
    .eq('id', parentOrderId)
    .single();

  if (!parentOrder) {
    return NextResponse.json({ 
      success: false, 
      error: '订单不存在' 
    }, { status: 404 });
  }

  // 生成子订单编号前缀
  const prefix = `${parentOrder.order_code}-S`;

  const subOrders: any[] = [];

  if (splitType === 'by_line') {
    // 按产线拆分
    for (const config of splitConfig) {
      const subOrderNo = `${prefix}${String(subOrders.length + 1).padStart(2, '0')}`;
      
      subOrders.push({
        sub_order_no: subOrderNo,
        parent_order_id: parentOrderId,
        production_line_id: config.lineId,
        quantity: config.quantity,
        completed_quantity: 0,
        progress: 0,
        status: 'pending',
        planned_start_date: config.startDate,
        planned_end_date: config.endDate,
        created_by: createdBy
      });
    }
  } else if (splitType === 'by_batch') {
    // 按批次拆分
    for (let i = 0; i < splitConfig.length; i++) {
      const config = splitConfig[i];
      const subOrderNo = `${prefix}${String(i + 1).padStart(2, '0')}`;
      
      subOrders.push({
        sub_order_no: subOrderNo,
        parent_order_id: parentOrderId,
        quantity: config.quantity,
        completed_quantity: 0,
        progress: 0,
        status: 'pending',
        planned_start_date: config.startDate,
        planned_end_date: config.endDate,
        shipment_batch: config.batchNo || i + 1,
        created_by: createdBy
      });
    }
  } else if (splitType === 'by_quantity') {
    // 按数量均匀拆分
    const quantityPerBatch = splitConfig.quantityPerBatch;
    const totalBatches = Math.ceil(parentOrder.total_quantity / quantityPerBatch);
    
    for (let i = 0; i < totalBatches; i++) {
      const qty = i === totalBatches - 1 
        ? parentOrder.total_quantity - (i * quantityPerBatch)
        : quantityPerBatch;
      
      const subOrderNo = `${prefix}${String(i + 1).padStart(2, '0')}`;
      
      subOrders.push({
        sub_order_no: subOrderNo,
        parent_order_id: parentOrderId,
        quantity: qty,
        completed_quantity: 0,
        progress: 0,
        status: 'pending',
        shipment_batch: i + 1,
        created_by: createdBy
      });
    }
  }

  // 插入子订单
  const { data: createdSubOrders, error } = await client
    .from('sub_orders')
    .insert(subOrders)
    .select();

  if (error) throw error;

  // 更新原订单状态
  await client
    .from('production_orders')
    .update({
      is_split: true,
      split_count: subOrders.length,
      split_at: new Date().toISOString()
    })
    .eq('id', parentOrderId);

  // 记录拆分历史
  await client
    .from('order_split_history')
    .insert({
      parent_order_id: parentOrderId,
      split_type: splitType,
      split_count: subOrders.length,
      split_by: createdBy,
      split_at: new Date().toISOString(),
      details: { config: splitConfig }
    });

  return NextResponse.json({
    success: true,
    data: createdSubOrders,
    message: `订单已拆分为 ${subOrders.length} 个子订单`
  });
}

/**
 * 合并订单
 */
async function mergeOrders(client: any, data: any) {
  const {
    orderIds,
    mergeType, // 'production' | 'shipment'
    mergedBy
  } = data;

  if (orderIds.length < 2) {
    return NextResponse.json({ 
      success: false, 
      error: '需要至少2个订单进行合并' 
    }, { status: 400 });
  }

  // 获取订单详情
  const { data: orders } = await client
    .from('production_orders')
    .select(`
      id,
      order_code,
      total_quantity,
      style_id,
      customer_id,
      styles (id, style_no)
    `)
    .in('id', orderIds);

  if (!orders || orders.length < 2) {
    return NextResponse.json({ 
      success: false, 
      error: '订单不存在' 
    }, { status: 400 });
  }

  // 验证是否可以合并（相同款式）
  const styleIds = [...new Set(orders.map((o: any) => o.style_id))];
  if (styleIds.length > 1) {
    return NextResponse.json({ 
      success: false, 
      error: '不同款式的订单不能合并生产' 
    }, { status: 400 });
  }

  // 创建合并组
  const mergeNo = `MG${Date.now().toString(36).toUpperCase()}`;
  
  const { data: mergeGroup, error } = await client
    .from('order_merge_groups')
    .insert({
      merge_no: mergeNo,
      merge_type: mergeType,
      total_orders: orderIds.length,
      total_quantity: orders.reduce((sum: number, o: any) => sum + o.total_quantity, 0),
      status: 'active',
      created_by: mergedBy,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  // 关联订单到合并组
  await client
    .from('order_merge_items')
    .insert(orderIds.map((orderId: string) => ({
      merge_group_id: mergeGroup.id,
      order_id: orderId
    })));

  // 更新订单状态
  await client
    .from('production_orders')
    .update({
      is_merged: true,
      merge_group_id: mergeGroup.id
    })
    .in('id', orderIds);

  return NextResponse.json({
    success: true,
    data: {
      mergeGroup,
      mergedOrders: orders
    },
    message: `${orders.length} 个订单已合并`
  });
}

/**
 * 获取可合并订单
 */
async function getMergeCandidates(client: any, searchParams: URLSearchParams) {
  const styleId = searchParams.get('style_id');
  const customerId = searchParams.get('customer_id');

  // 查找相同款式、未合并、未完成的订单
  let query = client
    .from('production_orders')
    .select(`
      id,
      order_code,
      total_quantity,
      delivery_date,
      status,
      is_merged,
      customers (id, name),
      styles (id, style_no, style_name)
    `)
    .eq('is_merged', false)
    .in('status', ['confirmed', 'scheduled', 'in_production']);

  if (styleId) {
    query = query.eq('style_id', styleId);
  }

  if (customerId) {
    query = query.eq('customer_id', customerId);
  }

  const { data: orders, error } = await query;

  if (error) throw error;

  // 按款式分组
  const grouped: Record<string, any[]> = {};
  orders?.forEach((order: any) => {
    const key = order.styles?.id || 'unknown';
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(order);
  });

  // 只返回有多个订单的组（可合并）
  const candidates = Object.entries(grouped)
    .filter(([_, orders]) => orders.length >= 2)
    .map(([styleId, orders]) => ({
      styleId,
      styleNo: orders[0]?.styles?.style_no,
      styleName: orders[0]?.styles?.style_name,
      orders,
      totalQuantity: orders.reduce((sum, o) => sum + o.total_quantity, 0)
    }));

  return NextResponse.json({
    success: true,
    data: candidates
  });
}

/**
 * 创建出货
 */
async function createShipment(client: any, data: any) {
  const {
    orderId,
    subOrderId,
    shipmentNo,
    quantity,
    cartons,
    plannedDate,
    carrier,
    trackingNo,
    notes,
    createdBy
  } = data;

  const { data: shipment, error } = await client
    .from('shipments')
    .insert({
      shipment_no: shipmentNo || `SH${Date.now().toString(36).toUpperCase()}`,
      order_id: orderId,
      sub_order_id: subOrderId,
      quantity,
      cartons,
      planned_date: plannedDate,
      carrier,
      tracking_no: trackingNo,
      status: 'pending',
      notes,
      created_by: createdBy,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: shipment,
    message: '出货计划已创建'
  });
}

/**
 * 完成出货
 */
async function completeShipment(client: any, data: any) {
  const { shipmentId, actualQuantity, actualCartons, shippedBy, notes } = data;

  const { data: shipment, error } = await client
    .from('shipments')
    .update({
      status: 'shipped',
      actual_quantity: actualQuantity,
      actual_cartons: actualCartons,
      shipped_at: new Date().toISOString(),
      shipped_by: shippedBy,
      notes
    })
    .eq('id', shipmentId)
    .select()
    .single();

  if (error) throw error;

  // 更新订单出货进度
  if (shipment.order_id) {
    const { data: totalShipped } = await client
      .from('shipments')
      .select('actual_quantity')
      .eq('order_id', shipment.order_id)
      .eq('status', 'shipped');

    const shippedQty = totalShipped?.reduce((sum: number, s: any) => sum + (s.actual_quantity || 0), 0) || 0;

    await client
      .from('production_orders')
      .update({
        shipped_quantity: shippedQty,
        shipment_status: shippedQty > 0 ? 'partial' : 'none'
      })
      .eq('id', shipment.order_id);
  }

  return NextResponse.json({
    success: true,
    data: shipment,
    message: '出货已完成'
  });
}

/**
 * 出货计划
 */
async function getShipmentSchedule(client: any, searchParams: URLSearchParams) {
  const orderId = searchParams.get('order_id');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  let query = client
    .from('shipments')
    .select(`
      id,
      shipment_no,
      quantity,
      actual_quantity,
      cartons,
      planned_date,
      shipped_at,
      status,
      carrier,
      tracking_no,
      production_orders (
        order_code,
        customers (name),
        styles (style_no, style_name)
      )
    `)
    .order('planned_date', { ascending: true });

  if (orderId) {
    query = query.eq('order_id', orderId);
  }

  if (startDate) {
    query = query.gte('planned_date', startDate);
  }

  if (endDate) {
    query = query.lte('planned_date', endDate);
  }

  const { data: shipments, error } = await query;

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: shipments
  });
}

/**
 * 进度汇总
 */
async function getProgressSummary(client: any, searchParams: URLSearchParams) {
  const parentOrderId = searchParams.get('parent_order_id');

  if (!parentOrderId) {
    return NextResponse.json({ 
      success: false, 
      error: '需要父订单ID' 
    }, { status: 400 });
  }

  // 获取父订单
  const { data: parentOrder } = await client
    .from('production_orders')
    .select('*')
    .eq('id', parentOrderId)
    .single();

  // 获取子订单
  const { data: subOrders } = await client
    .from('sub_orders')
    .select(`
      id,
      sub_order_no,
      quantity,
      completed_quantity,
      progress,
      status,
      production_lines (name)
    `)
    .eq('parent_order_id', parentOrderId);

  // 汇总
  const totalQuantity = subOrders?.reduce((sum: number, s: any) => sum + s.quantity, 0) || 0;
  const totalCompleted = subOrders?.reduce((sum: number, s: any) => sum + s.completed_quantity, 0) || 0;
  const overallProgress = totalQuantity > 0 ? Math.round(totalCompleted / totalQuantity * 100) : 0;

  // 各状态统计
  const statusCount = {
    pending: subOrders?.filter((s: any) => s.status === 'pending').length || 0,
    inProduction: subOrders?.filter((s: any) => s.status === 'in_production').length || 0,
    completed: subOrders?.filter((s: any) => s.status === 'completed').length || 0
  };

  // 各产线进度
  const byLine: Record<string, { quantity: number; completed: number }> = {};
  subOrders?.forEach((s: any) => {
    const lineName = s.production_lines?.name || '未分配';
    if (!byLine[lineName]) {
      byLine[lineName] = { quantity: 0, completed: 0 };
    }
    byLine[lineName].quantity += s.quantity;
    byLine[lineName].completed += s.completed_quantity;
  });

  return NextResponse.json({
    success: true,
    data: {
      parentOrder,
      subOrders,
      summary: {
        totalSubOrders: subOrders?.length || 0,
        totalQuantity,
        totalCompleted,
        overallProgress,
        statusCount,
        byLine: Object.entries(byLine).map(([line, data]) => ({
          line,
          ...data,
          progress: data.quantity > 0 ? Math.round(data.completed / data.quantity * 100) : 0
        }))
      }
    }
  });
}

/**
 * 取消拆分
 */
async function cancelSplit(client: any, data: any) {
  const { parentOrderId, cancelledBy, reason } = data;

  // 检查子订单状态
  const { data: subOrders } = await client
    .from('sub_orders')
    .select('id, status')
    .eq('parent_order_id', parentOrderId);

  const hasStarted = subOrders?.some((s: any) => s.status === 'in_production' || s.status === 'completed');

  if (hasStarted) {
    return NextResponse.json({ 
      success: false, 
      error: '已有子订单开始生产，无法取消拆分' 
    }, { status: 400 });
  }

  // 删除子订单
  await client
    .from('sub_orders')
    .delete()
    .eq('parent_order_id', parentOrderId);

  // 更新父订单
  await client
    .from('production_orders')
    .update({
      is_split: false,
      split_count: 0,
      split_at: null
    })
    .eq('id', parentOrderId);

  // 记录
  await client
    .from('order_split_history')
    .insert({
      parent_order_id: parentOrderId,
      action: 'cancel',
      cancelled_by: cancelledBy,
      cancelled_at: new Date().toISOString(),
      reason
    });

  return NextResponse.json({
    success: true,
    message: '拆分已取消'
  });
}

async function getSubOrderDetail(client: any, subOrderId: string | null) {
  if (!subOrderId) {
    return NextResponse.json({ 
      success: false, 
      error: '缺少子订单ID' 
    }, { status: 400 });
  }

  const { data: subOrder, error } = await client
    .from('sub_orders')
    .select(`
      *,
      production_orders (*),
      production_lines (*)
    `)
    .eq('id', subOrderId)
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: subOrder
  });
}

async function updateSubOrder(client: any, data: any) {
  const { subOrderId, updates } = data;

  const { data: subOrder, error } = await client
    .from('sub_orders')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', subOrderId)
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: subOrder
  });
}

async function getSplitHistory(client: any, searchParams: URLSearchParams) {
  const parentOrderId = searchParams.get('parent_order_id');

  let query = client
    .from('order_split_history')
    .select(`
      *,
      production_orders (order_code)
    `)
    .order('split_at', { ascending: false });

  if (parentOrderId) {
    query = query.eq('parent_order_id', parentOrderId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return NextResponse.json({ success: true, data });
}
