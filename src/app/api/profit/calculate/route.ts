import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 计算订单成本
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { order_id, force_recalculate = false } = body;

    if (!order_id) {
      return NextResponse.json({ success: false, error: '缺少订单ID' }, { status: 400 });
    }

    // 获取订单信息
    const { data: order, error: orderError } = await client
      .from('production_orders')
      .select(`
        id, order_code, style_id, customer_id, quantity, status,
        unit_price, total_amount, created_at,
        styles(id, style_code, style_name),
        customers(id, name, code)
      `)
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 });
    }

    // 检查是否已核算
    if (!force_recalculate) {
      const { data: existingCost } = await client
        .from('order_costs')
        .select('*')
        .eq('order_id', order_id)
        .eq('cost_status', 'confirmed')
        .single();

      if (existingCost) {
        return NextResponse.json({ success: true, data: existingCost, message: '成本已核算' });
      }
    }

    // 1. 计算材料成本
    const materialCost = await calculateMaterialCost(client, order_id);

    // 2. 计算人工成本
    const laborCost = await calculateLaborCost(client, order_id);

    // 3. 计算外发成本
    const outsourceCost = await calculateOutsourceCost(client, order_id);

    // 4. 计算运输成本
    const shippingCost = await calculateShippingCost(client, order_id);

    // 5. 汇总
    const totalCost = 
      materialCost.material + 
      materialCost.accessory + 
      materialCost.loss +
      laborCost.direct + 
      laborCost.indirect +
      outsourceCost.outsource +
      outsourceCost.craft +
      shippingCost.shipping +
      shippingCost.packaging +
      shippingCost.other;

    const orderAmount = order.total_amount || (order.unit_price * order.quantity) || 0;
    const grossProfit = orderAmount - totalCost;
    const profitRate = orderAmount > 0 ? (grossProfit / orderAmount * 100) : 0;
    const unitCost = order.quantity > 0 ? totalCost / order.quantity : 0;
    const unitProfit = order.quantity > 0 ? grossProfit / order.quantity : 0;

    // 保存/更新成本记录
    const costRecord = {
      id: `cost_${order_id}`,
      order_id,
      order_amount: orderAmount,
      material_cost: materialCost.material,
      accessory_cost: materialCost.accessory,
      material_loss_cost: materialCost.loss,
      labor_cost: laborCost.direct,
      indirect_labor_cost: laborCost.indirect,
      outsource_cost: outsourceCost.outsource,
      craft_cost: outsourceCost.craft,
      shipping_cost: shippingCost.shipping,
      packaging_cost: shippingCost.packaging,
      other_cost: shippingCost.other,
      total_cost: totalCost,
      gross_profit: grossProfit,
      profit_rate: profitRate,
      quantity: order.quantity,
      unit_cost: unitCost,
      unit_profit: unitProfit,
      cost_status: 'calculated',
      calculated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await client
      .from('order_costs')
      .upsert(costRecord);

    if (upsertError) {
      console.error('Save cost error:', upsertError);
      return NextResponse.json({ success: false, error: '保存成本记录失败' }, { status: 500 });
    }

    // 检查利润预警
    await checkProfitAlerts(client, order, grossProfit, profitRate, totalCost);

    return NextResponse.json({
      success: true,
      data: {
        ...costRecord,
        order_code: order.order_code,
        style_name: (order.styles as any)?.style_name,
        customer_name: (order.customers as any)?.name,
      },
      breakdown: {
        material: materialCost,
        labor: laborCost,
        outsource: outsourceCost,
        shipping: shippingCost,
      },
    });
  } catch (error) {
    console.error('Calculate cost error:', error);
    return NextResponse.json({ success: false, error: '计算失败' }, { status: 500 });
  }
}

// 计算材料成本
async function calculateMaterialCost(client: any, orderId: string) {
  // 从库存事务表获取该订单的材料出库
  const { data: transactions } = await client
    .from('inventory_transactions')
    .select(`
      quantity, unit_price, total_amount, transaction_type,
      materials(id, name, category)
    `)
    .eq('reference_type', 'production_order')
    .eq('reference_id', orderId)
    .eq('transaction_type', 'out');

  let material = 0;
  let accessory = 0;
  let loss = 0;

  if (transactions) {
    for (const t of transactions) {
      const amount = t.total_amount || (t.quantity * t.unit_price) || 0;
      const category = t.materials?.category || '';
      
      if (category.includes('面料') || category.includes('布料')) {
        material += amount;
      } else if (category.includes('辅料') || category.includes('配件')) {
        accessory += amount;
      } else {
        material += amount; // 默认归为面料
      }
    }
  }

  // 计算损耗（默认5%）
  loss = material * 0.05;

  return { material, accessory, loss };
}

// 计算人工成本
async function calculateLaborCost(client: any, orderId: string) {
  // 从工序跟踪获取已完成工序
  const { data: tracking } = await client
    .from('process_tracking')
    .select(`
      employee_id, process_id, quantity, completed_at,
      processes(id, name, price),
      employees(id, name)
    `)
    .eq('order_id', orderId);

  let direct = 0;

  if (tracking) {
    for (const t of tracking) {
      // 工序单价 * 完成数量
      const price = t.processes?.price || 0;
      direct += price * (t.quantity || 0);
    }
  }

  // 间接人工（管理费用，按直接人工的15%计算）
  const indirect = direct * 0.15;

  return { direct, indirect };
}

// 计算外发成本
async function calculateOutsourceCost(client: any, orderId: string) {
  // 从外发记录获取
  const { data: outsourceRecords } = await client
    .from('bundle_outsource')
    .select('unit_price, quantity, total_amount')
    .eq('order_id', orderId);

  let outsource = 0;

  if (outsourceRecords) {
    for (const o of outsourceRecords) {
      outsource += o.total_amount || (o.unit_price * o.quantity) || 0;
    }
  }

  // 从二次工艺获取
  const { data: crafts } = await client
    .from('secondary_process_orders')
    .select('total_amount')
    .eq('order_id', orderId);

  let craft = 0;

  if (crafts) {
    for (const c of crafts) {
      craft += c.total_amount || 0;
    }
  }

  return { outsource, craft };
}

// 计算运输成本
async function calculateShippingCost(client: any, orderId: string) {
  // 从出货记录获取
  const { data: shipments } = await client
    .from('shipment_details')
    .select(`
      quantity,
      shipments(id, shipping_cost, status)
    `)
    .eq('order_id', orderId);

  let shipping = 0;
  let packaging = 0;
  let other = 0;

  if (shipments) {
    for (const s of shipments) {
      // 按数量分摊运输成本
      const shipmentCost = s.shipments?.shipping_cost || 0;
      shipping += shipmentCost;
    }
  }

  // 包装成本（按件计算，默认2元/件）
  // 这里可以从订单数量估算
  const { data: order } = await client
    .from('production_orders')
    .select('quantity')
    .eq('id', orderId)
    .single();

  if (order) {
    packaging = (order.quantity || 0) * 2;
  }

  return { shipping, packaging, other };
}

// 检查利润预警
async function checkProfitAlerts(
  client: any,
  order: any,
  grossProfit: number,
  profitRate: number,
  totalCost: number
) {
  // 1. 亏损订单预警
  if (grossProfit < 0) {
    await client.from('profit_alerts').insert({
      id: `alert_loss_${order.id}_${Date.now()}`,
      alert_type: 'loss_order',
      severity: 'critical',
      order_id: order.id,
      style_id: order.style_id,
      customer_id: order.customer_id,
      title: `亏损订单: ${order.order_code}`,
      message: `订单 ${order.order_code} 亏损 ${Math.abs(grossProfit).toFixed(2)} 元`,
      actual_value: grossProfit,
      threshold_value: 0,
      variance_value: grossProfit,
      variance_rate: profitRate,
      status: 'active',
    });
  }
  // 2. 低利润预警（利润率<10%）
  else if (profitRate < 10) {
    await client.from('profit_alerts').insert({
      id: `alert_low_${order.id}_${Date.now()}`,
      alert_type: 'low_profit',
      severity: 'warning',
      order_id: order.id,
      style_id: order.style_id,
      customer_id: order.customer_id,
      title: `低利润订单: ${order.order_code}`,
      message: `订单 ${order.order_code} 利润率仅 ${profitRate.toFixed(1)}%`,
      actual_value: profitRate,
      threshold_value: 10,
      variance_value: profitRate - 10,
      variance_rate: profitRate,
      status: 'active',
    });
  }

  // 3. 成本超支预警（与标准成本对比）
  const { data: standard } = await client
    .from('style_cost_standards')
    .select('standard_total_cost')
    .eq('style_id', order.style_id)
    .eq('is_active', true)
    .single();

  if (standard && order.quantity > 0) {
    const unitCost = totalCost / order.quantity;
    const standardCost = standard.standard_total_cost;
    const variance = unitCost - standardCost;
    const varianceRate = standardCost > 0 ? (variance / standardCost * 100) : 0;

    if (varianceRate > 10) { // 超过标准成本10%
      await client.from('profit_alerts').insert({
        id: `alert_overrun_${order.id}_${Date.now()}`,
        alert_type: 'cost_overrun',
        severity: 'warning',
        order_id: order.id,
        style_id: order.style_id,
        title: `成本超支: ${order.order_code}`,
        message: `单件成本 ${unitCost.toFixed(2)} 元，超出标准成本 ${varianceRate.toFixed(1)}%`,
        actual_value: unitCost,
        threshold_value: standardCost,
        variance_value: variance,
        variance_rate: varianceRate,
        status: 'active',
      });
    }
  }
}
