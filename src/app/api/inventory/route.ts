import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取库存列表（含物料信息）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const warehouse = searchParams.get('warehouse');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const client = getSupabaseClient();
    
    // 获取库存数据
    let query = client
      .from('inventory')
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

    // 获取物料信息
    let materials: Record<string, any> = {};
    if (data && data.length > 0) {
      const materialIds = [...new Set(data.map(i => i.material_id).filter(Boolean))];
      if (materialIds.length > 0) {
        const { data: matData } = await client
          .from('materials')
          .select('*')
          .in('id', materialIds);
        
        if (matData) {
          matData.forEach(mat => {
            materials[mat.id] = mat;
          });
        }
      }
    }

    // 组装返回数据
    const formattedData = data?.map(item => ({
      ...item,
      materials: materials[item.material_id] || null,
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
      total: count,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Get inventory error:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}

// 库存入库/出库
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { material_id, type, quantity, warehouse, location, related_type, related_id, notes } = body;
    
    const client = getSupabaseClient();

    // 查询当前库存
    const { data: currentInventory } = await client
      .from('inventory')
      .select('*')
      .eq('material_id', material_id)
      .eq('warehouse', warehouse)
      .single();

    let beforeQty = 0;
    let afterQty = 0;

    if (type === 'in') {
      // 入库
      if (currentInventory) {
        beforeQty = Number(currentInventory.quantity);
        afterQty = beforeQty + Number(quantity);
        
        await client
          .from('inventory')
          .update({
            quantity: afterQty,
            available_qty: afterQty - Number(currentInventory.locked_qty || 0),
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentInventory.id);
      } else {
        afterQty = Number(quantity);
        await client
          .from('inventory')
          .insert({
            material_id,
            warehouse,
            location,
            quantity: afterQty,
            locked_qty: 0,
            available_qty: afterQty,
          });
      }
    } else if (type === 'out') {
      // 出库
      if (!currentInventory) {
        return NextResponse.json({ error: '库存不足' }, { status: 400 });
      }
      
      beforeQty = Number(currentInventory.quantity);
      afterQty = beforeQty - Number(quantity);
      
      if (afterQty < 0) {
        return NextResponse.json({ error: '库存不足' }, { status: 400 });
      }
      
      await client
        .from('inventory')
        .update({
          quantity: afterQty,
          available_qty: afterQty - Number(currentInventory.locked_qty || 0),
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentInventory.id);
    }

    // 记录库存日志
    await client
      .from('inventory_logs')
      .insert({
        material_id,
        type,
        quantity: Number(quantity),
        before_qty: beforeQty,
        after_qty: afterQty,
        warehouse,
        location,
        related_type,
        related_id,
        notes,
      });

    return NextResponse.json({ success: true, data: { beforeQty, afterQty } });
  } catch (error) {
    console.error('Inventory operation error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
