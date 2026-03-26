import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 生成发货任务号
function generateTaskNo(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `FH${year}${month}${day}${random}`;
}

// 获取发货任务列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const supplierId = searchParams.get('supplier_id');
    const client = getSupabaseClient();

    let query = client.from('shipping_tasks').select('*');

    if (status) {
      query = query.eq('status', status);
    }
    
    // 供应商筛选 - 只看自己的发货记录
    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 获取客户信息
    const customerIds = [...new Set(data?.map((t: any) => t.customer_id).filter(Boolean) || [])];
    let customersMap: Record<string, any> = {};
    
    if (customerIds.length > 0) {
      const { data: customers } = await client
        .from('customers')
        .select('id, name, code, contact, phone, address')
        .in('id', customerIds);
      
      if (customers) {
        customersMap = customers.reduce((acc: any, c: any) => {
          acc[c.id] = c;
          return acc;
        }, {});
      }
    }

    const result = data?.map((task: any) => ({
      ...task,
      customer: customersMap[task.customer_id] || null,
    })) || [];

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Get shipping tasks error:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

// 创建发货任务
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const client = getSupabaseClient();

    const taskNo = generateTaskNo();

    const { data, error } = await client
      .from('shipping_tasks')
      .insert({
        task_no: taskNo,
        outsource_order_id: body.outsource_order_id,
        production_order_id: body.production_order_id,
        customer_id: body.customer_id,
        supplier_id: body.supplier_id,
        style_no: body.style_no,
        quantity: body.quantity,
        courier: body.courier,
        tracking_no: body.tracking_no,
        shipping_address: body.shipping_address,
        receiver: body.receiver,
        receiver_phone: body.receiver_phone,
        ship_date: body.ship_date,
        status: 'pending',
        notes: body.notes,
        created_by: body.created_by,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Create shipping task error:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}

// 更新发货任务状态
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const client = getSupabaseClient();

    const updateData: any = {
      status: body.status,
      updated_at: new Date().toISOString(),
    };

    if (body.status === 'shipped') {
      updateData.ship_date = new Date().toISOString().split('T')[0];
      updateData.tracking_no = body.tracking_no;
      updateData.courier = body.courier;
    } else if (body.status === 'delivered') {
      updateData.delivery_date = new Date().toISOString().split('T')[0];
    }

    const { error } = await client
      .from('shipping_tasks')
      .update(updateData)
      .eq('id', body.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update shipping task error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
