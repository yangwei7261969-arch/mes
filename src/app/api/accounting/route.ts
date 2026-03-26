import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 分账系统API
 * 
 * 功能：
 * • 订单分账计算
 * • 多方利益分配
 * • 结算管理
 * • 财务对账
 * • 发票管理
 */

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'overview';

    switch (action) {
      case 'overview':
        return await getAccountingOverview(client, searchParams);
      case 'profit-sharing':
        return await getProfitSharing(client, searchParams);
      case 'settlements':
        return await listSettlements(client, searchParams);
      case 'invoices':
        return await listInvoices(client, searchParams);
      case 'transactions':
        return await listTransactions(client, searchParams);
      case 'reconciliation':
        return await reconcile(client, searchParams);
      case 'report':
        return await generateReport(client, searchParams);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Accounting API error:', error);
    return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'create-settlement':
        return await createSettlement(client, data);
      case 'confirm-settlement':
        return await confirmSettlement(client, data);
      case 'create-invoice':
        return await createInvoice(client, data);
      case 'record-payment':
        return await recordPayment(client, data);
      case 'adjust':
        return await adjustAccounting(client, data);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Accounting operation error:', error);
    return NextResponse.json({ success: false, error: '操作失败' }, { status: 500 });
  }
}

/**
 * 分账概览
 */
async function getAccountingOverview(client: any, searchParams: URLSearchParams) {
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get('month') || '0');

  const startDate = month > 0 
    ? `${year}-${month.toString().padStart(2, '0')}-01`
    : `${year}-01-01`;
  const endDate = month > 0 
    ? `${year}-${(month + 1).toString().padStart(2, '0')}-01`
    : `${year + 1}-01-01`;

  // 收入统计
  const { data: orders } = await client
    .from('production_orders')
    .select('total_amount, status')
    .gte('delivery_date', startDate)
    .lt('delivery_date', endDate)
    .eq('status', 'completed');

  const totalRevenue = orders?.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0;

  // 成本统计
  const { data: costs } = await client
    .from('order_costs')
    .select('amount, cost_type')
    .gte('created_at', startDate)
    .lt('created_at', endDate);

  const costBreakdown = {
    material: costs?.filter((c: any) => c.cost_type === 'material').reduce((s: number, c: any) => s + c.amount, 0) || 0,
    labor: costs?.filter((c: any) => c.cost_type === 'labor').reduce((s: number, c: any) => s + c.amount, 0) || 0,
    overhead: costs?.filter((c: any) => c.cost_type === 'overhead').reduce((s: number, c: any) => s + c.amount, 0) || 0,
    external: costs?.filter((c: any) => c.cost_type === 'external').reduce((s: number, c: any) => s + c.amount, 0) || 0
  };

  const totalCost = Object.values(costBreakdown).reduce((a: number, b: any) => a + b, 0) as number;

  // 待结算
  const { data: pendingSettlements } = await client
    .from('settlements')
    .select('settlement_amount')
    .eq('status', 'pending');

  const pendingAmount = pendingSettlements?.reduce((sum: number, s: any) => sum + (s.settlement_amount || 0), 0) || 0;

  // 待收款
  const { data: receivables } = await client
    .from('invoices')
    .select('amount, paid_amount')
    .eq('status', 'issued');

  const receivableAmount = receivables?.reduce((sum: number, i: any) => sum + ((i.amount || 0) - (i.paid_amount || 0)), 0) || 0;

  return NextResponse.json({
    success: true,
    data: {
      revenue: {
        total: totalRevenue,
        ordersCount: orders?.length || 0,
        avgOrderValue: orders?.length ? Math.round(totalRevenue / orders.length) : 0
      },
      costs: {
        ...costBreakdown,
        total: totalCost
      },
      profit: {
        gross: totalRevenue - totalCost,
        margin: totalRevenue > 0 ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 100) : 0
      },
      pending: {
        settlements: pendingAmount,
        receivables: receivableAmount
      },
      period: { year, month }
    }
  });
}

/**
 * 利润分配
 */
async function getProfitSharing(client: any, searchParams: URLSearchParams) {
  const orderId = searchParams.get('order_id');
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get('month') || '0');

  if (orderId) {
    return await getOrderProfitSharing(client, orderId);
  }

  // 汇总利润分配
  const startDate = month > 0 
    ? `${year}-${month.toString().padStart(2, '0')}-01`
    : `${year}-01-01`;
  const endDate = month > 0 
    ? `${year}-${(month + 1).toString().padStart(2, '0')}-01`
    : `${year + 1}-01-01`;

  const { data: distributions } = await client
    .from('profit_distributions')
    .select(`
      *,
      stakeholders (id, name, stakeholder_type)
    `)
    .gte('created_at', startDate)
    .lt('created_at', endDate);

  // 按利益方类型汇总
  const byType: Record<string, { count: number; total: number }> = {};
  distributions?.forEach((d: any) => {
    const type = d.stakeholders?.stakeholder_type || 'other';
    if (!byType[type]) {
      byType[type] = { count: 0, total: 0 };
    }
    byType[type].count++;
    byType[type].total += d.amount || 0;
  });

  return NextResponse.json({
    success: true,
    data: {
      distributions: distributions || [],
      byType,
      summary: {
        totalDistributed: distributions?.reduce((sum: number, d: any) => sum + (d.amount || 0), 0) || 0,
        stakeholderCount: Object.keys(byType).length
      }
    }
  });
}

/**
 * 订单利润分配明细
 */
async function getOrderProfitSharing(client: any, orderId: string) {
  const { data: order } = await client
    .from('production_orders')
    .select(`
      *,
      customers (id, name),
      styles (style_no, style_name)
    `)
    .eq('id', orderId)
    .single();

  if (!order) {
    return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 });
  }

  // 获取成本
  const { data: costs } = await client
    .from('order_costs')
    .select('*')
    .eq('order_id', orderId);

  // 获取分配
  const { data: distributions } = await client
    .from('profit_distributions')
    .select(`
      *,
      stakeholders (id, name, stakeholder_type)
    `)
    .eq('order_id', orderId);

  const revenue = order.total_amount || 0;
  const totalCost = costs?.reduce((sum: number, c: any) => sum + (c.amount || 0), 0) || 0;
  const profit = revenue - totalCost;

  // 分配规则
  const distributionRules = [
    { stakeholder: '工厂', type: 'factory', rate: 0.3, amount: profit * 0.3 },
    { stakeholder: '工人', type: 'worker', rate: 0.25, amount: profit * 0.25 },
    { stakeholder: '材料商', type: 'supplier', rate: 0.15, amount: profit * 0.15 },
    { stakeholder: '平台', type: 'platform', rate: 0.3, amount: profit * 0.3 }
  ];

  return NextResponse.json({
    success: true,
    data: {
      order,
      revenue,
      costs: {
        material: costs?.filter((c: any) => c.cost_type === 'material').reduce((s: number, c: any) => s + c.amount, 0) || 0,
        labor: costs?.filter((c: any) => c.cost_type === 'labor').reduce((s: number, c: any) => s + c.amount, 0) || 0,
        overhead: costs?.filter((c: any) => c.cost_type === 'overhead').reduce((s: number, c: any) => s + c.amount, 0) || 0,
        total: totalCost
      },
      profit,
      distributions: distributions || [],
      suggestedDistribution: distributionRules
    }
  });
}

/**
 * 结算列表
 */
async function listSettlements(client: any, searchParams: URLSearchParams) {
  const status = searchParams.get('status');
  const stakeholderId = searchParams.get('stakeholder_id');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  let query = client
    .from('settlements')
    .select(`
      *,
      stakeholders (id, name, stakeholder_type)
    `)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }
  if (stakeholderId) {
    query = query.eq('stakeholder_id', stakeholderId);
  }
  if (startDate) {
    query = query.gte('period_start', startDate);
  }
  if (endDate) {
    query = query.lte('period_end', endDate);
  }

  const { data, error } = await query;

  if (error) throw error;

  // 统计
  const stats = {
    total: data?.length || 0,
    pending: data?.filter((s: any) => s.status === 'pending').length || 0,
    completed: data?.filter((s: any) => s.status === 'completed').length || 0,
    totalAmount: data?.reduce((sum: number, s: any) => sum + (s.settlement_amount || 0), 0) || 0,
    pendingAmount: data?.filter((s: any) => s.status === 'pending').reduce((sum: number, s: any) => sum + (s.settlement_amount || 0), 0) || 0
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
 * 发票列表
 */
async function listInvoices(client: any, searchParams: URLSearchParams) {
  const status = searchParams.get('status');
  const customerId = searchParams.get('customer_id');

  let query = client
    .from('invoices')
    .select(`
      *,
      customers (id, name),
      production_orders (order_no)
    `)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }
  if (customerId) {
    query = query.eq('customer_id', customerId);
  }

  const { data, error } = await query;

  if (error) throw error;

  // 统计
  const stats = {
    total: data?.length || 0,
    draft: data?.filter((i: any) => i.status === 'draft').length || 0,
    issued: data?.filter((i: any) => i.status === 'issued').length || 0,
    paid: data?.filter((i: any) => i.status === 'paid').length || 0,
    totalAmount: data?.reduce((sum: number, i: any) => sum + (i.amount || 0), 0) || 0,
    paidAmount: data?.reduce((sum: number, i: any) => sum + (i.paid_amount || 0), 0) || 0
  };

  return NextResponse.json({
    success: true,
    data: {
      invoices: data || [],
      stats
    }
  });
}

/**
 * 交易记录
 */
async function listTransactions(client: any, searchParams: URLSearchParams) {
  const type = searchParams.get('type'); // income, expense
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  let query = client
    .from('transactions')
    .select('*')
    .order('transaction_date', { ascending: false });

  if (type) {
    query = query.eq('transaction_type', type);
  }
  if (startDate) {
    query = query.gte('transaction_date', startDate);
  }
  if (endDate) {
    query = query.lte('transaction_date', endDate);
  }

  const { data, error } = await query;

  if (error) throw error;

  // 按类型汇总
  const income = data?.filter((t: any) => t.transaction_type === 'income').reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;
  const expense = data?.filter((t: any) => t.transaction_type === 'expense').reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;

  return NextResponse.json({
    success: true,
    data: {
      transactions: data || [],
      summary: {
        income,
        expense,
        net: income - expense,
        count: data?.length || 0
      }
    }
  });
}

/**
 * 对账
 */
async function reconcile(client: any, searchParams: URLSearchParams) {
  const orderId = searchParams.get('order_id');
  const customerId = searchParams.get('customer_id');

  if (orderId) {
    return await reconcileOrder(client, orderId);
  }

  if (customerId) {
    return await reconcileCustomer(client, customerId);
  }

  // 全面对账
  const { data: orders } = await client
    .from('production_orders')
    .select('id, order_no, total_amount, status')
    .in('status', ['completed', 'shipped']);

  const reconciliations = [];

  for (const order of orders || []) {
    const { data: invoices } = await client
      .from('invoices')
      .select('amount, paid_amount, status')
      .eq('order_id', order.id);

    const totalInvoiced = invoices?.reduce((sum: number, i: any) => sum + (i.amount || 0), 0) || 0;
    const totalPaid = invoices?.reduce((sum: number, i: any) => sum + (i.paid_amount || 0), 0) || 0;

    reconciliations.push({
      orderId: order.id,
      orderNo: order.order_no,
      orderAmount: order.total_amount,
      invoicedAmount: totalInvoiced,
      paidAmount: totalPaid,
      discrepancy: order.total_amount - totalInvoiced,
      status: totalPaid >= order.total_amount ? 'settled' : totalPaid > 0 ? 'partial' : 'unpaid'
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      reconciliations,
      summary: {
        totalOrders: reconciliations.length,
        settled: reconciliations.filter(r => r.status === 'settled').length,
        partial: reconciliations.filter(r => r.status === 'partial').length,
        unpaid: reconciliations.filter(r => r.status === 'unpaid').length,
        totalDiscrepancy: reconciliations.reduce((sum, r) => sum + r.discrepancy, 0)
      }
    }
  });
}

/**
 * 生成报告
 */
async function generateReport(client: any, searchParams: URLSearchParams) {
  const type = searchParams.get('type') || 'monthly';
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  const endDate = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;

  // 收入明细
  const { data: revenueData } = await client
    .from('production_orders')
    .select(`
      order_no, total_amount, delivery_date,
      customers (name),
      styles (style_no, style_name)
    `)
    .gte('delivery_date', startDate)
    .lt('delivery_date', endDate)
    .eq('status', 'completed');

  // 成本明细
  const { data: costData } = await client
    .from('order_costs')
    .select('*')
    .gte('created_at', startDate)
    .lt('created_at', endDate);

  // 利润分配
  const { data: distributions } = await client
    .from('profit_distributions')
    .select(`
      *,
      stakeholders (name, stakeholder_type)
    `)
    .gte('created_at', startDate)
    .lt('created_at', endDate);

  const totalRevenue = revenueData?.reduce((sum: number, r: any) => sum + (r.total_amount || 0), 0) || 0;
  const totalCost = costData?.reduce((sum: number, c: any) => sum + (c.amount || 0), 0) || 0;
  const totalProfit = totalRevenue - totalCost;

  return NextResponse.json({
    success: true,
    data: {
      reportType: type,
      period: { year, month },
      revenue: {
        total: totalRevenue,
        details: revenueData || []
      },
      costs: {
        total: totalCost,
        byType: {
          material: costData?.filter((c: any) => c.cost_type === 'material').reduce((s: number, c: any) => s + c.amount, 0) || 0,
          labor: costData?.filter((c: any) => c.cost_type === 'labor').reduce((s: number, c: any) => s + c.amount, 0) || 0,
          overhead: costData?.filter((c: any) => c.cost_type === 'overhead').reduce((s: number, c: any) => s + c.amount, 0) || 0
        },
        details: costData || []
      },
      profit: {
        total: totalProfit,
        margin: totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0
      },
      distributions: distributions || [],
      generatedAt: new Date().toISOString()
    }
  });
}

/**
 * 创建结算
 */
async function createSettlement(client: any, data: any) {
  const { stakeholderId, periodStart, periodEnd, items, notes } = data;

  // 计算结算金额
  const settlementAmount = items?.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) || 0;

  const settlement = {
    stakeholder_id: stakeholderId,
    period_start: periodStart,
    period_end: periodEnd,
    settlement_amount: settlementAmount,
    items,
    status: 'pending',
    notes,
    created_at: new Date().toISOString()
  };

  const { data: created, error } = await client
    .from('settlements')
    .insert(settlement)
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: created,
    message: '结算单已创建'
  });
}

/**
 * 确认结算
 */
async function confirmSettlement(client: any, data: any) {
  const { settlementId, paymentMethod, transactionRef } = data;

  const { data: settlement, error } = await client
    .from('settlements')
    .update({
      status: 'completed',
      payment_method: paymentMethod,
      transaction_ref: transactionRef,
      settled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', settlementId)
    .select()
    .single();

  if (error) throw error;

  // 记录交易
  await client
    .from('transactions')
    .insert({
      transaction_type: 'expense',
      amount: settlement.settlement_amount,
      reference_type: 'settlement',
      reference_id: settlementId,
      stakeholder_id: settlement.stakeholder_id,
      transaction_date: new Date().toISOString(),
      notes: `结算单${settlementId}付款`
    });

  return NextResponse.json({
    success: true,
    data: settlement,
    message: '结算已确认'
  });
}

/**
 * 创建发票
 */
async function createInvoice(client: any, data: any) {
  const { orderId, customerId, items, dueDate, notes } = data;

  const amount = items?.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) || 0;

  const invoice = {
    invoice_no: `INV${Date.now().toString(36).toUpperCase()}`,
    order_id: orderId,
    customer_id: customerId,
    amount,
    items,
    due_date: dueDate,
    status: 'draft',
    notes,
    created_at: new Date().toISOString()
  };

  const { data: created, error } = await client
    .from('invoices')
    .insert(invoice)
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: created,
    message: '发票已创建'
  });
}

/**
 * 记录付款
 */
async function recordPayment(client: any, data: any) {
  const { invoiceId, amount, paymentMethod, transactionRef, notes } = data;

  const { data: invoice } = await client
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (!invoice) {
    return NextResponse.json({ success: false, error: '发票不存在' }, { status: 404 });
  }

  const newPaidAmount = (invoice.paid_amount || 0) + amount;
  const status = newPaidAmount >= invoice.amount ? 'paid' : 'partial';

  const { data: updated, error } = await client
    .from('invoices')
    .update({
      paid_amount: newPaidAmount,
      status,
      payment_method: paymentMethod,
      transaction_ref: transactionRef,
      paid_at: status === 'paid' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq('id', invoiceId)
    .select()
    .single();

  if (error) throw error;

  // 记录交易
  await client
    .from('transactions')
    .insert({
      transaction_type: 'income',
      amount,
      reference_type: 'invoice',
      reference_id: invoiceId,
      stakeholder_id: invoice.customer_id,
      transaction_date: new Date().toISOString(),
      notes: notes || `发票${invoice.invoice_no}收款`
    });

  return NextResponse.json({
    success: true,
    data: updated,
    message: '付款已记录'
  });
}

/**
 * 账务调整
 */
async function adjustAccounting(client: any, data: any) {
  const { type, referenceId, adjustmentAmount, reason } = data;

  const adjustment = {
    adjustment_type: type,
    reference_id: referenceId,
    adjustment_amount: adjustmentAmount,
    reason,
    created_at: new Date().toISOString()
  };

  const { data: created, error } = await client
    .from('accounting_adjustments')
    .insert(adjustment)
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: created,
    message: '调整已记录'
  });
}

// 辅助函数
async function reconcileOrder(client: any, orderId: string) {
  const { data: order } = await client
    .from('production_orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (!order) {
    return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 });
  }

  const { data: costs } = await client
    .from('order_costs')
    .select('*')
    .eq('order_id', orderId);

  const { data: invoices } = await client
    .from('invoices')
    .select('*')
    .eq('order_id', orderId);

  const { data: distributions } = await client
    .from('profit_distributions')
    .select('*')
    .eq('order_id', orderId);

  const totalCost = costs?.reduce((sum: number, c: any) => sum + (c.amount || 0), 0) || 0;
  const totalInvoiced = invoices?.reduce((sum: number, i: any) => sum + (i.amount || 0), 0) || 0;
  const totalPaid = invoices?.reduce((sum: number, i: any) => sum + (i.paid_amount || 0), 0) || 0;
  const totalDistributed = distributions?.reduce((sum: number, d: any) => sum + (d.amount || 0), 0) || 0;

  return NextResponse.json({
    success: true,
    data: {
      order,
      costs: {
        total: totalCost,
        details: costs || []
      },
      invoices: {
        total: totalInvoiced,
        paid: totalPaid,
        details: invoices || []
      },
      profit: {
        gross: (order.total_amount || 0) - totalCost,
        distributed: totalDistributed,
        remaining: (order.total_amount || 0) - totalCost - totalDistributed
      },
      reconciliation: {
        orderAmount: order.total_amount,
        invoicedAmount: totalInvoiced,
        paidAmount: totalPaid,
        costAmount: totalCost,
        invoiceDiscrepancy: (order.total_amount || 0) - totalInvoiced,
        paymentDiscrepancy: totalInvoiced - totalPaid
      }
    }
  });
}

async function reconcileCustomer(client: any, customerId: string) {
  const { data: orders } = await client
    .from('production_orders')
    .select('*')
    .eq('customer_id', customerId);

  const { data: invoices } = await client
    .from('invoices')
    .select('*')
    .eq('customer_id', customerId);

  const totalOrderAmount = orders?.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0;
  const totalInvoiced = invoices?.reduce((sum: number, i: any) => sum + (i.amount || 0), 0) || 0;
  const totalPaid = invoices?.reduce((sum: number, i: any) => sum + (i.paid_amount || 0), 0) || 0;

  return NextResponse.json({
    success: true,
    data: {
      customerId,
      orders: orders || [],
      invoices: invoices || [],
      summary: {
        totalOrderAmount,
        totalInvoiced,
        totalPaid,
        receivable: totalInvoiced - totalPaid,
        uninvoiced: totalOrderAmount - totalInvoiced
      }
    }
  });
}
