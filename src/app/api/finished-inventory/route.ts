import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取成衣库存列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const warehouse = searchParams.get('warehouse');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const client = getSupabaseClient();
    
    let query = client
      .from('finished_inventory')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (warehouse && warehouse !== 'all') {
      query = query.eq('warehouse', warehouse);
    }

    const { data, error, count } = await query
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 获取成衣信息
    let goods: Record<string, any> = {};
    if (data && data.length > 0) {
      const goodsIds = [...new Set(data.map(i => i.goods_id).filter(Boolean))];
      if (goodsIds.length > 0) {
        const { data: goodsData } = await client
          .from('finished_goods')
          .select('*')
          .in('id', goodsIds);
        
        if (goodsData) {
          goodsData.forEach(g => {
            goods[g.id] = g;
          });
        }
      }
    }

    const formattedData = data?.map(item => ({
      ...item,
      finished_goods: goods[item.goods_id] || null,
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
      total: count,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Get finished inventory error:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}

// 成衣入库/出库
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { goods_id, type, quantity, warehouse, location, related_type, related_id, notes } = body;
    
    const client = getSupabaseClient();

    // 查询当前库存
    const { data: currentInventory } = await client
      .from('finished_inventory')
      .select('*')
      .eq('goods_id', goods_id)
      .eq('warehouse', warehouse)
      .single();

    let beforeQty = 0;
    let afterQty = 0;

    if (type === 'in') {
      if (currentInventory) {
        beforeQty = Number(currentInventory.quantity);
        afterQty = beforeQty + Number(quantity);
        
        await client
          .from('finished_inventory')
          .update({
            quantity: afterQty,
            available_qty: afterQty - Number(currentInventory.locked_qty || 0),
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentInventory.id);
      } else {
        afterQty = Number(quantity);
        await client
          .from('finished_inventory')
          .insert({
            goods_id,
            warehouse,
            location,
            quantity: afterQty,
            locked_qty: 0,
            available_qty: afterQty,
          });
      }
    } else if (type === 'out') {
      if (!currentInventory) {
        return NextResponse.json({ error: '库存不足' }, { status: 400 });
      }
      
      beforeQty = Number(currentInventory.quantity);
      afterQty = beforeQty - Number(quantity);
      
      if (afterQty < 0) {
        return NextResponse.json({ error: '库存不足' }, { status: 400 });
      }
      
      await client
        .from('finished_inventory')
        .update({
          quantity: afterQty,
          available_qty: afterQty - Number(currentInventory.locked_qty || 0),
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentInventory.id);
    }

    return NextResponse.json({ success: true, data: { beforeQty, afterQty } });
  } catch (error) {
    console.error('Finished inventory operation error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
