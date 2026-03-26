import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取工序流转记录
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bundleId = searchParams.get('bundle_id');
    const workerId = searchParams.get('worker_id');
    const processId = searchParams.get('process_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    const client = getSupabaseClient();
    
    let query = client
      .from('process_tracking')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (bundleId) query = query.eq('bundle_id', bundleId);
    if (workerId) query = query.eq('worker_id', workerId);
    if (processId) query = query.eq('process_id', processId);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate + 'T23:59:59');

    const { data, error, count } = await query
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 获取关联信息
    let employees: Record<string, any> = {};
    let processes: Record<string, any> = {};
    let bundles: Record<string, any> = {};

    if (data && data.length > 0) {
      const workerIds = [...new Set(data.map(t => t.worker_id).filter(Boolean))];
      const processIds = [...new Set(data.map(t => t.process_id).filter(Boolean))];
      const bundleIds = [...new Set(data.map(t => t.bundle_id).filter(Boolean))];

      if (workerIds.length > 0) {
        const { data: empData } = await client
          .from('employees')
          .select('id, name, employee_no, department')
          .in('id', workerIds);
        if (empData) empData.forEach(e => employees[e.id] = e);
      }

      if (processIds.length > 0) {
        const { data: procData } = await client
          .from('processes')
          .select('id, name, code, category, unit_price')
          .in('id', processIds);
        if (procData) procData.forEach(p => processes[p.id] = p);
      }

      if (bundleIds.length > 0) {
        const { data: bundleData } = await client
          .from('cutting_bundles')
          .select('id, bundle_no, size, color, quantity')
          .in('id', bundleIds);
        if (bundleData) bundleData.forEach(b => bundles[b.id] = b);
      }
    }

    const formattedData = data?.map(item => ({
      ...item,
      employees: employees[item.worker_id] || null,
      processes: processes[item.process_id] || null,
      cutting_bundles: bundles[item.bundle_id] || null,
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
      total: count,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Get process tracking error:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}

// 扫码登记工序
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      qr_code,      // 扫描的二维码（扎号）
      process_id,   // 工序ID
      worker_id,    // 员工ID
      quantity,     // 完成数量（可选，默认整扎数量）
      notes,
    } = body;
    
    const client = getSupabaseClient();

    // 查找分扎
    const { data: bundle } = await client
      .from('cutting_bundles')
      .select('*, cutting_orders(style_no, color)')
      .eq('bundle_no', qr_code)
      .single();

    if (!bundle) {
      return NextResponse.json({ error: '二维码无效，未找到对应分扎' }, { status: 404 });
    }

    // 获取工序信息
    const { data: process } = await client
      .from('processes')
      .select('*')
      .eq('id', process_id)
      .single();

    if (!process) {
      return NextResponse.json({ error: '工序不存在' }, { status: 404 });
    }

    // 检查该扎是否已完成此工序
    const { data: existing } = await client
      .from('process_tracking')
      .select('id')
      .eq('bundle_id', bundle.id)
      .eq('process_id', process_id)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: '该扎已完成此工序，请勿重复登记' }, { status: 400 });
    }

    // 计算完成数量和工资
    const completedQty = quantity || bundle.quantity;
    const wage = completedQty * Number(process.unit_price);

    // 创建工序记录
    const now = new Date().toISOString();
    const { data, error } = await client
      .from('process_tracking')
      .insert({
        bundle_id: bundle.id,
        process_id,
        worker_id,
        quantity: completedQty,
        wage,
        status: 'completed',
        start_time: now,
        end_time: now,
        notes,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 更新分扎状态
    await client
      .from('cutting_bundles')
      .update({ 
        status: 'in_progress',
        current_process_id: process_id,
        updated_at: new Date().toISOString() 
      })
      .eq('id', bundle.id);

    // 同时记录到production_progress用于工资汇总
    await client
      .from('production_progress')
      .insert({
        order_id: bundle.cutting_order_id,
        process_id,
        worker_id,
        quantity: completedQty,
        defective_qty: 0,
        status: 'completed',
        end_time: new Date().toISOString(),
        notes,
      });

    return NextResponse.json({ 
      success: true, 
      data,
      wage,
      message: `登记成功！${process.name} 完成 ${completedQty} 件，工资 ¥${wage.toFixed(2)}` 
    });
  } catch (error) {
    console.error('Scan process error:', error);
    return NextResponse.json({ error: '登记失败' }, { status: 500 });
  }
}
