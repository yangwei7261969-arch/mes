import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取客户列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const level = searchParams.get('level');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const client = getSupabaseClient();
    
    let query = client
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (level && level !== 'all') {
      query = query.eq('level', level);
    }

    if (search) {
      query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%,contact.ilike.%${search}%`);
    }

    const { data, error, count } = await query
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
      total: count,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Get customers error:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}

// 创建客户
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const client = getSupabaseClient();

    // 生成客户编码
    const { data: lastCustomer } = await client
      .from('customers')
      .select('code')
      .order('code', { ascending: false })
      .limit(1);

    let code = 'C001';
    if (lastCustomer && lastCustomer.length > 0) {
      const lastCode = parseInt(lastCustomer[0].code.replace('C', ''));
      code = `C${String(lastCode + 1).padStart(3, '0')}`;
    }

    const { data, error } = await client
      .from('customers')
      .insert({ ...body, code })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}
