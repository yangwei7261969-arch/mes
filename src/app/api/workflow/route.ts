import { NextRequest, NextResponse } from 'next/server';
import {
  WorkflowService,
  OrderWorkflow,
  CuttingWorkflow,
  ProductionWorkflow,
  QualityWorkflow,
  InventoryWorkflow,
  OutsourceWorkflow,
  FinanceWorkflow,
  AlertWorkflow,
  NotificationWorkflow,
  SalaryWorkflow,
} from '@/lib/business/workflow-service';

/**
 * 统一业务逻辑API
 * 
 * 提供所有业务流程闭环的统一入口
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'status';

  try {
    switch (action) {
      case 'status':
        return getWorkflowStatus();
      
      case 'auto-detect':
        return await autoDetectAlerts();
      
      case 'order-progress':
        const orderId = searchParams.get('orderId');
        if (!orderId) {
          return NextResponse.json({ error: '缺少订单ID' }, { status: 400 });
        }
        return NextResponse.json(await OrderWorkflow.updateOrderProgress(orderId));
      
      default:
        return NextResponse.json({ error: '未知操作' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Workflow API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { module, action, data } = body;

    if (!module || !action) {
      return NextResponse.json({ 
        error: '缺少必要参数: module, action' 
      }, { status: 400 });
    }

    let result;

    switch (module) {
      // 订单管理
      case 'order':
        result = await handleOrderAction(action, data);
        break;
      
      // 裁床管理
      case 'cutting':
        result = await handleCuttingAction(action, data);
        break;
      
      // 生产管理
      case 'production':
        result = await handleProductionAction(action, data);
        break;
      
      // 质量管理
      case 'quality':
        result = await handleQualityAction(action, data);
        break;
      
      // 库存管理
      case 'inventory':
        result = await handleInventoryAction(action, data);
        break;
      
      // 外发管理
      case 'outsource':
        result = await handleOutsourceAction(action, data);
        break;
      
      // 财务管理
      case 'finance':
        result = await handleFinanceAction(action, data);
        break;
      
      // 预警管理
      case 'alert':
        result = await handleAlertAction(action, data);
        break;
      
      // 通知管理
      case 'notification':
        result = await handleNotificationAction(action, data);
        break;
      
      // 工资管理
      case 'salary':
        result = await handleSalaryAction(action, data);
        break;
      
      default:
        return NextResponse.json({ error: '未知模块' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Workflow API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// ============================================
// 订单管理处理器
// ============================================

async function handleOrderAction(action: string, data: any) {
  switch (action) {
    case 'create':
      return await OrderWorkflow.createOrder(data);
    
    case 'confirm':
      return await OrderWorkflow.confirmOrder(data.orderId, data.confirmedBy);
    
    case 'start-production':
      return await OrderWorkflow.startProduction(data.orderId);
    
    case 'update-progress':
      return await OrderWorkflow.updateOrderProgress(data.orderId);
    
    case 'complete':
      return await OrderWorkflow.completeOrder(data.orderId);
    
    case 'cancel':
      return await OrderWorkflow.cancelOrder(data.orderId, data.reason, data.cancelledBy);
    
    default:
      return { success: false, message: '未知订单操作' };
  }
}

// ============================================
// 裁床管理处理器
// ============================================

async function handleCuttingAction(action: string, data: any) {
  switch (action) {
    case 'create':
      return await CuttingWorkflow.createCuttingOrder(data);
    
    case 'complete':
      return await CuttingWorkflow.completeCutting(data.cuttingId, data.sizeBreakdown);
    
    default:
      return { success: false, message: '未知裁床操作' };
  }
}

// ============================================
// 生产管理处理器
// ============================================

async function handleProductionAction(action: string, data: any) {
  switch (action) {
    case 'scan-start':
      return await ProductionWorkflow.scanStartWork(data);
    
    case 'scan-complete':
      return await ProductionWorkflow.scanCompleteWork(data);
    
    default:
      return { success: false, message: '未知生产操作' };
  }
}

// ============================================
// 质量管理处理器
// ============================================

async function handleQualityAction(action: string, data: any) {
  switch (action) {
    case 'inspection-pass':
      return await QualityWorkflow.inspectionPass(data.inspectionId);
    
    case 'inspection-fail':
      return await QualityWorkflow.inspectionFail(data.inspectionId, data.defects);
    
    case 'record-defect':
      return await QualityWorkflow.recordDefect(data);
    
    default:
      return { success: false, message: '未知质量操作' };
  }
}

// ============================================
// 库存管理处理器
// ============================================

async function handleInventoryAction(action: string, data: any) {
  switch (action) {
    case 'inbound':
      return await InventoryWorkflow.inbound(data);
    
    case 'outbound':
      return await InventoryWorkflow.outbound(data);
    
    default:
      return { success: false, message: '未知库存操作' };
  }
}

// ============================================
// 外发管理处理器
// ============================================

async function handleOutsourceAction(action: string, data: any) {
  switch (action) {
    case 'create':
      return await OutsourceWorkflow.createOutsource(data);
    
    case 'send':
      return await OutsourceWorkflow.sendOut(data.outsourceId);
    
    case 'receive':
      return await OutsourceWorkflow.receiveBack(
        data.outsourceId, 
        data.returnQty, 
        data.defectQty
      );
    
    default:
      return { success: false, message: '未知外发操作' };
  }
}

// ============================================
// 财务管理处理器
// ============================================

async function handleFinanceAction(action: string, data: any) {
  switch (action) {
    case 'confirm-receivable':
      return await FinanceWorkflow.confirmReceivable(data.billId, data.paidAmount);
    
    case 'confirm-payable':
      return await FinanceWorkflow.confirmPayable(data.billId, data.paidAmount);
    
    case 'generate-payable':
      return await FinanceWorkflow.generatePayable(data);
    
    default:
      return { success: false, message: '未知财务操作' };
  }
}

// ============================================
// 预警管理处理器
// ============================================

async function handleAlertAction(action: string, data: any) {
  switch (action) {
    case 'create':
      await AlertWorkflow.createAlert(data);
      return { success: true, message: '预警已创建' };
    
    case 'handle':
      return await AlertWorkflow.handleAlert(data.alertId, data.handler, data.action);
    
    default:
      return { success: false, message: '未知预警操作' };
  }
}

// ============================================
// 通知管理处理器
// ============================================

async function handleNotificationAction(action: string, data: any) {
  switch (action) {
    case 'send':
      await NotificationWorkflow.sendNotification(data);
      return { success: true, message: '通知已发送' };
    
    case 'mark-read':
      await NotificationWorkflow.markAsRead(data.notificationId);
      return { success: true, message: '通知已标记已读' };
    
    default:
      return { success: false, message: '未知通知操作' };
  }
}

// ============================================
// 工资管理处理器
// ============================================

async function handleSalaryAction(action: string, data: any) {
  switch (action) {
    case 'generate-monthly':
      return await SalaryWorkflow.generateMonthlySalary(data.year, data.month);
    
    default:
      return { success: false, message: '未知工资操作' };
  }
}

// ============================================
// 辅助函数
// ============================================

function getWorkflowStatus() {
  return NextResponse.json({
    success: true,
    data: {
      modules: [
        {
          name: 'order',
          description: '订单管理闭环',
          actions: ['create', 'confirm', 'start-production', 'update-progress', 'complete', 'cancel'],
        },
        {
          name: 'cutting',
          description: '裁床管理闭环',
          actions: ['create', 'complete'],
        },
        {
          name: 'production',
          description: '生产管理闭环',
          actions: ['scan-start', 'scan-complete'],
        },
        {
          name: 'quality',
          description: '质量管理闭环',
          actions: ['inspection-pass', 'inspection-fail', 'record-defect'],
        },
        {
          name: 'inventory',
          description: '库存管理闭环',
          actions: ['inbound', 'outbound'],
        },
        {
          name: 'outsource',
          description: '外发管理闭环',
          actions: ['create', 'send', 'receive'],
        },
        {
          name: 'finance',
          description: '财务管理闭环',
          actions: ['confirm-receivable', 'confirm-payable', 'generate-payable'],
        },
        {
          name: 'alert',
          description: '预警系统闭环',
          actions: ['create', 'handle'],
        },
        {
          name: 'notification',
          description: '通知系统闭环',
          actions: ['send', 'mark-read'],
        },
        {
          name: 'salary',
          description: '工资管理闭环',
          actions: ['generate-monthly'],
        },
      ],
      version: '1.0.0',
    },
  });
}

async function autoDetectAlerts() {
  const alerts = await AlertWorkflow.autoDetect();
  return NextResponse.json({
    success: true,
    data: {
      detected: alerts.length,
      alerts,
    },
  });
}
