import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 库存联动API
 * 
 * 实现库存与其他业务模块的自动联动：
 * 1. 生产订单 → 自动扣减面料、辅料
 * 2. 裁床 → 自动扣减面料
 * 3. 采购入库 → 自动更新库存
 * 4. 外发发出 → 自动锁定物料
 * 5. 成品入库 → 自动增加成衣库存
 * 6. 出货 → 自动扣减成衣库存
 * 
 * 库存预警规则：
 * - 库存 <= 安全库存 → 预警
 * - 库存 <= 安全库存*0.3 → 严重预警
 * - 库存 <= 0 → 缺货预警
 */

const client = getSupabaseClient();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'status';

  try {
    switch (action) {
      case 'status':
        return getInventoryStatus();
      
      case 'warnings':
        return getInventoryWarnings();
      
      case 'transactions':
        const materialId = searchParams.get('material_id');
        const days = parseInt(searchParams.get('days') || '30');
        return getInventoryTransactions(materialId, days);
      
      default:
        return NextResponse.json({ error: '未知操作' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Inventory linkage error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    let result;

    switch (action) {
      case 'production_outbound':
        result = await handleProductionOutbound(data);
        break;
      
      case 'cutting_outbound':
        result = await handleCuttingOutbound(data);
        break;
      
      case 'purchase_inbound':
        result = await handlePurchaseInbound(data);
        break;
      
      case 'outsource_lock':
        result = await handleOutsourceLock(data);
        break;
      
      case 'outsource_unlock':
        result = await handleOutsourceUnlock(data);
        break;
      
      case 'finished_inbound':
        result = await handleFinishedInbound(data);
        break;
      
      case 'shipment_outbound':
        result = await handleShipmentOutbound(data);
        break;
      
      case 'adjustment':
        result = await handleAdjustment(data);
        break;
      
      case 'transfer':
        result = await handleTransfer(data);
        break;
      
      default:
        return NextResponse.json({ error: '未知操作' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Inventory linkage error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// ============================================
// 库存状态概览
// ============================================

async function getInventoryStatus() {
  // 获取库存统计
  const { data: materials } = await client
    .from('materials')
    .select('id, code, name, type, current_stock, safety_stock, unit_price');

  const totalItems = materials?.length || 0;
  const totalValue = materials?.reduce((sum, m) => sum + (m.current_stock || 0) * (m.unit_price || 0), 0) || 0;
  
  const warningItems = materials?.filter(m => 
    m.safety_stock && m.current_stock <= m.safety_stock
  ) || [];
  
  const shortageItems = materials?.filter(m => 
    m.current_stock <= 0
  ) || [];

  return NextResponse.json({
    success: true,
    data: {
      totalItems,
      totalValue,
      warningCount: warningItems.length,
      shortageCount: shortageItems.length,
      warningItems: warningItems.slice(0, 10),
      shortageItems: shortageItems.slice(0, 10),
    },
  });
}

// ============================================
// 库存预警查询
// ============================================

async function getInventoryWarnings() {
  const { data: materials } = await client
    .from('materials')
    .select(`
      id, code, name, type, current_stock, safety_stock, unit_price,
      material_categories (name)
    `)
    .not('safety_stock', 'is', null);

  const warnings = (materials || [])
    .filter(m => m.current_stock <= m.safety_stock)
    .map(m => {
      let level = 'warning';
      if (m.current_stock <= 0) level = 'critical';
      else if (m.current_stock <= m.safety_stock * 0.3) level = 'critical';

      return {
        materialId: m.id,
        materialCode: m.code,
        materialName: m.name,
        category: (m.material_categories as any)?.name || '未分类',
        currentStock: m.current_stock,
        safetyStock: m.safety_stock,
        shortage: m.safety_stock - m.current_stock,
        level,
        suggestedPurchase: m.safety_stock * 1.5 - m.current_stock,
      };
    });

  return NextResponse.json({
    success: true,
    data: {
      total: warnings.length,
      critical: warnings.filter(w => w.level === 'critical').length,
      warning: warnings.filter(w => w.level === 'warning').length,
      items: warnings,
    },
  });
}

// ============================================
// 库存事务查询
// ============================================

async function getInventoryTransactions(materialId: string | null, days: number) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  let query = client
    .from('inventory_transactions')
    .select(`
      id, transaction_no, material_id, type, quantity, 
      before_quantity, after_quantity, warehouse, 
      related_type, related_no, operator, remark, created_at
    `)
    .gte('created_at', startDate)
    .order('created_at', { ascending: false })
    .limit(100);

  if (materialId) {
    query = query.eq('material_id', materialId);
  }

  const { data: transactions, error } = await query;

  if (error) throw error;

  // 获取物料信息
  const materialIds = [...new Set(transactions?.map(t => t.material_id) || [])];
  const { data: materials } = await client
    .from('materials')
    .select('id, code, name')
    .in('id', materialIds);

  const materialMap: Record<string, any> = {};
  materials?.forEach(m => {
    materialMap[m.id] = m;
  });

  const enrichedTransactions = transactions?.map(t => ({
    ...t,
    material: materialMap[t.material_id] || null,
  }));

  return NextResponse.json({
    success: true,
    data: {
      transactions: enrichedTransactions,
      total: enrichedTransactions?.length || 0,
    },
  });
}

// ============================================
// 生产领料
// ============================================

async function handleProductionOutbound(data: {
  orderId: string;
  orderNo: string;
  materials: Array<{
    materialId: string;
    quantity: number;
    warehouse?: string;
  }>;
  operator?: string;
}): Promise<any> {
  const { orderId, orderNo, materials, operator } = data;
  const results: any[] = [];

  for (const item of materials) {
    const result = await outboundMaterial({
      materialId: item.materialId,
      quantity: item.quantity,
      warehouse: item.warehouse || '主仓库',
      relatedType: 'production',
      relatedId: orderId,
      relatedNo: orderNo,
      operator: operator || 'system',
      remark: `生产订单 ${orderNo} 领料`,
    });

    results.push(result);
  }

  return {
    success: true,
    message: `生产领料完成，共处理 ${materials.length} 种物料`,
    data: { results },
  };
}

// ============================================
// 裁床领料
// ============================================

async function handleCuttingOutbound(data: {
  cuttingId: string;
  cuttingNo: string;
  materialId: string;
  quantity: number;
  warehouse?: string;
  operator?: string;
}): Promise<any> {
  const result = await outboundMaterial({
    materialId: data.materialId,
    quantity: data.quantity,
    warehouse: data.warehouse || '主仓库',
    relatedType: 'cutting',
    relatedId: data.cuttingId,
    relatedNo: data.cuttingNo,
    operator: data.operator || 'system',
    remark: `裁床单 ${data.cuttingNo} 领料`,
  });

  return {
    success: true,
    message: '裁床领料完成',
    data: result,
  };
}

// ============================================
// 采购入库
// ============================================

async function handlePurchaseInbound(data: {
  purchaseId: string;
  purchaseNo: string;
  supplierId: string;
  materials: Array<{
    materialId: string;
    quantity: number;
    unitPrice?: number;
    warehouse?: string;
    location?: string;
  }>;
  operator?: string;
}): Promise<any> {
  const results: any[] = [];

  for (const item of data.materials) {
    const result = await inboundMaterial({
      materialId: item.materialId,
      quantity: item.quantity,
      warehouse: item.warehouse || '主仓库',
      location: item.location,
      relatedType: 'purchase',
      relatedId: data.purchaseId,
      relatedNo: data.purchaseNo,
      operator: data.operator || 'system',
      remark: `采购入库 ${data.purchaseNo}`,
    });

    // 更新物料单价
    if (item.unitPrice) {
      await client
        .from('materials')
        .update({ unit_price: item.unitPrice })
        .eq('id', item.materialId);
    }

    results.push(result);
  }

  return {
    success: true,
    message: `采购入库完成，共处理 ${data.materials.length} 种物料`,
    data: { results },
  };
}

// ============================================
// 外发锁定物料
// ============================================

async function handleOutsourceLock(data: {
  outsourceId: string;
  outsourceNo: string;
  materials: Array<{
    materialId: string;
    quantity: number;
    warehouse?: string;
  }>;
  operator?: string;
}): Promise<any> {
  const results: any[] = [];

  for (const item of data.materials) {
    // 锁定库存
    const { data: inventory, error } = await client
      .from('inventory')
      .select('*')
      .eq('material_id', item.materialId)
      .eq('warehouse', item.warehouse || '主仓库')
      .single();

    if (error || !inventory) {
      results.push({
        materialId: item.materialId,
        success: false,
        error: '库存不存在',
      });
      continue;
    }

    const newLockedQty = (inventory.locked_qty || 0) + item.quantity;
    
    if (newLockedQty > inventory.quantity) {
      results.push({
        materialId: item.materialId,
        success: false,
        error: '可锁定库存不足',
      });
      continue;
    }

    await client
      .from('inventory')
      .update({
        locked_qty: newLockedQty,
        available_qty: inventory.quantity - newLockedQty,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inventory.id);

    results.push({
      materialId: item.materialId,
      success: true,
      locked: item.quantity,
    });
  }

  return {
    success: true,
    message: `外发锁定完成`,
    data: { results },
  };
}

// ============================================
// 外发解锁物料
// ============================================

async function handleOutsourceUnlock(data: {
  outsourceId: string;
  outsourceNo: string;
  materials: Array<{
    materialId: string;
    quantity: number;
    warehouse?: string;
  }>;
  operator?: string;
}): Promise<any> {
  const results: any[] = [];

  for (const item of data.materials) {
    const { data: inventory, error } = await client
      .from('inventory')
      .select('*')
      .eq('material_id', item.materialId)
      .eq('warehouse', item.warehouse || '主仓库')
      .single();

    if (!error && inventory) {
      const newLockedQty = Math.max(0, (inventory.locked_qty || 0) - item.quantity);
      
      await client
        .from('inventory')
        .update({
          locked_qty: newLockedQty,
          available_qty: inventory.quantity - newLockedQty,
          updated_at: new Date().toISOString(),
        })
        .eq('id', inventory.id);

      results.push({
        materialId: item.materialId,
        success: true,
        unlocked: item.quantity,
      });
    }
  }

  return {
    success: true,
    message: `外发解锁完成`,
    data: { results },
  };
}

// ============================================
// 成品入库
// ============================================

async function handleFinishedInbound(data: {
  orderId: string;
  orderNo: string;
  styleId: string;
  styleNo: string;
  styleName: string;
  color: string;
  items: Array<{
    size: string;
    quantity: number;
  }>;
  warehouse?: string;
  operator?: string;
}): Promise<any> {
  const results: any[] = [];

  for (const item of data.items) {
    // 检查是否已有成品库存记录
    const { data: existing } = await client
      .from('finished_inventory')
      .select('*')
      .eq('style_id', data.styleId)
      .eq('color', data.color)
      .eq('size', item.size)
      .eq('warehouse', data.warehouse || '成品仓')
      .single();

    if (existing) {
      // 更新库存
      const newQty = existing.quantity + item.quantity;
      await client
        .from('finished_inventory')
        .update({
          quantity: newQty,
          available_qty: newQty - (existing.locked_qty || 0),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      
      results.push({
        size: item.size,
        quantity: item.quantity,
        newTotal: newQty,
        action: 'updated',
      });
    } else {
      // 创建新库存记录
      await client
        .from('finished_inventory')
        .insert({
          style_id: data.styleId,
          style_no: data.styleNo,
          style_name: data.styleName,
          color: data.color,
          size: item.size,
          warehouse: data.warehouse || '成品仓',
          quantity: item.quantity,
          locked_qty: 0,
          available_qty: item.quantity,
        });

      results.push({
        size: item.size,
        quantity: item.quantity,
        newTotal: item.quantity,
        action: 'created',
      });
    }

    // 记录库存事务
    await client.from('inventory_transactions').insert({
      transaction_no: `FI${Date.now().toString(36).toUpperCase()}`,
      material_id: `${data.styleNo}-${data.color}-${item.size}`,
      type: 'in',
      quantity: item.quantity,
      warehouse: data.warehouse || '成品仓',
      related_type: 'production',
      related_id: data.orderId,
      related_no: data.orderNo,
      operator: data.operator || 'system',
      remark: `成品入库 - ${data.styleName} ${data.color} ${item.size}`,
      created_at: new Date().toISOString(),
    });
  }

  return {
    success: true,
    message: `成品入库完成，共 ${data.items.reduce((sum, i) => sum + i.quantity, 0)} 件`,
    data: { results },
  };
}

// ============================================
// 出货扣减库存
// ============================================

async function handleShipmentOutbound(data: {
  shipmentId: string;
  shipmentNo: string;
  orderId: string;
  orderNo: string;
  items: Array<{
    inventoryId: string;
    styleNo: string;
    color: string;
    size: string;
    quantity: number;
  }>;
  operator?: string;
}): Promise<any> {
  const results: any[] = [];

  for (const item of data.items) {
    const { data: inventory, error } = await client
      .from('finished_inventory')
      .select('*')
      .eq('id', item.inventoryId)
      .single();

    if (error || !inventory) {
      results.push({
        ...item,
        success: false,
        error: '库存记录不存在',
      });
      continue;
    }

    if (inventory.available_qty < item.quantity) {
      results.push({
        ...item,
        success: false,
        error: '可用库存不足',
      });
      continue;
    }

    const newQty = inventory.quantity - item.quantity;
    
    await client
      .from('finished_inventory')
      .update({
        quantity: newQty,
        available_qty: newQty - (inventory.locked_qty || 0),
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.inventoryId);

    results.push({
      ...item,
      success: true,
      newQuantity: newQty,
    });

    // 记录库存事务
    await client.from('inventory_transactions').insert({
      transaction_no: `FO${Date.now().toString(36).toUpperCase()}`,
      material_id: `${item.styleNo}-${item.color}-${item.size}`,
      type: 'out',
      quantity: item.quantity,
      warehouse: inventory.warehouse,
      related_type: 'shipment',
      related_id: data.shipmentId,
      related_no: data.shipmentNo,
      operator: data.operator || 'system',
      remark: `出货扣减 - ${data.shipmentNo}`,
      created_at: new Date().toISOString(),
    });
  }

  return {
    success: true,
    message: `出货扣减完成`,
    data: { results },
  };
}

// ============================================
// 库存调整
// ============================================

async function handleAdjustment(data: {
  materialId: string;
  warehouse: string;
  adjustmentType: 'increase' | 'decrease';
  quantity: number;
  reason: string;
  operator?: string;
}): Promise<any> {
  const { data: inventory } = await client
    .from('inventory')
    .select('*')
    .eq('material_id', data.materialId)
    .eq('warehouse', data.warehouse)
    .single();

  if (!inventory) {
    return {
      success: false,
      error: '库存记录不存在',
    };
  }

  const adjustmentQty = data.adjustmentType === 'increase' ? data.quantity : -data.quantity;
  const newQty = inventory.quantity + adjustmentQty;

  if (newQty < 0) {
    return {
      success: false,
      error: '调整后库存不能为负',
    };
  }

  await client
    .from('inventory')
    .update({
      quantity: newQty,
      available_qty: newQty - (inventory.locked_qty || 0),
      updated_at: new Date().toISOString(),
    })
    .eq('id', inventory.id);

  // 更新物料表
  await client
    .from('materials')
    .update({ current_stock: newQty })
    .eq('id', data.materialId);

  // 记录库存事务
  await client.from('inventory_transactions').insert({
    transaction_no: `ADJ${Date.now().toString(36).toUpperCase()}`,
    material_id: data.materialId,
    type: data.adjustmentType === 'increase' ? 'adjust_in' : 'adjust_out',
    quantity: data.quantity,
    before_quantity: inventory.quantity,
    after_quantity: newQty,
    warehouse: data.warehouse,
    related_type: 'adjustment',
    operator: data.operator || 'system',
    remark: data.reason,
    created_at: new Date().toISOString(),
  });

  return {
    success: true,
    message: '库存调整完成',
    data: {
      before: inventory.quantity,
      adjustment: adjustmentQty,
      after: newQty,
    },
  };
}

// ============================================
// 库存调拨
// ============================================

async function handleTransfer(data: {
  materialId: string;
  fromWarehouse: string;
  toWarehouse: string;
  quantity: number;
  operator?: string;
  remark?: string;
}): Promise<any> {
  // 从源仓库出库
  const fromResult = await outboundMaterial({
    materialId: data.materialId,
    quantity: data.quantity,
    warehouse: data.fromWarehouse,
    relatedType: 'transfer',
    operator: data.operator,
    remark: `调拨至 ${data.toWarehouse}`,
  });

  // 入库到目标仓库
  const toResult = await inboundMaterial({
    materialId: data.materialId,
    quantity: data.quantity,
    warehouse: data.toWarehouse,
    relatedType: 'transfer',
    operator: data.operator,
    remark: `从 ${data.fromWarehouse} 调入`,
  });

  return {
    success: true,
    message: '库存调拨完成',
    data: { fromResult, toResult },
  };
}

// ============================================
// 辅助函数
// ============================================

async function outboundMaterial(params: {
  materialId: string;
  quantity: number;
  warehouse: string;
  relatedType?: string;
  relatedId?: string;
  relatedNo?: string;
  operator?: string;
  remark?: string;
}): Promise<any> {
  const { data: inventory } = await client
    .from('inventory')
    .select('*')
    .eq('material_id', params.materialId)
    .eq('warehouse', params.warehouse)
    .single();

  if (!inventory) {
    return { success: false, error: '库存不足' };
  }

  const beforeQty = Number(inventory.quantity);
  const afterQty = beforeQty - params.quantity;

  if (afterQty < 0) {
    return { success: false, error: '库存不足' };
  }

  // 更新库存
  await client
    .from('inventory')
    .update({
      quantity: afterQty,
      available_qty: afterQty - Number(inventory.locked_qty || 0),
      updated_at: new Date().toISOString(),
    })
    .eq('id', inventory.id);

  // 更新物料表
  await client
    .from('materials')
    .update({ current_stock: afterQty })
    .eq('id', params.materialId);

  // 记录库存事务
  await client.from('inventory_transactions').insert({
    transaction_no: `OUT${Date.now().toString(36).toUpperCase()}`,
    material_id: params.materialId,
    type: 'out',
    quantity: params.quantity,
    before_quantity: beforeQty,
    after_quantity: afterQty,
    warehouse: params.warehouse,
    related_type: params.relatedType,
    related_id: params.relatedId,
    related_no: params.relatedNo,
    operator: params.operator,
    remark: params.remark,
    created_at: new Date().toISOString(),
  });

  // 检查预警
  await checkAndCreateWarning(params.materialId, afterQty);

  return {
    success: true,
    beforeQty,
    afterQty,
  };
}

async function inboundMaterial(params: {
  materialId: string;
  quantity: number;
  warehouse: string;
  location?: string;
  relatedType?: string;
  relatedId?: string;
  relatedNo?: string;
  operator?: string;
  remark?: string;
}): Promise<any> {
  const { data: inventory } = await client
    .from('inventory')
    .select('*')
    .eq('material_id', params.materialId)
    .eq('warehouse', params.warehouse)
    .single();

  let beforeQty = 0;
  let afterQty = params.quantity;

  if (inventory) {
    beforeQty = Number(inventory.quantity);
    afterQty = beforeQty + params.quantity;

    await client
      .from('inventory')
      .update({
        quantity: afterQty,
        available_qty: afterQty - Number(inventory.locked_qty || 0),
        updated_at: new Date().toISOString(),
      })
      .eq('id', inventory.id);
  } else {
    await client.from('inventory').insert({
      material_id: params.materialId,
      warehouse: params.warehouse,
      location: params.location,
      quantity: afterQty,
      locked_qty: 0,
      available_qty: afterQty,
    });
  }

  // 更新物料表
  await client
    .from('materials')
    .update({ current_stock: afterQty })
    .eq('id', params.materialId);

  // 记录库存事务
  await client.from('inventory_transactions').insert({
    transaction_no: `IN${Date.now().toString(36).toUpperCase()}`,
    material_id: params.materialId,
    type: 'in',
    quantity: params.quantity,
    before_quantity: beforeQty,
    after_quantity: afterQty,
    warehouse: params.warehouse,
    related_type: params.relatedType,
    related_id: params.relatedId,
    related_no: params.relatedNo,
    operator: params.operator,
    remark: params.remark,
    created_at: new Date().toISOString(),
  });

  return {
    success: true,
    beforeQty,
    afterQty,
  };
}

async function checkAndCreateWarning(materialId: string, currentQty: number): Promise<void> {
  const { data: material } = await client
    .from('materials')
    .select('code, name, safety_stock')
    .eq('id', materialId)
    .single();

  if (!material || !material.safety_stock) return;

  if (currentQty <= material.safety_stock) {
    const level = currentQty <= material.safety_stock * 0.3 ? 'critical' : 'warning';
    
    // 检查是否已存在预警
    const { data: existing } = await client
      .from('alerts')
      .select('id')
      .eq('related_id', materialId)
      .eq('alert_type', 'inventory')
      .eq('status', 'active')
      .single();

    if (!existing) {
      await client.from('alerts').insert({
        alert_type: 'inventory',
        alert_level: level,
        title: '库存不足预警',
        content: `物料 ${material.name}(${material.code}) 库存不足，当前: ${currentQty}，安全库存: ${material.safety_stock}`,
        related_id: materialId,
        related_type: 'material',
        status: 'active',
        created_at: new Date().toISOString(),
      });
    }
  }
}
