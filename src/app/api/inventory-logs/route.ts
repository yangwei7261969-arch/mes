import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取库存日志
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get('materialId');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const client = getSupabaseClient();
    
    let query = client
      .from('inventory_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (materialId) {
      query = query.eq('material_id', materialId);
    }

    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    const { data, error, count } = await query
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 获取物料信息
    let materials: Record<string, any> = {};
    if (data && data.length > 0) {
      const materialIds = [...new Set(data.map(l => l.material_id).filter(Boolean))];
      if (materialIds.length > 0) {
        const { data: matData } = await client
          .from('materials')
          .select('id, name, code, unit')
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
    console.error('Get inventory logs error:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}
