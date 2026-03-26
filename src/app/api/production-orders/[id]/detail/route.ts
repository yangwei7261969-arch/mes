import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取生产订单详情（包含裁床单和库存关联）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getSupabaseClient();

    // 获取订单详情
    const { data: order, error: orderError } = await client
      .from('production_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    // 获取关联的裁床单
    const { data: cuttingOrders } = await client
      .from('cutting_orders')
      .select('*')
      .eq('production_order_id', id);

    // 计算裁床统计
    const cuttingStats = {
      totalCuttingQty: cuttingOrders?.reduce((sum, c) => sum + (c.cutting_qty || 0), 0) || 0,
      totalCompletedQty: cuttingOrders?.reduce((sum, c) => sum + (c.completed_qty || 0), 0) || 0,
      totalDefectiveQty: cuttingOrders?.reduce((sum, c) => sum + (c.defective_qty || 0), 0) || 0,
      cuttingOrders: cuttingOrders || [],
    };

    // 获取生产进度
    const { data: progress } = await client
      .from('production_progress')
      .select('*')
      .eq('order_id', id);

    // 获取工序信息
    let processes: Record<string, any> = {};
    if (progress && progress.length > 0) {
      const processIds = [...new Set(progress.map(p => p.process_id).filter(Boolean))];
      if (processIds.length > 0) {
        const { data: processData } = await client
          .from('processes')
          .select('id, name')
          .in('id', processIds);
        
        if (processData) {
          processData.forEach(p => {
            processes[p.id] = p;
          });
        }
      }
    }

    // 组装进度数据
    const formattedProgress = progress?.map(p => ({
      ...p,
      processes: processes[p.process_id] || null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        cuttingStats,
        progress: formattedProgress || [],
      },
    });
  } catch (error) {
    console.error('Get production order detail error:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}
