import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取采购订单列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const supplierId = searchParams.get('supplierId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const client = getSupabaseClient();
    
    let query = client
      .from('purchase_orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }

    const { data, error, count } = await query
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 获取供应商信息
    let suppliers: Record<string, any> = {};
    if (data && data.length > 0) {
      const supplierIds = [...new Set(data.map(o => o.supplier_id).filter(Boolean))];
      if (supplierIds.length > 0) {
        const { data: supData } = await client
          .from('suppliers')
          .select('id, name')
          .in('id', supplierIds);
        
        if (supData) {
          supData.forEach(sup => {
            suppliers[sup.id] = sup;
          });
        }
      }
    }

    // 组装返回数据
    const formattedData = data?.map(item => ({
      ...item,
      suppliers: suppliers[item.supplier_id] || null,
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
      total: count,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Get purchase orders error:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}

// 创建采购订单
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { supplier_id, items, ...orderData } = body;
    
    const client = getSupabaseClient();

    // 生成采购单号
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const { data: lastOrder } = await client
      .from('purchase_orders')
      .select('order_no')
      .like('order_no', `PUR${dateStr}%`)
      .order('order_no', { ascending: false })
      .limit(1);

    let orderNo = `PUR${dateStr}001`;
    if (lastOrder && lastOrder.length > 0) {
      const lastNo = parseInt(lastOrder[0].order_no.slice(-3));
      orderNo = `PUR${dateStr}${String(lastNo + 1).padStart(3, '0')}`;
    }

    // 计算总金额
    const totalAmount = items?.reduce((sum: number, item: any) => sum + Number(item.amount), 0) || 0;

    // 创建采购订单
    const { data: order, error: orderError } = await client
      .from('purchase_orders')
      .insert({
        ...orderData,
        order_no: orderNo,
        supplier_id,
        total_amount: totalAmount,
        order_date: orderData.order_date || today.toISOString().slice(0, 10),
      })
      .select()
      .single();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    // 创建采购明细
    if (items && items.length > 0) {
      const purchaseItems = items.map((item: any) => ({
        order_id: order.id,
        material_id: item.material_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.quantity * item.unit_price,
      }));

      await client.from('purchase_items').insert(purchaseItems);
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error('Create purchase order error:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}

// 采购入库
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action } = body;
    
    const client = getSupabaseClient();

    if (action === 'receive') {
      // 采购入库
      const { data: order } = await client
        .from('purchase_orders')
        .select('*, purchase_items(*)')
        .eq('id', id)
        .single();

      if (!order) {
        return NextResponse.json({ error: '订单不存在' }, { status: 404 });
      }

      // 更新采购订单状态
      await client
        .from('purchase_orders')
        .update({
          status: 'completed',
          received_date: new Date().toISOString().slice(0, 10),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      // 物料入库
      for (const item of order.purchase_items || []) {
        // 调用库存入库接口
        await fetch(new URL('/api/inventory', request.url), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            material_id: item.material_id,
            type: 'in',
            quantity: item.received_qty || item.quantity,
            warehouse: '主仓库',
            related_type: 'purchase',
            related_id: id,
            notes: `采购入库 - ${order.order_no}`,
          }),
        });
      }

      return NextResponse.json({ success: true, message: '入库成功' });
    }

    // 更新状态
    const { status } = body;
    const { error } = await client
      .from('purchase_orders')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update purchase order error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
