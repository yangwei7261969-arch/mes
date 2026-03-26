import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取出货单列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const client = getSupabaseClient();
    
    let query = client
      .from('shipments')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data, error, count } = await query
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 获取客户信息
    let customers: Record<string, any> = {};
    if (data && data.length > 0) {
      const customerIds = [...new Set(data.map(s => s.customer_id).filter(Boolean))];
      if (customerIds.length > 0) {
        const { data: custData } = await client
          .from('customers')
          .select('id, name')
          .in('id', customerIds);
        
        if (custData) {
          custData.forEach(cust => {
            customers[cust.id] = cust;
          });
        }
      }
    }

    // 组装返回数据
    const formattedData = data?.map(item => ({
      ...item,
      customers: customers[item.customer_id] || null,
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
      total: count,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Get shipments error:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}

// 创建出货单
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customer_id, items, ...shipmentData } = body;
    
    const client = getSupabaseClient();

    // 生成出货单号
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const { data: lastShipment } = await client
      .from('shipments')
      .select('shipment_no')
      .like('shipment_no', `SHP${dateStr}%`)
      .order('shipment_no', { ascending: false })
      .limit(1);

    let shipmentNo = `SHP${dateStr}001`;
    if (lastShipment && lastShipment.length > 0) {
      const lastNo = parseInt(lastShipment[0].shipment_no.slice(-3));
      shipmentNo = `SHP${dateStr}${String(lastNo + 1).padStart(3, '0')}`;
    }

    // 计算总数和金额
    const totalQty = items?.reduce((sum: number, item: any) => sum + Number(item.quantity), 0) || 0;
    const totalAmount = items?.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0) || 0;

    // 创建出货单
    const { data: shipment, error: shipmentError } = await client
      .from('shipments')
      .insert({
        ...shipmentData,
        shipment_no: shipmentNo,
        customer_id,
        total_qty: totalQty,
        total_amount: totalAmount,
        shipment_date: shipmentData.shipment_date || today.toISOString().slice(0, 10),
      })
      .select()
      .single();

    if (shipmentError) {
      return NextResponse.json({ error: shipmentError.message }, { status: 500 });
    }

    // 创建出货明细并扣减库存
    if (items && items.length > 0) {
      for (const item of items) {
        // 创建出货明细
        await client.from('shipment_items').insert({
          shipment_id: shipment.id,
          goods_id: item.goods_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.quantity * item.unit_price,
        });

        // 扣减成衣库存
        await client
          .from('finished_inventory')
          .update({
            quantity: client.rpc('decrement', { 
              table_name: 'finished_inventory',
              column_name: 'quantity',
              row_id: item.inventory_id,
              amount: item.quantity 
            }),
          })
          .eq('id', item.inventory_id);
      }
    }

    return NextResponse.json({ success: true, data: shipment });
  } catch (error) {
    console.error('Create shipment error:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}

// 确认出货
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, tracking_no, courier } = body;
    
    const client = getSupabaseClient();

    if (action === 'ship') {
      // 确认发货
      const { error } = await client
        .from('shipments')
        .update({
          status: 'shipped',
          tracking_no,
          courier,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: '发货成功' });
    }

    if (action === 'deliver') {
      // 确认送达
      const { error } = await client
        .from('shipments')
        .update({
          status: 'delivered',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: '已确认送达' });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error) {
    console.error('Update shipment error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
