import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 统一仪表盘API
 * 
 * 合并功能：
 * • 统计概览
 * • 告警信息
 * • 趋势数据
 * • 关键指标
 */
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'overview';

    switch (action) {
      case 'overview':
        return await getOverviewStats(client);
      case 'alerts':
        return await getAlerts(client, searchParams);
      case 'production':
        return await getProductionStats(client, searchParams);
      case 'quality':
        return await getQualityStats(client, searchParams);
      case 'inventory':
        return await getInventoryStats(client);
      case 'financial':
        return await getFinancialStats(client, searchParams);
      case 'trends':
        return await getTrends(client, searchParams);
      case 'kpis':
        return await getKPIs(client);
      default:
        return await getOverviewStats(client);
    }
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ success: false, error: '获取数据失败' }, { status: 500 });
  }
}

/**
 * 总览统计
 */
async function getOverviewStats(client: any) {
  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  // 并行获取各项统计
  const [
    orderStats,
    productionStats,
    qualityStats,
    inventoryStats
  ] = await Promise.all([
    getOrderStatistics(client, monthStart),
    getProductionStatistics(client, today),
    getQualityStatistics(client, monthStart),
    getInventoryStatistics(client)
  ]);

  return NextResponse.json({
    success: true,
    data: {
      orders: orderStats,
      production: productionStats,
      quality: qualityStats,
      inventory: inventoryStats,
      lastUpdated: new Date().toISOString()
    }
  });
}

async function getOrderStatistics(client: any, monthStart: string) {
  // 本月订单统计
  const { data: orders } = await client
    .from('production_orders')
    .select('status, quantity, completed_quantity')
    .gte('created_at', monthStart);

  const total = orders?.length || 0;
  const inProduction = orders?.filter((o: any) => o.status === 'in_production').length || 0;
  const completed = orders?.filter((o: any) => o.status === 'completed').length || 0;
  const pending = orders?.filter((o: any) => o.status === 'pending').length || 0;

  return { total, inProduction, completed, pending };
}

async function getProductionStatistics(client: any, today: string) {
  // 今日生产统计
  const { data: tracking } = await client
    .from('process_tracking')
    .select('quantity, created_at')
    .gte('created_at', `${today}T00:00:00Z`);

  const todayOutput = tracking?.reduce((sum: number, t: any) => sum + (t.quantity || 0), 0) || 0;

  // 在产订单
  const { count: activeOrders } = await client
    .from('production_orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'in_production');

  return {
    todayOutput,
    activeOrders: activeOrders || 0
  };
}

async function getQualityStatistics(client: any, monthStart: string) {
  // 本月质检统计
  const { data: inspections } = await client
    .from('quality_iqc')
    .select('result')
    .gte('created_at', monthStart);

  const total = inspections?.length || 0;
  const passed = inspections?.filter((i: any) => i.result === 'passed').length || 0;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  return { total, passed, passRate };
}

async function getInventoryStatistics(client: any) {
  // 库存预警
  const { data: materials } = await client
    .from('materials')
    .select('id, code, name, safety_stock');

  const { data: inventory } = await client
    .from('inventory')
    .select('material_id, quantity');

  const inventoryMap = new Map();
  inventory?.forEach((i: any) => {
    const current = inventoryMap.get(i.material_id) || 0;
    inventoryMap.set(i.material_id, current + parseFloat(i.quantity || 0));
  });

  let lowStock = 0;
  let outOfStock = 0;

  materials?.forEach((m: any) => {
    const qty = inventoryMap.get(m.id) || 0;
    const safety = parseFloat(m.safety_stock || 0);
    if (qty === 0) outOfStock++;
    else if (safety > 0 && qty < safety) lowStock++;
  });

  return { lowStock, outOfStock };
}

/**
 * 告警信息
 */
async function getAlerts(client: any, searchParams: URLSearchParams) {
  const type = searchParams.get('type') || 'all';
  const limit = parseInt(searchParams.get('limit') || '20');

  const alerts: any[] = [];

  // 1. 库存告警
  if (type === 'all' || type === 'inventory') {
    const { data: lowStock } = await client
      .from('materials')
      .select(`
        id, code, name, safety_stock,
        inventory (quantity)
      `)
      .eq('is_active', true);

    lowStock?.forEach((m: any) => {
      const qty = m.inventory?.reduce((sum: number, i: any) => sum + parseFloat(i.quantity || 0), 0) || 0;
      if (m.safety_stock && qty < m.safety_stock) {
        alerts.push({
          type: 'inventory',
          level: qty === 0 ? 'critical' : 'warning',
          title: qty === 0 ? '物料缺货' : '库存不足',
          message: `${m.name} (${m.code}) 库存: ${qty}, 安全库存: ${m.safety_stock}`,
          referenceId: m.id,
          createdAt: new Date().toISOString()
        });
      }
    });
  }

  // 2. 生产告警
  if (type === 'all' || type === 'production') {
    // 逾期订单
    const today = new Date().toISOString().split('T')[0];
    const { data: overdue } = await client
      .from('production_orders')
      .select('id, order_no, style_name, plan_end_date, quantity, completed_quantity')
      .lt('plan_end_date', today)
      .neq('status', 'completed');

    overdue?.forEach((o: any) => {
      alerts.push({
        type: 'production',
        level: 'critical',
        title: '订单逾期',
        message: `订单 ${o.order_no} (${o.style_name}) 已逾期，进度: ${o.completed_quantity}/${o.quantity}`,
        referenceId: o.id,
        createdAt: new Date().toISOString()
      });
    });
  }

  // 3. 质量告警
  if (type === 'all' || type === 'quality') {
    const { data: defects } = await client
      .from('quality_defects')
      .select('*')
      .eq('status', 'open')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (defects && defects.length > 0) {
      alerts.push({
        type: 'quality',
        level: 'warning',
        title: '待处理缺陷',
        message: `有 ${defects.length} 个缺陷待处理`,
        referenceId: null,
        createdAt: new Date().toISOString()
      });
    }
  }

  // 按级别和类型排序
  alerts.sort((a, b) => {
    if (a.level === 'critical' && b.level !== 'critical') return -1;
    if (a.level !== 'critical' && b.level === 'critical') return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return NextResponse.json({
    success: true,
    data: alerts.slice(0, limit),
    summary: {
      total: alerts.length,
      critical: alerts.filter(a => a.level === 'critical').length,
      warning: alerts.filter(a => a.level === 'warning').length
    }
  });
}

/**
 * 生产统计详情
 */
async function getProductionStats(client: any, searchParams: URLSearchParams) {
  const period = searchParams.get('period') || 'today';

  let startDate: string;
  const today = new Date();

  switch (period) {
    case 'week':
      startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      break;
    case 'month':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      break;
    default:
      startDate = today.toISOString().split('T')[0];
  }

  // 获取生产进度
  const { data: orders } = await client
    .from('production_orders')
    .select(`
      id, order_no, style_no, style_name, quantity, completed_quantity, status,
      production_progress (quantity, defective_qty)
    `)
    .gte('created_at', startDate);

  // 按状态统计
  const byStatus = {
    pending: orders?.filter((o: any) => o.status === 'pending').length || 0,
    inProduction: orders?.filter((o: any) => o.status === 'in_production').length || 0,
    completed: orders?.filter((o: any) => o.status === 'completed').length || 0
  };

  // 总产量
  const totalOutput = orders?.reduce((sum: number, o: any) => sum + (o.completed_quantity || 0), 0) || 0;

  // 完成率
  const totalQty = orders?.reduce((sum: number, o: any) => sum + (o.quantity || 0), 0) || 0;
  const completionRate = totalQty > 0 ? Math.round((totalOutput / totalQty) * 100) : 0;

  return NextResponse.json({
    success: true,
    data: {
      period,
      startDate,
      orders: orders?.slice(0, 10),
      summary: {
        totalOrders: orders?.length || 0,
        totalOutput,
        completionRate,
        byStatus
      }
    }
  });
}

/**
 * 质量统计详情
 */
async function getQualityStats(client: any, searchParams: URLSearchParams) {
  const period = searchParams.get('period') || 'month';
  const today = new Date();

  let startDate: string;
  switch (period) {
    case 'week':
      startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      break;
    default:
      startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  }

  // IQC统计
  const { data: iqc } = await client
    .from('quality_iqc')
    .select('result')
    .gte('created_at', startDate);

  // IPQC统计
  const { data: ipqc } = await client
    .from('quality_ipqc')
    .select('result')
    .gte('created_at', startDate);

  // OQC统计
  const { data: oqc } = await client
    .from('quality_oqc')
    .select('result')
    .gte('created_at', startDate);

  const calcRate = (data: any[]) => {
    const total = data?.length || 0;
    const passed = data?.filter((d: any) => d.result === 'passed').length || 0;
    return { total, passed, rate: total > 0 ? Math.round((passed / total) * 100) : 0 };
  };

  return NextResponse.json({
    success: true,
    data: {
      iqc: calcRate(iqc),
      ipqc: calcRate(ipqc),
      oqc: calcRate(oqc),
      period
    }
  });
}

/**
 * 库存统计详情
 */
async function getInventoryStats(client: any) {
  // 按类别统计
  const { data: materials } = await client
    .from('materials')
    .select(`
      id, code, name, category,
      inventory (quantity)
    `)
    .eq('is_active', true);

  const byCategory: Record<string, { count: number; value: number }> = {};

  materials?.forEach((m: any) => {
    const cat = m.category || '其他';
    if (!byCategory[cat]) {
      byCategory[cat] = { count: 0, value: 0 };
    }
    byCategory[cat].count++;
    const qty = m.inventory?.reduce((sum: number, i: any) => sum + parseFloat(i.quantity || 0), 0) || 0;
    byCategory[cat].value += qty;
  });

  // 库存预警
  const { data: alerts } = await client
    .from('materials')
    .select(`
      id, code, name, safety_stock,
      inventory (quantity)
    `)
    .eq('is_active', true);

  let lowStock = 0;
  let outOfStock = 0;

  alerts?.forEach((m: any) => {
    const qty = m.inventory?.reduce((sum: number, i: any) => sum + parseFloat(i.quantity || 0), 0) || 0;
    if (qty === 0) outOfStock++;
    else if (m.safety_stock && qty < m.safety_stock) lowStock++;
  });

  return NextResponse.json({
    success: true,
    data: {
      totalMaterials: materials?.length || 0,
      byCategory,
      alerts: { lowStock, outOfStock }
    }
  });
}

/**
 * 财务统计
 */
async function getFinancialStats(client: any, searchParams: URLSearchParams) {
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

  // 应收账款
  const { data: receivables } = await client
    .from('bills')
    .select('total_amount, paid_amount')
    .eq('type', 'receivable')
    .neq('status', 'paid');

  const totalReceivable = receivables?.reduce((sum: number, b: any) => 
    sum + (parseFloat(b.total_amount) - parseFloat(b.paid_amount || 0)), 0) || 0;

  // 应付账款
  const { data: payables } = await client
    .from('bills')
    .select('total_amount, paid_amount')
    .eq('type', 'payable')
    .neq('status', 'paid');

  const totalPayable = payables?.reduce((sum: number, b: any) => 
    sum + (parseFloat(b.total_amount) - parseFloat(b.paid_amount || 0)), 0) || 0;

  // 本月销售
  const { data: shipments } = await client
    .from('shipments')
    .select('total_amount')
    .gte('shipment_date', `${year}-${month.toString().padStart(2, '0')}-01`)
    .lt('shipment_date', `${year}-${(month + 1).toString().padStart(2, '0')}-01`);

  const monthlySales = shipments?.reduce((sum: number, s: any) => sum + parseFloat(s.total_amount || 0), 0) || 0;

  return NextResponse.json({
    success: true,
    data: {
      receivable: totalReceivable,
      payable: totalPayable,
      monthlySales,
      year,
      month
    }
  });
}

/**
 * 趋势数据
 */
async function getTrends(client: any, searchParams: URLSearchParams) {
  const type = searchParams.get('type') || 'production';
  const days = parseInt(searchParams.get('days') || '7');

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

  const trends: any[] = [];

  if (type === 'production') {
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const { data } = await client
        .from('process_tracking')
        .select('quantity')
        .gte('created_at', `${dateStr}T00:00:00Z`)
        .lt('created_at', `${dateStr}T23:59:59Z`);

      const output = data?.reduce((sum: number, t: any) => sum + (t.quantity || 0), 0) || 0;
      trends.push({ date: dateStr, value: output });
    }
  } else if (type === 'quality') {
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const { data } = await client
        .from('quality_iqc')
        .select('result')
        .gte('created_at', `${dateStr}T00:00:00Z`)
        .lt('created_at', `${dateStr}T23:59:59Z`);

      const total = data?.length || 0;
      const passed = data?.filter((i: any) => i.result === 'passed').length || 0;
      trends.push({ date: dateStr, value: total > 0 ? Math.round((passed / total) * 100) : 100 });
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      type,
      trends
    }
  });
}

/**
 * KPI指标
 */
async function getKPIs(client: any) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

  // 1. 准时交货率
  const { data: orders } = await client
    .from('production_orders')
    .select('id, plan_end_date, actual_end_date, status')
    .gte('created_at', monthStart)
    .eq('status', 'completed');

  const onTime = orders?.filter((o: any) => 
    o.actual_end_date && new Date(o.actual_end_date) <= new Date(o.plan_end_date)
  ).length || 0;
  const deliveryRate = (orders?.length || 0) > 0 ? Math.round((onTime / orders.length) * 100) : 0;

  // 2. 产线效率
  const { data: timings } = await client
    .from('process_timing')
    .select('takt_time, quantity_completed')
    .gte('created_at', monthStart);

  const avgTakt = timings && timings.length > 0
    ? timings.reduce((sum: number, t: any) => sum + (t.takt_time || 0), 0) / timings.length
    : 0;
  const targetTakt = 60; // 假设目标节拍60秒
  const efficiency = avgTakt > 0 ? Math.min(100, Math.round((targetTakt / avgTakt) * 100)) : 100;

  // 3. 一次合格率
  const { data: oqc } = await client
    .from('quality_oqc')
    .select('passed_qty, inspected_qty')
    .gte('created_at', monthStart);

  const totalInspected = oqc?.reduce((sum: number, o: any) => sum + (o.inspected_qty || 0), 0) || 0;
  const totalPassed = oqc?.reduce((sum: number, o: any) => sum + (o.passed_qty || 0), 0) || 0;
  const firstPassRate = totalInspected > 0 ? Math.round((totalPassed / totalInspected) * 100) : 100;

  // 4. 设备利用率（模拟）
  const utilizationRate = 85;

  return NextResponse.json({
    success: true,
    data: {
      deliveryRate,
      efficiency,
      firstPassRate,
      utilizationRate,
      period: '本月'
    }
  });
}
