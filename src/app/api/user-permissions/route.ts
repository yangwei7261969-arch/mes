import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取用户权限
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const client = getSupabaseClient();

    if (userId) {
      // 获取指定用户的权限
      const { data: permissions, error: permError } = await client
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId);

      if (permError) {
        return NextResponse.json({ error: permError.message }, { status: 500 });
      }

      // 获取用户部门
      const { data: departments, error: deptError } = await client
        .from('user_departments')
        .select('*')
        .eq('user_id', userId);

      if (deptError) {
        return NextResponse.json({ error: deptError.message }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        data: {
          permissions: permissions || [],
          departments: departments || [],
        }
      });
    }

    // 获取所有用户的权限配置
    const { data: users, error: usersError } = await client
      .from('users')
      .select('id, name, email, department, position, status');

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    // 获取所有权限配置
    const { data: allPermissions } = await client
      .from('user_permissions')
      .select('*');

    // 获取所有部门配置
    const { data: allDepartments } = await client
      .from('user_departments')
      .select('*');

    // 组装数据
    const result = users?.map((user: any) => ({
      ...user,
      permissions: allPermissions?.filter((p: any) => p.user_id === user.id) || [],
      departments: allDepartments?.filter((d: any) => d.user_id === user.id) || [],
    })) || [];

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Get permissions error:', error);
    return NextResponse.json({ error: '获取权限失败' }, { status: 500 });
  }
}

// 设置用户权限
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const client = getSupabaseClient();

    // 删除旧权限
    await client
      .from('user_permissions')
      .delete()
      .eq('user_id', body.user_id);

    // 插入新权限
    if (body.permissions && body.permissions.length > 0) {
      const records = body.permissions.map((p: any) => ({
        user_id: body.user_id,
        module: p.module,
        can_view: p.can_view ?? true,
        can_create: p.can_create ?? false,
        can_edit: p.can_edit ?? false,
        can_delete: p.can_delete ?? false,
        can_approve: p.can_approve ?? false,
      }));

      const { error } = await client
        .from('user_permissions')
        .insert(records);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Set permissions error:', error);
    return NextResponse.json({ error: '设置权限失败' }, { status: 500 });
  }
}

// 设置用户部门
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const client = getSupabaseClient();

    // 删除旧部门配置
    await client
      .from('user_departments')
      .delete()
      .eq('user_id', body.user_id);

    // 插入新部门配置
    if (body.departments && body.departments.length > 0) {
      const records = body.departments.map((d: any) => ({
        user_id: body.user_id,
        department: d.department,
        position: d.position,
        is_manager: d.is_manager ?? false,
      }));

      const { error } = await client
        .from('user_departments')
        .insert(records);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Set departments error:', error);
    return NextResponse.json({ error: '设置部门失败' }, { status: 500 });
  }
}
