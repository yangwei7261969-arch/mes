import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * SaaS多租户API
 * 
 * 功能：
 * • 租户管理
 * • 租户隔离
 * • 订阅计划
 * • 使用量统计
 * • 计费管理
 */

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';

    switch (action) {
      case 'list':
        return await listTenants(client, searchParams);
      case 'detail':
        return await getTenantDetail(client, searchParams);
      case 'stats':
        return await getTenantStats(client, searchParams);
      case 'usage':
        return await getUsageStats(client, searchParams);
      case 'plans':
        return await listPlans(client);
      case 'subscriptions':
        return await listSubscriptions(client, searchParams);
      case 'billing':
        return await getBillingHistory(client, searchParams);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Tenant API error:', error);
    return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'create':
        return await createTenant(client, data);
      case 'update':
        return await updateTenant(client, data);
      case 'suspend':
        return await suspendTenant(client, data);
      case 'reactivate':
        return await reactivateTenant(client, data);
      case 'upgrade':
        return await upgradePlan(client, data);
      case 'downgrade':
        return await downgradePlan(client, data);
      case 'record-usage':
        return await recordUsage(client, data);
      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Tenant operation error:', error);
    return NextResponse.json({ success: false, error: '操作失败' }, { status: 500 });
  }
}

/**
 * 租户列表
 */
async function listTenants(client: any, searchParams: URLSearchParams) {
  const status = searchParams.get('status');
  const plan = searchParams.get('plan');
  const search = searchParams.get('search');

  let query = client
    .from('tenants')
    .select(`
      *,
      subscriptions (plan_id, status, current_period_end)
    `)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }
  if (plan) {
    query = query.eq('subscriptions.plan_id', plan);
  }
  if (search) {
    query = query.or(`name.ilike.%${search}%,company_name.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) throw error;

  // 统计
  const stats = {
    total: data?.length || 0,
    active: data?.filter((t: any) => t.status === 'active').length || 0,
    trial: data?.filter((t: any) => t.status === 'trial').length || 0,
    suspended: data?.filter((t: any) => t.status === 'suspended').length || 0,
    cancelled: data?.filter((t: any) => t.status === 'cancelled').length || 0
  };

  return NextResponse.json({
    success: true,
    data: {
      tenants: data || [],
      stats
    }
  });
}

/**
 * 租户详情
 */
async function getTenantDetail(client: any, searchParams: URLSearchParams) {
  const id = searchParams.get('id');
  const slug = searchParams.get('slug');

  if (!id && !slug) {
    return NextResponse.json({ success: false, error: '缺少租户ID或标识' }, { status: 400 });
  }

  let query = client
    .from('tenants')
    .select(`
      *,
      subscriptions (*),
      users (id, name, email, role)
    `);

  if (id) {
    query = query.eq('id', id);
  } else {
    query = query.eq('slug', slug);
  }

  const { data: tenant, error } = await query.single();

  if (error || !tenant) {
    return NextResponse.json({ success: false, error: '租户不存在' }, { status: 404 });
  }

  // 使用量统计
  const usage = await getTenantUsage(client, tenant.id);

  // 功能权限
  const features = await getTenantFeatures(client, tenant.id);

  return NextResponse.json({
    success: true,
    data: {
      tenant,
      usage,
      features
    }
  });
}

/**
 * 租户统计
 */
async function getTenantStats(client: any, searchParams: URLSearchParams) {
  const tenantId = searchParams.get('tenant_id');
  const period = searchParams.get('period') || 'month';

  if (!tenantId) {
    return NextResponse.json({ success: false, error: '缺少租户ID' }, { status: 400 });
  }

  // 计算时间范围
  const now = new Date();
  let startDate: Date;
  switch (period) {
    case 'day':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  // 订单统计
  const { data: orders } = await client
    .from('production_orders')
    .select('id, total_amount, status')
    .eq('tenant_id', tenantId)
    .gte('created_at', startDate.toISOString());

  // 用户统计
  const { count: userCount } = await client
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  // 存储统计
  const { data: storage } = await client
    .from('storage_usage')
    .select('size_bytes')
    .eq('tenant_id', tenantId)
    .single();

  // API调用统计
  const { data: apiUsage } = await client
    .from('api_usage')
    .select('request_count')
    .eq('tenant_id', tenantId)
    .gte('date', startDate.toISOString().split('T')[0]);

  const totalApiCalls = apiUsage?.reduce((sum: number, u: any) => sum + (u.request_count || 0), 0) || 0;

  return NextResponse.json({
    success: true,
    data: {
      period,
      orders: {
        total: orders?.length || 0,
        completed: orders?.filter((o: any) => o.status === 'completed').length || 0,
        totalAmount: orders?.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0
      },
      users: userCount || 0,
      storage: {
        used: storage?.size_bytes || 0,
        usedGB: ((storage?.size_bytes || 0) / (1024 * 1024 * 1024)).toFixed(2)
      },
      apiCalls: totalApiCalls
    }
  });
}

/**
 * 使用量统计
 */
async function getUsageStats(client: any, searchParams: URLSearchParams) {
  const tenantId = searchParams.get('tenant_id');
  const type = searchParams.get('type') || 'all';

  if (!tenantId) {
    return NextResponse.json({ success: false, error: '缺少租户ID' }, { status: 400 });
  }

  const usage = await getTenantUsage(client, tenantId);

  // 获取配额
  const { data: subscription } = await client
    .from('subscriptions')
    .select(`
      *,
      plans (name, limits)
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .single();

  const limits = subscription?.plans?.limits || {};
  const usageWithLimits = {
    users: {
      used: usage.users || 0,
      limit: limits.max_users || -1,
      percentage: limits.max_users > 0 ? Math.round((usage.users / limits.max_users) * 100) : 0
    },
    orders: {
      used: usage.orders || 0,
      limit: limits.max_orders || -1,
      percentage: limits.max_orders > 0 ? Math.round((usage.orders / limits.max_orders) * 100) : 0
    },
    storage: {
      used: usage.storage || 0,
      usedGB: ((usage.storage || 0) / (1024 * 1024 * 1024)).toFixed(2),
      limit: limits.max_storage_gb || -1,
      limitGB: limits.max_storage_gb || -1,
      percentage: limits.max_storage_gb > 0 
        ? Math.round(((usage.storage || 0) / (limits.max_storage_gb * 1024 * 1024 * 1024)) * 100) 
        : 0
    },
    apiCalls: {
      used: usage.apiCalls || 0,
      limit: limits.max_api_calls || -1,
      percentage: limits.max_api_calls > 0 ? Math.round((usage.apiCalls / limits.max_api_calls) * 100) : 0
    }
  };

  // 检查是否超限
  const warnings: string[] = [];
  if (usageWithLimits.users.percentage >= 90) {
    warnings.push('用户数即将达到上限');
  }
  if (usageWithLimits.storage.percentage >= 90) {
    warnings.push('存储空间即将用尽');
  }
  if (usageWithLimits.apiCalls.percentage >= 90) {
    warnings.push('API调用次数即将达到上限');
  }

  return NextResponse.json({
    success: true,
    data: {
      usage: usageWithLimits,
      warnings,
      subscription: {
        plan: subscription?.plans?.name,
        status: subscription?.status,
        currentPeriodEnd: subscription?.current_period_end
      }
    }
  });
}

/**
 * 计划列表
 */
async function listPlans(client: any) {
  const { data, error } = await client
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('price_monthly', { ascending: true });

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: data || []
  });
}

/**
 * 订阅列表
 */
async function listSubscriptions(client: any, searchParams: URLSearchParams) {
  const tenantId = searchParams.get('tenant_id');
  const status = searchParams.get('status');

  let query = client
    .from('subscriptions')
    .select(`
      *,
      tenants (id, name, company_name),
      plans (id, name, price_monthly)
    `)
    .order('created_at', { ascending: false });

  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }
  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) throw error;

  // 统计
  const now = new Date();
  const stats = {
    total: data?.length || 0,
    active: data?.filter((s: any) => s.status === 'active').length || 0,
    trial: data?.filter((s: any) => s.status === 'trialing').length || 0,
    cancelled: data?.filter((s: any) => s.status === 'cancelled').length || 0,
    expiringSoon: data?.filter((s: any) => {
      const endDate = new Date(s.current_period_end);
      const daysUntilEnd = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysUntilEnd <= 7 && daysUntilEnd > 0;
    }).length || 0,
    mrr: data?.filter((s: any) => s.status === 'active')
      .reduce((sum: number, s: any) => sum + (s.plans?.price_monthly || 0), 0) || 0
  };

  return NextResponse.json({
    success: true,
    data: {
      subscriptions: data || [],
      stats
    }
  });
}

/**
 * 账单历史
 */
async function getBillingHistory(client: any, searchParams: URLSearchParams) {
  const tenantId = searchParams.get('tenant_id');
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

  if (!tenantId) {
    return NextResponse.json({ success: false, error: '缺少租户ID' }, { status: 400 });
  }

  const startDate = `${year}-01-01`;
  const endDate = `${year + 1}-01-01`;

  const { data: invoices } = await client
    .from('tenant_invoices')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('invoice_date', startDate)
    .lt('invoice_date', endDate)
    .order('invoice_date', { ascending: false });

  const { data: payments } = await client
    .from('tenant_payments')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('payment_date', startDate)
    .lt('payment_date', endDate)
    .order('payment_date', { ascending: false });

  return NextResponse.json({
    success: true,
    data: {
      invoices: invoices || [],
      payments: payments || [],
      summary: {
        totalInvoiced: invoices?.reduce((sum: number, i: any) => sum + (i.amount || 0), 0) || 0,
        totalPaid: payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0,
        outstanding: (invoices?.reduce((sum: number, i: any) => sum + (i.amount || 0), 0) || 0) - 
                     (payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0)
      }
    }
  });
}

/**
 * 创建租户
 */
async function createTenant(client: any, data: any) {
  const { name, companyName, slug, planId, adminUser } = data;

  // 检查slug是否已存在
  const { data: existing } = await client
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .single();

  if (existing) {
    return NextResponse.json({ 
      success: false, 
      error: '租户标识已被使用' 
    }, { status: 400 });
  }

  // 创建租户
  const tenant = {
    name,
    company_name: companyName,
    slug,
    status: planId ? 'active' : 'trial',
    trial_ends_at: planId ? null : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString()
  };

  const { data: createdTenant, error } = await client
    .from('tenants')
    .insert(tenant)
    .select()
    .single();

  if (error) throw error;

  // 创建订阅
  if (planId) {
    await client
      .from('subscriptions')
      .insert({
        tenant_id: createdTenant.id,
        plan_id: planId,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      });
  }

  // 创建管理员用户
  if (adminUser) {
    await client
      .from('users')
      .insert({
        tenant_id: createdTenant.id,
        name: adminUser.name,
        email: adminUser.email,
        role: 'admin',
        created_at: new Date().toISOString()
      });
  }

  return NextResponse.json({
    success: true,
    data: createdTenant,
    message: '租户创建成功'
  });
}

/**
 * 更新租户
 */
async function updateTenant(client: any, data: any) {
  const { id, ...updates } = data;

  updates.updated_at = new Date().toISOString();

  const { data: tenant, error } = await client
    .from('tenants')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: tenant,
    message: '租户信息已更新'
  });
}

/**
 * 暂停租户
 */
async function suspendTenant(client: any, data: any) {
  const { id, reason } = data;

  const { data: tenant, error } = await client
    .from('tenants')
    .update({
      status: 'suspended',
      suspended_at: new Date().toISOString(),
      suspension_reason: reason,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // 暂停订阅
  await client
    .from('subscriptions')
    .update({ status: 'suspended' })
    .eq('tenant_id', id);

  return NextResponse.json({
    success: true,
    data: tenant,
    message: '租户已暂停'
  });
}

/**
 * 重新激活租户
 */
async function reactivateTenant(client: any, data: any) {
  const { id } = data;

  const { data: tenant, error } = await client
    .from('tenants')
    .update({
      status: 'active',
      suspended_at: null,
      suspension_reason: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // 激活订阅
  await client
    .from('subscriptions')
    .update({ status: 'active' })
    .eq('tenant_id', id);

  return NextResponse.json({
    success: true,
    data: tenant,
    message: '租户已重新激活'
  });
}

/**
 * 升级计划
 */
async function upgradePlan(client: any, data: any) {
  const { tenantId, newPlanId, proration = true } = data;

  // 获取当前订阅
  const { data: currentSub } = await client
    .from('subscriptions')
    .select('*, plans (price_monthly)')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .single();

  // 获取新计划
  const { data: newPlan } = await client
    .from('plans')
    .select('*')
    .eq('id', newPlanId)
    .single();

  if (!newPlan) {
    return NextResponse.json({ success: false, error: '计划不存在' }, { status: 404 });
  }

  // 更新订阅
  const { data: subscription, error } = await client
    .from('subscriptions')
    .update({
      plan_id: newPlanId,
      updated_at: new Date().toISOString()
    })
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .select()
    .single();

  if (error) throw error;

  // 记录变更
  await client
    .from('subscription_changes')
    .insert({
      tenant_id: tenantId,
      old_plan_id: currentSub?.plan_id,
      new_plan_id: newPlanId,
      change_type: 'upgrade',
      proration_amount: proration ? calculateProration(currentSub, newPlan) : 0,
      created_at: new Date().toISOString()
    });

  return NextResponse.json({
    success: true,
    data: subscription,
    message: `已升级到${newPlan.name}计划`
  });
}

/**
 * 降级计划
 */
async function downgradePlan(client: any, data: any) {
  const { tenantId, newPlanId, effectiveAt } = data;

  // 检查使用量是否超过新计划限制
  const usage = await getTenantUsage(client, tenantId);

  const { data: newPlan } = await client
    .from('plans')
    .select('*')
    .eq('id', newPlanId)
    .single();

  if (!newPlan) {
    return NextResponse.json({ success: false, error: '计划不存在' }, { status: 404 });
  }

  // 检查是否超限
  const limits = newPlan.limits || {};
  const overLimit = [];

  if (limits.max_users > 0 && usage.users > limits.max_users) {
    overLimit.push(`用户数(${usage.users}/${limits.max_users})`);
  }
  if (limits.max_storage_gb > 0 && usage.storageGB > limits.max_storage_gb) {
    overLimit.push(`存储空间(${usage.storageGB.toFixed(2)}GB/${limits.max_storage_gb}GB)`);
  }

  if (overLimit.length > 0) {
    return NextResponse.json({
      success: false,
      error: `当前使用量超过新计划限制：${overLimit.join('、')}。请先减少使用量。`
    }, { status: 400 });
  }

  // 如果指定了生效时间，创建待执行的变更
  if (effectiveAt) {
    await client
      .from('pending_plan_changes')
      .insert({
        tenant_id: tenantId,
        new_plan_id: newPlanId,
        effective_at: effectiveAt,
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      message: `计划变更将在${effectiveAt}生效`
    });
  }

  // 立即降级
  const { data: subscription, error } = await client
    .from('subscriptions')
    .update({
      plan_id: newPlanId,
      updated_at: new Date().toISOString()
    })
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: subscription,
    message: `已降级到${newPlan.name}计划`
  });
}

/**
 * 记录使用量
 */
async function recordUsage(client: any, data: any) {
  const { tenantId, type, amount, metadata } = data;

  const usage = {
    tenant_id: tenantId,
    usage_type: type,
    amount,
    metadata,
    recorded_at: new Date().toISOString()
  };

  const { error } = await client
    .from('tenant_usage')
    .insert(usage);

  if (error) throw error;

  return NextResponse.json({
    success: true,
    message: '使用量已记录'
  });
}

// 辅助函数
async function getTenantUsage(client: any, tenantId: string): Promise<any> {
  // 用户数
  const { count: users } = await client
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  // 本月订单数
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data: orders } = await client
    .from('production_orders')
    .select('id')
    .eq('tenant_id', tenantId)
    .gte('created_at', monthStart.toISOString());

  // 存储使用量
  const { data: storage } = await client
    .from('storage_usage')
    .select('size_bytes')
    .eq('tenant_id', tenantId)
    .single();

  // API调用次数
  const { data: apiUsage } = await client
    .from('api_usage')
    .select('request_count')
    .eq('tenant_id', tenantId)
    .gte('date', monthStart.toISOString().split('T')[0]);

  return {
    users: users || 0,
    orders: orders?.length || 0,
    storage: storage?.size_bytes || 0,
    storageGB: ((storage?.size_bytes || 0) / (1024 * 1024 * 1024)),
    apiCalls: apiUsage?.reduce((sum: number, u: any) => sum + (u.request_count || 0), 0) || 0
  };
}

async function getTenantFeatures(client: any, tenantId: string): Promise<string[]> {
  const { data: subscription } = await client
    .from('subscriptions')
    .select(`
      *,
      plans (features)
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .single();

  return subscription?.plans?.features || [];
}

function calculateProration(currentSub: any, newPlan: any): number {
  if (!currentSub || !newPlan) return 0;

  const currentPrice = currentSub.plans?.price_monthly || 0;
  const newPrice = newPlan.price_monthly || 0;

  // 计算剩余天数
  const periodEnd = new Date(currentSub.current_period_end);
  const now = new Date();
  const remainingDays = Math.max(0, (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const totalDays = 30;

  // 按比例计算
  const unusedAmount = currentPrice * (remainingDays / totalDays);
  const newAmount = newPrice * (remainingDays / totalDays);

  return newAmount - unusedAmount;
}
