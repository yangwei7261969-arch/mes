import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 定时任务API
 * 
 * 用于自动执行业务逻辑闭环中的定时任务：
 * 1. 交期预警检测
 * 2. 库存预警检测
 * 3. 订单进度自动更新
 * 4. 质量问题预警
 * 5. 财务到期提醒
 */

const client = getSupabaseClient();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const task = searchParams.get('task') || 'all';

  try {
    const results: Record<string, any> = {};

    switch (task) {
      case 'all':
        results.deliveryAlerts = await checkDeliveryAlerts();
        results.inventoryAlerts = await checkInventoryAlerts();
        results.progressUpdate = await updateOrderProgress();
        results.qualityAlerts = await checkQualityAlerts();
        results.financeAlerts = await checkFinanceAlerts();
        results.cleanup = await cleanupOldData();
        break;
      
      case 'delivery':
        results.deliveryAlerts = await checkDeliveryAlerts();
        break;
      
      case 'inventory':
        results.inventoryAlerts = await checkInventoryAlerts();
        break;
      
      case 'progress':
        results.progressUpdate = await updateOrderProgress();
        break;
      
      case 'quality':
        results.qualityAlerts = await checkQualityAlerts();
        break;
      
      case 'finance':
        results.financeAlerts = await checkFinanceAlerts();
        break;
      
      case 'cleanup':
        results.cleanup = await cleanupOldData();
        break;
      
      default:
        return NextResponse.json({ error: '未知任务类型' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      executedAt: new Date().toISOString(),
      results,
    });
  } catch (error: any) {
    console.error('Scheduled task error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// ============================================
// 1. 交期预警检测
// ============================================

async function checkDeliveryAlerts() {
  const today = new Date();
  const threeDaysLater = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
  const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  // 查询即将到期的订单
  const { data: orders } = await client
    .from('production_orders')
    .select('id, order_no, delivery_date, status, progress')
    .in('status', ['confirmed', 'in_progress', 'quality_check'])
    .lte('delivery_date', sevenDaysLater.toISOString())
    .gte('delivery_date', today.toISOString());

  const alerts: any[] = [];

  for (const order of orders || []) {
    const deliveryDate = new Date(order.delivery_date);
    const daysUntilDelivery = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // 检查是否已存在相同预警
    const { data: existingAlert } = await client
      .from('alerts')
      .select('id')
      .eq('related_id', order.id)
      .eq('alert_type', 'delivery')
      .eq('status', 'active')
      .single();

    if (existingAlert) continue; // 已存在预警，跳过

    let level = 'info';
    let title = '';
    let content = '';

    if (daysUntilDelivery <= 0) {
      level = 'critical';
      title = '订单逾期预警';
      content = `订单 ${order.order_no} 已逾期，当前进度: ${order.progress}%`;
    } else if (daysUntilDelivery <= 3) {
      level = 'critical';
      title = '交期紧迫预警';
      content = `订单 ${order.order_no} 将在 ${daysUntilDelivery} 天后到期，当前进度: ${order.progress}%`;
    } else if (daysUntilDelivery <= 7) {
      level = 'warning';
      title = '交期提醒';
      content = `订单 ${order.order_no} 将在 ${daysUntilDelivery} 天后到期，当前进度: ${order.progress}%`;
    }

    if (title) {
      await client.from('alerts').insert({
        alert_type: 'delivery',
        alert_level: level,
        title,
        content,
        related_id: order.id,
        related_type: 'production_order',
        status: 'active',
        created_at: new Date().toISOString(),
      });

      alerts.push({ order_no: order.order_no, level, days: daysUntilDelivery });
    }
  }

  return {
    checked: orders?.length || 0,
    created: alerts.length,
    details: alerts,
  };
}

// ============================================
// 2. 库存预警检测
// ============================================

async function checkInventoryAlerts() {
  // 查询所有物料的当前库存和安全库存
  const { data: materials } = await client
    .from('materials')
    .select('id, code, name, current_stock, safety_stock, category_id')
    .not('safety_stock', 'is', null);

  const alerts: any[] = [];

  for (const material of materials || []) {
    if (material.current_stock <= material.safety_stock) {
      // 检查是否已存在相同预警
      const { data: existingAlert } = await client
        .from('alerts')
        .select('id')
        .eq('related_id', material.id)
        .eq('alert_type', 'inventory')
        .eq('status', 'active')
        .single();

      if (existingAlert) continue;

      const level = material.current_stock <= material.safety_stock * 0.3 ? 'critical' : 'warning';
      const shortage = material.safety_stock - material.current_stock;

      await client.from('alerts').insert({
        alert_type: 'inventory',
        alert_level: level,
        title: '库存不足预警',
        content: `物料 ${material.name}(${material.code}) 库存不足，当前库存: ${material.current_stock}，安全库存: ${material.safety_stock}，缺口: ${shortage}`,
        related_id: material.id,
        related_type: 'material',
        status: 'active',
        created_at: new Date().toISOString(),
      });

      alerts.push({
        material_code: material.code,
        material_name: material.name,
        current: material.current_stock,
        safety: material.safety_stock,
        level,
      });
    }
  }

  return {
    checked: materials?.length || 0,
    created: alerts.length,
    details: alerts,
  };
}

// ============================================
// 3. 订单进度自动更新
// ============================================

async function updateOrderProgress() {
  // 查询进行中的订单
  const { data: orders } = await client
    .from('production_orders')
    .select('id, order_no, progress')
    .eq('status', 'in_progress');

  const updates: any[] = [];

  for (const order of orders || []) {
    // 获取订单的所有分扎
    const { data: bundles } = await client
      .from('cutting_bundles')
      .select('id, quantity')
      .eq('order_id', order.id);

    if (!bundles || bundles.length === 0) continue;

    // 获取所有工票完成情况
    const bundleIds = bundles.map(b => b.id);
    const { data: tickets } = await client
      .from('work_tickets')
      .select('completed_quantity')
      .in('bundle_id', bundleIds)
      .eq('status', 'completed');

    // 计算进度
    const totalQty = bundles.reduce((sum, b) => sum + b.quantity, 0);
    const completedQty = tickets?.reduce((sum, t) => sum + (t.completed_quantity || 0), 0) || 0;
    const progress = totalQty > 0 ? Math.round((completedQty / totalQty) * 100) : 0;

    // 只更新有变化的订单
    if (progress !== order.progress) {
      await client
        .from('production_orders')
        .update({ progress })
        .eq('id', order.id);

      updates.push({
        order_no: order.order_no,
        old_progress: order.progress,
        new_progress: progress,
      });

      // 如果进度>=90%，检查是否需要转入质检
      if (progress >= 90) {
        const { data: orderDetail } = await client
          .from('production_orders')
          .select('status')
          .eq('id', order.id)
          .single();

        if (orderDetail?.status === 'in_progress') {
          await client
            .from('production_orders')
            .update({ status: 'quality_check' })
            .eq('id', order.id);
        }
      }
    }
  }

  return {
    checked: orders?.length || 0,
    updated: updates.length,
    details: updates,
  };
}

// ============================================
// 4. 质量问题预警
// ============================================

async function checkQualityAlerts() {
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  // 查询24小时内未处理的严重缺陷
  const { data: criticalDefects } = await client
    .from('quality_defects')
    .select('id, order_id, defect_type, quantity, severity, created_at')
    .eq('severity', 'critical')
    .eq('status', 'open')
    .gte('created_at', yesterday.toISOString());

  const alerts: any[] = [];

  // 创建汇总预警
  if (criticalDefects && criticalDefects.length > 0) {
    await client.from('alerts').insert({
      alert_type: 'quality',
      alert_level: 'critical',
      title: '严重质量问题预警',
      content: `发现 ${criticalDefects.length} 个严重质量问题待处理，请立即查看`,
      status: 'active',
      created_at: new Date().toISOString(),
    });

    alerts.push({
      type: 'critical_defects',
      count: criticalDefects.length,
    });
  }

  // 查询次品率超过5%的订单
  const { data: orders } = await client
    .from('production_orders')
    .select('id, order_no, total_quantity')
    .in('status', ['in_progress', 'quality_check']);

  for (const order of orders || []) {
    // 统计该订单的次品数量
    const { data: defects } = await client
      .from('quality_defects')
      .select('quantity')
      .eq('order_id', order.id);

    const totalDefects = defects?.reduce((sum, d) => sum + d.quantity, 0) || 0;
    const defectRate = order.total_quantity > 0 
      ? (totalDefects / order.total_quantity) * 100 
      : 0;

    if (defectRate > 5) {
      await client.from('alerts').insert({
        alert_type: 'quality',
        alert_level: 'warning',
        title: '次品率预警',
        content: `订单 ${order.order_no} 次品率 ${defectRate.toFixed(2)}% 超过标准(5%)，请关注`,
        related_id: order.id,
        related_type: 'production_order',
        status: 'active',
        created_at: new Date().toISOString(),
      });

      alerts.push({
        type: 'high_defect_rate',
        order_no: order.order_no,
        rate: defectRate.toFixed(2),
      });
    }
  }

  return {
    criticalDefects: criticalDefects?.length || 0,
    created: alerts.length,
    details: alerts,
  };
}

// ============================================
// 5. 财务到期提醒
// ============================================

async function checkFinanceAlerts() {
  const today = new Date();
  const threeDaysLater = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
  const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const alerts: any[] = [];

  // 查询即将到期的应收账款
  const { data: receivables } = await client
    .from('bills')
    .select('id, bill_no, amount, paid_amount, due_date, customers(name)')
    .eq('bill_type', 'receivable')
    .eq('status', 'pending')
    .lte('due_date', sevenDaysLater.toISOString())
    .gte('due_date', today.toISOString());

  for (const bill of receivables || []) {
    const dueDate = new Date(bill.due_date);
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const unpaidAmount = bill.amount - bill.paid_amount;
    const customerName = (bill.customers as any)?.name || '未知客户';

    let level = 'info';
    if (daysUntilDue <= 0) level = 'critical';
    else if (daysUntilDue <= 3) level = 'warning';

    await client.from('alerts').insert({
      alert_type: 'finance',
      alert_level: level,
      title: '应收账款到期提醒',
      content: `客户 ${customerName} 账单 ${bill.bill_no} 将在 ${daysUntilDue} 天后到期，未收金额: ¥${unpaidAmount.toLocaleString()}`,
      related_id: bill.id,
      related_type: 'bill',
      status: 'active',
      created_at: new Date().toISOString(),
    });

    alerts.push({
      type: 'receivable',
      bill_no: bill.bill_no,
      customer: customerName,
      amount: unpaidAmount,
      days: daysUntilDue,
    });
  }

  // 查询即将到期的应付账款
  const { data: payables } = await client
    .from('bills')
    .select('id, bill_no, amount, paid_amount, due_date, suppliers(name)')
    .eq('bill_type', 'payable')
    .eq('status', 'pending')
    .lte('due_date', sevenDaysLater.toISOString())
    .gte('due_date', today.toISOString());

  for (const bill of payables || []) {
    const dueDate = new Date(bill.due_date);
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const unpaidAmount = bill.amount - bill.paid_amount;
    const supplierName = (bill.suppliers as any)?.name || '未知供应商';

    let level = 'info';
    if (daysUntilDue <= 0) level = 'critical';
    else if (daysUntilDue <= 3) level = 'warning';

    await client.from('alerts').insert({
      alert_type: 'finance',
      alert_level: level,
      title: '应付账款到期提醒',
      content: `供应商 ${supplierName} 账单 ${bill.bill_no} 将在 ${daysUntilDue} 天后到期，未付金额: ¥${unpaidAmount.toLocaleString()}`,
      related_id: bill.id,
      related_type: 'bill',
      status: 'active',
      created_at: new Date().toISOString(),
    });

    alerts.push({
      type: 'payable',
      bill_no: bill.bill_no,
      supplier: supplierName,
      amount: unpaidAmount,
      days: daysUntilDue,
    });
  }

  return {
    receivablesChecked: receivables?.length || 0,
    payablesChecked: payables?.length || 0,
    created: alerts.length,
    details: alerts,
  };
}

// ============================================
// 6. 清理过期数据
// ============================================

async function cleanupOldData() {
  const results: any = {};

  // 清理30天前的已读通知
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const { error: notificationError } = await client
    .from('notifications')
    .delete()
    .eq('status', 'read')
    .lt('read_at', thirtyDaysAgo.toISOString());

  results.notifications = notificationError ? 'failed' : 'cleaned';

  // 清理已处理的预警（保留7天）
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const { error: alertError } = await client
    .from('alerts')
    .delete()
    .eq('status', 'handled')
    .lt('handled_at', sevenDaysAgo.toISOString());

  results.alerts = alertError ? 'failed' : 'cleaned';

  // 清理过期的临时数据
  const { error: tempError } = await client
    .from('temp_data')
    .delete()
    .lt('expires_at', new Date().toISOString());

  results.tempData = tempError ? 'failed' : 'cleaned';

  return results;
}

// ============================================
// POST 方法 - 手动触发任务
// ============================================

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { tasks } = body;

  if (!tasks || !Array.isArray(tasks)) {
    return NextResponse.json({ 
      error: '请提供要执行的任务列表' 
    }, { status: 400 });
  }

  const results: Record<string, any> = {};

  for (const task of tasks) {
    switch (task) {
      case 'delivery':
        results.deliveryAlerts = await checkDeliveryAlerts();
        break;
      case 'inventory':
        results.inventoryAlerts = await checkInventoryAlerts();
        break;
      case 'progress':
        results.progressUpdate = await updateOrderProgress();
        break;
      case 'quality':
        results.qualityAlerts = await checkQualityAlerts();
        break;
      case 'finance':
        results.financeAlerts = await checkFinanceAlerts();
        break;
      case 'cleanup':
        results.cleanup = await cleanupOldData();
        break;
    }
  }

  return NextResponse.json({
    success: true,
    executedAt: new Date().toISOString(),
    results,
  });
}
