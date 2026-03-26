import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 租户用户管理 API
 */

// GET: 获取租户下的用户列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tenantId } = await params;
    const client = getSupabaseClient();
    
    const { data: users, error } = await client
      .from('tenant_users')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('joined_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch tenant users:', error);
      return NextResponse.json({ 
        success: false, 
        error: '获取用户列表失败' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: users || [] 
    });
  } catch (error) {
    console.error('Get tenant users error:', error);
    return NextResponse.json({ 
      success: false, 
      error: '服务器错误' 
    }, { status: 500 });
  }
}

// POST: 添加用户到租户
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tenantId } = await params;
    const body = await request.json();
    const { user_id, role = 'member', department } = body;

    if (!user_id) {
      return NextResponse.json({ 
        success: false, 
        error: '用户ID必填' 
      }, { status: 400 });
    }

    const client = getSupabaseClient();

    // 检查是否已存在
    const { data: existingUser } = await client
      .from('tenant_users')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', user_id)
      .single();

    if (existingUser) {
      return NextResponse.json({ 
        success: false, 
        error: '用户已在租户中' 
      }, { status: 400 });
    }

    // 检查用户数限制
    const { data: tenant } = await client
      .from('tenants')
      .select('max_users')
      .eq('id', tenantId)
      .single();

    const { count } = await client
      .from('tenant_users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    if (tenant && count && count >= tenant.max_users) {
      return NextResponse.json({ 
        success: false, 
        error: '已达到用户数上限' 
      }, { status: 400 });
    }

    // 添加用户
    const { data: tenantUser, error } = await client
      .from('tenant_users')
      .insert({
        tenant_id: tenantId,
        user_id,
        role,
        department,
        status: 'active',
        joined_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to add tenant user:', error);
      return NextResponse.json({ 
        success: false, 
        error: '添加用户失败' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: tenantUser 
    });
  } catch (error) {
    console.error('Add tenant user error:', error);
    return NextResponse.json({ 
      success: false, 
      error: '服务器错误' 
    }, { status: 500 });
  }
}
