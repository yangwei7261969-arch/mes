import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取生产订单列表（含外发、工艺、尾部信息）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const client = getSupabaseClient();

    let query = client
      .from('production_orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`order_no.ilike.%${search}%,style_no.ilike.%${search}%,style_name.ilike.%${search}%`);
    }

    const { data, error, count } = await query
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 获取所有订单的ID
    const orderIds = data?.map((o: any) => o.id) || [];

    // 查询外发订单信息
    const { data: outsourceOrders } = await client
      .from('outsource_orders')
      .select('id, production_order_id, supplier_id, status')
      .in('production_order_id', orderIds);

    // 获取供应商名称
    const supplierIds = [...new Set(outsourceOrders?.map((o: any) => o.supplier_id).filter(Boolean) || [])];
    let suppliersMap: Record<string, string> = {};
    if (supplierIds.length > 0) {
      const { data: suppliers } = await client
        .from('suppliers')
        .select('id, name')
        .in('id', supplierIds);
      suppliers?.forEach((s: any) => {
        suppliersMap[s.id] = s.name;
      });
    }

    // 查询二次工艺信息
    const { data: craftProcesses } = await client
      .from('craft_processes')
      .select('production_order_id, quantity, completed_quantity, status')
      .in('production_order_id', orderIds);

    // 查询尾部处理信息
    const { data: finishingRecords } = await client
      .from('finishing_records')
      .select('production_order_id, quantity, completed_quantity, status')
      .in('production_order_id', orderIds);

    // 组装数据
    const enrichedData = data?.map((order: any) => {
      // 外发信息
      const outsourceInfo = outsourceOrders
        ?.filter((o: any) => o.production_order_id === order.id)
        .map((o: any) => ({
          supplier_id: o.supplier_id,
          supplier_name: suppliersMap[o.supplier_id] || '未知供应商',
          status: o.status,
        })) || [];

      // 二次工艺信息
      const craftInfo = craftProcesses
        ?.filter((c: any) => c.production_order_id === order.id)
        .reduce((acc: any, c: any) => {
          acc.total += c.quantity || 0;
          acc.completed += c.completed_quantity || 0;
          return acc;
        }, { total: 0, completed: 0, status: 'pending' });
      
      if (craftInfo && craftInfo.total > 0) {
        craftInfo.status = craftInfo.completed >= craftInfo.total ? 'completed' : 
          craftInfo.completed > 0 ? 'in_progress' : 'pending';
      }

      // 尾部处理信息
      const finishingInfo = finishingRecords
        ?.filter((f: any) => f.production_order_id === order.id)
        .reduce((acc: any, f: any) => {
          acc.total += f.quantity || 0;
          acc.completed += f.completed_quantity || 0;
          return acc;
        }, { total: 0, completed: 0, status: 'pending' });
      
      if (finishingInfo && finishingInfo.total > 0) {
        finishingInfo.status = finishingInfo.completed >= finishingInfo.total ? 'completed' : 
          finishingInfo.completed > 0 ? 'in_progress' : 'pending';
      }

      return {
        ...order,
        outsource_info: outsourceInfo.length > 0 ? outsourceInfo : undefined,
        craft_info: craftInfo && craftInfo.total > 0 ? craftInfo : undefined,
        finishing_info: finishingInfo && finishingInfo.total > 0 ? finishingInfo : undefined,
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedData,
      total: count,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Get production orders error:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}

// 创建生产订单
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const client = getSupabaseClient();

    // 生成订单号
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const { data: lastOrder } = await client
      .from('production_orders')
      .select('order_no')
      .like('order_no', `PO${dateStr}%`)
      .order('order_no', { ascending: false })
      .limit(1);

    let orderNo = `PO${dateStr}001`;
    if (lastOrder && lastOrder.length > 0) {
      const lastNo = parseInt(lastOrder[0].order_no.slice(-3));
      orderNo = `PO${dateStr}${String(lastNo + 1).padStart(3, '0')}`;
    }

    // 处理数据，确保字段正确（不使用不存在的字段）
    const orderData: any = {
      order_no: orderNo,
      style_no: body.style_no,
      style_name: body.style_name || '',
      color: body.color,
      quantity: body.quantity,
      size_breakdown: body.size_breakdown || null,
      plan_start_date: body.plan_start_date || null,
      plan_end_date: body.plan_end_date || null,
      workshop: body.workshop || null,
      status: 'pending',
      notes: body.notes || null,
    };
    
    // 处理图片字段（可能存在也可能不存在）
    if (body.style_image) {
      orderData.style_image = body.style_image;
    }

    const { data, error } = await client
      .from('production_orders')
      .insert(orderData)
      .select()
      .single();

    if (error) {
      console.error('Create order error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 同时创建order_details记录
    if (body.size_breakdown && Object.keys(body.size_breakdown).length > 0) {
      const detailsData = Object.entries(body.size_breakdown).map(([size, qty]) => ({
        id: `OD${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
        order_id: data.id,
        size,
        quantity: qty,
      }));
      
      await client.from('order_details').insert(detailsData);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Create production order error:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}

// 更新生产订单
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const client = getSupabaseClient();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少订单ID' }, { status: 400 });
    }

    // 构建更新数据
    const dataToUpdate: any = {};
    
    if (updateData.style_no !== undefined) dataToUpdate.style_no = updateData.style_no;
    if (updateData.style_name !== undefined) dataToUpdate.style_name = updateData.style_name;
    if (updateData.color !== undefined) dataToUpdate.color = updateData.color;
    if (updateData.quantity !== undefined) dataToUpdate.quantity = updateData.quantity;
    if (updateData.size_breakdown !== undefined) dataToUpdate.size_breakdown = updateData.size_breakdown;
    if (updateData.plan_start_date !== undefined) dataToUpdate.plan_start_date = updateData.plan_start_date;
    if (updateData.plan_end_date !== undefined) dataToUpdate.plan_end_date = updateData.plan_end_date;
    if (updateData.status !== undefined) dataToUpdate.status = updateData.status;
    if (updateData.notes !== undefined) dataToUpdate.notes = updateData.notes;
    if (updateData.workshop !== undefined) dataToUpdate.workshop = updateData.workshop;
    if (updateData.style_image !== undefined) dataToUpdate.style_image = updateData.style_image;
    
    dataToUpdate.updated_at = new Date().toISOString();

    const { data, error } = await client
      .from('production_orders')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update order error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 如果更新了尺码明细，同步更新order_details
    if (updateData.size_breakdown) {
      // 删除旧的明细
      await client.from('order_details').delete().eq('order_id', id);
      
      // 创建新的明细
      const detailsData = Object.entries(updateData.size_breakdown).map(([size, qty]) => ({
        id: `OD${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
        order_id: id,
        size,
        quantity: qty,
      }));
      
      if (detailsData.length > 0) {
        await client.from('order_details').insert(detailsData);
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Update production order error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
