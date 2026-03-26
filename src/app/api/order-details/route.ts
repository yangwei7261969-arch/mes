import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取生产订单明细（颜色+尺码配比）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('order_id');
    
    const client = getSupabaseClient();
    
    if (orderId) {
      // 获取单个订单的明细
      const { data: order } = await client
        .from('production_orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (!order) {
        return NextResponse.json({ error: '订单不存在' }, { status: 404 });
      }
      
      // 获取该订单已有的裁床记录
      const { data: cuttingOrders } = await client
        .from('cutting_orders')
        .select('id, cutting_qty, size_breakdown, status')
        .eq('production_order_id', orderId);
      
      // 计算已载数量
      const alreadyCut = (cuttingOrders || []).reduce((sum: number, co: any) => {
        return sum + (co.cutting_qty || 0);
      }, 0);
      
      // 计算各尺码已载数量
      const sizeAlreadyCut: Record<string, number> = {};
      (cuttingOrders || []).forEach((co: any) => {
        if (co.size_breakdown) {
          Object.entries(co.size_breakdown).forEach(([size, qty]) => {
            sizeAlreadyCut[size] = (sizeAlreadyCut[size] || 0) + (qty as number);
          });
        }
      });
      
      // 获取尺码明细 - 优先级：production_orders.size_breakdown > order_details表 > 默认4等分
      let sizeBreakdown: Record<string, number> = {};
      let sizeSource = 'default';
      
      // 1. 首先检查 production_orders.size_breakdown
      if (order.size_breakdown && Object.keys(order.size_breakdown).length > 0) {
        sizeBreakdown = order.size_breakdown;
        sizeSource = 'production_order';
      } else {
        // 2. 尝试从 order_details 表获取
        const { data: orderDetails } = await client
          .from('order_details')
          .select('size, quantity')
          .eq('order_id', orderId);
        
        if (orderDetails && orderDetails.length > 0) {
          orderDetails.forEach((detail: any) => {
            if (detail.size && detail.quantity) {
              sizeBreakdown[detail.size] = detail.quantity;
            }
          });
          sizeSource = 'order_details';
        } else {
          // 3. 默认按4等分（仅当确实没有数据时）
          const qty = order.quantity || order.total_quantity || 0;
          sizeBreakdown = {
            'S': Math.floor(qty / 4),
            'M': Math.floor(qty / 4),
            'L': Math.floor(qty / 4),
            'XL': qty - Math.floor(qty / 4) * 3,
          };
          sizeSource = 'default';
        }
      }
      
      // 计算各尺码剩余待载数量
      const sizeRemaining: Record<string, number> = {};
      Object.entries(sizeBreakdown).forEach(([size, qty]) => {
        sizeRemaining[size] = Math.max(0, (qty as number) - (sizeAlreadyCut[size] || 0));
      });
      
      const totalQuantity = order.quantity || order.total_quantity || 0;
      
      return NextResponse.json({
        success: true,
        data: {
          order,
          size_breakdown: sizeBreakdown,
          size_source: sizeSource, // 告知前端数据来源
          already_cut: alreadyCut,
          size_already_cut: sizeAlreadyCut,
          size_remaining: sizeRemaining,
          remaining_qty: Math.max(0, totalQuantity - alreadyCut),
          cutting_orders: cuttingOrders || [],
        }
      });
    }
    
    // 获取所有需要裁床的订单（未完成的）
    const { data, error } = await client
      .from('production_orders')
      .select('id, order_no, style_no, style_name, color, quantity, completed_quantity, status, size_breakdown')
      .in('status', ['pending', 'in_progress', 'confirmed'])
      .order('created_at', { ascending: false });
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // 为每个订单补充尺码明细信息
    const enrichedData = await Promise.all((data || []).map(async (order: any) => {
      // 如果有 size_breakdown，直接使用
      if (order.size_breakdown && Object.keys(order.size_breakdown).length > 0) {
        return {
          ...order,
          quantity: order.quantity || order.total_quantity,
          has_size_detail: true,
        };
      }
      
      // 尝试从 order_details 获取
      const { data: orderDetails } = await client
        .from('order_details')
        .select('size, quantity')
        .eq('order_id', order.id);
      
      if (orderDetails && orderDetails.length > 0) {
        const sizeBreakdown: Record<string, number> = {};
        orderDetails.forEach((detail: any) => {
          if (detail.size && detail.quantity) {
            sizeBreakdown[detail.size] = detail.quantity;
          }
        });
        return {
          ...order,
          quantity: order.quantity || order.total_quantity,
          size_breakdown: sizeBreakdown,
          has_size_detail: true,
        };
      }
      
      return {
        ...order,
        quantity: order.quantity || order.total_quantity,
        has_size_detail: false,
      };
    }));
    
    return NextResponse.json({ success: true, data: enrichedData });
  } catch (error) {
    console.error('Get order details error:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}

// 保存/更新订单尺码明细
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { order_id, size_breakdown, action } = body;
    
    if (action === 'update_size_breakdown') {
      if (!order_id || !size_breakdown) {
        return NextResponse.json({ error: '缺少参数' }, { status: 400 });
      }
      
      // 计算总数量
      const totalQty = Object.values(size_breakdown).reduce((sum: number, qty) => sum + (qty as number), 0);
      
      // 更新生产订单的尺码明细
      const { error } = await client
        .from('production_orders')
        .update({
          size_breakdown,
          quantity: totalQty,
          total_quantity: totalQty,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order_id);
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      // 同时更新/创建 order_details 记录
      // 先删除旧的明细
      await client.from('order_details').delete().eq('order_id', order_id);
      
      // 创建新的明细
      const detailsData = Object.entries(size_breakdown).map(([size, qty]) => ({
        id: `OD${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
        order_id,
        size,
        quantity: qty,
      }));
      
      if (detailsData.length > 0) {
        await client.from('order_details').insert(detailsData);
      }
      
      return NextResponse.json({ 
        success: true, 
        message: '尺码明细已更新',
        data: { size_breakdown, total_quantity: totalQty }
      });
    }
    
    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error) {
    console.error('Update order details error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
