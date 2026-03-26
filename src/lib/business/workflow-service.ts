/**
 * 业务流程闭环服务
 * 
 * 实现所有业务流程的状态流转和自动联动
 * 
 * 核心业务闭环：
 * 1. 订单管理：创建 → 排产 → 生产 → 质检 → 出货 → 完结
 * 2. 裁床管理：计划 → 执行 → 分扎 → 发放
 * 3. 生产管理：工序 → 扫码 → 进度 → 完工
 * 4. 质量管理：质检 → 不良 → 返工 → 复检
 * 5. 库存管理：入库 → 出库 → 盘点 → 预警
 * 6. 外发管理：外发 → 发出 → 回收 → 结算
 * 7. 财务管理：应收 → 应付 → 对账 → 结算
 * 8. 预警系统：检测 → 通知 → 处理 → 反馈
 */

import { getSupabaseClient } from '@/storage/database/supabase-client';

const client = getSupabaseClient();

// ============================================
// 类型定义
// ============================================

export type OrderStatus = 'pending' | 'confirmed' | 'in_progress' | 'quality_check' | 'shipping' | 'completed' | 'cancelled';
export type CuttingStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type ProductionStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type QualityResult = 'pending' | 'pass' | 'fail' | 'conditional';
export type OutsourceStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'returned' | 'cancelled';
export type ShipmentStatus = 'pending' | 'packing' | 'shipped' | 'delivered' | 'cancelled';
export type AlertLevel = 'info' | 'warning' | 'error' | 'critical';

export interface WorkflowResult {
  success: boolean;
  message: string;
  data?: any;
  alerts?: AlertInfo[];
}

export interface AlertInfo {
  type: string;
  level: AlertLevel;
  title: string;
  content: string;
  relatedId?: string;
  relatedType?: string;
}

// ============================================
// 1. 订单管理业务闭环
// ============================================

export class OrderWorkflow {
  
  /**
   * 创建订单 - 自动触发后续流程
   */
  static async createOrder(orderData: any): Promise<WorkflowResult> {
    try {
      // 生成订单号
      const orderNo = await this.generateOrderNo();
      
      // 创建订单
      const { data: order, error } = await client
        .from('production_orders')
        .insert({
          ...orderData,
          order_no: orderNo,
          status: 'pending',
          progress: 0,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // 创建订单日志
      await this.logOrderAction(order.id, 'created', '订单创建', orderData.created_by);

      // 自动创建预警（交期提醒）
      if (order.delivery_date) {
        const daysUntilDelivery = Math.ceil(
          (new Date(order.delivery_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysUntilDelivery <= 7) {
          await AlertWorkflow.createAlert({
            type: 'delivery',
            level: daysUntilDelivery <= 3 ? 'critical' : 'warning',
            title: '新订单交期紧迫',
            content: `订单 ${orderNo} 将在 ${daysUntilDelivery} 天后到期，请尽快安排生产`,
            relatedId: order.id,
            relatedType: 'production_order',
          });
        }
      }

      return {
        success: true,
        message: '订单创建成功',
        data: order,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '订单创建失败',
      };
    }
  }

  /**
   * 确认订单 - 开始排产
   */
  static async confirmOrder(orderId: string, confirmedBy: string): Promise<WorkflowResult> {
    try {
      const { data: order } = await client
        .from('production_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (!order) throw new Error('订单不存在');
      if (order.status !== 'pending') throw new Error('订单状态不允许确认');

      // 更新订单状态
      await client
        .from('production_orders')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          confirmed_by: confirmedBy,
        })
        .eq('id', orderId);

      // 记录日志
      await this.logOrderAction(orderId, 'confirmed', '订单确认', confirmedBy);

      // 自动创建生产准备任务
      await this.createProductionPrepTasks(order);

      // 通知相关人员
      await NotificationWorkflow.sendNotification({
        type: 'order',
        level: 'info',
        title: '订单已确认',
        content: `订单 ${order.order_no} 已确认，请安排生产准备`,
        relatedOrder: order.order_no,
        recipients: ['production_manager', 'warehouse'],
      });

      return {
        success: true,
        message: '订单确认成功，已开始排产',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '订单确认失败',
      };
    }
  }

  /**
   * 开始生产 - 更新订单状态
   */
  static async startProduction(orderId: string): Promise<WorkflowResult> {
    try {
      const { data: order } = await client
        .from('production_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (!order) throw new Error('订单不存在');

      // 更新订单状态
      await client
        .from('production_orders')
        .update({
          status: 'in_progress',
          production_started_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      // 记录日志
      await this.logOrderAction(orderId, 'production_started', '开始生产', 'system');

      return {
        success: true,
        message: '生产已开始',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '开始生产失败',
      };
    }
  }

  /**
   * 更新订单进度 - 自动计算
   */
  static async updateOrderProgress(orderId: string): Promise<WorkflowResult> {
    try {
      // 获取订单的所有裁床分扎
      const { data: bundles } = await client
        .from('cutting_bundles')
        .select('id, quantity, status')
        .eq('order_id', orderId);

      if (!bundles || bundles.length === 0) {
        return { success: true, message: '暂无分扎数据' };
      }

      // 获取所有工票完成情况
      const bundleIds = bundles.map(b => b.id);
      const { data: tickets } = await client
        .from('work_tickets')
        .select('bundle_id, quantity, completed_quantity')
        .in('bundle_id', bundleIds);

      // 计算总数量和完成数量
      const totalQty = bundles.reduce((sum, b) => sum + b.quantity, 0);
      const completedQty = tickets?.reduce((sum, t) => sum + (t.completed_quantity || 0), 0) || 0;
      const progress = totalQty > 0 ? Math.round((completedQty / totalQty) * 100) : 0;

      // 更新订单进度
      await client
        .from('production_orders')
        .update({ progress })
        .eq('id', orderId);

      // 检查是否进入质检阶段（进度>=90%）
      if (progress >= 90) {
        await this.transitionToQualityCheck(orderId);
      }

      return {
        success: true,
        message: `进度已更新: ${progress}%`,
        data: { progress, totalQty, completedQty },
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '更新进度失败',
      };
    }
  }

  /**
   * 转入质检阶段
   */
  static async transitionToQualityCheck(orderId: string): Promise<void> {
    const { data: order } = await client
      .from('production_orders')
      .select('status')
      .eq('id', orderId)
      .single();

    if (order?.status === 'in_progress') {
      await client
        .from('production_orders')
        .update({ status: 'quality_check' })
        .eq('id', orderId);

      // 创建质检任务
      await QualityWorkflow.createOQCInspection(orderId);
    }
  }

  /**
   * 完成订单 - 自动触发后续流程
   */
  static async completeOrder(orderId: string): Promise<WorkflowResult> {
    try {
      const { data: order } = await client
        .from('production_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (!order) throw new Error('订单不存在');

      // 检查是否所有质检通过
      const { data: inspections } = await client
        .from('quality_inspections')
        .select('result')
        .eq('order_id', orderId);

      const hasFailedInspection = inspections?.some(i => i.result === 'fail');
      if (hasFailedInspection) {
        throw new Error('存在未通过的质检，无法完成订单');
      }

      // 更新订单状态
      await client
        .from('production_orders')
        .update({
          status: 'completed',
          progress: 100,
          completed_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      // 记录日志
      await this.logOrderAction(orderId, 'completed', '订单完成', 'system');

      // 自动生成财务账单
      await FinanceWorkflow.generateReceivable(order);

      return {
        success: true,
        message: '订单已完成',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '完成订单失败',
      };
    }
  }

  /**
   * 取消订单 - 回滚所有关联数据
   */
  static async cancelOrder(orderId: string, reason: string, cancelledBy: string): Promise<WorkflowResult> {
    try {
      const { data: order } = await client
        .from('production_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (!order) throw new Error('订单不存在');
      if (order.status === 'completed') throw new Error('已完成的订单无法取消');

      // 更新订单状态
      await client
        .from('production_orders')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: cancelledBy,
          cancel_reason: reason,
        })
        .eq('id', orderId);

      // 取消关联的裁床单
      await client
        .from('cutting_orders')
        .update({ status: 'cancelled' })
        .eq('production_order_id', orderId);

      // 取消关联的外发订单
      await client
        .from('outsource_orders')
        .update({ status: 'cancelled' })
        .eq('production_order_id', orderId);

      // 取消关联的出货单
      await client
        .from('shipments')
        .update({ status: 'cancelled' })
        .eq('order_id', orderId);

      // 记录日志
      await this.logOrderAction(orderId, 'cancelled', `订单取消: ${reason}`, cancelledBy);

      return {
        success: true,
        message: '订单已取消，关联数据已回滚',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '取消订单失败',
      };
    }
  }

  /**
   * 生成订单号
   */
  private static async generateOrderNo(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    const { data: lastOrder } = await client
      .from('production_orders')
      .select('order_no')
      .like('order_no', `PO${dateStr}%`)
      .order('order_no', { ascending: false })
      .limit(1);

    let orderNo = `PO${dateStr}001`;
    if (lastOrder && lastOrder.length > 0) {
      const lastNo = parseInt(lastOrder[0].order_no.slice(-3));
      orderNo = `PO${dateStr}${String(lastNo + 1).padStart(3, '0')}`;
    }

    return orderNo;
  }

  /**
   * 创建生产准备任务
   */
  private static async createProductionPrepTasks(order: any): Promise<void> {
    const tasks = [
      {
        order_id: order.id,
        task_type: 'material_check',
        task_name: '物料齐套检查',
        status: 'pending',
        due_date: order.delivery_date,
      },
      {
        order_id: order.id,
        task_type: 'production_line_assign',
        task_name: '生产线分配',
        status: 'pending',
        due_date: order.delivery_date,
      },
      {
        order_id: order.id,
        task_type: 'cutting_plan',
        task_name: '裁床计划',
        status: 'pending',
        due_date: order.delivery_date,
      },
    ];

    await client.from('production_prep_tasks').insert(tasks);
  }

  /**
   * 记录订单操作日志
   */
  private static async logOrderAction(orderId: string, action: string, description: string, operator: string): Promise<void> {
    await client.from('order_logs').insert({
      order_id: orderId,
      action,
      description,
      operator,
      created_at: new Date().toISOString(),
    });
  }
}

// ============================================
// 2. 裁床管理业务闭环
// ============================================

export class CuttingWorkflow {
  
  /**
   * 创建裁床单 - 自动关联订单
   */
  static async createCuttingOrder(data: any): Promise<WorkflowResult> {
    try {
      const cuttingNo = await this.generateCuttingNo();

      const { data: cutting, error } = await client
        .from('cutting_orders')
        .insert({
          ...data,
          cutting_no: cuttingNo,
          status: 'pending',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // 如果关联了生产订单，更新订单状态
      if (data.production_order_id) {
        await OrderWorkflow.startProduction(data.production_order_id);
      }

      // 扣减面料库存
      if (data.fabric_code && data.fabric_qty) {
        await InventoryWorkflow.outbound({
          materialId: data.fabric_code,
          quantity: data.fabric_qty,
          warehouse: '主仓库',
          relatedType: 'cutting',
          relatedId: cutting.id,
          notes: `裁床单 ${cuttingNo} 领料`,
        });
      }

      return {
        success: true,
        message: '裁床单创建成功',
        data: cutting,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '创建裁床单失败',
      };
    }
  }

  /**
   * 完成裁床 - 自动创建分扎
   */
  static async completeCutting(cuttingId: string, sizeBreakdown: Record<string, number>): Promise<WorkflowResult> {
    try {
      const { data: cutting } = await client
        .from('cutting_orders')
        .select('*')
        .eq('id', cuttingId)
        .single();

      if (!cutting) throw new Error('裁床单不存在');

      // 更新裁床单状态
      await client
        .from('cutting_orders')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', cuttingId);

      // 自动创建分扎
      const bundles = await this.createBundles(cutting, sizeBreakdown);

      // 更新订单进度
      if (cutting.production_order_id) {
        await OrderWorkflow.updateOrderProgress(cutting.production_order_id);
      }

      return {
        success: true,
        message: '裁床完成，已自动创建分扎',
        data: { bundles },
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '完成裁床失败',
      };
    }
  }

  /**
   * 创建分扎记录
   */
  private static async createBundles(cutting: any, sizeBreakdown: Record<string, number>): Promise<any[]> {
    const bundles: any[] = [];
    let bundleIndex = 1;

    for (const [size, quantity] of Object.entries(sizeBreakdown)) {
      const bundleNo = `${cutting.cutting_no}-${String(bundleIndex).padStart(3, '0')}`;
      
      bundles.push({
        bundle_no: bundleNo,
        cutting_id: cutting.id,
        order_id: cutting.production_order_id,
        size,
        color: cutting.color,
        quantity,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      bundleIndex++;
    }

    const { data } = await client.from('cutting_bundles').insert(bundles).select();
    return data || [];
  }

  /**
   * 生成分扎号
   */
  private static async generateCuttingNo(): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const { count } = await client
      .from('cutting_orders')
      .select('id', { count: 'exact', head: true });
    
    return `CUT${dateStr}${String((count || 0) + 1).padStart(3, '0')}`;
  }
}

// ============================================
// 3. 生产管理业务闭环
// ============================================

export class ProductionWorkflow {
  
  /**
   * 扫码开始工序
   */
  static async scanStartWork(data: {
    bundleId: string;
    processId: string;
    employeeId: string;
  }): Promise<WorkflowResult> {
    try {
      const { bundleId, processId, employeeId } = data;

      // 获取分扎信息
      const { data: bundle } = await client
        .from('cutting_bundles')
        .select('*, cutting_orders(*)')
        .eq('id', bundleId)
        .single();

      if (!bundle) throw new Error('分扎不存在');

      // 创建工票
      const ticketNo = `TK${Date.now().toString(36).toUpperCase()}`;
      const { data: ticket } = await client
        .from('work_tickets')
        .insert({
          ticket_no: ticketNo,
          bundle_id: bundleId,
          order_id: bundle.order_id,
          process_id: processId,
          employee_id: employeeId,
          quantity: bundle.quantity,
          completed_quantity: 0,
          status: 'in_progress',
          start_time: new Date().toISOString(),
        })
        .select()
        .single();

      // 更新分扎状态
      await client
        .from('cutting_bundles')
        .update({
          status: 'in_progress',
          current_process: processId,
        })
        .eq('id', bundleId);

      return {
        success: true,
        message: '工序已开始',
        data: ticket,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '开始工序失败',
      };
    }
  }

  /**
   * 扫码完成工序
   */
  static async scanCompleteWork(data: {
    ticketId: string;
    completedQuantity: number;
    defectQuantity?: number;
  }): Promise<WorkflowResult> {
    try {
      const { ticketId, completedQuantity, defectQuantity = 0 } = data;

      // 获取工票信息
      const { data: ticket } = await client
        .from('work_tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (!ticket) throw new Error('工票不存在');

      // 更新工票
      await client
        .from('work_tickets')
        .update({
          completed_quantity: completedQuantity,
          defect_quantity: defectQuantity,
          status: 'completed',
          end_time: new Date().toISOString(),
        })
        .eq('id', ticketId);

      // 计算计件工资
      await SalaryWorkflow.recordPieceWork(ticket.employee_id, {
        processId: ticket.process_id,
        quantity: completedQuantity,
        ticketId,
      });

      // 如果有次品，创建质量记录
      if (defectQuantity > 0) {
        await QualityWorkflow.recordDefect({
          orderId: ticket.order_id,
          processId: ticket.process_id,
          quantity: defectQuantity,
          source: 'production',
        });
      }

      // 更新订单进度
      if (ticket.order_id) {
        await OrderWorkflow.updateOrderProgress(ticket.order_id);
      }

      return {
        success: true,
        message: '工序已完成',
        data: { completedQuantity, defectQuantity },
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '完成工序失败',
      };
    }
  }
}

// ============================================
// 4. 质量管理业务闭环
// ============================================

export class QualityWorkflow {
  
  /**
   * 创建出货检验(OQC)
   */
  static async createOQCInspection(orderId: string): Promise<void> {
    const inspectionNo = `OQC${Date.now().toString(36).toUpperCase()}`;
    
    await client.from('quality_inspections').insert({
      inspection_no: inspectionNo,
      order_id: orderId,
      inspection_type: 'OQC',
      status: 'pending',
      created_at: new Date().toISOString(),
    });
  }

  /**
   * 记录缺陷
   */
  static async recordDefect(data: {
    orderId: string;
    processId: string;
    quantity: number;
    source: string;
  }): Promise<void> {
    await client.from('quality_defects').insert({
      order_id: data.orderId,
      process_id: data.processId,
      quantity: data.quantity,
      source: data.source,
      status: 'open',
      created_at: new Date().toISOString(),
    });

    // 触发质量预警
    await AlertWorkflow.createAlert({
      type: 'quality',
      level: 'warning',
      title: '质量问题预警',
      content: `订单发现 ${data.quantity} 件次品，来源: ${data.source}`,
      relatedId: data.orderId,
      relatedType: 'production_order',
    });
  }

  /**
   * 质检通过
   */
  static async inspectionPass(inspectionId: string): Promise<WorkflowResult> {
    try {
      const { data: inspection } = await client
        .from('quality_inspections')
        .select('*')
        .eq('id', inspectionId)
        .single();

      if (!inspection) throw new Error('质检记录不存在');

      // 更新质检结果
      await client
        .from('quality_inspections')
        .update({
          result: 'pass',
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', inspectionId);

      // 如果是OQC，更新订单状态为待出货
      if (inspection.inspection_type === 'OQC' && inspection.order_id) {
        await client
          .from('production_orders')
          .update({ status: 'shipping' })
          .eq('id', inspection.order_id);
      }

      return {
        success: true,
        message: '质检通过',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '质检操作失败',
      };
    }
  }

  /**
   * 质检不通过 - 创建返工单
   */
  static async inspectionFail(inspectionId: string, defects: any[]): Promise<WorkflowResult> {
    try {
      const { data: inspection } = await client
        .from('quality_inspections')
        .select('*')
        .eq('id', inspectionId)
        .single();

      if (!inspection) throw new Error('质检记录不存在');

      // 更新质检结果
      await client
        .from('quality_inspections')
        .update({
          result: 'fail',
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', inspectionId);

      // 记录缺陷
      for (const defect of defects) {
        await this.recordDefect({
          orderId: inspection.order_id,
          processId: defect.processId,
          quantity: defect.quantity,
          source: 'inspection',
        });
      }

      // 创建返工单
      const reworkNo = `RW${Date.now().toString(36).toUpperCase()}`;
      await client.from('rework_orders').insert({
        rework_no: reworkNo,
        order_id: inspection.order_id,
        inspection_id: inspectionId,
        quantity: defects.reduce((sum, d) => sum + d.quantity, 0),
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      return {
        success: true,
        message: '质检不通过，已创建返工单',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '质检操作失败',
      };
    }
  }
}

// ============================================
// 5. 库存管理业务闭环
// ============================================

export class InventoryWorkflow {
  
  /**
   * 入库操作
   */
  static async inbound(data: {
    materialId: string;
    quantity: number;
    warehouse: string;
    location?: string;
    relatedType?: string;
    relatedId?: string;
    notes?: string;
  }): Promise<WorkflowResult> {
    try {
      const { materialId, quantity, warehouse, location, relatedType, relatedId, notes } = data;

      // 查询当前库存
      const { data: current } = await client
        .from('inventory')
        .select('*')
        .eq('material_id', materialId)
        .eq('warehouse', warehouse)
        .single();

      let beforeQty = 0;
      let afterQty = quantity;

      if (current) {
        beforeQty = Number(current.quantity);
        afterQty = beforeQty + quantity;

        await client
          .from('inventory')
          .update({
            quantity: afterQty,
            available_qty: afterQty - Number(current.locked_qty || 0),
            updated_at: new Date().toISOString(),
          })
          .eq('id', current.id);
      } else {
        await client.from('inventory').insert({
          material_id: materialId,
          warehouse,
          location,
          quantity: afterQty,
          locked_qty: 0,
          available_qty: afterQty,
        });
      }

      // 记录库存日志
      await client.from('inventory_logs').insert({
        material_id: materialId,
        type: 'in',
        quantity,
        before_qty: beforeQty,
        after_qty: afterQty,
        warehouse,
        location,
        related_type: relatedType,
        related_id: relatedId,
        notes,
        created_at: new Date().toISOString(),
      });

      // 检查是否需要预警
      await this.checkInventoryAlert(materialId, afterQty);

      return {
        success: true,
        message: '入库成功',
        data: { beforeQty, afterQty },
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '入库失败',
      };
    }
  }

  /**
   * 出库操作
   */
  static async outbound(data: {
    materialId: string;
    quantity: number;
    warehouse: string;
    location?: string;
    relatedType?: string;
    relatedId?: string;
    notes?: string;
  }): Promise<WorkflowResult> {
    try {
      const { materialId, quantity, warehouse, location, relatedType, relatedId, notes } = data;

      // 查询当前库存
      const { data: current } = await client
        .from('inventory')
        .select('*')
        .eq('material_id', materialId)
        .eq('warehouse', warehouse)
        .single();

      if (!current) {
        throw new Error('库存不足');
      }

      const beforeQty = Number(current.quantity);
      const afterQty = beforeQty - quantity;

      if (afterQty < 0) {
        throw new Error('库存不足');
      }

      // 更新库存
      await client
        .from('inventory')
        .update({
          quantity: afterQty,
          available_qty: afterQty - Number(current.locked_qty || 0),
          updated_at: new Date().toISOString(),
        })
        .eq('id', current.id);

      // 记录库存日志
      await client.from('inventory_logs').insert({
        material_id: materialId,
        type: 'out',
        quantity,
        before_qty: beforeQty,
        after_qty: afterQty,
        warehouse,
        location,
        related_type: relatedType,
        related_id: relatedId,
        notes,
        created_at: new Date().toISOString(),
      });

      // 检查是否需要预警
      await this.checkInventoryAlert(materialId, afterQty);

      return {
        success: true,
        message: '出库成功',
        data: { beforeQty, afterQty },
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '出库失败',
      };
    }
  }

  /**
   * 检查库存预警
   */
  private static async checkInventoryAlert(materialId: string, currentQty: number): Promise<void> {
    // 获取物料安全库存
    const { data: material } = await client
      .from('materials')
      .select('code, name, safety_stock')
      .eq('id', materialId)
      .single();

    if (material && material.safety_stock) {
      if (currentQty <= material.safety_stock) {
        const level = currentQty <= material.safety_stock * 0.3 ? 'critical' : 'warning';
        
        await AlertWorkflow.createAlert({
          type: 'inventory',
          level,
          title: '库存预警',
          content: `物料 ${material.name}(${material.code}) 库存不足，当前库存: ${currentQty}，安全库存: ${material.safety_stock}`,
          relatedId: materialId,
          relatedType: 'material',
        });
      }
    }
  }
}

// ============================================
// 6. 外发管理业务闭环
// ============================================

export class OutsourceWorkflow {
  
  /**
   * 创建外发订单
   */
  static async createOutsource(data: any): Promise<WorkflowResult> {
    try {
      const outsourceNo = `WF${Date.now().toString(36).toUpperCase()}`;

      const { data: outsource, error } = await client
        .from('outsource_orders')
        .insert({
          ...data,
          outsource_no: outsourceNo,
          status: 'pending',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // 创建外发进度记录
      await this.createProgressRecords(outsource.id);

      return {
        success: true,
        message: '外发订单创建成功',
        data: outsource,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '创建外发订单失败',
      };
    }
  }

  /**
   * 外发发出
   */
  static async sendOut(outsourceId: string): Promise<WorkflowResult> {
    try {
      await client
        .from('outsource_orders')
        .update({
          status: 'in_progress',
          send_date: new Date().toISOString(),
        })
        .eq('id', outsourceId);

      // 更新外发进度
      await this.updateProgress(outsourceId, 'production_prep', 'completed');

      return {
        success: true,
        message: '外发已发出',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '外发发出失败',
      };
    }
  }

  /**
   * 外发回收
   */
  static async receiveBack(outsourceId: string, returnQty: number, defectQty: number): Promise<WorkflowResult> {
    try {
      const { data: outsource } = await client
        .from('outsource_orders')
        .select('*')
        .eq('id', outsourceId)
        .single();

      if (!outsource) throw new Error('外发订单不存在');

      // 更新外发订单
      await client
        .from('outsource_orders')
        .update({
          status: returnQty < outsource.quantity ? 'partial_return' : 'returned',
          return_quantity: returnQty,
          defect_quantity: defectQty,
          return_date: new Date().toISOString(),
        })
        .eq('id', outsourceId);

      // 如果有次品，记录质量问题
      if (defectQty > 0) {
        await QualityWorkflow.recordDefect({
          orderId: outsource.production_order_id,
          processId: 'outsource',
          quantity: defectQty,
          source: 'outsource',
        });
      }

      // 更新订单进度
      if (outsource.production_order_id) {
        await OrderWorkflow.updateOrderProgress(outsource.production_order_id);
      }

      return {
        success: true,
        message: '外发已回收',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '外发回收失败',
      };
    }
  }

  /**
   * 创建进度记录
   */
  private static async createProgressRecords(outsourceId: string): Promise<void> {
    const stages = [
      { stage: 'production_prep', stage_name: '生产准备' },
      { stage: 'cutting', stage_name: '裁床' },
      { stage: 'craft', stage_name: '二次工艺' },
      { stage: 'workshop', stage_name: '车间生产' },
      { stage: 'finishing', stage_name: '尾部处理' },
      { stage: 'shipping', stage_name: '出货' },
    ];

    await client.from('outsource_progress').insert(
      stages.map(s => ({
        outsource_order_id: outsourceId,
        stage: s.stage,
        stage_name: s.stage_name,
        status: 'pending',
      }))
    );
  }

  /**
   * 更新进度
   */
  private static async updateProgress(outsourceId: string, stage: string, status: string): Promise<void> {
    await client
      .from('outsource_progress')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('outsource_order_id', outsourceId)
      .eq('stage', stage);
  }
}

// ============================================
// 7. 财务管理业务闭环
// ============================================

export class FinanceWorkflow {
  
  /**
   * 生成应收账款
   */
  static async generateReceivable(order: any): Promise<void> {
    const billNo = `AR${Date.now().toString(36).toUpperCase()}`;

    await client.from('bills').insert({
      bill_no: billNo,
      bill_type: 'receivable',
      category: '销售款',
      related_id: order.id,
      related_no: order.order_no,
      customer_id: order.customer_id,
      amount: order.total_amount,
      paid_amount: 0,
      due_date: order.delivery_date,
      status: 'pending',
      created_at: new Date().toISOString(),
    });
  }

  /**
   * 生成应付账款
   */
  static async generatePayable(data: {
    supplierId: string;
    relatedType: string;
    relatedId: string;
    relatedNo: string;
    amount: number;
    dueDate: string;
  }): Promise<void> {
    const billNo = `AP${Date.now().toString(36).toUpperCase()}`;

    await client.from('bills').insert({
      bill_no: billNo,
      bill_type: 'payable',
      category: data.relatedType === 'purchase' ? '采购款' : '外发加工费',
      related_id: data.relatedId,
      related_no: data.relatedNo,
      supplier_id: data.supplierId,
      amount: data.amount,
      paid_amount: 0,
      due_date: data.dueDate,
      status: 'pending',
      created_at: new Date().toISOString(),
    });
  }

  /**
   * 收款确认
   */
  static async confirmReceivable(billId: string, paidAmount: number): Promise<WorkflowResult> {
    try {
      const { data: bill } = await client
        .from('bills')
        .select('*')
        .eq('id', billId)
        .single();

      if (!bill) throw new Error('账单不存在');

      const newPaidAmount = Number(bill.paid_amount) + paidAmount;
      const status = newPaidAmount >= bill.amount ? 'paid' : 'partial';

      await client
        .from('bills')
        .update({
          paid_amount: newPaidAmount,
          status,
          paid_at: status === 'paid' ? new Date().toISOString() : null,
        })
        .eq('id', billId);

      return {
        success: true,
        message: status === 'paid' ? '收款完成' : '部分收款',
        data: { paidAmount: newPaidAmount, totalAmount: bill.amount },
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '收款确认失败',
      };
    }
  }

  /**
   * 付款确认
   */
  static async confirmPayable(billId: string, paidAmount: number): Promise<WorkflowResult> {
    try {
      const { data: bill } = await client
        .from('bills')
        .select('*')
        .eq('id', billId)
        .single();

      if (!bill) throw new Error('账单不存在');

      const newPaidAmount = Number(bill.paid_amount) + paidAmount;
      const status = newPaidAmount >= bill.amount ? 'paid' : 'partial';

      await client
        .from('bills')
        .update({
          paid_amount: newPaidAmount,
          status,
          paid_at: status === 'paid' ? new Date().toISOString() : null,
        })
        .eq('id', billId);

      return {
        success: true,
        message: status === 'paid' ? '付款完成' : '部分付款',
        data: { paidAmount: newPaidAmount, totalAmount: bill.amount },
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '付款确认失败',
      };
    }
  }
}

// ============================================
// 8. 预警系统闭环
// ============================================

export class AlertWorkflow {
  
  /**
   * 创建预警
   */
  static async createAlert(data: {
    type: string;
    level: AlertLevel;
    title: string;
    content: string;
    relatedId?: string;
    relatedType?: string;
  }): Promise<void> {
    await client.from('alerts').insert({
      alert_type: data.type,
      alert_level: data.level,
      title: data.title,
      content: data.content,
      related_id: data.relatedId,
      related_type: data.relatedType,
      status: 'active',
      created_at: new Date().toISOString(),
    });
  }

  /**
   * 处理预警
   */
  static async handleAlert(alertId: string, handler: string, action: string): Promise<WorkflowResult> {
    try {
      await client
        .from('alerts')
        .update({
          status: 'handled',
          handled_by: handler,
          handled_at: new Date().toISOString(),
          handle_action: action,
        })
        .eq('id', alertId);

      return {
        success: true,
        message: '预警已处理',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '处理预警失败',
      };
    }
  }

  /**
   * 自动检测预警
   */
  static async autoDetect(): Promise<AlertInfo[]> {
    const alerts: AlertInfo[] = [];

    // 1. 检测交期预警
    const { data: urgentOrders } = await client
      .from('production_orders')
      .select('id, order_no, delivery_date, status')
      .in('status', ['confirmed', 'in_progress', 'quality_check'])
      .lte('delivery_date', new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString());

    for (const order of urgentOrders || []) {
      const daysUntilDelivery = Math.ceil(
        (new Date(order.delivery_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilDelivery <= 0) {
        alerts.push({
          type: 'delivery',
          level: 'critical',
          title: '订单逾期预警',
          content: `订单 ${order.order_no} 已逾期`,
          relatedId: order.id,
          relatedType: 'production_order',
        });
      } else if (daysUntilDelivery <= 3) {
        alerts.push({
          type: 'delivery',
          level: 'warning',
          title: '交期紧迫预警',
          content: `订单 ${order.order_no} 将在 ${daysUntilDelivery} 天后到期`,
          relatedId: order.id,
          relatedType: 'production_order',
        });
      }
    }

    // 2. 检测库存预警
    const { data: lowStockMaterials } = await client
      .from('materials')
      .select('id, code, name, current_stock, safety_stock')
      .not('safety_stock', 'is', null);

    for (const material of lowStockMaterials || []) {
      if (material.current_stock <= material.safety_stock) {
        alerts.push({
          type: 'inventory',
          level: material.current_stock <= material.safety_stock * 0.3 ? 'critical' : 'warning',
          title: '库存不足预警',
          content: `物料 ${material.name}(${material.code}) 库存不足，当前: ${material.current_stock}，安全库存: ${material.safety_stock}`,
          relatedId: material.id,
          relatedType: 'material',
        });
      }
    }

    // 3. 检测质量问题
    const { data: openDefects } = await client
      .from('quality_defects')
      .select('id, order_id, quantity, severity')
      .eq('status', 'open')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const criticalDefects = openDefects?.filter(d => d.severity === 'critical') || [];
    if (criticalDefects.length > 0) {
      alerts.push({
        type: 'quality',
        level: 'critical',
        title: '严重质量问题预警',
        content: `发现 ${criticalDefects.length} 个严重质量问题待处理`,
        relatedType: 'quality',
      });
    }

    // 创建预警记录
    for (const alert of alerts) {
      await this.createAlert(alert);
    }

    return alerts;
  }
}

// ============================================
// 9. 通知系统闭环
// ============================================

export class NotificationWorkflow {
  
  /**
   * 发送通知
   */
  static async sendNotification(data: {
    type: string;
    level: string;
    title: string;
    content: string;
    relatedOrder?: string;
    recipients?: string[];
  }): Promise<void> {
    // 根据接收者角色获取用户
    let userIds: string[] = [];

    if (data.recipients && data.recipients.length > 0) {
      const { data: users } = await client
        .from('users')
        .select('id')
        .in('role_id', data.recipients);
      
      userIds = users?.map(u => u.id) || [];
    }

    // 如果没有指定接收者，发送给所有管理员
    if (userIds.length === 0) {
      const { data: admins } = await client
        .from('users')
        .select('id')
        .eq('role_id', 'admin');
      
      userIds = admins?.map(u => u.id) || [];
    }

    // 创建通知记录
    const notifications = userIds.map(userId => ({
      type: data.type,
      level: data.level,
      title: data.title,
      content: data.content,
      related_order: data.relatedOrder,
      recipient: userId,
      status: 'unread',
      created_at: new Date().toISOString(),
    }));

    await client.from('notifications').insert(notifications);
  }

  /**
   * 标记通知已读
   */
  static async markAsRead(notificationId: string): Promise<void> {
    await client
      .from('notifications')
      .update({
        status: 'read',
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId);
  }
}

// ============================================
// 10. 工资管理闭环
// ============================================

export class SalaryWorkflow {
  
  /**
   * 记录计件工作
   */
  static async recordPieceWork(employeeId: string, data: {
    processId: string;
    quantity: number;
    ticketId: string;
  }): Promise<void> {
    // 获取工序单价
    const { data: process } = await client
      .from('processes')
      .select('standard_rate')
      .eq('id', data.processId)
      .single();

    if (!process) return;

    const amount = (process.standard_rate || 0) * data.quantity;

    // 获取员工计件系数
    const { data: employee } = await client
      .from('employees')
      .select('piece_rate')
      .eq('id', employeeId)
      .single();

    const pieceRate = employee?.piece_rate || 1;
    const finalAmount = amount * pieceRate;

    // 记录计件工资
    await client.from('piece_wage_records').insert({
      employee_id: employeeId,
      ticket_id: data.ticketId,
      process_id: data.processId,
      quantity: data.quantity,
      unit_price: process.standard_rate,
      piece_rate: pieceRate,
      amount: finalAmount,
      created_at: new Date().toISOString(),
    });
  }

  /**
   * 生成月度工资
   */
  static async generateMonthlySalary(year: number, month: number): Promise<WorkflowResult> {
    try {
      const { data: employees } = await client
        .from('employees')
        .select('*')
        .eq('status', 'active');

      if (!employees) {
        return { success: true, message: '无员工数据' };
      }

      for (const employee of employees) {
        // 获取计件工资总额
        const { data: pieceRecords } = await client
          .from('piece_wage_records')
          .select('amount')
          .eq('employee_id', employee.id)
          .gte('created_at', `${year}-${String(month).padStart(2, '0')}-01`)
          .lte('created_at', `${year}-${String(month).padStart(2, '0')}-31`);

        const pieceSalary = pieceRecords?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;

        // 获取加班工资
        const { data: attendance } = await client
          .from('attendance')
          .select('overtime_hours')
          .eq('employee_id', employee.id)
          .gte('attendance_date', `${year}-${String(month).padStart(2, '0')}-01`)
          .lte('attendance_date', `${year}-${String(month).padStart(2, '0')}-31`);

        const overtimeHours = attendance?.reduce((sum, a) => sum + (a.overtime_hours || 0), 0) || 0;
        const overtimeRate = Number(employee.base_salary) / 174; // 月工作小时数
        const overtimeSalary = overtimeHours * overtimeRate * 1.5;

        // 计算总工资
        const totalSalary = Number(employee.base_salary) + pieceSalary + overtimeSalary;

        // 创建工资记录
        await client.from('salary_records').insert({
          employee_id: employee.id,
          employee_no: employee.employee_no,
          employee_name: employee.name,
          year,
          month,
          base_salary: employee.base_salary,
          piece_salary: pieceSalary,
          overtime_salary: overtimeSalary,
          bonus: 0,
          deduction: 0,
          total_salary: totalSalary,
          work_days: attendance?.length || 0,
          overtime_hours: overtimeHours,
          piece_count: pieceRecords?.length || 0,
          status: 'pending',
          created_at: new Date().toISOString(),
        });
      }

      return {
        success: true,
        message: `已生成 ${year}年${month}月 工资表`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '生成工资失败',
      };
    }
  }
}

// ============================================
// 导出所有工作流服务
// ============================================

export const WorkflowService = {
  Order: OrderWorkflow,
  Cutting: CuttingWorkflow,
  Production: ProductionWorkflow,
  Quality: QualityWorkflow,
  Inventory: InventoryWorkflow,
  Outsource: OutsourceWorkflow,
  Finance: FinanceWorkflow,
  Alert: AlertWorkflow,
  Notification: NotificationWorkflow,
  Salary: SalaryWorkflow,
};
