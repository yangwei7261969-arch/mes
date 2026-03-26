import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET - 获取编菲列表
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (id) {
      // 获取单个编菲详情
      const { data: bianfei, error } = await client
        .from('bianfei_records')
        .select(`
          *,
          bianfei_items (*)
        `)
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json({ success: true, data: null });
        }
        throw error;
      }
      
      return NextResponse.json({ success: true, data: bianfei });
    }
    
    // 获取编菲列表
    const { data, error } = await client
      .from('bianfei_records')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        return NextResponse.json({ success: true, data: [] });
      }
      throw error;
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Get bianfei error:', error);
    return NextResponse.json({ success: true, data: [] });
  }
}

// POST - 创建新编菲
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { 
      order_no,
      style_name,
      style_code,
      color,
      sizes,
      items,
      quick_mode,
      merge_same,
      auto_increment,
      remark
    } = body;
    
    // 验证必填字段
    if (!order_no) {
      return NextResponse.json({ success: false, error: '请输入订单号' });
    }
    if (!color) {
      return NextResponse.json({ success: false, error: '请选择颜色' });
    }
    if (!sizes || sizes.length === 0) {
      return NextResponse.json({ success: false, error: '请选择至少一个尺码' });
    }
    
    // 生成编菲单号
    const bianfeiNo = `BF-${Date.now().toString(36).toUpperCase()}`;
    
    // 计算总数量
    const totalQuantity = items?.reduce((sum: number, item: any) => 
      sum + Object.values(item.quantities || {}).reduce((s: number, q: any) => s + (Number(q) || 0), 0), 0
    ) || 0;
    
    // 创建编菲主记录
    const { data: bianfei, error: bianfeiError } = await client
      .from('bianfei_records')
      .insert({
        bianfei_no: bianfeiNo,
        order_no,
        style_name,
        style_code,
        color,
        sizes: JSON.stringify(sizes),
        quick_mode: quick_mode || false,
        merge_same: merge_same || false,
        auto_increment: auto_increment || false,
        remark,
        status: 'pending',
        total_quantity: totalQuantity
      })
      .select()
      .single();
    
    if (bianfeiError) {
      console.error('Insert bianfei error:', bianfeiError);
      return NextResponse.json({ 
        success: false, 
        error: bianfeiError.message || '创建编菲失败' 
      });
    }
    
    // 创建编菲明细
    if (items && items.length > 0) {
      const bianfeiItems = items.map((item: any, index: number) => ({
        bianfei_id: bianfei.id,
        item_no: index + 1,
        item_name: item.name || `条目${index + 1}`,
        quantities: JSON.stringify(item.quantities || {}),
        total: Object.values(item.quantities || {}).reduce((s: number, q: any) => s + (Number(q) || 0), 0)
      }));
      
      const { error: itemsError } = await client
        .from('bianfei_items')
        .insert(bianfeiItems);
      
      if (itemsError) {
        console.error('Insert bianfei items error:', itemsError);
        // 不回滚主记录，只返回警告
      }
    }
    
    return NextResponse.json({ success: true, data: bianfei });
  } catch (error: any) {
    console.error('Create bianfei error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || '创建编菲失败' 
    });
  }
}

// PUT - 更新编菲
export async function PUT(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { id, items, sizes, ...updates } = body;
    
    if (!id) {
      return NextResponse.json({ success: false, error: '缺少编菲ID' });
    }
    
    // 计算总数量
    if (items) {
      updates.total_quantity = items.reduce((sum: number, item: any) => 
        sum + Object.values(item.quantities || {}).reduce((s: number, q: any) => s + (Number(q) || 0), 0), 0
      );
    }
    
    // 更新主记录
    const { data, error } = await client
      .from('bianfei_records')
      .update({
        ...updates,
        sizes: sizes ? JSON.stringify(sizes) : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    // 更新明细
    if (items && items.length > 0) {
      // 先删除旧明细
      await client.from('bianfei_items').delete().eq('bianfei_id', id);
      
      // 插入新明细
      const bianfeiItems = items.map((item: any, index: number) => ({
        bianfei_id: id,
        item_no: index + 1,
        item_name: item.name || `条目${index + 1}`,
        quantities: JSON.stringify(item.quantities || {}),
        total: Object.values(item.quantities || {}).reduce((s: number, q: any) => s + (Number(q) || 0), 0)
      }));
      
      await client.from('bianfei_items').insert(bianfeiItems);
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Update bianfei error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || '更新编菲失败' 
    });
  }
}

// DELETE - 删除编菲
export async function DELETE(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ success: false, error: '缺少编菲ID' });
    }
    
    // 先删除明细
    await client.from('bianfei_items').delete().eq('bianfei_id', id);
    
    // 再删除主记录
    const { error } = await client.from('bianfei_records').delete().eq('id', id);
    
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete bianfei error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || '删除编菲失败' 
    });
  }
}
