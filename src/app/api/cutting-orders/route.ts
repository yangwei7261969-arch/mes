import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取裁床单列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const productionOrderId = searchParams.get('production_order_id');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const client = getSupabaseClient();
    
    let query = client
      .from('cutting_orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (productionOrderId) {
      query = query.eq('production_order_id', productionOrderId);
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
    console.error('Get cutting orders error:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}

// 创建裁床单
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const client = getSupabaseClient();

    // 生成裁床单号
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const { count } = await client
      .from('cutting_orders')
      .select('id', { count: 'exact', head: true });
    
    const orderNo = `CUT${dateStr}${String((count || 0) + 1).padStart(3, '0')}`;

    const { data, error } = await client
      .from('cutting_orders')
      .insert({
        order_no: orderNo,
        production_order_id: body.production_order_id || null,
        style_no: body.style_no,
        color: body.color,
        fabric_code: body.fabric_code || null,
        fabric_qty: body.fabric_qty || null,
        cutting_qty: body.cutting_qty,
        completed_qty: 0,
        defective_qty: 0,
        status: body.status || 'pending',
        cutting_date: body.cutting_date || new Date().toISOString().slice(0, 10),
        workshop: body.workshop || null,
        cutting_team: body.cutting_team || null,
        notes: body.notes || null,
        size_breakdown: body.size_breakdown || null,
        bed_number: body.bed_number || null,
        total_beds: body.total_beds || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 如果关联了生产订单，更新生产订单状态
    if (body.production_order_id) {
      await client
        .from('production_orders')
        .update({ status: 'in_progress' })
        .eq('id', body.production_order_id);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Create cutting order error:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}

// 更新裁床单
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, completed_qty } = body;
    const client = getSupabaseClient();

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (status) updateData.status = status;
    if (completed_qty !== undefined) updateData.completed_qty = completed_qty;

    const { data, error } = await client
      .from('cutting_orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Update cutting order error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

// 删除裁床单
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: '缺少ID参数' }, { status: 400 });
    }

    const client = getSupabaseClient();
    
    const { error } = await client
      .from('cutting_orders')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete cutting order error:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
