import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取供应商结算记录
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplier_id');

    if (!supplierId) {
      return NextResponse.json({ error: '缺少供应商ID' }, { status: 400 });
    }

    const client = getSupabaseClient();

    const { data, error } = await client
      .from('supplier_payments')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (error) {
      // 表可能不存在，返回空数组
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, data: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Get supplier payments error:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}
