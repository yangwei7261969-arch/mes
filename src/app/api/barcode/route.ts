import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 条码管理API
 * 
 * GET: 获取条码信息
 * POST: 生成新的条码
 * 
 * 功能：
 * 1. 工序二维码自动生成
 * 2. 每扎唯一ID（防串单）
 * 3. 条码验证
 */

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const barcode = searchParams.get('barcode');

    // 解析条码
    if (action === 'parse' && barcode) {
      return await parseBarcode(client, barcode);
    }

    // 获取条码信息
    if (action === 'info' && barcode) {
      return await getBarcodeInfo(client, barcode);
    }

    return NextResponse.json({ 
      success: false, 
      error: '请指定操作类型' 
    }, { status: 400 });

  } catch (error) {
    console.error('Barcode GET error:', error);
    return NextResponse.json({ success: false, error: '操作失败' }, { status: 500 });
  }
}

/**
 * POST: 生成条码
 */
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { action } = body;

    if (action === 'generate_bundle') {
      // 生成扎包条码
      return await generateBundleBarcode(client, body);
    }

    if (action === 'generate_process') {
      // 生成工序条码
      return await generateProcessBarcode(client, body);
    }

    if (action === 'generate_ticket') {
      // 生成工票条码
      return await generateTicketBarcode(client, body);
    }

    if (action === 'batch_generate') {
      // 批量生成条码
      return await batchGenerateBarcodes(client, body);
    }

    return NextResponse.json({ 
      success: false, 
      error: '未知操作' 
    }, { status: 400 });

  } catch (error) {
    console.error('Barcode POST error:', error);
    return NextResponse.json({ success: false, error: '操作失败' }, { status: 500 });
  }
}

/**
 * 解析条码
 */
async function parseBarcode(client: any, barcode: string) {
  // 条码格式: TYPE-ORDERID-BUNDLEID-PROCESSID-SEQ
  // 例如: BD-ORD001-B001-P001-01
  // 类型: BD=扎包, PR=工序, TK=工票, QT=质检

  const parts = barcode.split('-');
  if (parts.length < 2) {
    return NextResponse.json({ 
      success: false, 
      error: '无效的条码格式' 
    }, { status: 400 });
  }

  const [type, orderId, bundleId, processId, seq] = parts;

  const result: any = {
    barcode,
    type,
    order_id: orderId,
    bundle_id: bundleId,
    process_id: processId,
    sequence: seq
  };

  // 根据类型获取详细信息
  if (type === 'BD' && bundleId) {
    // 扎包信息
    const { data: bundle } = await client
      .from('cutting_bundles')
      .select(`
        *,
        cutting_records (
          order_id,
          layer_count,
          piece_count
        ),
        styles (style_name),
        production_orders (order_code)
      `)
      .eq('id', bundleId)
      .single();
    
    result.details = bundle;
  }

  if (type === 'TK') {
    // 工票信息
    const { data: ticket } = await client
      .from('work_tickets')
      .select(`
        *,
        processes (name),
        employees (name)
      `)
      .eq('id', `${bundleId}-${seq}`)
      .single();
    
    result.details = ticket;
  }

  return NextResponse.json({
    success: true,
    data: result
  });
}

/**
 * 获取条码详细信息
 */
async function getBarcodeInfo(client: any, barcode: string) {
  // 先解析条码
  const parseResult = await parseBarcode(client, barcode);
  const parsedData = await parseResult.json();

  if (!parsedData.success) {
    return parseResult;
  }

  const { type, bundle_id, process_id } = parsedData.data;

  // 获取状态信息
  let status: any = {
    scanned: false,
    current_process: null,
    completed_processes: [],
    issues: []
  };

  // 检查扎包状态
  if (bundle_id) {
    const { data: tracking } = await client
      .from('process_tracking')
      .select(`
        *,
        processes (name, sequence)
      `)
      .eq('bundle_id', bundle_id)
      .order('created_at', { ascending: true });

    if (tracking) {
      status.completed_processes = tracking.map((t: any) => ({
        process_id: t.process_id,
        process_name: t.processes?.name,
        completed_at: t.end_time || t.start_time,
        employee_name: t.employee_name
      }));

      const latest = tracking[tracking.length - 1];
      if (latest && !latest.end_time) {
        status.current_process = {
          process_id: latest.process_id,
          process_name: latest.processes?.name,
          started_at: latest.start_time
        };
      }
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      ...parsedData.data,
      status
    }
  });
}

/**
 * 生成扎包条码
 */
async function generateBundleBarcode(client: any, body: any) {
  const { orderId, cuttingRecordId, bundleNumber, quantity } = body;

  // 生成唯一ID
  const bundleId = `B${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  
  // 生成条码: BD-ORDERID-BUNDLEID
  const barcode = `BD-${orderId}-${bundleId}`;

  // 创建扎包记录
  const { data, error } = await client
    .from('cutting_bundles')
    .insert({
      id: bundleId,
      cutting_record_id: cuttingRecordId,
      bundle_number: bundleNumber,
      quantity,
      barcode,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ 
      success: false, 
      error: '创建扎包失败',
      details: error.message 
    }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: {
      ...data,
      barcode,
      qr_content: JSON.stringify({
        type: 'BD',
        id: bundleId,
        order: orderId,
        bundle: bundleNumber,
        qty: quantity
      })
    }
  });
}

/**
 * 生成工序条码
 */
async function generateProcessBarcode(client: any, body: any) {
  const { orderId, processId, bundleId } = body;

  // 生成条码: PR-ORDERID-BUNDLEID-PROCESSID
  const barcode = `PR-${orderId}-${bundleId}-${processId}`;

  return NextResponse.json({
    success: true,
    data: {
      barcode,
      qr_content: JSON.stringify({
        type: 'PR',
        order: orderId,
        bundle: bundleId,
        process: processId
      })
    }
  });
}

/**
 * 生成工票条码
 */
async function generateTicketBarcode(client: any, body: any) {
  const { bundleId, processId, quantity, employeeId } = body;

  // 为每件生成工票
  const tickets = [];
  for (let i = 1; i <= quantity; i++) {
    const seq = i.toString().padStart(3, '0');
    const ticketId = `${bundleId}-${processId}-${seq}`;
    const barcode = `TK-${bundleId}-${processId}-${seq}`;

    tickets.push({
      id: ticketId,
      bundle_id: bundleId,
      process_id: processId,
      sequence: i,
      barcode,
      employee_id: employeeId,
      status: 'pending'
    });
  }

  // 批量插入
  const { error } = await client
    .from('work_tickets')
    .insert(tickets);

  if (error) {
    return NextResponse.json({ 
      success: false, 
      error: '创建工票失败' 
    }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: {
      count: tickets.length,
      tickets: tickets.slice(0, 5), // 返回前5个作为示例
      message: `已生成 ${tickets.length} 张工票`
    }
  });
}

/**
 * 批量生成条码
 */
async function batchGenerateBarcodes(client: any, body: any) {
  const { orderId, bundles } = body;
  // bundles: [{ cuttingRecordId, bundleNumber, quantity }]

  const results = [];

  for (const bundle of bundles) {
    const result = await generateBundleBarcode(client, {
      orderId,
      ...bundle
    });
    const data = await result.json();
    results.push(data);
  }

  return NextResponse.json({
    success: true,
    data: {
      total: results.length,
      results
    }
  });
}
