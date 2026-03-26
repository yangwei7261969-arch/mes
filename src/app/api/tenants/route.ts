import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 租户管理 API
 * GET: 获取所有租户列表
 * POST: 创建新租户
 */

// GET: 获取租户列表
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    
    const { data: tenants, error } = await client
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch tenants:', error);
      return NextResponse.json({ 
        success: false, 
        error: '获取租户列表失败' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: tenants || [] 
    });
  } catch (error) {
    console.error('Get tenants error:', error);
    return NextResponse.json({ 
      success: false, 
      error: '服务器错误' 
    }, { status: 500 });
  }
}

// POST: 创建租户
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      code, 
      plan = 'standard',
      max_users = 50,
      max_orders = 1000,
      contact_person,
      phone,
      email,
      features = {},
    } = body;

    if (!name || !code) {
      return NextResponse.json({ 
        success: false, 
        error: '租户名称和编码必填' 
      }, { status: 400 });
    }

    const client = getSupabaseClient();

    // 检查编码是否已存在
    const { data: existingTenant } = await client
      .from('tenants')
      .select('id')
      .eq('code', code)
      .single();

    if (existingTenant) {
      return NextResponse.json({ 
        success: false, 
        error: '租户编码已存在' 
      }, { status: 400 });
    }

    // 创建租户
    const { data: tenant, error } = await client
      .from('tenants')
      .insert({
        name,
        code,
        plan,
        status: 'trial',
        max_users,
        max_orders,
        contact_person,
        phone,
        email,
        features,
        config: {
          timezone: 'Asia/Shanghai',
          language: 'zh-CN',
          currency: 'CNY',
        },
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create tenant:', error);
      return NextResponse.json({ 
        success: false, 
        error: '创建租户失败' 
      }, { status: 500 });
    }

    // 自动创建一个默认工厂
    await client.from('factories').insert({
      tenant_id: tenant.id,
      name: `${name} - 主工厂`,
      code: `${code}_MAIN`,
      status: 'active',
    });

    return NextResponse.json({ 
      success: true, 
      data: tenant 
    });
  } catch (error) {
    console.error('Create tenant error:', error);
    return NextResponse.json({ 
      success: false, 
      error: '服务器错误' 
    }, { status: 500 });
  }
}
