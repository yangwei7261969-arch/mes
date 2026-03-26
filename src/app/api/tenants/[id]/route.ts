import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 单个租户管理 API
 * GET: 获取租户详情
 * PUT: 更新租户信息
 * PATCH: 更新租户状态
 * DELETE: 删除租户
 */

// GET: 获取租户详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getSupabaseClient();
    
    const { data: tenant, error } = await client
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !tenant) {
      return NextResponse.json({ 
        success: false, 
        error: '租户不存在' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data: tenant 
    });
  } catch (error) {
    console.error('Get tenant error:', error);
    return NextResponse.json({ 
      success: false, 
      error: '服务器错误' 
    }, { status: 500 });
  }
}

// PUT: 更新租户信息
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const client = getSupabaseClient();
    
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    
    if (body.name) updateData.name = body.name;
    if (body.plan) updateData.plan = body.plan;
    if (body.max_users !== undefined) updateData.max_users = body.max_users;
    if (body.max_orders !== undefined) updateData.max_orders = body.max_orders;
    if (body.contact_person !== undefined) updateData.contact_person = body.contact_person;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.features) updateData.features = body.features;
    if (body.config) updateData.config = body.config;

    const { data: tenant, error } = await client
      .from('tenants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update tenant:', error);
      return NextResponse.json({ 
        success: false, 
        error: '更新租户失败' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: tenant 
    });
  } catch (error) {
    console.error('Update tenant error:', error);
    return NextResponse.json({ 
      success: false, 
      error: '服务器错误' 
    }, { status: 500 });
  }
}

// PATCH: 更新租户状态
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;
    
    if (!['active', 'suspended', 'trial', 'cancelled'].includes(status)) {
      return NextResponse.json({ 
        success: false, 
        error: '无效的状态值' 
      }, { status: 400 });
    }

    const client = getSupabaseClient();
    
    const { data: tenant, error } = await client
      .from('tenants')
      .update({ 
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update tenant status:', error);
      return NextResponse.json({ 
        success: false, 
        error: '更新状态失败' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: tenant 
    });
  } catch (error) {
    console.error('Update tenant status error:', error);
    return NextResponse.json({ 
      success: false, 
      error: '服务器错误' 
    }, { status: 500 });
  }
}

// DELETE: 删除租户 (软删除)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getSupabaseClient();

    // 检查是否有关联数据
    const { data: users } = await client
      .from('tenant_users')
      .select('id')
      .eq('tenant_id', id)
      .limit(1);

    const { data: orders } = await client
      .from('production_orders')
      .select('id')
      .eq('tenant_id', id)
      .limit(1);

    if ((users && users.length > 0) || (orders && orders.length > 0)) {
      // 有关联数据，执行软删除
      const { error } = await client
        .from('tenants')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        return NextResponse.json({ 
          success: false, 
          error: '删除失败' 
        }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: '租户已停用（有关联数据，已软删除）' 
      });
    } else {
      // 无关联数据，直接删除
      const { error } = await client
        .from('tenants')
        .delete()
        .eq('id', id);

      if (error) {
        return NextResponse.json({ 
          success: false, 
          error: '删除失败' 
        }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: '租户已删除' 
      });
    }
  } catch (error) {
    console.error('Delete tenant error:', error);
    return NextResponse.json({ 
      success: false, 
      error: '服务器错误' 
    }, { status: 500 });
  }
}
