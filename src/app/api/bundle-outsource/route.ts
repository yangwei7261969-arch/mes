import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 创建外发记录
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const {
      bundle_id,
      cutting_order_id,
      supplier_id,
      supplier_level,
      quantity,
      process_type,
      process_name,
      send_date,
      expected_return_date,
      unit_price,
      notes,
      style_no,
      size,
      color,
    } = body;

    // 验证必填字段
    if (!bundle_id || !supplier_id || !process_type) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段' },
        { status: 400 }
      );
    }

    // 生成外发单号
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const { data: maxNo } = await supabase
      .from('bundle_outsource')
      .select('outsource_no')
      .like('outsource_no', `OUT${dateStr}%`)
      .order('outsource_no', { ascending: false })
      .limit(1);

    let nextNum = 1;
    if (maxNo && maxNo.length > 0 && maxNo[0].outsource_no) {
      const lastNum = parseInt(maxNo[0].outsource_no.slice(-3));
      nextNum = lastNum + 1;
    }
    const outsource_no = `OUT${dateStr}${String(nextNum).padStart(3, '0')}`;

    // 创建外发记录
    const { data: outsource, error: outsourceError } = await supabase
      .from('bundle_outsource')
      .insert({
        outsource_no,
        bundle_id,
        cutting_order_id,
        supplier_id,
        supplier_level: supplier_level || 1,
        quantity,
        process_type,
        process_name: process_name || process_type,
        send_date: send_date || new Date().toISOString().split('T')[0],
        expected_return_date,
        unit_price: unit_price || 0,
        total_price: (unit_price || 0) * quantity,
        status: 'pending',
        notes,
        style_no,
        size,
        color,
      })
      .select()
      .single();

    if (outsourceError) {
      console.error('Create outsource error:', outsourceError);
      return NextResponse.json(
        { success: false, error: '创建外发记录失败' },
        { status: 500 }
      );
    }

    // 更新裁片扎状态为"外发中"
    const { error: updateError } = await supabase
      .from('cutting_bundles')
      .update({ status: 'outsourced' })
      .eq('id', bundle_id);

    if (updateError) {
      console.error('Update bundle status error:', updateError);
    }

    return NextResponse.json({
      success: true,
      data: outsource,
      message: '外发成功',
    });
  } catch (error) {
    console.error('Outsource error:', error);
    return NextResponse.json(
      { success: false, error: '外发失败' },
      { status: 500 }
    );
  }
}

// 获取外发列表
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const bundle_id = searchParams.get('bundle_id');
    const supplier_id = searchParams.get('supplier_id');
    const status = searchParams.get('status');

    let query = supabase
      .from('bundle_outsource')
      .select(`
        *,
        suppliers:supplier_id (
          id,
          name,
          level
        ),
        cutting_bundles:bundle_id (
          bundle_no
        )
      `)
      .order('created_at', { ascending: false });

    if (bundle_id) {
      query = query.eq('bundle_id', bundle_id);
    }
    if (supplier_id) {
      query = query.eq('supplier_id', supplier_id);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Fetch outsource error:', error);
      return NextResponse.json(
        { success: false, error: '获取外发列表失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Fetch outsource error:', error);
    return NextResponse.json(
      { success: false, error: '获取外发列表失败' },
      { status: 500 }
    );
  }
}
