import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const { username, password, tenant_id } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 支持用户名或邮箱登录
    // 先尝试用用户名查询
    let query = client
      .from('users')
      .select('*')
      .eq('status', 'active');

    // 判断是邮箱还是用户名
    if (username.includes('@')) {
      query = query.eq('email', username);
    } else {
      query = query.eq('username', username);
    }

    const { data: users, error } = await query
      .eq('password', password)
      .maybeSingle();

    if (error || !users) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 更新最后登录时间
    await client
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', users.id);

    // 获取用户的租户信息
    let userTenants: Array<{ tenant_id: string; role: string }> = [];
    let primaryTenant = tenant_id;

    try {
      const { data: tenantUsers } = await client
        .from('tenant_users')
        .select('tenant_id, role')
        .eq('user_id', users.id)
        .eq('status', 'active');

      if (tenantUsers && tenantUsers.length > 0) {
        userTenants = tenantUsers;
        
        // 如果没有指定租户，使用第一个租户
        if (!primaryTenant && tenantUsers.length > 0) {
          primaryTenant = tenantUsers[0].tenant_id;
        }
        
        // 验证指定的租户是否在用户的租户列表中
        if (primaryTenant) {
          const validTenant = tenantUsers.find((t) => t.tenant_id === primaryTenant);
          if (!validTenant) {
            primaryTenant = tenantUsers[0].tenant_id;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to fetch tenant users:', e);
    }

    // 如果用户没有关联租户，使用默认租户
    if (!primaryTenant) {
      primaryTenant = 'tenant_default';
    }

    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = users;

    return NextResponse.json({
      success: true,
      user: {
        ...userWithoutPassword,
        tenant_id: primaryTenant,
        tenant_role: userTenants.find((t) => t.tenant_id === primaryTenant)?.role || 'member',
        tenants: userTenants,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}
