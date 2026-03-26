import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 角色管理API
 * GET: 获取角色列表
 * POST: 创建新角色
 * PUT: 更新角色权限
 */

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const includePermissions = searchParams.get('include_permissions') === 'true';

    // 获取角色列表
    const { data: roles, error } = await client
      .from('roles')
      .select('*')
      .order('level', { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: '获取角色列表失败' }, { status: 500 });
    }

    // 如果需要包含权限信息
    if (includePermissions && roles) {
      const rolesWithPermissions = await Promise.all(
        roles.map(async (role: any) => {
          const { data: permissions } = await client
            .from('role_permissions')
            .select('permission_id')
            .eq('role_id', role.id);
          
          return {
            ...role,
            permission_count: permissions?.length || 0,
            permissions: permissions?.map((p: any) => p.permission_id) || []
          };
        })
      );

      // 获取所有权限列表
      const { data: allPermissions } = await client
        .from('permissions')
        .select('*')
        .order('module', { ascending: true });

      return NextResponse.json({
        success: true,
        data: rolesWithPermissions,
        allPermissions: allPermissions || []
      });
    }

    return NextResponse.json({
      success: true,
      data: roles
    });

  } catch (error) {
    console.error('Get roles error:', error);
    return NextResponse.json({ success: false, error: '获取角色失败' }, { status: 500 });
  }
}

/**
 * 创建或更新角色
 */
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { action, roleId, permissionIds } = body;

    if (action === 'update_permissions') {
      // 更新角色权限
      if (!roleId || !Array.isArray(permissionIds)) {
        return NextResponse.json({ 
          success: false, 
          error: '参数错误' 
        }, { status: 400 });
      }

      // 先删除旧权限
      await client
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId);

      // 插入新权限
      if (permissionIds.length > 0) {
        const records = permissionIds.map((pid: string) => ({
          id: `rp_${roleId}_${pid}`,
          role_id: roleId,
          permission_id: pid
        }));

        const { error } = await client
          .from('role_permissions')
          .insert(records);

        if (error) {
          return NextResponse.json({ 
            success: false, 
            error: '更新权限失败' 
          }, { status: 500 });
        }
      }

      return NextResponse.json({
        success: true,
        message: '权限更新成功'
      });
    }

    if (action === 'create') {
      // 创建新角色
      const { name, displayName, description, level, parentId } = body;

      const { data, error } = await client
        .from('roles')
        .insert({
          id: name.toLowerCase().replace(/\s+/g, '_'),
          name,
          display_name: displayName,
          description,
          level: level || 5,
          parent_id: parentId,
          is_system: false
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ 
          success: false, 
          error: '创建角色失败',
          details: error.message 
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data
      });
    }

    if (action === 'assign_user') {
      // 给用户分配角色
      const { userId, roleIds } = body;

      if (!userId || !Array.isArray(roleIds)) {
        return NextResponse.json({ 
          success: false, 
          error: '参数错误' 
        }, { status: 400 });
      }

      // 先删除用户旧角色
      await client
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // 插入新角色
      if (roleIds.length > 0) {
        const records = roleIds.map((roleId: string) => ({
          user_id: userId,
          role_id: roleId
        }));

        const { error } = await client
          .from('user_roles')
          .insert(records);

        if (error) {
          return NextResponse.json({ 
            success: false, 
            error: '分配角色失败' 
          }, { status: 500 });
        }
      }

      return NextResponse.json({
        success: true,
        message: '角色分配成功'
      });
    }

    return NextResponse.json({ 
      success: false, 
      error: '未知操作' 
    }, { status: 400 });

  } catch (error) {
    console.error('Roles POST error:', error);
    return NextResponse.json({ success: false, error: '操作失败' }, { status: 500 });
  }
}
