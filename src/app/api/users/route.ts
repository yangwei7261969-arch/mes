import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取用户列表
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search');

    let query = client
      .from('users')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: users, error: usersError, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    // 获取用户角色
    const userIds = users?.map((u: any) => u.id) || [];
    const { data: userRoles } = await client
      .from('user_roles')
      .select('user_id, role_id, roles(id, name, display_name, level)');

    // 组装数据
    const result = users?.map((user: any) => ({
      ...user,
      roles: userRoles?.filter((ur: any) => ur.user_id === user.id)?.map((ur: any) => ur.roles) || [],
    }));

    return NextResponse.json({
      success: true,
      data: result,
      total: count,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: '获取用户失败' }, { status: 500 });
  }
}

// 创建用户
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { name, email, phone, password, department, position, role_ids } = body;

    if (!name || !email) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    // 检查邮箱是否已存在
    const { data: existing } = await client
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return NextResponse.json({ error: '邮箱已被使用' }, { status: 400 });
    }

    // 创建用户
    const { data: user, error: userError } = await client
      .from('users')
      .insert({
        id: body.id || undefined,
        username: body.username || email.split('@')[0],
        name,
        email,
        phone,
        password, // 实际应该加密
        department,
        position,
        status: 'active',
      })
      .select()
      .single();

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    // 分配角色
    if (role_ids && role_ids.length > 0) {
      const records = role_ids.map((role_id: string) => ({
        id: `ur_${user.id}_${role_id}`,
        user_id: user.id,
        role_id,
      }));

      await client
        .from('user_roles')
        .insert(records);
    }

    return NextResponse.json({ success: true, data: user, message: '用户创建成功' });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: '创建用户失败' }, { status: 500 });
  }
}

// 更新用户
export async function PUT(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { id, name, email, phone, department, position, status, role_ids } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
    }

    // 更新用户信息
    const { error: updateError } = await client
      .from('users')
      .update({
        name,
        email,
        phone,
        department,
        position,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 更新角色
    if (role_ids !== undefined) {
      // 删除旧角色
      await client
        .from('user_roles')
        .delete()
        .eq('user_id', id);

      // 插入新角色
      if (role_ids && role_ids.length > 0) {
        const records = role_ids.map((role_id: string) => ({
          id: `ur_${id}_${role_id}`,
          user_id: id,
          role_id,
        }));

        await client
          .from('user_roles')
          .insert(records);
      }
    }

    return NextResponse.json({ success: true, message: '用户更新成功' });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: '更新用户失败' }, { status: 500 });
  }
}

// 删除用户
export async function DELETE(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
    }

    // 删除用户角色
    await client
      .from('user_roles')
      .delete()
      .eq('user_id', id);

    // 删除用户权限
    await client
      .from('user_permissions')
      .delete()
      .eq('user_id', id);

    // 删除用户
    const { error } = await client
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '用户删除成功' });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: '删除用户失败' }, { status: 500 });
  }
}
