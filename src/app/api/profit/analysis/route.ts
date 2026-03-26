import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取利润分析数据
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'orders'; // orders/customers/styles/alerts/summary
    const period = searchParams.get('period') || 'month'; // day/week/month/year
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const customerId = searchParams.get('customer_id');
    const styleId = searchParams.get('style_id');

    switch (type) {
      case 'orders':
        return await getOrderProfits(client, { startDate, endDate, customerId, styleId });
      case 'customers':
        return await getCustomerProfits(client, { period, startDate, endDate });
      case 'styles':
        return await getStyleProfits(client, { period, startDate, endDate });
      case 'alerts':
        return await getProfitAlerts(client, { startDate, endDate });
      case 'summary':
        return await getProfitSummary(client, { period, startDate, endDate });
      default:
        return NextResponse.json({ success: false, error: '无效的类型' }, { status: 400 });
    }
  } catch (error) {
    console.error('Get profit analysis error:', error);
    return NextResponse.json({ success: false, error: '获取数据失败' }, { status: 500 });
  }
}

// 获取订单利润列表
async function getOrderProfits(
  client: any,
  filters: { startDate?: string | null; endDate?: string | null; customerId?: string | null; styleId?: string | null }
) {
  let query = client
    .from('order_costs')
    .select(`
      *,
      production_orders(
        id, order_code, status, created_at,
        styles(id, style_code, style_name),
        customers(id, name, code)
      )
    `)
    .order('created_at', { ascending: false });

  // 应用过滤器
  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }
  if (filters.customerId) {
    query = query.eq('production_orders.customer_id', filters.customerId);
  }
  if (filters.styleId) {
    query = query.eq('production_orders.style_id', filters.styleId);
  }

  const { data, error } = await query.limit(100);

  if (error) {
    return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 });
  }

  // 格式化数据
  const orders = (data || []).map((item: any) => ({
    ...item,
    order_code: item.production_orders?.order_code,
    style_name: item.production_orders?.styles?.style_name,
    customer_name: item.production_orders?.customers?.name,
    order_status: item.production_orders?.status,
  }));

  return NextResponse.json({ success: true, data: orders });
}

// 获取客户利润汇总
async function getCustomerProfits(
  client: any,
  filters: { period: string; startDate?: string | null; endDate?: string | null }
) {
  // 直接从order_costs汇总
  const { data: costs, error } = await client
    .from('order_costs')
    .select(`
      order_amount, total_cost, gross_profit, profit_rate, quantity,
      production_orders!inner(
        customer_id, created_at,
        customers(id, name, code)
      )
    `)
    .eq('cost_status', 'calculated');

  if (error) {
    return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 });
  }

  // 按客户汇总
  const customerMap = new Map();

  for (const cost of costs || []) {
    const customerId = cost.production_orders?.customer_id;
    const customer = cost.production_orders?.customers;

    if (!customerId) continue;

    // 日期过滤
    if (filters.startDate && cost.production_orders?.created_at < filters.startDate) continue;
    if (filters.endDate && cost.production_orders?.created_at > filters.endDate) continue;

    if (!customerMap.has(customerId)) {
      customerMap.set(customerId, {
        customer_id: customerId,
        customer_name: customer?.name || '',
        customer_code: customer?.code || '',
        total_orders: 0,
        total_quantity: 0,
        total_revenue: 0,
        total_cost: 0,
        total_profit: 0,
        orders: [],
      });
    }

    const summary = customerMap.get(customerId);
    summary.total_orders += 1;
    summary.total_quantity += cost.quantity || 0;
    summary.total_revenue += cost.order_amount || 0;
    summary.total_cost += cost.total_cost || 0;
    summary.total_profit += cost.gross_profit || 0;
  }

  // 计算利润率并排序
  const result = Array.from(customerMap.values()).map((item) => ({
    ...item,
    avg_profit_rate: item.total_revenue > 0 
      ? (item.total_profit / item.total_revenue * 100).toFixed(2)
      : 0,
    avg_unit_profit: item.total_quantity > 0
      ? (item.total_profit / item.total_quantity).toFixed(2)
      : 0,
  })).sort((a, b) => b.total_profit - a.total_profit);

  return NextResponse.json({ success: true, data: result });
}

// 获取款式利润汇总
async function getStyleProfits(
  client: any,
  filters: { period: string; startDate?: string | null; endDate?: string | null }
) {
  const { data: costs, error } = await client
    .from('order_costs')
    .select(`
      order_amount, total_cost, gross_profit, profit_rate, quantity, unit_cost, unit_profit,
      production_orders!inner(
        style_id, created_at,
        styles(id, style_code, style_name)
      )
    `)
    .eq('cost_status', 'calculated');

  if (error) {
    return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 });
  }

  // 按款式汇总
  const styleMap = new Map();

  for (const cost of costs || []) {
    const styleId = cost.production_orders?.style_id;
    const style = cost.production_orders?.styles;

    if (!styleId) continue;

    // 日期过滤
    if (filters.startDate && cost.production_orders?.created_at < filters.startDate) continue;
    if (filters.endDate && cost.production_orders?.created_at > filters.endDate) continue;

    if (!styleMap.has(styleId)) {
      styleMap.set(styleId, {
        style_id: styleId,
        style_code: style?.style_code || '',
        style_name: style?.style_name || '',
        total_orders: 0,
        total_quantity: 0,
        total_revenue: 0,
        total_cost: 0,
        total_profit: 0,
      });
    }

    const summary = styleMap.get(styleId);
    summary.total_orders += 1;
    summary.total_quantity += cost.quantity || 0;
    summary.total_revenue += cost.order_amount || 0;
    summary.total_cost += cost.total_cost || 0;
    summary.total_profit += cost.gross_profit || 0;
  }

  // 计算利润率并排序
  const result = Array.from(styleMap.values()).map((item) => ({
    ...item,
    avg_profit_rate: item.total_revenue > 0 
      ? (item.total_profit / item.total_revenue * 100).toFixed(2)
      : 0,
    avg_unit_cost: item.total_quantity > 0
      ? (item.total_cost / item.total_quantity).toFixed(2)
      : 0,
    avg_unit_profit: item.total_quantity > 0
      ? (item.total_profit / item.total_quantity).toFixed(2)
      : 0,
  })).sort((a, b) => b.total_profit - a.total_profit);

  return NextResponse.json({ success: true, data: result });
}

// 获取利润预警
async function getProfitAlerts(
  client: any,
  filters: { startDate?: string | null; endDate?: string | null }
) {
  let query = client
    .from('profit_alerts')
    .select(`
      *,
      production_orders(order_code),
      styles(style_code, style_name),
      customers(name)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  const { data, error } = await query.limit(50);

  if (error) {
    return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data || [] });
}

// 获取利润总览
async function getProfitSummary(
  client: any,
  filters: { period: string; startDate?: string | null; endDate?: string | null }
) {
  const { data: costs, error } = await client
    .from('order_costs')
    .select(`
      order_amount, total_cost, gross_profit, profit_rate, quantity,
      material_cost, labor_cost, outsource_cost, shipping_cost,
      production_orders(created_at, status)
    `)
    .eq('cost_status', 'calculated');

  if (error) {
    return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 });
  }

  // 日期过滤
  let filteredCosts = costs || [];
  if (filters.startDate) {
    filteredCosts = filteredCosts.filter((c: any) => 
      c.production_orders?.created_at >= filters.startDate!
    );
  }
  if (filters.endDate) {
    filteredCosts = filteredCosts.filter((c: any) => 
      c.production_orders?.created_at <= filters.endDate!
    );
  }

  // 汇总
  const summary: any = {
    total_orders: filteredCosts.length,
    total_quantity: filteredCosts.reduce((sum: number, c: any) => sum + (c.quantity || 0), 0),
    total_revenue: filteredCosts.reduce((sum: number, c: any) => sum + (c.order_amount || 0), 0),
    total_cost: filteredCosts.reduce((sum: number, c: any) => sum + (c.total_cost || 0), 0),
    total_profit: filteredCosts.reduce((sum: number, c: any) => sum + (c.gross_profit || 0), 0),
    
    // 成本明细
    cost_breakdown: {
      material: filteredCosts.reduce((sum: number, c: any) => sum + (c.material_cost || 0), 0),
      labor: filteredCosts.reduce((sum: number, c: any) => sum + (c.labor_cost || 0), 0),
      outsource: filteredCosts.reduce((sum: number, c: any) => sum + (c.outsource_cost || 0), 0),
      shipping: filteredCosts.reduce((sum: number, c: any) => sum + (c.shipping_cost || 0), 0),
    },

    // 统计
    profit_orders: filteredCosts.filter((c: any) => (c.gross_profit || 0) > 0).length,
    loss_orders: filteredCosts.filter((c: any) => (c.gross_profit || 0) < 0).length,
    low_profit_orders: filteredCosts.filter((c: any) => 
      (c.profit_rate || 0) >= 0 && (c.profit_rate || 0) < 10
    ).length,
  };

  // 计算利润率
  summary.avg_profit_rate = summary.total_revenue > 0
    ? (summary.total_profit / summary.total_revenue * 100).toFixed(2)
    : 0;

  // 成本占比
  const costTotal = summary.total_cost || 1;
  summary.cost_percentage = {
    material: ((summary.cost_breakdown.material / costTotal) * 100).toFixed(1),
    labor: ((summary.cost_breakdown.labor / costTotal) * 100).toFixed(1),
    outsource: ((summary.cost_breakdown.outsource / costTotal) * 100).toFixed(1),
    shipping: ((summary.cost_breakdown.shipping / costTotal) * 100).toFixed(1),
  };

  return NextResponse.json({ success: true, data: summary });
}

// 批量核算订单成本
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { order_ids } = body;

    if (!order_ids || !Array.isArray(order_ids)) {
      return NextResponse.json({ success: false, error: '请提供订单ID列表' }, { status: 400 });
    }

    const results = [];

    for (const orderId of order_ids) {
      try {
        // 调用核算逻辑
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/profit/calculate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId }),
        });

        const result = await response.json();
        results.push({
          order_id: orderId,
          success: result.success,
          message: result.success ? '核算成功' : result.error,
        });
      } catch (err) {
        results.push({
          order_id: orderId,
          success: false,
          message: '核算失败',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      message: `成功核算 ${successCount}/${order_ids.length} 个订单`,
      results,
    });
  } catch (error) {
    console.error('Batch calculate error:', error);
    return NextResponse.json({ success: false, error: '批量核算失败' }, { status: 500 });
  }
}
