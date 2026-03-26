import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取裁床分扎列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cuttingOrderId = searchParams.get('cutting_order_id');
    const bundleNo = searchParams.get('bundle_no');

    const client = getSupabaseClient();
    
    let query = client
      .from('cutting_bundles')
      .select('*', { count: 'exact' })
      .order('bundle_no', { ascending: true });

    if (cuttingOrderId) {
      query = query.eq('cutting_order_id', cuttingOrderId);
    }

    if (bundleNo) {
      query = query.eq('bundle_no', bundleNo);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 获取裁床单信息
    let cuttingOrders: Record<string, any> = {};
    if (data && data.length > 0) {
      const orderIds = [...new Set(data.map(b => b.cutting_order_id).filter(Boolean))];
      if (orderIds.length > 0) {
        const { data: orderData } = await client
          .from('cutting_orders')
          .select('id, order_no, style_no, color, bed_number, total_beds')
          .in('id', orderIds);
        
        if (orderData) {
          orderData.forEach(o => cuttingOrders[o.id] = o);
        }
      }
    }

    const formattedData = data?.map(item => ({
      ...item,
      cutting_orders: cuttingOrders[item.cutting_order_id] || null,
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
      total: count,
    });
  } catch (error) {
    console.error('Get cutting bundles error:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}

// 创建裁床分扎（批量）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      cutting_order_id, 
      bundles, // [{ size, color, quantity, bundle_count }]
    } = body;
    
    const client = getSupabaseClient();

    // 获取裁床单信息
    const { data: cuttingOrder } = await client
      .from('cutting_orders')
      .select('*')
      .eq('id', cutting_order_id)
      .single();

    if (!cuttingOrder) {
      return NextResponse.json({ error: '裁床单不存在' }, { status: 404 });
    }

    // 查询该裁床单已有的最大分扎编号，避免重复
    const { data: existingBundles } = await client
      .from('cutting_bundles')
      .select('bundle_no')
      .eq('cutting_order_id', cutting_order_id)
      .order('bundle_no', { ascending: false })
      .limit(1);

    // 解析最大编号，获取下一个起始编号
    let bundleIndex = 1;
    if (existingBundles && existingBundles.length > 0) {
      const lastBundleNo = existingBundles[0].bundle_no;
      // 从 bundle_no 中提取编号，格式如 "CUT20260321001-003"
      const match = lastBundleNo?.match(/-(\d+)$/);
      if (match) {
        bundleIndex = parseInt(match[1], 10) + 1;
      }
    }

    // 生成分扎数据
    const bundleRecords: any[] = [];

    for (const bundle of bundles) {
      for (let i = 0; i < bundle.bundle_count; i++) {
        const bundleNo = `${cuttingOrder.order_no}-${String(bundleIndex).padStart(3, '0')}`;
        
        bundleRecords.push({
          cutting_order_id,
          bundle_no: bundleNo,
          size: bundle.size,
          color: bundle.color || cuttingOrder.color,
          quantity: bundle.quantity,
          status: 'pending',
          qr_code: bundleNo, // 二维码内容即扎号
        });
        
        bundleIndex++;
      }
    }

    // 批量插入
    const { data, error } = await client
      .from('cutting_bundles')
      .insert(bundleRecords)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data,
      count: bundleRecords.length,
      message: `成功创建 ${bundleRecords.length} 扎` 
    });
  } catch (error) {
    console.error('Create cutting bundles error:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}

// 更新分扎状态
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = body;
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('cutting_bundles')
      .update({ 
        status,
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Update cutting bundle error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

// 删除分扎
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: '缺少ID参数' }, { status: 400 });
    }

    const client = getSupabaseClient();
    
    const { error } = await client
      .from('cutting_bundles')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete cutting bundle error:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
