import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 生成工资条
export async function POST(request: NextRequest) {
  try {
    const { month } = await request.json();
    
    if (!month) {
      return NextResponse.json({ error: '请选择月份' }, { status: 400 });
    }

    // 解析月份 (格式: "2025-01")
    const [year, monthNum] = month.split('-').map(Number);

    const client = getSupabaseClient();

    // 检查是否已生成
    const { data: existing } = await client
      .from('salaries')
      .select('id')
      .eq('year', year)
      .eq('month', monthNum)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: '该月份工资条已存在' }, { status: 400 });
    }

    // 获取所有在职员工
    const { data: employees, error: empError } = await client
      .from('employees')
      .select('*')
      .eq('status', 'active');

    if (empError) {
      return NextResponse.json({ error: empError.message }, { status: 500 });
    }

    if (!employees || employees.length === 0) {
      return NextResponse.json({ error: '没有在职员工' }, { status: 400 });
    }

    // 为每个员工生成工资条
    const salaries = employees.map(emp => ({
      employee_id: emp.id,
      year,
      month: monthNum,
      base_salary: emp.base_salary || 0,
      overtime_pay: 0,
      bonus: 0,
      allowance: 0,
      deduction: 0,
      utility_fee: 0,
      rent_fee: 0,
      other_deduction: 0,
      total_amount: emp.base_salary || 0,
      status: 'pending',
    }));

    const { error: insertError } = await client
      .from('salaries')
      .insert(salaries);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      count: salaries.length,
      message: `成功生成 ${salaries.length} 条工资条` 
    });
  } catch (error) {
    console.error('Generate salaries error:', error);
    return NextResponse.json({ error: '生成失败' }, { status: 500 });
  }
}
