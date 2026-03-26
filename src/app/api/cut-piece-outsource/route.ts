import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取裁片外发列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productionOrderId = searchParams.get('productionOrderId');
    const supplierId = searchParams.get('supplierId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const client = getSupabaseClient();
    
    let query = client
      .from('cut_piece_outsources')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (productionOrderId) {
      query = query.eq('production_order_id', productionOrderId);
    }

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 获取关联信息
    let orders: Record<string, any> = {};
    let suppliers: Record<string, any> = {};
    
    if (data && data.length > 0) {
      const orderIds = [...new Set(data.map(c => c.production_order_id).filter(Boolean))];
      const supplierIds = [...new Set(data.map(c => c.supplier_id).filter(Boolean))];
      
      if (orderIds.length > 0) {
        const { data: orderData } = await client
          .from('production_orders')
          .select('id, order_no, style_no, style_name')
          .in('id', orderIds);
          
        if (orderData) {
          orderData.forEach(o => {
            orders[o.id] = o;
          });
        }
      }
      
      if (supplierIds.length > 0) {
        const { data: supplierData } = await client
          .from('suppliers')
          .select('id, name, supplier_level, contact_person, phone')
          .in('id', supplierIds);
          
        if (supplierData) {
          supplierData.forEach(s => {
            suppliers[s.id] = s;
          });
        }
      }
    }

    const formattedData = data?.map(item => ({
      ...item,
      production_orders: orders[item.production_order_id] || null,
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
    console.error('Get cut piece outsource error:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}

// 创建裁片外发记录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('cut_piece_outsources')
      .insert({
        production_order_id: body.production_order_id,
        piece_name: body.piece_name,
        quantity: body.quantity,
        supplier_id: body.supplier_id,
        out_date: body.out_date,
        expected_return_date: body.expected_return_date,
        status: 'pending',
        notes: body.notes,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Create cut piece outsource error:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}

// 更新裁片外发记录
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const client = getSupabaseClient();

    // 先获取当前记录
    const { data: currentRecord } = await client
      .from('cut_piece_outsources')
      .select('status')
      .eq('id', body.id)
      .single();

    const updateData: Record<string, any> = {};
    
    if (body.status) {
      updateData.status = body.status;
      
      // 状态变更时自动记录时间
      if (body.status === 'in_transit' && currentRecord?.status === 'pending') {
        // 发料，记录开始时间
        updateData.start_time = new Date().toISOString();
        updateData.out_date = new Date().toISOString().split('T')[0];
      } else if (body.status === 'processing' && currentRecord?.status === 'in_transit') {
        // 开始加工
      } else if (body.status === 'completed' && ['in_transit', 'processing'].includes(currentRecord?.status || '')) {
        // 完成，记录结束时间
        updateData.end_time = new Date().toISOString();
        updateData.actual_return_date = new Date().toISOString().split('T')[0];
      }
    }
    
    if (body.actual_return_date) updateData.actual_return_date = body.actual_return_date;
    if (body.notes) updateData.notes = body.notes;

    const { data, error } = await client
      .from('cut_piece_outsources')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Update cut piece outsource error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
