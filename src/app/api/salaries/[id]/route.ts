import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const client = getSupabaseClient();

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // 处理状态更新
    if (body.status) {
      updateData.status = body.status;
    }

    // 确认时间
    if (body.status === 'confirmed') {
      updateData.confirmed_at = new Date().toISOString();
    }

    // 发放时间
    if (body.status === 'paid') {
      updateData.paid_at = new Date().toISOString();
    }

    // 处理paid_date字段
    if (body.paid_date) {
      updateData.paid_at = new Date(body.paid_date).toISOString();
    }

    const { data, error } = await client
      .from('salaries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Update salary error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
