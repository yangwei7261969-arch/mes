import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 生成外发订单号
function generateOutsourceOrderNo(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `WF${year}${month}${day}${random}`;
}

// 获取外发订单列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplier_id');
    const status = searchParams.get('status');
    const client = getSupabaseClient();

    let query = client.from('outsource_orders').select('*');

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 获取供应商信息
    const supplierIds = [...new Set(data?.map((o: any) => o.supplier_id) || [])];
    let suppliersMap: Record<string, any> = {};
    
    if (supplierIds.length > 0) {
      const { data: suppliers } = await client
        .from('suppliers')
        .select('id, name, code, contact, phone')
        .in('id', supplierIds);
      
      if (suppliers) {
        suppliersMap = suppliers.reduce((acc: any, s: any) => {
          acc[s.id] = s;
          return acc;
        }, {});
      }
    }

    const result = data?.map((order: any) => ({
      ...order,
      supplier: suppliersMap[order.supplier_id] || null,
    })) || [];

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Get outsource orders error:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

// 创建外发订单
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const client = getSupabaseClient();

    const orderNo = generateOutsourceOrderNo();

    const { data, error } = await client
      .from('outsource_orders')
      .insert({
        order_no: orderNo,
        production_order_id: body.production_order_id,
        supplier_id: body.supplier_id,
        style_no: body.style_no,
        style_name: body.style_name,
        color: body.color,
        size: body.size,
        quantity: body.quantity,
        unit_price: body.unit_price,
        total_amount: body.unit_price ? body.unit_price * body.quantity : null,
        status: 'pending',
        priority: body.priority || 5,
        plan_start_date: body.plan_start_date,
        plan_end_date: body.plan_end_date,
        notes: body.notes,
        created_by: body.created_by,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 创建各阶段进度记录
    const stages = ['production_prep', 'cutting', 'craft', 'workshop', 'finishing', 'shipping'];
    const progressRecords = stages.map(stage => ({
      outsource_order_id: data.id,
      stage,
      status: 'pending',
    }));

    await client.from('outsource_progress').insert(progressRecords);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Create outsource order error:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}

// 更新外发订单状态（接单/拒绝/完成等）
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const client = getSupabaseClient();

    const updateData: any = {
      status: body.status,
      updated_at: new Date().toISOString(),
    };

    if (body.status === 'accepted') {
      updateData.actual_start_date = new Date().toISOString().split('T')[0];
    } else if (body.status === 'completed') {
      updateData.actual_end_date = new Date().toISOString().split('T')[0];
    }

    const { error } = await client
      .from('outsource_orders')
      .update(updateData)
      .eq('id', body.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update outsource order error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
