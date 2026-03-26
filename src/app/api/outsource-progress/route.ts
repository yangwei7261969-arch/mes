import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取外发订单进度
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const outsourceOrderId = searchParams.get('outsource_order_id');
    const client = getSupabaseClient();

    if (!outsourceOrderId) {
      return NextResponse.json({ error: '缺少订单ID' }, { status: 400 });
    }

    const { data, error } = await client
      .from('outsource_progress')
      .select('*')
      .eq('outsource_order_id', outsourceOrderId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 阶段名称映射
    const stageNames: Record<string, string> = {
      production_prep: '生产准备',
      cutting: '裁床',
      craft: '二次工艺',
      workshop: '车间',
      finishing: '尾部',
      shipping: '发货',
    };

    const result = data?.map((p: any) => ({
      ...p,
      stage_name: stageNames[p.stage] || p.stage,
    })) || [];

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Get outsource progress error:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

// 更新阶段进度
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const client = getSupabaseClient();

    const updateData: any = {
      status: body.status,
      quantity: body.quantity,
      completed_qty: body.completed_qty,
      notes: body.notes,
      updated_at: new Date().toISOString(),
    };

    if (body.status === 'in_progress' && !body.start_date) {
      updateData.start_date = new Date().toISOString().split('T')[0];
    }
    if (body.status === 'completed') {
      updateData.end_date = new Date().toISOString().split('T')[0];
    }

    const { error } = await client
      .from('outsource_progress')
      .update(updateData)
      .eq('id', body.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 检查是否所有阶段完成，自动更新订单状态
    if (body.status === 'completed') {
      const { data: allProgress } = await client
        .from('outsource_progress')
        .select('status')
        .eq('outsource_order_id', body.outsource_order_id);

      const allCompleted = allProgress?.every((p: any) => p.status === 'completed');
      
      if (allCompleted) {
        await client
          .from('outsource_orders')
          .update({
            status: 'completed',
            actual_end_date: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString(),
          })
          .eq('id', body.outsource_order_id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update outsource progress error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
