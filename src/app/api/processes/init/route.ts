import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 默认工序数据
const defaultProcesses = [
  // 裁床工序
  { name: '拉布', code: 'CUT001', category: 'cutting', unit_price: 0.1, sequence: 1 },
  { name: '裁片', code: 'CUT002', category: 'cutting', unit_price: 0.15, sequence: 2 },
  { name: '编号', code: 'CUT003', category: 'cutting', unit_price: 0.05, sequence: 3 },
  { name: '分包', code: 'CUT004', category: 'cutting', unit_price: 0.08, sequence: 4 },
  
  // 车缝工序
  { name: '平车缝制', code: 'SEW001', category: 'sewing', unit_price: 0.5, sequence: 10 },
  { name: '双针车缝', code: 'SEW002', category: 'sewing', unit_price: 0.6, sequence: 11 },
  { name: '包边', code: 'SEW003', category: 'sewing', unit_price: 0.3, sequence: 12 },
  { name: '车领', code: 'SEW004', category: 'sewing', unit_price: 0.8, sequence: 13 },
  { name: '车袖', code: 'SEW005', category: 'sewing', unit_price: 0.7, sequence: 14 },
  { name: '车袋', code: 'SEW006', category: 'sewing', unit_price: 0.5, sequence: 15 },
  { name: '拼缝', code: 'SEW007', category: 'sewing', unit_price: 0.4, sequence: 16 },
  { name: '车拉链', code: 'SEW008', category: 'sewing', unit_price: 0.6, sequence: 17 },
  { name: '车钮门', code: 'SEW009', category: 'sewing', unit_price: 0.2, sequence: 18 },
  
  // 后道工序
  { name: '剪线', code: 'FIN001', category: 'finishing', unit_price: 0.1, sequence: 20 },
  { name: '熨烫', code: 'FIN002', category: 'finishing', unit_price: 0.2, sequence: 21 },
  { name: '查货', code: 'FIN003', category: 'finishing', unit_price: 0.1, sequence: 22 },
  { name: '补衣', code: 'FIN004', category: 'finishing', unit_price: 0.3, sequence: 23 },
  { name: '整烫', code: 'FIN005', category: 'finishing', unit_price: 0.25, sequence: 24 },
  
  // 包装工序
  { name: '折衣', code: 'PAK001', category: 'packing', unit_price: 0.15, sequence: 30 },
  { name: '吊牌', code: 'PAK002', category: 'packing', unit_price: 0.1, sequence: 31 },
  { name: '装袋', code: 'PAK003', category: 'packing', unit_price: 0.1, sequence: 32 },
  { name: '装箱', code: 'PAK004', category: 'packing', unit_price: 0.2, sequence: 33 },
  { name: '打包', code: 'PAK005', category: 'packing', unit_price: 0.3, sequence: 34 },
];

// 初始化默认工序
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    
    // 检查是否已有数据
    const { data: existing } = await client
      .from('processes')
      .select('id')
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ 
        error: '工序数据已存在，无需重复初始化' 
      }, { status: 400 });
    }

    // 插入默认工序
    const { error } = await client
      .from('processes')
      .insert(defaultProcesses);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `成功初始化 ${defaultProcesses.length} 个默认工序` 
    });
  } catch (error) {
    console.error('Initialize processes error:', error);
    return NextResponse.json({ error: '初始化失败' }, { status: 500 });
  }
}
