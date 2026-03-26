import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取款式的工序配置
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const styleNo = searchParams.get('style_no');
    const client = getSupabaseClient();

    if (styleNo) {
      // 获取指定款式的工序配置
      const { data: styleProcessData, error: styleProcessError } = await client
        .from('style_processes')
        .select('*')
        .eq('style_no', styleNo)
        .order('sequence', { ascending: true });

      if (styleProcessError) {
        return NextResponse.json({ error: styleProcessError.message }, { status: 500 });
      }

      // 获取工序详情
      const processIds = styleProcessData?.map((sp: any) => sp.process_id) || [];
      let processesMap: Record<string, any> = {};
      
      if (processIds.length > 0) {
        const { data: processData, error: processError } = await client
          .from('processes')
          .select('*')
          .in('id', processIds);
        
        if (!processError && processData) {
          processesMap = processData.reduce((acc: any, p: any) => {
            acc[p.id] = p;
            return acc;
          }, {});
        }
      }

      // 合并数据
      const data = styleProcessData?.map((sp: any) => ({
        ...sp,
        processes: processesMap[sp.process_id] || null,
      })) || [];

      return NextResponse.json({ success: true, data });
    }

    // 获取所有款式的工序配置
    const { data: allStyleProcesses, error: allError } = await client
      .from('style_processes')
      .select('*')
      .order('style_no', { ascending: true });

    if (allError) {
      return NextResponse.json({ error: allError.message }, { status: 500 });
    }

    // 获取所有涉及的工序
    const allProcessIds = [...new Set(allStyleProcesses?.map((sp: any) => sp.process_id) || [])];
    let allProcessesMap: Record<string, any> = {};
    
    if (allProcessIds.length > 0) {
      const { data: allProcessData } = await client
        .from('processes')
        .select('*')
        .in('id', allProcessIds);
      
      if (allProcessData) {
        allProcessesMap = allProcessData.reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }
    }

    // 按款式分组
    const grouped: Record<string, any[]> = {};
    allStyleProcesses?.forEach((item: any) => {
      if (!grouped[item.style_no]) {
        grouped[item.style_no] = [];
      }
      grouped[item.style_no].push({
        ...item,
        processes: allProcessesMap[item.process_id] || null,
      });
    });

    return NextResponse.json({ success: true, data: grouped });
  } catch (error) {
    console.error('Get style processes error:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}

// 为款式配置工序（批量）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { style_no, processes, copy_from } = body;
    const client = getSupabaseClient();

    // 如果是从其他款式复制
    if (copy_from) {
      const { data: sourceProcesses, error: sourceError } = await client
        .from('style_processes')
        .select('*')
        .eq('style_no', copy_from);

      if (sourceError) {
        return NextResponse.json({ error: sourceError.message }, { status: 500 });
      }

      if (!sourceProcesses || sourceProcesses.length === 0) {
        return NextResponse.json({ error: '源款式没有工序配置' }, { status: 400 });
      }

      // 复制到目标款式
      const newProcesses = sourceProcesses.map((p: any) => ({
        style_no,
        process_id: p.process_id,
        sequence: p.sequence,
        unit_price: p.unit_price,
        notes: p.notes,
      }));

      const { data, error } = await client
        .from('style_processes')
        .insert(newProcesses)
        .select();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        data,
        message: `已从 ${copy_from} 复制 ${data.length} 个工序` 
      });
    }

    // 直接配置工序
    if (!processes || processes.length === 0) {
      return NextResponse.json({ error: '请提供工序配置' }, { status: 400 });
    }

    const records = processes.map((p: any, index: number) => ({
      style_no,
      process_id: p.process_id,
      sequence: p.sequence || index + 1,
      unit_price: p.unit_price,
      notes: p.notes,
    }));

    const { data, error } = await client
      .from('style_processes')
      .insert(records)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Create style processes error:', error);
    return NextResponse.json({ error: '配置失败' }, { status: 500 });
  }
}

// 删除款式的工序配置
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const styleNo = searchParams.get('style_no');
    const client = getSupabaseClient();

    if (id) {
      const { error } = await client
        .from('style_processes')
        .delete()
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else if (styleNo) {
      const { error } = await client
        .from('style_processes')
        .delete()
        .eq('style_no', styleNo);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete style processes error:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
