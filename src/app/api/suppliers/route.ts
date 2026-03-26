import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 供应商统一API
 * 
 * 合并功能：
 * • 供应商管理
 * • 供应商登录
 * • 供应商认证
 * • 供应商审核
 * • 供应商付款
 */
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';

    switch (action) {
      case 'list':
        return await getSuppliers(client, searchParams);
      case 'detail':
        return await getSupplierDetail(client, searchParams.get('id'));
      case 'categories':
        return await getSupplierCategories(client);
      case 'statistics':
        return await getSupplierStatistics(client);
      case 'audit-list':
        return await getAuditList(client, searchParams);
      case 'payments':
        return await getSupplierPayments(client, searchParams);
      case 'orders':
        return await getSupplierOrders(client, searchParams);
      case 'performance':
        return await getSupplierPerformance(client, searchParams.get('id'));
      default:
        return await getSuppliers(client, searchParams);
    }
  } catch (error) {
    console.error('Supplier API error:', error);
    return NextResponse.json({ success: false, error: '操作失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'create':
        return await createSupplier(client, data);
      case 'update':
        return await updateSupplier(client, data);
      case 'delete':
        return await deleteSupplier(client, data);
      case 'register':
        return await registerSupplier(client, data);
      case 'login':
        return await loginSupplier(client, data);
      case 'audit':
        return await auditSupplier(client, data);
      case 'payment':
        return await recordPayment(client, data);
      case 'update-rating':
        return await updateRating(client, data);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Supplier operation error:', error);
    return NextResponse.json({ success: false, error: '操作失败' }, { status: 500 });
  }
}

/**
 * 获取供应商列表
 */
async function getSuppliers(client: any, searchParams: URLSearchParams) {
  const category = searchParams.get('category');
  const status = searchParams.get('status') || 'active';
  const keyword = searchParams.get('keyword');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('page_size') || '20');

  let query = client
    .from('suppliers')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (category) {
    query = query.eq('category', category);
  }

  if (status !== 'all') {
    query = query.eq('is_active', status === 'active');
  }

  if (keyword) {
    query = query.or(`name.ilike.%${keyword}%,code.ilike.%${keyword}%,contact.ilike.%${keyword}%`);
  }

  const { data: suppliers, error, count } = await query;

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: {
      suppliers,
      pagination: { page, pageSize, total: count || 0 }
    }
  });
}

/**
 * 供应商详情
 */
async function getSupplierDetail(client: any, supplierId: string | null) {
  if (!supplierId) {
    return NextResponse.json({ success: false, error: '缺少供应商ID' }, { status: 400 });
  }

  const { data: supplier, error } = await client
    .from('suppliers')
    .select(`
      *,
      purchase_orders (
        id, order_no, status, total_amount, order_date
      )
    `)
    .eq('id', supplierId)
    .single();

  if (error || !supplier) {
    return NextResponse.json({ success: false, error: '供应商不存在' }, { status: 404 });
  }

  // 获取统计
  const { data: orders } = await client
    .from('purchase_orders')
    .select('total_amount, status')
    .eq('supplier_id', supplierId);

  const stats = {
    totalOrders: orders?.length || 0,
    totalAmount: orders?.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0,
    pendingOrders: orders?.filter((o: any) => o.status === 'pending').length || 0
  };

  return NextResponse.json({
    success: true,
    data: { supplier, stats }
  });
}

/**
 * 供应商分类
 */
async function getSupplierCategories(client: any) {
  const { data, error } = await client
    .from('suppliers')
    .select('category')
    .eq('is_active', true);

  if (error) throw error;

  const categories = [...new Set(data?.map((s: any) => s.category).filter(Boolean))];

  return NextResponse.json({
    success: true,
    data: categories
  });
}

/**
 * 供应商统计
 */
async function getSupplierStatistics(client: any) {
  const { count: total } = await client
    .from('suppliers')
    .select('*', { count: 'exact', head: true });

  const { count: active } = await client
    .from('suppliers')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  const { data: byCategory } = await client
    .from('suppliers')
    .select('category');

  const categoryCount: Record<string, number> = {};
  byCategory?.forEach((s: any) => {
    if (s.category) {
      categoryCount[s.category] = (categoryCount[s.category] || 0) + 1;
    }
  });

  return NextResponse.json({
    success: true,
    data: {
      total: total || 0,
      active: active || 0,
      inactive: (total || 0) - (active || 0),
      byCategory: categoryCount
    }
  });
}

/**
 * 创建供应商
 */
async function createSupplier(client: any, data: any) {
  const { 
    code, name, shortName, type, category, contact, phone, email, 
    address, taxNo, bankName, bankAccount, paymentTerms, notes 
  } = data;

  if (!code || !name) {
    return NextResponse.json({ success: false, error: '编码和名称为必填项' }, { status: 400 });
  }

  const { data: supplier, error } = await client
    .from('suppliers')
    .insert({
      code,
      name,
      short_name: shortName,
      type,
      category,
      contact,
      phone,
      email,
      address,
      tax_no: taxNo,
      bank_name: bankName,
      bank_account: bankAccount,
      payment_terms: paymentTerms,
      notes,
      is_active: true,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: '供应商编码已存在' }, { status: 400 });
    }
    throw error;
  }

  return NextResponse.json({
    success: true,
    data: supplier,
    message: '供应商创建成功'
  });
}

/**
 * 更新供应商
 */
async function updateSupplier(client: any, data: any) {
  const { id, updates } = data;

  if (!id) {
    return NextResponse.json({ success: false, error: '缺少供应商ID' }, { status: 400 });
  }

  const { data: supplier, error } = await client
    .from('suppliers')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: supplier,
    message: '供应商更新成功'
  });
}

/**
 * 删除供应商（软删除）
 */
async function deleteSupplier(client: any, data: any) {
  const { id } = data;

  if (!id) {
    return NextResponse.json({ success: false, error: '缺少供应商ID' }, { status: 400 });
  }

  // 检查是否有关联订单
  const { count } = await client
    .from('purchase_orders')
    .select('*', { count: 'exact', head: true })
    .eq('supplier_id', id);

  if (count && count > 0) {
    return NextResponse.json({ 
      success: false, 
      error: '该供应商有关联订单，无法删除，建议停用' 
    }, { status: 400 });
  }

  await client
    .from('suppliers')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  return NextResponse.json({
    success: true,
    message: '供应商已停用'
  });
}

/**
 * 供应商注册
 */
async function registerSupplier(client: any, data: any) {
  const { 
    name, contact, phone, email, address, category, 
    taxNo, bankName, bankAccount, password 
  } = data;

  if (!name || !contact || !phone || !password) {
    return NextResponse.json({ 
      success: false, 
      error: '名称、联系人、电话和密码为必填项' 
    }, { status: 400 });
  }

  // 生成编码
  const code = `SUP${Date.now().toString(36).toUpperCase()}`;

  // 创建供应商账户
  const { data: supplier, error } = await client
    .from('suppliers')
    .insert({
      code,
      name,
      contact,
      phone,
      email,
      address,
      category,
      tax_no: taxNo,
      bank_name: bankName,
      bank_account: bankAccount,
      is_active: false, // 需要审核
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  // 创建用户账户
  const { data: user } = await client
    .from('users')
    .insert({
      email: email || `${code}@supplier.local`,
      name: contact,
      phone,
      password, // 实际应该加密
      status: 'pending',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  return NextResponse.json({
    success: true,
    data: { supplier, user },
    message: '注册成功，等待审核'
  });
}

/**
 * 供应商登录
 */
async function loginSupplier(client: any, data: any) {
  const { phone, password } = data;

  if (!phone || !password) {
    return NextResponse.json({ success: false, error: '请输入手机号和密码' }, { status: 400 });
  }

  // 查找供应商
  const { data: supplier } = await client
    .from('suppliers')
    .select('*')
    .eq('phone', phone)
    .single();

  if (!supplier) {
    return NextResponse.json({ success: false, error: '供应商不存在' }, { status: 404 });
  }

  if (!supplier.is_active) {
    return NextResponse.json({ success: false, error: '账户未激活或待审核' }, { status: 403 });
  }

  // 验证密码（实际应该使用bcrypt等加密方式）
  const { data: user } = await client
    .from('users')
    .select('*')
    .eq('phone', phone)
    .single();

  if (!user || user.password !== password) {
    return NextResponse.json({ success: false, error: '密码错误' }, { status: 401 });
  }

  // 生成token
  const token = `SUP${Date.now().toString(36)}${Math.random().toString(36).substr(2)}`;

  return NextResponse.json({
    success: true,
    data: {
      supplier,
      token,
      user: { id: user.id, name: user.name, email: user.email }
    },
    message: '登录成功'
  });
}

/**
 * 审核供应商
 */
async function getAuditList(client: any, searchParams: URLSearchParams) {
  const status = searchParams.get('status') || 'pending';

  let query = client
    .from('suppliers')
    .select('*')
    .order('created_at', { ascending: false });

  if (status === 'pending') {
    query = query.eq('is_active', false);
  } else if (status === 'approved') {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data
  });
}

async function auditSupplier(client: any, data: any) {
  const { supplierId, approved, notes, auditedBy } = data;

  const { error } = await client
    .from('suppliers')
    .update({
      is_active: approved,
      notes: notes,
      updated_at: new Date().toISOString()
    })
    .eq('id', supplierId);

  if (error) throw error;

  return NextResponse.json({
    success: true,
    message: approved ? '供应商已通过审核' : '供应商审核未通过'
  });
}

/**
 * 供应商付款
 */
async function getSupplierPayments(client: any, searchParams: URLSearchParams) {
  const supplierId = searchParams.get('supplier_id');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');

  let query = client
    .from('payments')
    .select(`
      *,
      bills (bill_no, type)
    `)
    .order('payment_date', { ascending: false });

  if (supplierId) {
    query = query.eq('bills.supplier_id', supplierId);
  }

  if (dateFrom) {
    query = query.gte('payment_date', dateFrom);
  }

  if (dateTo) {
    query = query.lte('payment_date', dateTo);
  }

  const { data, error } = await query;

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data
  });
}

async function recordPayment(client: any, data: any) {
  const { supplierId, amount, method, paymentDate, notes, operatorId } = data;

  const paymentNo = `PAY${Date.now().toString(36).toUpperCase()}`;

  const { data: payment, error } = await client
    .from('payments')
    .insert({
      payment_no: paymentNo,
      type: 'payment',
      amount,
      method,
      payment_date: paymentDate,
      notes,
      operator_id: operatorId,
      audit_status: 'pending',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: payment,
    message: '付款记录已创建'
  });
}

/**
 * 供应商订单
 */
async function getSupplierOrders(client: any, searchParams: URLSearchParams) {
  const supplierId = searchParams.get('supplier_id');
  const status = searchParams.get('status');

  if (!supplierId) {
    return NextResponse.json({ success: false, error: '缺少供应商ID' }, { status: 400 });
  }

  let query = client
    .from('purchase_orders')
    .select(`
      *,
      purchase_items (
        id, material_id, quantity, unit_price, amount,
        materials (code, name, unit)
      )
    `)
    .eq('supplier_id', supplierId)
    .order('order_date', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data
  });
}

/**
 * 供应商绩效
 */
async function getSupplierPerformance(client: any, supplierId: string | null) {
  if (!supplierId) {
    return NextResponse.json({ success: false, error: '缺少供应商ID' }, { status: 400 });
  }

  // 获取订单统计
  const { data: orders } = await client
    .from('purchase_orders')
    .select('id, status, total_amount, order_date, expected_date, received_date')
    .eq('supplier_id', supplierId);

  const totalOrders = orders?.length || 0;
  const completedOrders = orders?.filter((o: any) => o.status === 'received').length || 0;
  
  // 准时交货率
  let onTimeDeliveries = 0;
  orders?.forEach((o: any) => {
    if (o.status === 'received' && o.expected_date && o.received_date) {
      if (new Date(o.received_date) <= new Date(o.expected_date)) {
        onTimeDeliveries++;
      }
    }
  });

  const onTimeRate = completedOrders > 0 ? Math.round((onTimeDeliveries / completedOrders) * 100) : 0;

  // 获取质检统计
  const { data: inspections } = await client
    .from('quality_iqc')
    .select('result')
    .eq('supplier_id', supplierId);

  const passedInspections = inspections?.filter((i: any) => i.result === 'passed').length || 0;
  const qualityRate = (inspections?.length || 0) > 0 
    ? Math.round((passedInspections / inspections.length) * 100) 
    : 0;

  return NextResponse.json({
    success: true,
    data: {
      totalOrders,
      completedOrders,
      onTimeRate,
      qualityRate,
      totalAmount: orders?.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0
    }
  });
}

/**
 * 更新评级
 */
async function updateRating(client: any, data: any) {
  const { supplierId, rating } = data;

  if (!supplierId || rating === undefined) {
    return NextResponse.json({ success: false, error: '缺少参数' }, { status: 400 });
  }

  const { error } = await client
    .from('suppliers')
    .update({
      rating,
      updated_at: new Date().toISOString()
    })
    .eq('id', supplierId);

  if (error) throw error;

  return NextResponse.json({
    success: true,
    message: '评级已更新'
  });
}
