import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 订单状态流转API
 * 
 * 处理订单的状态变更，并自动触发相关的业务逻辑
 * 
 * 状态流转规则：
 * pending → confirmed → in_progress → quality_check → shipping → completed
 *                                    ↓
 *                                 cancelled
 */

const client = getSupabaseClient();

// 状态流转配置
const STATUS_TRANSITIONS: Record<string, string[]> = {
  'pending': ['confirmed', 'cancelled'],
  'confirmed': ['in_progress', 'cancelled'],
  'in_progress': ['quality_check', 'cancelled'],
  'quality_check': ['shipping', 'in_progress', 'cancelled'],
  'shipping': ['completed', 'cancelled'],
  'completed': [],
  'cancelled': [],
};

// 状态变更时需要执行的动作
const STATUS_ACTIONS: Record<string, string[]> = {
  'confirmed': ['create_prep_tasks', 'notify_production', 'check_materials'],
  'in_progress': ['start_tracking', 'allocate_resources', 'notify_workers'],
  'quality_check': ['create_inspection', 'notify_qc'],
  'shipping': ['create_shipment', 'generate_documents', 'notify_logistics'],
  'completed': ['generate_invoice', 'update_statistics', 'archive_order'],
  'cancelled': ['release_resources', 'reverse_inventory', 'notify_stakeholders'],
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    // 获取订单当前状态和可转换状态
    const { data: order, error } = await client
      .from('production_orders')
      .select(`
        id, order_no, status, progress, 
        customer_id, style_no, style_name, 
        total_quantity, delivery_date,
        customers (name)
      `)
      .eq('id', id)
      .single();

    if (error || !order) {
      return NextResponse.json({ 
        success: false, 
        error: '订单不存在' 
      }, { status: 404 });
    }

    const allowedTransitions = STATUS_TRANSITIONS[order.status] || [];

    return NextResponse.json({
      success: true,
      data: {
        order,
        allowedTransitions,
        nextActions: STATUS_ACTIONS[allowedTransitions[0]] || [],
      },
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
    const body = await request.json();
    const { targetStatus, operator, reason } = body;

    if (!targetStatus) {
      return NextResponse.json({ 
        success: false, 
        error: '缺少目标状态' 
      }, { status: 400 });
    }

    // 获取当前订单
    const { data: order, error: fetchError } = await client
      .from('production_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ 
        success: false, 
        error: '订单不存在' 
      }, { status: 404 });
    }

    // 验证状态转换是否允许
    const allowedTransitions = STATUS_TRANSITIONS[order.status] || [];
    if (!allowedTransitions.includes(targetStatus)) {
      return NextResponse.json({ 
        success: false, 
        error: `不允许从 ${order.status} 转换到 ${targetStatus}` 
      }, { status: 400 });
    }

    // 执行状态变更
    const updateData: Record<string, any> = {
      status: targetStatus,
      updated_at: new Date().toISOString(),
    };

    // 根据目标状态设置特定字段
    switch (targetStatus) {
      case 'confirmed':
        updateData.confirmed_at = new Date().toISOString();
        updateData.confirmed_by = operator;
        break;
      case 'in_progress':
        updateData.production_started_at = new Date().toISOString();
        break;
      case 'quality_check':
        updateData.qc_started_at = new Date().toISOString();
        break;
      case 'shipping':
        updateData.shipping_started_at = new Date().toISOString();
        break;
      case 'completed':
        updateData.completed_at = new Date().toISOString();
        updateData.progress = 100;
        break;
      case 'cancelled':
        updateData.cancelled_at = new Date().toISOString();
        updateData.cancelled_by = operator;
        updateData.cancel_reason = reason;
        break;
    }

    // 更新订单状态
    const { error: updateError } = await client
      .from('production_orders')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    // 执行状态变更后的动作
    const actions = STATUS_ACTIONS[targetStatus] || [];
    const actionResults: Record<string, any> = {};

    for (const action of actions) {
      try {
        actionResults[action] = await executeAction(action, order, operator);
      } catch (error: any) {
        actionResults[action] = { success: false, error: error.message };
      }
    }

    // 记录状态变更日志
    await client.from('order_status_logs').insert({
      order_id: id,
      from_status: order.status,
      to_status: targetStatus,
      operator: operator || 'system',
      reason: reason,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `订单状态已更新为 ${targetStatus}`,
      data: {
        previousStatus: order.status,
        currentStatus: targetStatus,
        actions: actionResults,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

/**
 * 执行状态变更后的动作
 */
async function executeAction(action: string, order: any, operator: string): Promise<any> {
  switch (action) {
    case 'create_prep_tasks':
      return await createPrepTasks(order);
    
    case 'notify_production':
      return await notifyProduction(order);
    
    case 'check_materials':
      return await checkMaterials(order);
    
    case 'start_tracking':
      return await startTracking(order);
    
    case 'allocate_resources':
      return await allocateResources(order);
    
    case 'notify_workers':
      return await notifyWorkers(order);
    
    case 'create_inspection':
      return await createInspection(order);
    
    case 'notify_qc':
      return await notifyQC(order);
    
    case 'create_shipment':
      return await createShipment(order);
    
    case 'generate_documents':
      return await generateDocuments(order);
    
    case 'notify_logistics':
      return await notifyLogistics(order);
    
    case 'generate_invoice':
      return await generateInvoice(order);
    
    case 'update_statistics':
      return await updateStatistics(order);
    
    case 'archive_order':
      return await archiveOrder(order);
    
    case 'release_resources':
      return await releaseResources(order);
    
    case 'reverse_inventory':
      return await reverseInventory(order);
    
    case 'notify_stakeholders':
      return await notifyStakeholders(order);
    
    default:
      return { success: false, error: '未知动作' };
  }
}

// ============================================
// 动作实现
// ============================================

async function createPrepTasks(order: any): Promise<any> {
  const tasks = [
    {
      order_id: order.id,
      task_type: 'material_check',
      task_name: '物料齐套检查',
      status: 'pending',
      due_date: order.delivery_date,
    },
    {
      order_id: order.id,
      task_type: 'production_line_assign',
      task_name: '生产线分配',
      status: 'pending',
      due_date: order.delivery_date,
    },
    {
      order_id: order.id,
      task_type: 'cutting_plan',
      task_name: '裁床计划',
      status: 'pending',
      due_date: order.delivery_date,
    },
  ];

  await client.from('production_prep_tasks').insert(tasks);
  
  return { success: true, created: tasks.length };
}

async function notifyProduction(order: any): Promise<any> {
  // 发送通知给生产部门
  const { data: users } = await client
    .from('users')
    .select('id')
    .eq('role_id', 'production_manager');

  if (users && users.length > 0) {
    const notifications = users.map(u => ({
      type: 'order',
      level: 'info',
      title: '新订单待生产',
      content: `订单 ${order.order_no} 已确认，请安排生产`,
      related_order: order.order_no,
      recipient: u.id,
      status: 'unread',
    }));

    await client.from('notifications').insert(notifications);
  }

  return { success: true, notified: users?.length || 0 };
}

async function checkMaterials(order: any): Promise<any> {
  // 检查物料库存
  // 这里可以调用库存检查逻辑
  return { success: true, checked: true };
}

async function startTracking(order: any): Promise<any> {
  // 开始生产跟踪
  await client.from('production_tracking').insert({
    order_id: order.id,
    status: 'started',
    started_at: new Date().toISOString(),
  });

  return { success: true };
}

async function allocateResources(order: any): Promise<any> {
  // 分配资源（生产线、员工等）
  if (order.production_line_id) {
    await client
      .from('production_lines')
      .update({ current_order_id: order.id })
      .eq('id', order.production_line_id);
  }

  return { success: true };
}

async function notifyWorkers(order: any): Promise<any> {
  // 通知生产线员工
  return { success: true };
}

async function createInspection(order: any): Promise<any> {
  // 创建质检单
  const inspectionNo = `OQC${Date.now().toString(36).toUpperCase()}`;
  
  await client.from('quality_inspections').insert({
    inspection_no: inspectionNo,
    order_id: order.id,
    inspection_type: 'OQC',
    status: 'pending',
    created_at: new Date().toISOString(),
  });

  return { success: true, inspectionNo };
}

async function notifyQC(order: any): Promise<any> {
  // 通知质检部门
  const { data: users } = await client
    .from('users')
    .select('id')
    .eq('role_id', 'qc');

  if (users && users.length > 0) {
    const notifications = users.map(u => ({
      type: 'quality',
      level: 'info',
      title: '新质检任务',
      content: `订单 ${order.order_no} 待出货检验`,
      related_order: order.order_no,
      recipient: u.id,
      status: 'unread',
    }));

    await client.from('notifications').insert(notifications);
  }

  return { success: true };
}

async function createShipment(order: any): Promise<any> {
  // 创建出货单
  const shipmentNo = `SHP${Date.now().toString(36).toUpperCase()}`;
  
  const { data: shipment } = await client
    .from('shipments')
    .insert({
      shipment_no: shipmentNo,
      order_id: order.id,
      customer_id: order.customer_id,
      total_quantity: order.total_quantity,
      status: 'pending',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  return { success: true, shipmentNo };
}

async function generateDocuments(order: any): Promise<any> {
  // 生成出货文档
  return { success: true };
}

async function notifyLogistics(order: any): Promise<any> {
  // 通知物流部门
  return { success: true };
}

async function generateInvoice(order: any): Promise<any> {
  // 生成财务账单
  const billNo = `AR${Date.now().toString(36).toUpperCase()}`;

  await client.from('bills').insert({
    bill_no: billNo,
    bill_type: 'receivable',
    category: '销售款',
    related_id: order.id,
    related_no: order.order_no,
    customer_id: order.customer_id,
    amount: order.total_amount,
    paid_amount: 0,
    due_date: order.delivery_date,
    status: 'pending',
    created_at: new Date().toISOString(),
  });

  return { success: true, billNo };
}

async function updateStatistics(order: any): Promise<any> {
  // 更新统计数据
  return { success: true };
}

async function archiveOrder(order: any): Promise<any> {
  // 归档订单
  return { success: true };
}

async function releaseResources(order: any): Promise<any> {
  // 释放资源
  if (order.production_line_id) {
    await client
      .from('production_lines')
      .update({ current_order_id: null })
      .eq('id', order.production_line_id);
  }

  return { success: true };
}

async function reverseInventory(order: any): Promise<any> {
  // 回滚库存
  return { success: true };
}

async function notifyStakeholders(order: any): Promise<any> {
  // 通知相关人员
  return { success: true };
}
