import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取计件记录
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const orderId = searchParams.get('orderId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    const client = getSupabaseClient();
    
    let query = client
      .from('production_progress')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (employeeId) {
      query = query.eq('worker_id', employeeId);
    }

    if (orderId) {
      query = query.eq('order_id', orderId);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate + 'T23:59:59');
    }

    const { data, error, count } = await query
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 获取员工信息
    let employees: Record<string, any> = {};
    let processes: Record<string, any> = {};
    let orders: Record<string, any> = {};

    if (data && data.length > 0) {
      const employeeIds = [...new Set(data.map(p => p.worker_id).filter(Boolean))];
      const processIds = [...new Set(data.map(p => p.process_id).filter(Boolean))];
      const orderIds = [...new Set(data.map(p => p.order_id).filter(Boolean))];

      if (employeeIds.length > 0) {
        const { data: empData } = await client
          .from('employees')
          .select('id, name, department, position')
          .in('id', employeeIds);
        if (empData) {
          empData.forEach(e => employees[e.id] = e);
        }
      }

      if (processIds.length > 0) {
        const { data: processData } = await client
          .from('processes')
          .select('id, name, code, unit_price, category')
          .in('id', processIds);
        if (processData) {
          processData.forEach(p => processes[p.id] = p);
        }
      }

      if (orderIds.length > 0) {
        const { data: orderData } = await client
          .from('production_orders')
          .select('id, order_no, style_no, style_name')
          .in('id', orderIds);
        if (orderData) {
          orderData.forEach(o => orders[o.id] = o);
        }
      }
    }

    const formattedData = data?.map(item => ({
      ...item,
      employees: employees[item.worker_id] || null,
      processes: processes[item.process_id] || null,
      production_orders: orders[item.order_id] || null,
      // 计算工资
      wage: item.quantity && processes[item.process_id]?.unit_price 
        ? Number(item.quantity) * Number(processes[item.process_id].unit_price)
        : 0,
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
      total: count,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Get piece wages error:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}

// 记录计件
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_id, process_id, worker_id, quantity, defective_qty, notes } = body;
    
    const client = getSupabaseClient();

    // 获取工序单价
    const { data: process } = await client
      .from('processes')
      .select('unit_price')
      .eq('id', process_id)
      .single();

    // 创建计件记录
    const { data, error } = await client
      .from('production_progress')
      .insert({
        order_id,
        process_id,
        worker_id,
        quantity,
        defective_qty: defective_qty || 0,
        status: 'completed',
        end_time: new Date().toISOString(),
        notes,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 更新生产订单完成数量
    const { data: order } = await client
      .from('production_orders')
      .select('completed_quantity')
      .eq('id', order_id)
      .single();

    if (order) {
      await client
        .from('production_orders')
        .update({
          completed_quantity: (order.completed_quantity || 0) + quantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order_id);
    }

    // 计算并返回工资
    const wage = process?.unit_price ? Number(quantity) * Number(process.unit_price) : 0;

    return NextResponse.json({ 
      success: true, 
      data,
      wage,
      message: `计件录入成功，计算工资: ¥${wage.toFixed(2)}` 
    });
  } catch (error) {
    console.error('Create piece wage error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}

// 汇总员工计件工资
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, employee_id, start_date, end_date } = body;
    
    if (action === 'summary') {
      const client = getSupabaseClient();

      // 查询时间段内的计件记录
      let query = client
        .from('production_progress')
        .select('*, processes(unit_price)')
        .eq('worker_id', employee_id);

      if (start_date) {
        query = query.gte('created_at', start_date);
      }
      if (end_date) {
        query = query.lte('created_at', end_date + 'T23:59:59');
      }

      const { data, error } = await query;

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // 汇总工资
      const summary = data?.reduce((acc, item) => {
        const unitPrice = Number(item.processes?.unit_price || 0);
        const qty = Number(item.quantity || 0);
        const wage = unitPrice * qty;
        
        acc.totalQuantity += qty;
        acc.totalDefective += Number(item.defective_qty || 0);
        acc.totalWage += wage;
        acc.records.push({
          date: item.created_at,
          quantity: qty,
          defective: item.defective_qty,
          unitPrice,
          wage,
        });
        
        return acc;
      }, { totalQuantity: 0, totalDefective: 0, totalWage: 0, records: [] as any[] });

      return NextResponse.json({ 
        success: true, 
        data: summary 
      });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error) {
    console.error('Summary piece wages error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
