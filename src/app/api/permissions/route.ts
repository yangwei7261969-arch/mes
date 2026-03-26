import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 获取权限列表
 * GET: 获取所有权限或按模块分组
 */
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const groupBy = searchParams.get('group_by'); // module
    const userId = searchParams.get('user_id');

    // 如果指定了user_id，返回该用户的权限
    if (userId) {
      return await getUserPermissions(client, userId);
    }

    // 获取所有权限
    const { data: permissions, error } = await client
      .from('permissions')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Permissions query error:', error);
      // 处理表不存在的情况
      if (error.message?.includes('Could not find') || 
          error.code === '42P01' || 
          error.message?.includes('does not exist') ||
          error.message?.includes('relation') ||
          error.code === 'PGRST116') {
        return NextResponse.json({
          success: true,
          data: [],
          modules: []
        });
      }
      return NextResponse.json({ success: false, error: '获取权限列表失败' }, { status: 500 });
    }

    // 按模块分组
    if (groupBy === 'module') {
      const grouped: Record<string, any[]> = {};
      permissions?.forEach((p: any) => {
        if (!grouped[p.module]) {
          grouped[p.module] = [];
        }
        grouped[p.module].push(p);
      });

      return NextResponse.json({
        success: true,
        data: grouped,
        modules: Object.keys(grouped).sort()
      });
    }

    return NextResponse.json({
      success: true,
      data: permissions
    });

  } catch (error) {
    console.error('Get permissions error:', error);
    return NextResponse.json({ success: false, error: '获取权限失败' }, { status: 500 });
  }
}

/**
 * 获取用户权限
 */
async function getUserPermissions(client: any, userId: string) {
  // 1. 获取用户角色
  const { data: userRoles } = await client
    .from('user_roles')
    .select(`
      role_id,
      roles (
        id,
        name,
        display_name,
        level
      )
    `)
    .eq('user_id', userId);

  const roleIds = userRoles?.map((ur: any) => ur.role_id) || [];

  // 2. 获取角色权限
  let rolePermissions: string[] = [];
  if (roleIds.length > 0) {
    const { data: rpData } = await client
      .from('role_permissions')
      .select('permission_id')
      .in('role_id', roleIds);
    
    rolePermissions = rpData?.map((rp: any) => rp.permission_id) || [];
  }

  // 3. 获取用户额外权限
  const { data: userPermData } = await client
    .from('user_permissions')
    .select('*')
    .eq('user_id', userId);

  // 4. 获取用户数据权限
  const { data: dataPermissions } = await client
    .from('user_data_permissions')
    .select('*')
    .eq('user_id', userId);

  // 5. 合并权限
  const additionalPermissions: string[] = [];
  userPermData?.forEach((up: any) => {
    const module = up.module;
    if (up.can_view) additionalPermissions.push(`perm_${module}_view`);
    if (up.can_create) additionalPermissions.push(`perm_${module}_create`);
    if (up.can_edit) additionalPermissions.push(`perm_${module}_edit`);
    if (up.can_delete) additionalPermissions.push(`perm_${module}_delete`);
    if (up.can_approve) additionalPermissions.push(`perm_${module}_approve`);
    if (up.can_export) additionalPermissions.push(`perm_${module}_export`);
  });

  const allPermissions = [...new Set([...rolePermissions, ...additionalPermissions])];

  return NextResponse.json({
    success: true,
    data: {
      roles: userRoles?.map((ur: any) => ur.roles) || [],
      permissions: allPermissions,
      data_permissions: dataPermissions || [],
      level: userRoles?.reduce((min: number, ur: any) => 
        Math.min(min, ur.roles?.level || 999), 999) || 999
    }
  });
}
