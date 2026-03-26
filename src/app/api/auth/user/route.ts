import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 用户登录
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { email, password, username } = body;

    // 支持email或username登录
    const loginName = email || username;
    
    if (!loginName || !password) {
      return NextResponse.json(
        { success: false, error: '请输入用户名/邮箱和密码' },
        { status: 400 }
      );
    }

    // 查询用户 - 支持email或username登录
    const { data: user, error } = await client
      .from('users')
      .select(`
        id, name, email, phone, department, position, is_active, avatar_url, role_id,
        roles(id, name, display_name, level)
      `)
      .or(`email.eq.${loginName},username.eq.${loginName}`)
      .eq('password', password)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: '用户名/邮箱或密码错误' },
        { status: 401 }
      );
    }

    if (user.is_active !== true) {
      return NextResponse.json(
        { success: false, error: '账户已被停用' },
        { status: 403 }
      );
    }

    // 更新最后登录时间
    await client
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // 构建角色信息
    const roleData = Array.isArray(user.roles) ? user.roles[0] : user.roles;
    const roles = roleData ? [roleData] : [];
    const roleId = user.role_id || roleData?.id;

    // 获取用户权限
    let permissions: Array<{ module: string; action: string }> = [];
    
    if (roleId) {
      // 通过 role_permissions 表获取权限
      const { data: rolePerms } = await client
        .from('role_permissions')
        .select('permission_id, permissions(id, module, action)')
        .eq('role_id', roleId);
      
      if (rolePerms && rolePerms.length > 0) {
        permissions = rolePerms
          .map((rp: any) => {
            if (rp.permissions) {
              return {
                module: rp.permissions.module,
                action: rp.permissions.action,
              };
            }
            return null;
          })
          .filter(Boolean) as Array<{ module: string; action: string }>;
      }
    }

    // 如果是管理员角色，给予所有权限标识
    if (roleId === 'admin' || roleId === 'boss') {
      permissions = [{ module: '*', action: '*' }];
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        department: user.department,
        position: user.position,
        avatar: user.avatar_url,
        role_id: roleId,
        roles: roles.map((r: any) => r.id || r.name),
        permissions,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: '登录失败' },
      { status: 500 }
    );
  }
}

// 获取当前用户信息
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || searchParams.get('userId');

    // 如果没有传入userId，返回未登录状态
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: '未登录',
        user: null,
      }, { status: 401 });
    }

    const { data: user, error } = await client
      .from('users')
      .select(`
        id, name, email, phone, department, position, is_active, avatar_url, role_id,
        roles(id, name, display_name, level)
      `)
      .eq('id', userId)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    const roleData = Array.isArray(user.roles) ? user.roles[0] : user.roles;
    const roles = roleData ? [roleData] : [];
    const roleId = user.role_id || roleData?.id;

    // 获取用户权限
    let permissions: Array<{ module: string; action: string }> = [];
    
    if (roleId) {
      const { data: rolePerms } = await client
        .from('role_permissions')
        .select('permission_id, permissions(id, module, action)')
        .eq('role_id', roleId);
      
      if (rolePerms && rolePerms.length > 0) {
        permissions = rolePerms
          .map((rp: any) => {
            if (rp.permissions) {
              return {
                module: rp.permissions.module,
                action: rp.permissions.action,
              };
            }
            return null;
          })
          .filter(Boolean) as Array<{ module: string; action: string }>;
      }
    }

    // 如果是管理员角色，给予所有权限标识
    if (roleId === 'admin' || roleId === 'boss') {
      permissions = [{ module: '*', action: '*' }];
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        department: user.department,
        position: user.position,
        avatar: user.avatar_url,
        role_id: roleId,
        roles: roles.map((r: any) => r.id || r.name),
        permissions,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { success: false, error: '获取用户信息失败' },
      { status: 500 }
    );
  }
}
