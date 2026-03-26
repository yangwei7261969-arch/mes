import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 对账系统API
 * 
 * 商业功能：
 * • 客户账单生成
 * • 对账确认
 * • 付款跟踪
 * • 账龄分析
 * 
 * 价值：财务清晰，减少争议
 */

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';

    switch (action) {
      case 'list':
        return await getStatements(client, searchParams);
      case 'detail':
        return await getStatementDetail(client, searchParams.get('id'));
      case 'by-customer':
        return await getStatementsByCustomer(client, searchParams);
      case 'aging':
        return await getAgingAnalysis(client, searchParams);
      case 'summary':
        return await getSummary(client, searchParams);
      case 'export':
        return await exportStatement(client, searchParams);
      case 'payments':
        return await getPayments(client, searchParams);
      case 'overdue':
        return await getOverdueStatements(client, searchParams);
      default:
        return await getStatements(client, searchParams);
    }
  } catch (error) {
    console.error('Statement error:', error);
    return NextResponse.json({ success: false, error: '获取对账单失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();

    const { action, data } = body;

    switch (action) {
      case 'create':
        return await createStatement(client, data);
      case 'confirm':
        return await confirmStatement(client, data);
      case 'add-payment':
        return await addPayment(client, data);
      case 'adjust':
        return await adjustStatement(client, data);
      case 'send-reminder':
        return await sendReminder(client, data);
      case 'bulk-create':
        return await bulkCreateStatements(client, data);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Statement operation error:', error);
    return NextResponse.json({ success: false, error: '操作失败' }, { status: 500 });
  }
}

/**
 * 获取对账单列表
 */
async function getStatements(client: any, searchParams: URLSearchParams) {
  const status = searchParams.get('status') || 'all';
  const customerId = searchParams.get('customer_id');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('page_size') || '20');

  let query = client
    .from('statements')
    .select(`
      id,
      statement_no,
      statement_date,
      due_date,
      total_amount,
      paid_amount,
      balance,
      status,
      created_at,
      customers (
        id,
        code,
        name,
        contact_person
      )
    `)
    .order('statement_date', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  if (customerId) {
    query = query.eq('customer_id', customerId);
  }

  if (dateFrom) {
    query = query.gte('statement_date', dateFrom);
  }

  if (dateTo) {
    query = query.lte('statement_date', dateTo);
  }

  const { data: statements, error, count } = await query;

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: {
      statements,
      pagination: {
        page,
        pageSize,
        total: count || 0
      }
    }
  });
}

/**
 * 对账单详情
 */
async function getStatementDetail(client: any, statementId: string | null) {
  if (!statementId) {
    return NextResponse.json({ 
      success: false, 
      error: '缺少对账单ID' 
    }, { status: 400 });
  }

  const { data: statement, error } = await client
    .from('statements')
    .select(`
      *,
      customers (
        id,
        code,
        name,
        contact_person,
        contact_phone,
        contact_email,
        address
      ),
      statement_items (
        id,
        item_type,
        reference_no,
        reference_date,
        description,
        quantity,
        unit_price,
        amount,
        production_orders (
          order_code,
          styles (style_no, style_name)
        )
      ),
      statement_payments (
        id,
        payment_no,
        payment_date,
        amount,
        payment_method,
        reference_no,
        notes
      ),
      statement_history (
        action,
        action_by,
        action_at,
        notes,
        users (name)
      )
    `)
    .eq('id', statementId)
    .single();

  if (error) throw error;

  if (!statement) {
    return NextResponse.json({ 
      success: false, 
      error: '对账单不存在' 
    }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: statement
  });
}

/**
 * 按客户获取对账单
 */
async function getStatementsByCustomer(client: any, searchParams: URLSearchParams) {
  const customerId = searchParams.get('customer_id');

  if (!customerId) {
    return NextResponse.json({ 
      success: false, 
      error: '缺少客户ID' 
    }, { status: 400 });
  }

  const { data: statements } = await client
    .from('statements')
    .select(`
      id,
      statement_no,
      statement_date,
      due_date,
      total_amount,
      paid_amount,
      balance,
      status
    `)
    .eq('customer_id', customerId)
    .order('statement_date', { ascending: false });

  // 计算客户汇总
  const summary = {
    totalStatements: statements?.length || 0,
    totalAmount: statements?.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0) || 0,
    totalPaid: statements?.reduce((sum: number, s: any) => sum + (s.paid_amount || 0), 0) || 0,
    totalBalance: statements?.reduce((sum: number, s: any) => sum + (s.balance || 0), 0) || 0,
    overdueCount: statements?.filter((s: any) => 
      s.status !== 'paid' && new Date(s.due_date) < new Date()
    ).length || 0
  };

  return NextResponse.json({
    success: true,
    data: {
      statements,
      summary
    }
  });
}

/**
 * 账龄分析
 */
async function getAgingAnalysis(client: any, searchParams: URLSearchParams) {
  const customerId = searchParams.get('customer_id');

  let query = client
    .from('statements')
    .select(`
      id,
      statement_no,
      statement_date,
      due_date,
      balance,
      customers (id, name)
    `)
    .neq('status', 'paid')
    .gt('balance', 0);

  if (customerId) {
    query = query.eq('customer_id', customerId);
  }

  const { data: statements, error } = await query;

  if (error) throw error;

  const today = new Date();

  // 账龄分组
  const aging = {
    current: { amount: 0, count: 0, items: [] as any[] },
    days1to30: { amount: 0, count: 0, items: [] as any[] },
    days31to60: { amount: 0, count: 0, items: [] as any[] },
    days61to90: { amount: 0, count: 0, items: [] as any[] },
    over90: { amount: 0, count: 0, items: [] as any[] }
  };

  statements?.forEach((s: any) => {
    const dueDate = new Date(s.due_date);
    const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    let group: any;
    if (daysPastDue <= 0) {
      group = aging.current;
    } else if (daysPastDue <= 30) {
      group = aging.days1to30;
    } else if (daysPastDue <= 60) {
      group = aging.days31to60;
    } else if (daysPastDue <= 90) {
      group = aging.days61to90;
    } else {
      group = aging.over90;
    }

    group.amount += s.balance || 0;
    group.count += 1;
    group.items.push({
      ...s,
      daysPastDue: Math.max(0, daysPastDue)
    });
  });

  // 按客户汇总
  const byCustomer: Record<string, any> = {};
  statements?.forEach((s: any) => {
    const custId = s.customers?.id;
    if (!byCustomer[custId]) {
      byCustomer[custId] = {
        customer: s.customers,
        totalBalance: 0,
        statements: []
      };
    }
    byCustomer[custId].totalBalance += s.balance || 0;
    byCustomer[custId].statements.push(s);
  });

  return NextResponse.json({
    success: true,
    data: {
      aging,
      byCustomer: Object.values(byCustomer).sort((a: any, b: any) => b.totalBalance - a.totalBalance),
      totalOverdue: (aging.days1to30.amount + aging.days31to60.amount + 
                     aging.days61to90.amount + aging.over90.amount)
    }
  });
}

/**
 * 对账汇总
 */
async function getSummary(client: any, searchParams: URLSearchParams) {
  const dateFrom = searchParams.get('date_from') || 
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const dateTo = searchParams.get('date_to') || 
    new Date().toISOString().split('T')[0];

  // 统计数据
  const { data: stats } = await client
    .from('statements')
    .select('status, total_amount, paid_amount, balance')
    .gte('statement_date', dateFrom)
    .lte('statement_date', dateTo);

  const summary = {
    totalStatements: stats?.length || 0,
    totalAmount: stats?.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0) || 0,
    totalPaid: stats?.reduce((sum: number, s: any) => sum + (s.paid_amount || 0), 0) || 0,
    totalBalance: stats?.reduce((sum: number, s: any) => sum + (s.balance || 0), 0) || 0,
    byStatus: {
      draft: stats?.filter((s: any) => s.status === 'draft').length || 0,
      sent: stats?.filter((s: any) => s.status === 'sent').length || 0,
      confirmed: stats?.filter((s: any) => s.status === 'confirmed').length || 0,
      paid: stats?.filter((s: any) => s.status === 'paid').length || 0
    }
  };

  // 本月新增
  const thisMonth = new Date();
  thisMonth.setDate(1);
  const { count: thisMonthCount } = await client
    .from('statements')
    .select('*', { count: 'exact', head: true })
    .gte('statement_date', thisMonth.toISOString());

  // 逾期金额
  const { data: overdue } = await client
    .from('statements')
    .select('balance')
    .neq('status', 'paid')
    .lt('due_date', new Date().toISOString());

  const overdueAmount = overdue?.reduce((sum: number, s: any) => sum + (s.balance || 0), 0) || 0;

  return NextResponse.json({
    success: true,
    data: {
      ...summary,
      thisMonthCount,
      overdueAmount,
      dateRange: { from: dateFrom, to: dateTo }
    }
  });
}

/**
 * 创建对账单
 */
async function createStatement(client: any, data: any) {
  const {
    customerId,
    statementDate,
    dueDate,
    items,
    notes,
    createdBy
  } = data;

  // 生成对账单号
  const statementNo = `STMT${Date.now().toString(36).toUpperCase()}`;

  // 计算总金额
  const totalAmount = items.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);

  const { data: statement, error } = await client
    .from('statements')
    .insert({
      statement_no: statementNo,
      customer_id: customerId,
      statement_date: statementDate,
      due_date: dueDate,
      total_amount: totalAmount,
      paid_amount: 0,
      balance: totalAmount,
      status: 'draft',
      notes,
      created_by: createdBy,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  // 插入明细
  if (items && items.length > 0) {
    await client
      .from('statement_items')
      .insert(items.map((item: any) => ({
        statement_id: statement.id,
        item_type: item.itemType,
        reference_no: item.referenceNo,
        reference_date: item.referenceDate,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        amount: item.amount,
        order_id: item.orderId
      })));
  }

  // 记录历史
  await client
    .from('statement_history')
    .insert({
      statement_id: statement.id,
      action: 'created',
      action_by: createdBy,
      action_at: new Date().toISOString(),
      notes: '创建对账单'
    });

  return NextResponse.json({
    success: true,
    data: statement,
    message: '对账单已创建'
  });
}

/**
 * 确认对账单
 */
async function confirmStatement(client: any, data: any) {
  const { statementId, confirmedBy, notes } = data;

  const { data: statement, error } = await client
    .from('statements')
    .update({
      status: 'confirmed',
      confirmed_by: confirmedBy,
      confirmed_at: new Date().toISOString(),
      confirmation_notes: notes
    })
    .eq('id', statementId)
    .select()
    .single();

  if (error) throw error;

  // 记录历史
  await client
    .from('statement_history')
    .insert({
      statement_id: statementId,
      action: 'confirmed',
      action_by: confirmedBy,
      action_at: new Date().toISOString(),
      notes
    });

  return NextResponse.json({
    success: true,
    data: statement,
    message: '对账单已确认'
  });
}

/**
 * 添加付款
 */
async function addPayment(client: any, data: any) {
  const {
    statementId,
    paymentNo,
    paymentDate,
    amount,
    paymentMethod,
    referenceNo,
    notes,
    recordedBy
  } = data;

  // 获取对账单当前状态
  const { data: statement } = await client
    .from('statements')
    .select('*')
    .eq('id', statementId)
    .single();

  if (!statement) {
    return NextResponse.json({ 
      success: false, 
      error: '对账单不存在' 
    }, { status: 404 });
  }

  // 插入付款记录
  const { data: payment, error } = await client
    .from('statement_payments')
    .insert({
      statement_id: statementId,
      payment_no: paymentNo || `PAY${Date.now().toString(36).toUpperCase()}`,
      payment_date: paymentDate,
      amount,
      payment_method: paymentMethod,
      reference_no: referenceNo,
      notes,
      recorded_by: recordedBy,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  // 更新对账单
  const newPaidAmount = (statement.paid_amount || 0) + amount;
  const newBalance = statement.total_amount - newPaidAmount;
  const newStatus = newBalance <= 0 ? 'paid' : statement.status;

  await client
    .from('statements')
    .update({
      paid_amount: newPaidAmount,
      balance: Math.max(0, newBalance),
      status: newStatus,
      paid_at: newBalance <= 0 ? new Date().toISOString() : null
    })
    .eq('id', statementId);

  // 记录历史
  await client
    .from('statement_history')
    .insert({
      statement_id: statementId,
      action: 'payment',
      action_by: recordedBy,
      action_at: new Date().toISOString(),
      notes: `收到付款 ${amount}，${paymentMethod}`
    });

  return NextResponse.json({
    success: true,
    data: payment,
    message: '付款已记录'
  });
}

/**
 * 调整对账单
 */
async function adjustStatement(client: any, data: any) {
  const { statementId, adjustments, reason, adjustedBy } = data;

  // 获取原对账单
  const { data: original } = await client
    .from('statements')
    .select('*, statement_items (*)')
    .eq('id', statementId)
    .single();

  if (!original) {
    return NextResponse.json({ 
      success: false, 
      error: '对账单不存在' 
    }, { status: 404 });
  }

  // 应用调整
  const { error } = await client
    .from('statements')
    .update({
      ...adjustments,
      updated_at: new Date().toISOString()
    })
    .eq('id', statementId);

  if (error) throw error;

  // 记录历史
  await client
    .from('statement_history')
    .insert({
      statement_id: statementId,
      action: 'adjusted',
      action_by: adjustedBy,
      action_at: new Date().toISOString(),
      notes: reason,
      previous_data: original
    });

  return NextResponse.json({
    success: true,
    message: '对账单已调整'
  });
}

/**
 * 发送催款提醒
 */
async function sendReminder(client: any, data: any) {
  const { statementId, reminderType, sentBy } = data;

  // 获取对账单信息
  const { data: statement } = await client
    .from('statements')
    .select(`
      *,
      customers (name, contact_email)
    `)
    .eq('id', statementId)
    .single();

  if (!statement) {
    return NextResponse.json({ 
      success: false, 
      error: '对账单不存在' 
    }, { status: 404 });
  }

  // 记录提醒
  const { data: reminder } = await client
    .from('statement_reminders')
    .insert({
      statement_id: statementId,
      reminder_type: reminderType,
      sent_to: statement.customers?.contact_email,
      sent_at: new Date().toISOString(),
      sent_by: sentBy
    })
    .select()
    .single();

  // 记录历史
  await client
    .from('statement_history')
    .insert({
      statement_id: statementId,
      action: 'reminder',
      action_by: sentBy,
      action_at: new Date().toISOString(),
      notes: `发送${reminderType === 'email' ? '邮件' : '短信'}催款提醒`
    });

  return NextResponse.json({
    success: true,
    data: reminder,
    message: '催款提醒已发送'
  });
}

/**
 * 批量创建对账单
 */
async function bulkCreateStatements(client: any, data: any) {
  const { customerIds, statementDate, dueDate, createdBy } = data;

  const results: any[] = [];
  const errors: any[] = [];

  for (const customerId of customerIds) {
    try {
      // 获取客户未对账的订单
      const { data: orders } = await client
        .from('production_orders')
        .select(`
          id,
          order_code,
          total_quantity,
          unit_price,
          shipped_quantity,
          delivery_date
        `)
        .eq('customer_id', customerId)
        .eq('status', 'completed')
        .is('statement_id', null);

      if (!orders || orders.length === 0) {
        continue;
      }

      // 创建对账单
      const items = orders.map((o: any) => ({
        itemType: 'order',
        referenceNo: o.order_code,
        referenceDate: o.delivery_date,
        description: `订单 ${o.order_code}`,
        quantity: o.shipped_quantity || o.total_quantity,
        unitPrice: o.unit_price,
        amount: (o.shipped_quantity || o.total_quantity) * (o.unit_price || 0),
        orderId: o.id
      }));

      const result = await createStatement(client, {
        customerId,
        statementDate,
        dueDate,
        items,
        createdBy
      });

      results.push(result as any);

      // 更新订单的对账单ID
      await client
        .from('production_orders')
        .update({ statement_id: (result as any).data.id })
        .in('id', orders.map((o: any) => o.id));

    } catch (error) {
      errors.push({ customerId, error });
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      created: results.length,
      failed: errors.length,
      results,
      errors
    },
    message: `已创建 ${results.length} 个对账单`
  });
}

/**
 * 导出对账单
 */
async function exportStatement(client: any, searchParams: URLSearchParams) {
  const statementId = searchParams.get('id');

  if (!statementId) {
    return NextResponse.json({ 
      success: false, 
      error: '缺少对账单ID' 
    }, { status: 400 });
  }

  const { data: statement } = await client
    .from('statements')
    .select(`
      *,
      customers (*),
      statement_items (*),
      statement_payments (*)
    `)
    .eq('id', statementId)
    .single();

  return NextResponse.json({
    success: true,
    data: {
      statement,
      exportUrl: `/api/statements/export?id=${statementId}`
    }
  });
}

/**
 * 获取付款记录
 */
async function getPayments(client: any, searchParams: URLSearchParams) {
  const statementId = searchParams.get('statement_id');
  const customerId = searchParams.get('customer_id');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');

  let query = client
    .from('statement_payments')
    .select(`
      id,
      payment_no,
      payment_date,
      amount,
      payment_method,
      reference_no,
      notes,
      statements (
        statement_no,
        customers (name)
      )
    `)
    .order('payment_date', { ascending: false });

  if (statementId) {
    query = query.eq('statement_id', statementId);
  }

  if (customerId) {
    query = query.eq('statements.customer_id', customerId);
  }

  if (dateFrom) {
    query = query.gte('payment_date', dateFrom);
  }

  if (dateTo) {
    query = query.lte('payment_date', dateTo);
  }

  const { data: payments, error } = await query;

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: payments
  });
}

/**
 * 获取逾期对账单
 */
async function getOverdueStatements(client: any, searchParams: URLSearchParams) {
  const days = parseInt(searchParams.get('days') || '30');

  const overdueDate = new Date();
  overdueDate.setDate(overdueDate.getDate() - days);

  const { data: statements, error } = await client
    .from('statements')
    .select(`
      id,
      statement_no,
      statement_date,
      due_date,
      balance,
      customers (
        id,
        name,
        contact_person,
        contact_phone
      )
    `)
    .neq('status', 'paid')
    .gt('balance', 0)
    .lt('due_date', overdueDate.toISOString())
    .order('due_date', { ascending: true });

  if (error) throw error;

  // 计算逾期天数
  const today = new Date();
  const withOverdueDays = statements?.map((s: any) => ({
    ...s,
    overdueDays: Math.floor((today.getTime() - new Date(s.due_date).getTime()) / (1000 * 60 * 60 * 24))
  }));

  return NextResponse.json({
    success: true,
    data: withOverdueDays
  });
}
