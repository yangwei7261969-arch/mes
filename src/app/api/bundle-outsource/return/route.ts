import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 回货登记
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const {
      outsource_id,
      bundle_id,
      quantity,
      quality,
      notes,
    } = body;

    if (!outsource_id || !bundle_id) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段' },
        { status: 400 }
      );
    }

    // 更新外发记录状态
    const { error: updateError } = await supabase
      .from('bundle_outsource')
      .update({
        status: 'completed',
        actual_return_date: new Date().toISOString().split('T')[0],
        return_quantity: quantity,
        return_quality: quality,
        return_notes: notes,
      })
      .eq('id', outsource_id);

    if (updateError) {
      console.error('Update outsource error:', updateError);
      return NextResponse.json(
        { success: false, error: '更新外发记录失败' },
        { status: 500 }
      );
    }

    // 更新裁片扎状态为已完成
    const { error: bundleError } = await supabase
      .from('cutting_bundles')
      .update({ status: 'completed' })
      .eq('id', bundle_id);

    if (bundleError) {
      console.error('Update bundle status error:', bundleError);
    }

    return NextResponse.json({
      success: true,
      message: '回货登记成功',
    });
  } catch (error) {
    console.error('Return error:', error);
    return NextResponse.json(
      { success: false, error: '回货登记失败' },
      { status: 500 }
    );
  }
}
