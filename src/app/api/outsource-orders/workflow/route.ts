import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 外发管理业务闭环API
 * 
 * 外发流程：
 * 创建外发 → 供应商接单 → 发出物料 → 外发加工 → 回收验收 → 结算付款
 * 
 * 状态流转：
 * pending → accepted → processing → completed → returned → settled
 *                  ↓
 *               rejected
 * 
 * 联动逻辑：
 * 1. 创建外发 → 锁定相关分扎
 * 2. 发出物料 → 扣减库存
 * 3. 回收验收 → 更新分扎状态
 * 4. 结算付款 → 生成应付账款
 */

const client = getSupabaseClient();

// 状态流转配置
const STATUS_TRANSITIONS: Record<string, string[]> = {
  'pending': ['accepted', 'rejected', 'cancelled'],
  'accepted': ['processing', 'cancelled'],
  'processing': ['completed', 'partial_return'],
  'completed': ['returned', 'partial_return'],
  'partial_return': ['returned', 'completed'],
  'returned': ['settled'],
  'settled': [],
  'rejected': [],
  'cancelled': [],
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'status';
  const outsourceId = searchParams.get('id');

  try {
    switch (action) {
      case 'status':
        return getOutsourceStatus(outsourceId);
      
      case 'progress':
        return getOutsourceProgress(outsourceId);
      
      case 'pending-return':
        return getPendingReturns();
      
      case 'statistics':
        return getOutsourceStatistics();
      
      default:
        return NextResponse.json({ error: '未知操作' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    let result;

    switch (action) {
      case 'create':
        result = await createOutsource(data);
        break;
      
      case 'accept':
        result = await acceptOutsource(data);
        break;
      
      case 'reject':
        result = await rejectOutsource(data);
        break;
      
      case 'send':
        result = await sendOutsource(data);
        break;
      
      case 'receive':
        result = await receiveOutsource(data);
        break;
      
      case 'settle':
        result = await settleOutsource(data);
        break;
      
      case 'cancel':
        result = await cancelOutsource(data);
        break;
      
      case 'update-progress':
        result = await updateOutsourceProgress(data);
        break;
      
      default:
        return NextResponse.json({ error: '未知操作' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// ============================================
// 创建外发订单
// ============================================

async function createOutsource(data: {
  productionOrderId: string;
  supplierId: string;
  bundleId?: string;
  processId?: string;
  quantity: number;
  unitPrice: number;
  planStartDate: string;
  planEndDate: string;
  notes?: string;
  createdBy?: string;
}): Promise<any> {
  // 生成外发单号
  const outsourceNo = `WF${Date.now().toString(36).toUpperCase()}`;

  // 获取订单和供应商信息
  const { data: order } = await client
    .from('production_orders')
    .select('order_no, style_no, style_name, color')
    .eq('id', data.productionOrderId)
    .single();

  const { data: supplier } = await client
    .from('suppliers')
    .select('name, code')
    .eq('id', data.supplierId)
    .single();

  // 创建外发订单
  const { data: outsource, error } = await client
    .from('outsource_orders')
    .insert({
      outsource_no: outsourceNo,
      production_order_id: data.productionOrderId,
      supplier_id: data.supplierId,
      bundle_id: data.bundleId,
      process_id: data.processId,
      order_no: order?.order_no,
      style_no: order?.style_no,
      style_name: order?.style_name,
      color: order?.color,
      quantity: data.quantity,
      unit_price: data.unitPrice,
      total_amount: data.quantity * data.unitPrice,
      status: 'pending',
      plan_start_date: data.planStartDate,
      plan_end_date: data.planEndDate,
      notes: data.notes,
      created_by: data.createdBy,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  // 锁定相关分扎
  if (data.bundleId) {
    await client
      .from('cutting_bundles')
      .update({
        status: 'outsource',
        outsource_id: outsource.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.bundleId);
  }

  // 创建进度记录
  const stages = [
    { stage: 'created', stage_name: '创建', status: 'completed' },
    { stage: 'accepted', stage_name: '供应商接单', status: 'pending' },
    { stage: 'processing', stage_name: '加工中', status: 'pending' },
    { stage: 'returning', stage_name: '回收中', status: 'pending' },
    { stage: 'settling', stage_name: '结算中', status: 'pending' },
  ];

  await client.from('outsource_progress').insert(
    stages.map(s => ({
      outsource_order_id: outsource.id,
      stage: s.stage,
      stage_name: s.stage_name,
      status: s.status,
      created_at: new Date().toISOString(),
    }))
  );

  // 发送通知给供应商
  await client.from('supplier_notifications').insert({
    supplier_id: data.supplierId,
    type: 'outsource',
    title: '新外发订单',
    content: `您有新的外发订单 ${outsourceNo}，请及时处理`,
    related_id: outsource.id,
    status: 'unread',
    created_at: new Date().toISOString(),
  });

  return {
    success: true,
    message: '外发订单创建成功',
    data: outsource,
  };
}

// ============================================
// 供应商接单
// ============================================

async function acceptOutsource(data: {
  outsourceId: string;
  acceptedBy?: string;
  estimatedCompletionDate?: string;
}): Promise<any> {
  const { data: outsource } = await client
    .from('outsource_orders')
    .select('*')
    .eq('id', data.outsourceId)
    .single();

  if (!outsource) {
    return { success: false, error: '外发订单不存在' };
  }

  if (outsource.status !== 'pending') {
    return { success: false, error: '订单状态不允许接单' };
  }

  // 更新状态
  await client
    .from('outsource_orders')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      accepted_by: data.acceptedBy,
      estimated_completion_date: data.estimatedCompletionDate,
    })
    .eq('id', data.outsourceId);

  // 更新进度
  await client
    .from('outsource_progress')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('outsource_order_id', data.outsourceId)
    .eq('stage', 'accepted');

  return {
    success: true,
    message: '接单成功',
  };
}

// ============================================
// 供应商拒绝
// ============================================

async function rejectOutsource(data: {
  outsourceId: string;
  reason: string;
  rejectedBy?: string;
}): Promise<any> {
  const { data: outsource } = await client
    .from('outsource_orders')
    .select('*')
    .eq('id', data.outsourceId)
    .single();

  if (!outsource) {
    return { success: false, error: '外发订单不存在' };
  }

  // 更新状态
  await client
    .from('outsource_orders')
    .update({
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejected_by: data.rejectedBy,
      reject_reason: data.reason,
    })
    .eq('id', data.outsourceId);

  // 解锁分扎
  if (outsource.bundle_id) {
    await client
      .from('cutting_bundles')
      .update({
        status: 'pending',
        outsource_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', outsource.bundle_id);
  }

  // 发送预警
  await client.from('alerts').insert({
    alert_type: 'outsource',
    alert_level: 'warning',
    title: '外发订单被拒绝',
    content: `外发订单 ${outsource.outsource_no} 被供应商拒绝，原因: ${data.reason}`,
    related_id: data.outsourceId,
    related_type: 'outsource_order',
    status: 'active',
    created_at: new Date().toISOString(),
  });

  return {
    success: true,
    message: '已拒绝外发订单',
  };
}

// ============================================
// 发出物料
// ============================================

async function sendOutsource(data: {
  outsourceId: string;
  sendQuantity: number;
  materials?: Array<{
    materialId: string;
    quantity: number;
  }>;
  sender?: string;
  notes?: string;
}): Promise<any> {
  const { data: outsource } = await client
    .from('outsource_orders')
    .select('*')
    .eq('id', data.outsourceId)
    .single();

  if (!outsource) {
    return { success: false, error: '外发订单不存在' };
  }

  // 更新状态
  await client
    .from('outsource_orders')
    .update({
      status: 'processing',
      send_quantity: data.sendQuantity,
      send_date: new Date().toISOString(),
      sender: data.sender,
      notes: data.notes,
    })
    .eq('id', data.outsourceId);

  // 扣减物料库存
  if (data.materials && data.materials.length > 0) {
    for (const material of data.materials) {
      // 获取当前库存
      const { data: inventory } = await client
        .from('inventory')
        .select('*')
        .eq('material_id', material.materialId)
        .single();

      if (inventory) {
        const newQty = inventory.quantity - material.quantity;
        await client
          .from('inventory')
          .update({
            quantity: newQty,
            available_qty: newQty - inventory.locked_qty,
          })
          .eq('id', inventory.id);

        // 记录库存事务
        await client.from('inventory_transactions').insert({
          transaction_no: `OUT${Date.now().toString(36).toUpperCase()}`,
          material_id: material.materialId,
          type: 'out',
          quantity: material.quantity,
          before_quantity: inventory.quantity,
          after_quantity: newQty,
          related_type: 'outsource',
          related_id: data.outsourceId,
          related_no: outsource.outsource_no,
          operator: data.sender,
          remark: '外发领料',
          created_at: new Date().toISOString(),
        });
      }
    }
  }

  // 更新进度
  await client
    .from('outsource_progress')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('outsource_order_id', data.outsourceId)
    .eq('stage', 'processing');

  return {
    success: true,
    message: '外发已发出',
  };
}

// ============================================
// 回收验收
// ============================================

async function receiveOutsource(data: {
  outsourceId: string;
  returnQuantity: number;
  defectQuantity?: number;
  receiver?: string;
  qualityCheck?: {
    passQuantity: number;
    failQuantity: number;
    defectTypes?: Array<{
      type: string;
      quantity: number;
    }>;
  };
  notes?: string;
}): Promise<any> {
  const { data: outsource } = await client
    .from('outsource_orders')
    .select('*')
    .eq('id', data.outsourceId)
    .single();

  if (!outsource) {
    return { success: false, error: '外发订单不存在' };
  }

  const totalReturned = (outsource.return_quantity || 0) + data.returnQuantity;
  const totalDefect = (outsource.defect_quantity || 0) + (data.defectQuantity || 0);
  
  let newStatus = 'partial_return';
  if (totalReturned >= outsource.quantity) {
    newStatus = 'returned';
  }

  // 更新外发订单
  await client
    .from('outsource_orders')
    .update({
      status: newStatus,
      return_quantity: totalReturned,
      defect_quantity: totalDefect,
      return_date: new Date().toISOString(),
      receiver: data.receiver,
      notes: data.notes,
    })
    .eq('id', data.outsourceId);

  // 更新分扎状态
  if (outsource.bundle_id) {
    await client
      .from('cutting_bundles')
      .update({
        status: newStatus === 'returned' ? 'completed' : 'in_progress',
        updated_at: new Date().toISOString(),
      })
      .eq('id', outsource.bundle_id);
  }

  // 记录质检结果
  if (data.qualityCheck) {
    await client.from('quality_inspections').insert({
      inspection_no: `OQC${Date.now().toString(36).toUpperCase()}`,
      order_id: outsource.production_order_id,
      outsource_id: data.outsourceId,
      inspection_type: '外发回收检',
      total_quantity: data.returnQuantity,
      pass_quantity: data.qualityCheck.passQuantity,
      fail_quantity: data.qualityCheck.failQuantity,
      defect_details: data.qualityCheck.defectTypes,
      status: 'completed',
      created_at: new Date().toISOString(),
    });

    // 如果有次品，记录缺陷
    if (data.qualityCheck.failQuantity > 0) {
      for (const defect of data.qualityCheck.defectTypes || []) {
        await client.from('quality_defects').insert({
          order_id: outsource.production_order_id,
          outsource_id: data.outsourceId,
          defect_type: defect.type,
          quantity: defect.quantity,
          severity: 'major',
          source: 'outsource',
          status: 'open',
          created_at: new Date().toISOString(),
        });
      }
    }
  }

  // 更新进度
  await client
    .from('outsource_progress')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('outsource_order_id', data.outsourceId)
    .eq('stage', 'returning');

  // 更新订单进度
  if (outsource.production_order_id) {
    await updateOrderProgressFromOutsource(outsource.production_order_id);
  }

  return {
    success: true,
    message: newStatus === 'returned' ? '外发已全部回收' : '外发已部分回收',
    data: {
      returnQuantity: totalReturned,
      defectQuantity: totalDefect,
      status: newStatus,
    },
  };
}

// ============================================
// 结算付款
// ============================================

async function settleOutsource(data: {
  outsourceId: string;
  settleQuantity: number;
  settleAmount: number;
  deductionAmount?: number;
  deductionReason?: string;
  settledBy?: string;
}): Promise<any> {
  const { data: outsource } = await client
    .from('outsource_orders')
    .select('*')
    .eq('id', data.outsourceId)
    .single();

  if (!outsource) {
    return { success: false, error: '外发订单不存在' };
  }

  if (outsource.status !== 'returned' && outsource.status !== 'partial_return') {
    return { success: false, error: '订单状态不允许结算' };
  }

  const finalAmount = data.settleAmount - (data.deductionAmount || 0);

  // 更新外发订单
  await client
    .from('outsource_orders')
    .update({
      status: 'settled',
      settle_quantity: data.settleQuantity,
      settle_amount: data.settleAmount,
      deduction_amount: data.deductionAmount,
      deduction_reason: data.deductionReason,
      final_amount: finalAmount,
      settled_at: new Date().toISOString(),
      settled_by: data.settledBy,
    })
    .eq('id', data.outsourceId);

  // 生成应付账款
  const billNo = `AP${Date.now().toString(36).toUpperCase()}`;
  await client.from('bills').insert({
    bill_no: billNo,
    bill_type: 'payable',
    category: '外发加工费',
    related_id: data.outsourceId,
    related_no: outsource.outsource_no,
    supplier_id: outsource.supplier_id,
    amount: finalAmount,
    paid_amount: 0,
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30天后
    status: 'pending',
    created_at: new Date().toISOString(),
  });

  // 更新进度
  await client
    .from('outsource_progress')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('outsource_order_id', data.outsourceId)
    .eq('stage', 'settling');

  return {
    success: true,
    message: '外发已结算',
    data: {
      settleAmount: data.settleAmount,
      deductionAmount: data.deductionAmount || 0,
      finalAmount,
      billNo,
    },
  };
}

// ============================================
// 取消外发
// ============================================

async function cancelOutsource(data: {
  outsourceId: string;
  reason: string;
  cancelledBy?: string;
}): Promise<any> {
  const { data: outsource } = await client
    .from('outsource_orders')
    .select('*')
    .eq('id', data.outsourceId)
    .single();

  if (!outsource) {
    return { success: false, error: '外发订单不存在' };
  }

  if (!['pending', 'accepted'].includes(outsource.status)) {
    return { success: false, error: '当前状态不允许取消' };
  }

  // 更新状态
  await client
    .from('outsource_orders')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: data.cancelledBy,
      cancel_reason: data.reason,
    })
    .eq('id', data.outsourceId);

  // 解锁分扎
  if (outsource.bundle_id) {
    await client
      .from('cutting_bundles')
      .update({
        status: 'pending',
        outsource_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', outsource.bundle_id);
  }

  return {
    success: true,
    message: '外发已取消',
  };
}

// ============================================
// 更新进度
// ============================================

async function updateOutsourceProgress(data: {
  outsourceId: string;
  stage: string;
  status: string;
  progress?: number;
  notes?: string;
}): Promise<any> {
  await client
    .from('outsource_progress')
    .update({
      status: data.status,
      progress: data.progress,
      notes: data.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('outsource_order_id', data.outsourceId)
    .eq('stage', data.stage);

  return {
    success: true,
    message: '进度已更新',
  };
}

// ============================================
// 辅助函数
// ============================================

async function getOutsourceStatus(outsourceId: string | null) {
  if (!outsourceId) {
    return NextResponse.json({ 
      error: '缺少外发订单ID' 
    }, { status: 400 });
  }

  const { data: outsource } = await client
    .from('outsource_orders')
    .select(`
      *,
      suppliers (id, name, code, contact, phone),
      production_orders (id, order_no, style_name),
      outsource_progress (*)
    `)
    .eq('id', outsourceId)
    .single();

  return NextResponse.json({
    success: true,
    data: outsource,
  });
}

async function getOutsourceProgress(outsourceId: string | null) {
  if (!outsourceId) {
    return NextResponse.json({ 
      error: '缺少外发订单ID' 
    }, { status: 400 });
  }

  const { data: progress } = await client
    .from('outsource_progress')
    .select('*')
    .eq('outsource_order_id', outsourceId)
    .order('created_at', { ascending: true });

  return NextResponse.json({
    success: true,
    data: progress,
  });
}

async function getPendingReturns() {
  const { data: outsources } = await client
    .from('outsource_orders')
    .select(`
      id, outsource_no, quantity, send_quantity, return_quantity,
      suppliers (name),
      production_orders (order_no, style_name)
    `)
    .eq('status', 'processing')
    .order('created_at', { ascending: false });

  return NextResponse.json({
    success: true,
    data: outsources,
  });
}

async function getOutsourceStatistics() {
  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  // 统计各状态数量
  const { data: statusCounts } = await client
    .from('outsource_orders')
    .select('status');

  const statusSummary: Record<string, number> = {};
  statusCounts?.forEach(o => {
    statusSummary[o.status] = (statusSummary[o.status] || 0) + 1;
  });

  // 本月外发金额
  const { data: monthOrders } = await client
    .from('outsource_orders')
    .select('total_amount, final_amount')
    .gte('created_at', monthStart);

  const monthTotalAmount = monthOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
  const monthSettledAmount = monthOrders?.reduce((sum, o) => sum + (o.final_amount || 0), 0) || 0;

  // 待处理数量
  const pendingCount = statusSummary['pending'] || 0;
  const processingCount = statusSummary['processing'] || 0;

  return NextResponse.json({
    success: true,
    data: {
      statusSummary,
      monthTotalAmount,
      monthSettledAmount,
      pendingCount,
      processingCount,
    },
  });
}

async function updateOrderProgressFromOutsource(orderId: string): Promise<void> {
  // 调用订单进度计算API更新进度
  await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:5000'}/api/production-orders/${orderId}/progress`, {
    method: 'POST',
  });
}
