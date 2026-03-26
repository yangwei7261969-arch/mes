import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 订单生产进度计算API
 * 
 * 自动计算订单的生产进度，基于：
 * 1. 裁床完成数量
 * 2. 工票完成数量
 * 3. 质检通过数量
 * 
 * 进度计算规则：
 * - 裁床完成: 20%
 * - 生产完成: 70%
 * - 质检完成: 10%
 */

const client = getSupabaseClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const progress = await calculateOrderProgress(id);
    
    return NextResponse.json({
      success: true,
      data: progress,
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const progress = await calculateOrderProgress(id);
    
    // 更新订单进度
    await client
      .from('production_orders')
      .update({ 
        progress: progress.overallProgress,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // 检查是否需要自动流转状态
    const { data: order } = await client
      .from('production_orders')
      .select('status, progress')
      .eq('id', id)
      .single();

    if (order) {
      // 进度>=90%，自动转入质检
      if (progress.overallProgress >= 90 && order.status === 'in_progress') {
        await client
          .from('production_orders')
          .update({ status: 'quality_check' })
          .eq('id', id);

        // 创建质检任务
        await createQCTask(id);
      }

      // 进度=100%，自动标记为待出货
      if (progress.overallProgress >= 100 && order.status === 'quality_check') {
        await client
          .from('production_orders')
          .update({ status: 'shipping' })
          .eq('id', id);

        // 创建出货任务
        await createShipmentTask(id);
      }
    }

    return NextResponse.json({
      success: true,
      message: '进度已更新',
      data: progress,
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

/**
 * 计算订单生产进度
 */
async function calculateOrderProgress(orderId: string) {
  // 获取订单信息
  const { data: order } = await client
    .from('production_orders')
    .select('id, order_no, total_quantity')
    .eq('id', orderId)
    .single();

  if (!order) {
    throw new Error('订单不存在');
  }

  const totalQuantity = order.total_quantity || 0;

  // 1. 计算裁床进度 (权重: 20%)
  const cuttingProgress = await calculateCuttingProgress(orderId, totalQuantity);

  // 2. 计算生产进度 (权重: 70%)
  const productionProgress = await calculateProductionProgress(orderId, totalQuantity);

  // 3. 计算质检进度 (权重: 10%)
  const qualityProgress = await calculateQualityProgress(orderId, totalQuantity);

  // 计算总体进度
  const overallProgress = Math.round(
    cuttingProgress.percentage * 0.2 +
    productionProgress.percentage * 0.7 +
    qualityProgress.percentage * 0.1
  );

  return {
    orderId,
    orderNo: order.order_no,
    totalQuantity,
    cutting: cuttingProgress,
    production: productionProgress,
    quality: qualityProgress,
    overallProgress,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * 计算裁床进度
 */
async function calculateCuttingProgress(orderId: string, totalQuantity: number) {
  // 获取裁床记录
  const { data: cuttingOrders } = await client
    .from('cutting_orders')
    .select('id, cutting_no, cutting_qty, completed_qty, status')
    .eq('production_order_id', orderId);

  if (!cuttingOrders || cuttingOrders.length === 0) {
    return {
      status: 'pending',
      totalPlanned: 0,
      totalCompleted: 0,
      percentage: 0,
      details: [],
    };
  }

  const totalPlanned = cuttingOrders.reduce((sum, c) => sum + (c.cutting_qty || 0), 0);
  const totalCompleted = cuttingOrders.reduce((sum, c) => sum + (c.completed_qty || 0), 0);
  const percentage = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0;

  return {
    status: cuttingOrders.every(c => c.status === 'completed') ? 'completed' : 
            cuttingOrders.some(c => c.status === 'in_progress') ? 'in_progress' : 'pending',
    totalPlanned,
    totalCompleted,
    percentage,
    details: cuttingOrders.map(c => ({
      cuttingNo: c.cutting_no,
      planned: c.cutting_qty,
      completed: c.completed_qty,
      status: c.status,
    })),
  };
}

/**
 * 计算生产进度
 */
async function calculateProductionProgress(orderId: string, totalQuantity: number) {
  // 获取分扎
  const { data: bundles } = await client
    .from('cutting_bundles')
    .select('id, bundle_no, quantity, status')
    .eq('order_id', orderId);

  if (!bundles || bundles.length === 0) {
    return {
      status: 'pending',
      totalBundles: 0,
      completedBundles: 0,
      totalQuantity: 0,
      completedQuantity: 0,
      percentage: 0,
      processDetails: [],
    };
  }

  // 获取工票完成情况
  const bundleIds = bundles.map(b => b.id);
  const { data: tickets } = await client
    .from('work_tickets')
    .select(`
      id, bundle_id, process_id, quantity, completed_quantity, status,
      processes (process_code, process_name)
    `)
    .in('bundle_id', bundleIds);

  // 按工序统计完成情况
  const processStats: Record<string, { 
    processId: string; 
    processName: string; 
    total: number; 
    completed: number; 
  }> = {};

  tickets?.forEach((ticket: any) => {
    const processId = ticket.process_id;
    if (!processStats[processId]) {
      processStats[processId] = {
        processId,
        processName: ticket.processes?.process_name || '未知工序',
        total: 0,
        completed: 0,
      };
    }
    processStats[processId].total += ticket.quantity || 0;
    processStats[processId].completed += ticket.completed_quantity || 0;
  });

  // 计算总完成量（取所有工序中完成最少的比例）
  let minPercentage = 100;
  const processDetails = Object.values(processStats).map(stat => {
    const pct = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;
    if (pct < minPercentage) minPercentage = pct;
    return {
      ...stat,
      percentage: pct,
    };
  });

  // 如果没有工票，则根据分扎状态计算
  if (processDetails.length === 0) {
    const completedBundles = bundles.filter(b => b.status === 'completed').length;
    const percentage = bundles.length > 0 ? Math.round((completedBundles / bundles.length) * 100) : 0;
    
    return {
      status: bundles.every(b => b.status === 'completed') ? 'completed' : 
              bundles.some(b => b.status === 'in_progress') ? 'in_progress' : 'pending',
      totalBundles: bundles.length,
      completedBundles,
      totalQuantity: bundles.reduce((sum, b) => sum + b.quantity, 0),
      completedQuantity: bundles.filter(b => b.status === 'completed').reduce((sum, b) => sum + b.quantity, 0),
      percentage,
      processDetails: [],
    };
  }

  const totalQty = bundles.reduce((sum, b) => sum + b.quantity, 0);
  const completedQty = Math.round(totalQty * minPercentage / 100);

  return {
    status: minPercentage >= 100 ? 'completed' : minPercentage > 0 ? 'in_progress' : 'pending',
    totalBundles: bundles.length,
    completedBundles: bundles.filter(b => b.status === 'completed').length,
    totalQuantity: totalQty,
    completedQuantity: completedQty,
    percentage: minPercentage,
    processDetails,
  };
}

/**
 * 计算质检进度
 */
async function calculateQualityProgress(orderId: string, totalQuantity: number) {
  // 获取质检记录
  const { data: inspections } = await client
    .from('quality_inspections')
    .select('id, inspection_no, inspection_type, total_quantity, pass_quantity, status, result')
    .eq('order_id', orderId);

  if (!inspections || inspections.length === 0) {
    return {
      status: 'pending',
      totalInspected: 0,
      totalPassed: 0,
      passRate: 0,
      percentage: 0,
      details: [],
    };
  }

  // 统计OQC出货检验
  const oqcInspections = inspections.filter(i => i.inspection_type === 'OQC');
  
  if (oqcInspections.length === 0) {
    return {
      status: 'pending',
      totalInspected: 0,
      totalPassed: 0,
      passRate: 0,
      percentage: 0,
      details: inspections.map(i => ({
        inspectionNo: i.inspection_no,
        type: i.inspection_type,
        status: i.status,
        result: i.result,
      })),
    };
  }

  const totalInspected = oqcInspections.reduce((sum, i) => sum + (i.total_quantity || 0), 0);
  const totalPassed = oqcInspections.reduce((sum, i) => sum + (i.pass_quantity || 0), 0);
  const passRate = totalInspected > 0 ? Math.round((totalPassed / totalInspected) * 100) : 0;
  
  // 质检进度基于检验数量和通过率
  const inspectProgress = totalQuantity > 0 ? Math.round((totalInspected / totalQuantity) * 100) : 0;
  const percentage = Math.round(inspectProgress * (passRate / 100));

  return {
    status: oqcInspections.every(i => i.status === 'completed' && i.result === 'pass') ? 'completed' : 
            oqcInspections.some(i => i.status === 'in_progress') ? 'in_progress' : 'pending',
    totalInspected,
    totalPassed,
    passRate,
    percentage,
    details: oqcInspections.map(i => ({
      inspectionNo: i.inspection_no,
      total: i.total_quantity,
      passed: i.pass_quantity,
      status: i.status,
      result: i.result,
    })),
  };
}

/**
 * 创建质检任务
 */
async function createQCTask(orderId: string) {
  const { data: order } = await client
    .from('production_orders')
    .select('order_no')
    .eq('id', orderId)
    .single();

  if (!order) return;

  const inspectionNo = `OQC${Date.now().toString(36).toUpperCase()}`;
  
  await client.from('quality_inspections').insert({
    inspection_no: inspectionNo,
    order_id: orderId,
    inspection_type: 'OQC',
    status: 'pending',
    created_at: new Date().toISOString(),
  });

  // 创建预警
  await client.from('alerts').insert({
    alert_type: 'quality',
    alert_level: 'info',
    title: '待质检订单',
    content: `订单 ${order.order_no} 已完成生产，待进行出货检验`,
    related_id: orderId,
    related_type: 'production_order',
    status: 'active',
    created_at: new Date().toISOString(),
  });
}

/**
 * 创建出货任务
 */
async function createShipmentTask(orderId: string) {
  const { data: order } = await client
    .from('production_orders')
    .select('order_no, customer_id, total_quantity')
    .eq('id', orderId)
    .single();

  if (!order) return;

  const shipmentNo = `SHP${Date.now().toString(36).toUpperCase()}`;
  
  await client.from('shipments').insert({
    shipment_no: shipmentNo,
    order_id: orderId,
    customer_id: order.customer_id,
    total_quantity: order.total_quantity,
    status: 'pending',
    created_at: new Date().toISOString(),
  });

  // 创建预警
  await client.from('alerts').insert({
    alert_type: 'shipping',
    alert_level: 'info',
    title: '待出货订单',
    content: `订单 ${order.order_no} 已通过质检，待安排出货`,
    related_id: orderId,
    related_type: 'production_order',
    status: 'active',
    created_at: new Date().toISOString(),
  });
}
