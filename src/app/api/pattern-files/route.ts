import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 生成文件编号
function generateFileNo(type: string): string {
  const prefix = type === 'marker' ? 'MK' : 'PT';
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${prefix}${timestamp}`;
}

// GET - 获取唛架/纸样文件列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const type = searchParams.get('type'); // marker/pattern
    const styleNo = searchParams.get('style_no');
    const productionOrderId = searchParams.get('production_order_id');
    
    const client = getSupabaseClient();
    
    if (id) {
      // 获取单个文件详情
      const { data, error } = await client
        .from('pattern_files')
        .select(`
          *,
          production_orders (order_no, style_name, color, quantity)
        `)
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json({ success: true, data: null });
        }
        throw error;
      }
      
      // 单独查询关联的生产订单
      if (data?.production_order_id) {
        const { data: order } = await client
          .from('production_orders')
          .select('order_no, style_name, color, quantity')
          .eq('id', data.production_order_id)
          .single();
        data.production_orders = order || null;
      }
      
      return NextResponse.json({ success: true, data });
    }
    
    // 构建查询 - 先查主表
    let query = client
      .from('pattern_files')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    
    if (type) {
      query = query.eq('file_type', type);
    }
    if (styleNo) {
      query = query.ilike('style_no', `%${styleNo}%`);
    }
    if (productionOrderId) {
      query = query.eq('production_order_id', productionOrderId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // 单独查询关联的生产订单
    const orderIds = (data || [])
      .filter((item: any) => item.production_order_id)
      .map((item: any) => item.production_order_id);
    
    let ordersMap: Record<string, any> = {};
    if (orderIds.length > 0) {
      const { data: orders } = await client
        .from('production_orders')
        .select('id, order_no, style_name, color, quantity')
        .in('id', [...new Set(orderIds)]);
      
      if (orders) {
        orders.forEach((o: any) => {
          ordersMap[o.id] = o;
        });
      }
    }
    
    // 合并数据
    const enrichedData = (data || []).map((item: any) => ({
      ...item,
      production_orders: ordersMap[item.production_order_id] || null,
    }));
    
    return NextResponse.json({ success: true, data: enrichedData });
  } catch (error: any) {
    console.error('Get pattern files error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || '获取文件列表失败' 
    }, { status: 500 });
  }
}

// POST - 创建/上传唛架/纸样文件
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const client = getSupabaseClient();
    
    const {
      file_name,
      file_type, // marker/pattern
      file_path,
      file_size,
      style_no,
      style_name,
      sizes,
      fabric_width,
      fabric_length,
      fabric_usage,
      layout_efficiency,
      layers_count,
      pieces_count,
      production_order_id,
      tech_pack_id,
      parent_id,
      change_log,
      remark,
    } = body;
    
    // 验证必填字段
    if (!file_name || !file_type) {
      return NextResponse.json({ 
        success: false, 
        error: '文件名和文件类型为必填项' 
      }, { status: 400 });
    }
    
    // 生成文件编号
    const fileNo = generateFileNo(file_type);
    
    // 确定版本号
    let version = 1;
    if (parent_id) {
      const { data: parent } = await client
        .from('pattern_files')
        .select('version')
        .eq('id', parent_id)
        .single();
      if (parent) {
        version = parent.version + 1;
      }
    }
    
    // 计算总用量（如果有面料门幅和长度）
    let totalUsage = fabric_usage;
    if (fabric_width && fabric_length && !fabric_usage) {
      totalUsage = (fabric_width * fabric_length) / 10000; // 转换为平方米
    }
    
    const { data, error } = await client
      .from('pattern_files')
      .insert({
        file_no: fileNo,
        file_name,
        file_type,
        file_path,
        file_size,
        style_no,
        style_name,
        sizes,
        fabric_width,
        fabric_length,
        fabric_usage: totalUsage,
        total_usage: totalUsage,
        layout_efficiency,
        layers_count: layers_count || 1,
        pieces_count,
        production_order_id,
        tech_pack_id,
        parent_id,
        version,
        change_log,
        remark,
        status: 'active',
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Create pattern file error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || '创建文件失败' 
    }, { status: 500 });
  }
}

// PUT - 更新唛架/纸样文件
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: '缺少文件ID' 
      }, { status: 400 });
    }
    
    const client = getSupabaseClient();
    
    // 计算总用量
    if (updates.fabric_width && updates.fabric_length) {
      updates.fabric_usage = (updates.fabric_width * updates.fabric_length) / 10000;
      updates.total_usage = updates.fabric_usage;
    }
    
    updates.updated_at = new Date().toISOString();
    
    const { data, error } = await client
      .from('pattern_files')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Update pattern file error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || '更新文件失败' 
    }, { status: 500 });
  }
}

// DELETE - 删除唛架/纸样文件（软删除）
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: '缺少文件ID' 
      }, { status: 400 });
    }
    
    const client = getSupabaseClient();
    
    // 软删除
    const { error } = await client
      .from('pattern_files')
      .update({ 
        status: 'deleted',
        updated_at: new Date().toISOString() 
      })
      .eq('id', id);
    
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete pattern file error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || '删除文件失败' 
    }, { status: 500 });
  }
}
