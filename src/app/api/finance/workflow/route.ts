import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 财务管理业务闭环API
 * 
 * 财务流程：
 * 订单完成 → 生成应收 → 开票 → 收款 → 对账 → 核销
 * 采购入库 → 生成应付 → 收票 → 付款 → 对账 → 核销
 * 
 * 账单类型：
 * - receivable: 应收账款（客户欠款）
 * - payable: 应付账款（供应商欠款）
 * 
 * 账单状态：
 * pending → partial → paid → verified
 */

const client = getSupabaseClient();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'overview';

  try {
    switch (action) {
      case 'overview':
        return getFinanceOverview();
      
      case 'receivables':
        return getReceivables(searchParams);
      
      case 'payables':
        return getPayables(searchParams);
      
      case 'aging':
        return getAgingReport();
      
      case 'cash-flow':
        return getCashFlow(searchParams);
      
      case 'statistics':
        return getFinanceStatistics();
      
      default:
        return NextResponse.json({ error: '未知操作' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    let result;

    switch (action) {
      case 'generate-receivable':
        result = await generateReceivable(data);
        break;
      
      case 'generate-payable':
        result = await generatePayable(data);
        break;
      
      case 'receive-payment':
        result = await receivePayment(data);
        break;
      
      case 'make-payment':
        result = await makePayment(data);
        break;
      
      case 'verify-bill':
        result = await verifyBill(data);
        break;
      
      case 'write-off':
        result = await writeOffBill(data);
        break;
      
      case 'adjust-bill':
        result = await adjustBill(data);
        break;
      
      case 'batch-generate':
        result = await batchGenerateBills(data);
        break;
      
      default:
        return NextResponse.json({ error: '未知操作' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// ============================================
// 财务概览
// ============================================

async function getFinanceOverview() {
  const today = new Date().toISOString();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  // 应收账款统计
  const { data: receivables } = await client
    .from('bills')
    .select('amount, paid_amount, due_date, status')
    .eq('bill_type', 'receivable');

  const totalReceivable = receivables?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0;
  const receivedAmount = receivables?.reduce((sum, b) => sum + (b.paid_amount || 0), 0) || 0;
  const outstandingReceivable = totalReceivable - receivedAmount;

  // 应付账款统计
  const { data: payables } = await client
    .from('bills')
    .select('amount, paid_amount, due_date, status')
    .eq('bill_type', 'payable');

  const totalPayable = payables?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0;
  const paidAmount = payables?.reduce((sum, b) => sum + (b.paid_amount || 0), 0) || 0;
  const outstandingPayable = totalPayable - paidAmount;

  // 本月收入
  const { data: monthReceives } = await client
    .from('payment_records')
    .select('amount')
    .eq('type', 'receive')
    .gte('payment_date', monthStart);

  const monthIncome = monthReceives?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;

  // 本月支出
  const { data: monthPayments } = await client
    .from('payment_records')
    .select('amount')
    .eq('type', 'payment')
    .gte('payment_date', monthStart);

  const monthExpense = monthPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

  // 逾期账款
  const overdueReceivable = receivables?.filter(b => 
    new Date(b.due_date) < new Date() && b.status !== 'paid'
  ).reduce((sum, b) => sum + ((b.amount || 0) - (b.paid_amount || 0)), 0) || 0;

  const overduePayable = payables?.filter(b => 
    new Date(b.due_date) < new Date() && b.status !== 'paid'
  ).reduce((sum, b) => sum + ((b.amount || 0) - (b.paid_amount || 0)), 0) || 0;

  return NextResponse.json({
    success: true,
    data: {
      receivables: {
        total: totalReceivable,
        received: receivedAmount,
        outstanding: outstandingReceivable,
        overdue: overdueReceivable,
      },
      payables: {
        total: totalPayable,
        paid: paidAmount,
        outstanding: outstandingPayable,
        overdue: overduePayable,
      },
      cashFlow: {
        monthIncome,
        monthExpense,
        netCashFlow: monthIncome - monthExpense,
      },
    },
  });
}

// ============================================
// 生成应收账款
// ============================================

async function generateReceivable(data: {
  orderId: string;
  orderNo: string;
  customerId: string;
  amount: number;
  dueDate: string;
  description?: string;
}): Promise<any> {
  // 检查是否已存在账单
  const { data: existing } = await client
    .from('bills')
    .select('id')
    .eq('related_id', data.orderId)
    .eq('bill_type', 'receivable')
    .single();

  if (existing) {
    return { success: false, error: '该订单已生成应收账款' };
  }

  const billNo = `AR${Date.now().toString(36).toUpperCase()}`;

  const { data: bill, error } = await client
    .from('bills')
    .insert({
      bill_no: billNo,
      bill_type: 'receivable',
      category: '销售款',
      related_id: data.orderId,
      related_no: data.orderNo,
      customer_id: data.customerId,
      amount: data.amount,
      paid_amount: 0,
      due_date: data.dueDate,
      status: 'pending',
      description: data.description,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  // 记录财务日志
  await logFinanceAction({
    action: 'create_receivable',
    billId: bill.id,
    billNo: billNo,
    amount: data.amount,
    relatedType: 'order',
    relatedId: data.orderId,
    description: `订单 ${data.orderNo} 生成应收账款`,
  });

  return {
    success: true,
    message: '应收账款已生成',
    data: bill,
  };
}

// ============================================
// 生成应付账款
// ============================================

async function generatePayable(data: {
  relatedType: 'purchase' | 'outsource';
  relatedId: string;
  relatedNo: string;
  supplierId: string;
  amount: number;
  dueDate: string;
  category: string;
  description?: string;
}): Promise<any> {
  const billNo = `AP${Date.now().toString(36).toUpperCase()}`;

  const { data: bill, error } = await client
    .from('bills')
    .insert({
      bill_no: billNo,
      bill_type: 'payable',
      category: data.category,
      related_id: data.relatedId,
      related_no: data.relatedNo,
      supplier_id: data.supplierId,
      amount: data.amount,
      paid_amount: 0,
      due_date: data.dueDate,
      status: 'pending',
      description: data.description,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  await logFinanceAction({
    action: 'create_payable',
    billId: bill.id,
    billNo: billNo,
    amount: data.amount,
    relatedType: data.relatedType,
    relatedId: data.relatedId,
    description: `${data.relatedNo} 生成应付账款`,
  });

  return {
    success: true,
    message: '应付账款已生成',
    data: bill,
  };
}

// ============================================
// 收款
// ============================================

async function receivePayment(data: {
  billId: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  referenceNo?: string;
  bankAccount?: string;
  notes?: string;
  operator?: string;
}): Promise<any> {
  const { data: bill } = await client
    .from('bills')
    .select('*')
    .eq('id', data.billId)
    .single();

  if (!bill) {
    return { success: false, error: '账单不存在' };
  }

  if (bill.bill_type !== 'receivable') {
    return { success: false, error: '非应收账款' };
  }

  const newPaidAmount = (bill.paid_amount || 0) + data.amount;
  const newStatus = newPaidAmount >= bill.amount ? 'paid' : 'partial';

  // 更新账单
  await client
    .from('bills')
    .update({
      paid_amount: newPaidAmount,
      status: newStatus,
      paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.billId);

  // 记录收款
  const paymentNo = `RCV${Date.now().toString(36).toUpperCase()}`;
  await client.from('payment_records').insert({
    payment_no: paymentNo,
    bill_id: data.billId,
    type: 'receive',
    amount: data.amount,
    payment_method: data.paymentMethod,
    payment_date: data.paymentDate,
    reference_no: data.referenceNo,
    bank_account: data.bankAccount,
    notes: data.notes,
    operator: data.operator,
    created_at: new Date().toISOString(),
  });

  await logFinanceAction({
    action: 'receive_payment',
    billId: data.billId,
    billNo: bill.bill_no,
    amount: data.amount,
    relatedType: 'payment',
    description: `收款 ${data.amount} 元`,
  });

  // 如果是客户，更新客户信用记录
  if (bill.customer_id) {
    await updateCustomerCredit(bill.customer_id, data.amount);
  }

  return {
    success: true,
    message: newStatus === 'paid' ? '收款完成' : '部分收款',
    data: {
      paidAmount: newPaidAmount,
      totalAmount: bill.amount,
      remaining: bill.amount - newPaidAmount,
      status: newStatus,
    },
  };
}

// ============================================
// 付款
// ============================================

async function makePayment(data: {
  billId: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  referenceNo?: string;
  bankAccount?: string;
  notes?: string;
  operator?: string;
}): Promise<any> {
  const { data: bill } = await client
    .from('bills')
    .select('*')
    .eq('id', data.billId)
    .single();

  if (!bill) {
    return { success: false, error: '账单不存在' };
  }

  if (bill.bill_type !== 'payable') {
    return { success: false, error: '非应付账款' };
  }

  const newPaidAmount = (bill.paid_amount || 0) + data.amount;
  const newStatus = newPaidAmount >= bill.amount ? 'paid' : 'partial';

  // 更新账单
  await client
    .from('bills')
    .update({
      paid_amount: newPaidAmount,
      status: newStatus,
      paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.billId);

  // 记录付款
  const paymentNo = `PAY${Date.now().toString(36).toUpperCase()}`;
  await client.from('payment_records').insert({
    payment_no: paymentNo,
    bill_id: data.billId,
    type: 'payment',
    amount: data.amount,
    payment_method: data.paymentMethod,
    payment_date: data.paymentDate,
    reference_no: data.referenceNo,
    bank_account: data.bankAccount,
    notes: data.notes,
    operator: data.operator,
    created_at: new Date().toISOString(),
  });

  await logFinanceAction({
    action: 'make_payment',
    billId: data.billId,
    billNo: bill.bill_no,
    amount: data.amount,
    relatedType: 'payment',
    description: `付款 ${data.amount} 元`,
  });

  return {
    success: true,
    message: newStatus === 'paid' ? '付款完成' : '部分付款',
    data: {
      paidAmount: newPaidAmount,
      totalAmount: bill.amount,
      remaining: bill.amount - newPaidAmount,
      status: newStatus,
    },
  };
}

// ============================================
// 核销账单
// ============================================

async function verifyBill(data: {
  billId: string;
  verifiedBy: string;
  notes?: string;
}): Promise<any> {
  const { data: bill } = await client
    .from('bills')
    .select('*')
    .eq('id', data.billId)
    .single();

  if (!bill) {
    return { success: false, error: '账单不存在' };
  }

  if (bill.status !== 'paid') {
    return { success: false, error: '账单未完成支付' };
  }

  await client
    .from('bills')
    .update({
      status: 'verified',
      verified_at: new Date().toISOString(),
      verified_by: data.verifiedBy,
      verify_notes: data.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.billId);

  await logFinanceAction({
    action: 'verify_bill',
    billId: data.billId,
    billNo: bill.bill_no,
    amount: bill.amount,
    relatedType: 'verification',
    description: '账单核销',
  });

  return {
    success: true,
    message: '账单已核销',
  };
}

// ============================================
// 坏账核销
// ============================================

async function writeOffBill(data: {
  billId: string;
  writeOffAmount: number;
  reason: string;
  approvedBy: string;
}): Promise<any> {
  const { data: bill } = await client
    .from('bills')
    .select('*')
    .eq('id', data.billId)
    .single();

  if (!bill) {
    return { success: false, error: '账单不存在' };
  }

  const remainingAmount = bill.amount - (bill.paid_amount || 0);
  
  if (data.writeOffAmount > remainingAmount) {
    return { success: false, error: '核销金额超过剩余金额' };
  }

  // 更新账单
  const newPaidAmount = (bill.paid_amount || 0) + data.writeOffAmount;
  const newStatus = newPaidAmount >= bill.amount ? 'written_off' : 'partial';

  await client
    .from('bills')
    .update({
      paid_amount: newPaidAmount,
      status: newStatus,
      write_off_amount: data.writeOffAmount,
      write_off_reason: data.reason,
      write_off_at: new Date().toISOString(),
      write_off_by: data.approvedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.billId);

  await logFinanceAction({
    action: 'write_off',
    billId: data.billId,
    billNo: bill.bill_no,
    amount: data.writeOffAmount,
    relatedType: 'write_off',
    description: `坏账核销: ${data.reason}`,
  });

  return {
    success: true,
    message: '坏账已核销',
  };
}

// ============================================
// 账单调整
// ============================================

async function adjustBill(data: {
  billId: string;
  adjustmentAmount: number;
  reason: string;
  adjustedBy: string;
}): Promise<any> {
  const { data: bill } = await client
    .from('bills')
    .select('*')
    .eq('id', data.billId)
    .single();

  if (!bill) {
    return { success: false, error: '账单不存在' };
  }

  const newAmount = bill.amount + data.adjustmentAmount;

  if (newAmount < bill.paid_amount) {
    return { success: false, error: '调整后金额不能小于已付金额' };
  }

  await client
    .from('bills')
    .update({
      amount: newAmount,
      adjustment_amount: (bill.adjustment_amount || 0) + data.adjustmentAmount,
      adjustment_reason: data.reason,
      adjusted_at: new Date().toISOString(),
      adjusted_by: data.adjustedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.billId);

  await logFinanceAction({
    action: 'adjust_bill',
    billId: data.billId,
    billNo: bill.bill_no,
    amount: data.adjustmentAmount,
    relatedType: 'adjustment',
    description: `账单调整: ${data.reason}`,
  });

  return {
    success: true,
    message: '账单已调整',
    data: {
      originalAmount: bill.amount,
      adjustment: data.adjustmentAmount,
      newAmount,
    },
  };
}

// ============================================
// 批量生成账单
// ============================================

async function batchGenerateBills(data: {
  type: 'order' | 'outsource' | 'purchase';
  ids: string[];
}): Promise<any> {
  const results: any[] = [];

  for (const id of data.ids) {
    try {
      if (data.type === 'order') {
        const { data: order } = await client
          .from('production_orders')
          .select('id, order_no, customer_id, total_amount, delivery_date')
          .eq('id', id)
          .single();

        if (order) {
          const result = await generateReceivable({
            orderId: order.id,
            orderNo: order.order_no,
            customerId: order.customer_id,
            amount: order.total_amount,
            dueDate: order.delivery_date,
          });
          results.push({ id, success: result.success, message: result.message });
        }
      } else if (data.type === 'outsource') {
        const { data: outsource } = await client
          .from('outsource_orders')
          .select('id, outsource_no, supplier_id, final_amount')
          .eq('id', id)
          .single();

        if (outsource && outsource.final_amount) {
          const result = await generatePayable({
            relatedType: 'outsource',
            relatedId: outsource.id,
            relatedNo: outsource.outsource_no,
            supplierId: outsource.supplier_id,
            amount: outsource.final_amount,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            category: '外发加工费',
          });
          results.push({ id, success: result.success, message: result.message });
        }
      }
    } catch (error: any) {
      results.push({ id, success: false, error: error.message });
    }
  }

  return {
    success: true,
    message: `批量生成完成，成功: ${results.filter(r => r.success).length}，失败: ${results.filter(r => !r.success).length}`,
    data: { results },
  };
}

// ============================================
// 账龄分析
// ============================================

async function getAgingReport() {
  const today = new Date();
  
  // 获取所有未结清的账单
  const { data: bills } = await client
    .from('bills')
    .select(`
      id, bill_no, bill_type, amount, paid_amount, due_date, status,
      customers (name),
      suppliers (name)
    `)
    .neq('status', 'paid')
    .neq('status', 'verified')
    .neq('status', 'written_off');

  const agingRanges = [
    { label: '未到期', min: 0, max: 0 },
    { label: '1-30天', min: 1, max: 30 },
    { label: '31-60天', min: 31, max: 60 },
    { label: '61-90天', min: 61, max: 90 },
    { label: '90天以上', min: 91, max: 9999 },
  ];

  const receivablesAging: Record<string, any[]> = {};
  const payablesAging: Record<string, any[]> = {};

  agingRanges.forEach(range => {
    receivablesAging[range.label] = [];
    payablesAging[range.label] = [];
  });

  bills?.forEach(bill => {
    const dueDate = new Date(bill.due_date);
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const remaining = bill.amount - (bill.paid_amount || 0);

    let range = agingRanges[0]; // 默认未到期
    for (const r of agingRanges) {
      if (daysOverdue >= r.min && daysOverdue <= r.max) {
        range = r;
        break;
      }
    }

    const item = {
      bill_no: bill.bill_no,
      amount: bill.amount,
      paid_amount: bill.paid_amount,
      remaining,
      days_overdue: Math.max(0, daysOverdue),
      customer: (bill.customers as any)?.name,
      supplier: (bill.suppliers as any)?.name,
    };

    if (bill.bill_type === 'receivable') {
      receivablesAging[range.label].push(item);
    } else {
      payablesAging[range.label].push(item);
    }
  });

  return NextResponse.json({
    success: true,
    data: {
      receivablesAging,
      payablesAging,
      summary: {
        receivables: Object.entries(receivablesAging).map(([label, items]) => ({
          range: label,
          count: items.length,
          amount: items.reduce((sum, i) => sum + i.remaining, 0),
        })),
        payables: Object.entries(payablesAging).map(([label, items]) => ({
          range: label,
          count: items.length,
          amount: items.reduce((sum, i) => sum + i.remaining, 0),
        })),
      },
    },
  });
}

// ============================================
// 现金流查询
// ============================================

async function getCashFlow(searchParams: URLSearchParams) {
  const startDate = searchParams.get('start_date') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const endDate = searchParams.get('end_date') || new Date().toISOString();

  const { data: payments } = await client
    .from('payment_records')
    .select('*')
    .gte('payment_date', startDate)
    .lte('payment_date', endDate)
    .order('payment_date', { ascending: true });

  const incomeByDate: Record<string, number> = {};
  const expenseByDate: Record<string, number> = {};

  payments?.forEach(p => {
    const date = p.payment_date.split('T')[0];
    if (p.type === 'receive') {
      incomeByDate[date] = (incomeByDate[date] || 0) + p.amount;
    } else {
      expenseByDate[date] = (expenseByDate[date] || 0) + p.amount;
    }
  });

  const allDates = [...new Set([...Object.keys(incomeByDate), ...Object.keys(expenseByDate)])].sort();

  const cashFlowData = allDates.map(date => ({
    date,
    income: incomeByDate[date] || 0,
    expense: expenseByDate[date] || 0,
    net: (incomeByDate[date] || 0) - (expenseByDate[date] || 0),
  }));

  return NextResponse.json({
    success: true,
    data: {
      startDate,
      endDate,
      cashFlow: cashFlowData,
      summary: {
        totalIncome: Object.values(incomeByDate).reduce((a, b) => a + b, 0),
        totalExpense: Object.values(expenseByDate).reduce((a, b) => a + b, 0),
        netCashFlow: Object.values(incomeByDate).reduce((a, b) => a + b, 0) - Object.values(expenseByDate).reduce((a, b) => a + b, 0),
      },
    },
  });
}

// ============================================
// 财务统计
// ============================================

async function getFinanceStatistics() {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();

  // 本月收入统计
  const { data: monthIncome } = await client
    .from('payment_records')
    .select('amount')
    .eq('type', 'receive')
    .gte('payment_date', monthStart);

  // 本年收入统计
  const { data: yearIncome } = await client
    .from('payment_records')
    .select('amount')
    .eq('type', 'receive')
    .gte('payment_date', yearStart);

  // 本月支出统计
  const { data: monthExpense } = await client
    .from('payment_records')
    .select('amount')
    .eq('type', 'payment')
    .gte('payment_date', monthStart);

  // 本年支出统计
  const { data: yearExpense } = await client
    .from('payment_records')
    .select('amount')
    .eq('type', 'payment')
    .gte('payment_date', yearStart);

  return NextResponse.json({
    success: true,
    data: {
      month: {
        income: monthIncome?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0,
        expense: monthExpense?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0,
      },
      year: {
        income: yearIncome?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0,
        expense: yearExpense?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0,
      },
    },
  });
}

// ============================================
// 应收账款列表
// ============================================

async function getReceivables(searchParams: URLSearchParams) {
  const status = searchParams.get('status');
  const customerId = searchParams.get('customer_id');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('page_size') || '20');

  let query = client
    .from('bills')
    .select(`
      *, customers (id, name, code)
    `, { count: 'exact' })
    .eq('bill_type', 'receivable')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  if (customerId) {
    query = query.eq('customer_id', customerId);
  }

  const { data, error, count } = await query
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: {
      bills: data,
      pagination: { page, pageSize, total: count || 0 },
    },
  });
}

// ============================================
// 应付账款列表
// ============================================

async function getPayables(searchParams: URLSearchParams) {
  const status = searchParams.get('status');
  const supplierId = searchParams.get('supplier_id');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('page_size') || '20');

  let query = client
    .from('bills')
    .select(`
      *, suppliers (id, name, code)
    `, { count: 'exact' })
    .eq('bill_type', 'payable')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  if (supplierId) {
    query = query.eq('supplier_id', supplierId);
  }

  const { data, error, count } = await query
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: {
      bills: data,
      pagination: { page, pageSize, total: count || 0 },
    },
  });
}

// ============================================
// 辅助函数
// ============================================

async function logFinanceAction(params: {
  action: string;
  billId: string;
  billNo: string;
  amount: number;
  relatedType: string;
  relatedId?: string;
  description: string;
}): Promise<void> {
  await client.from('finance_logs').insert({
    action: params.action,
    bill_id: params.billId,
    bill_no: params.billNo,
    amount: params.amount,
    related_type: params.relatedType,
    related_id: params.relatedId,
    description: params.description,
    created_at: new Date().toISOString(),
  });
}

async function updateCustomerCredit(customerId: string, amount: number): Promise<void> {
  // 更新客户的累计交易额
  try {
    await client.rpc('increment_customer_credit', {
      customer_id: customerId,
      amount: amount,
    });
  } catch {
    // 如果RPC不存在，忽略错误
  }
}
