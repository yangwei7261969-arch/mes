import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 供应商注册
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const client = getSupabaseClient();

    // 检查编码是否已存在
    const { data: existing } = await client
      .from('suppliers')
      .select('id')
      .eq('code', body.code)
      .single();

    if (existing) {
      return NextResponse.json({ error: '供应商编码已存在' }, { status: 400 });
    }

    // 创建供应商
    const { data, error } = await client
      .from('suppliers')
      .insert({
        code: body.code,
        name: body.name,
        short_name: body.short_name,
        contact: body.contact,
        phone: body.phone,
        contact_phone: body.phone,
        email: body.email,
        address: body.address,
        password_hash: body.password, // 实际应用中应该加密
        parent_id: body.parent_id || null, // 上级供应商ID
        status: 'pending', // 待审核
        is_verified: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Supplier register error:', error);
    return NextResponse.json({ error: '注册失败' }, { status: 500 });
  }
}

// 供应商登录
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('suppliers')
      .select('*')
      .eq('code', body.code)
      .eq('password_hash', body.password)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
    }

    if (data.status === 'pending') {
      return NextResponse.json({ error: '账号待审核，请等待管理员审核' }, { status: 403 });
    }

    if (data.status === 'inactive') {
      return NextResponse.json({ error: '账号已被停用' }, { status: 403 });
    }

    // 返回供应商信息（不包含密码）
    const { password_hash, ...supplierInfo } = data;
    return NextResponse.json({ success: true, data: supplierInfo });
  } catch (error) {
    console.error('Supplier login error:', error);
    return NextResponse.json({ error: '登录失败' }, { status: 500 });
  }
}

// 获取供应商列表（含下线关系）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parent_id');
    const client = getSupabaseClient();

    let query = client.from('suppliers').select('*');
    
    if (parentId) {
      // 获取指定供应商的下线
      query = query.eq('parent_id', parentId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 按上级分组
    const grouped: Record<string, any[]> = {};
    data?.forEach((supplier: any) => {
      const key = supplier.parent_id || 'root';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(supplier);
    });

    return NextResponse.json({ success: true, data, grouped });
  } catch (error) {
    console.error('Get suppliers error:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

// 更新供应商状态
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const client = getSupabaseClient();

    const { error } = await client
      .from('suppliers')
      .update({
        status: body.status,
        is_verified: body.is_verified,
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update supplier error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
