import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取账单列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const client = getSupabaseClient();
    
    let query = client
      .from('bills')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
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
    console.error('Get bills error:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}

// 创建账单
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const client = getSupabaseClient();

    // 生成账单号
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = body.type === 'income' ? 'IN' : 'OUT';
    
    const { data: lastBill } = await client
      .from('bills')
      .select('bill_no')
      .like('bill_no', `${prefix}${dateStr}%`)
      .order('bill_no', { ascending: false })
      .limit(1);

    let billNo = `${prefix}${dateStr}001`;
    if (lastBill && lastBill.length > 0) {
      const lastNo = parseInt(lastBill[0].bill_no.slice(-3));
      billNo = `${prefix}${dateStr}${String(lastNo + 1).padStart(3, '0')}`;
    }

    const { data, error } = await client
      .from('bills')
      .insert({ ...body, bill_no: billNo })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Create bill error:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}
