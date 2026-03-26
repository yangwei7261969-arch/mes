import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

// 获取预警相关数据
async function getAlertContext(): Promise<string> {
  const client = getSupabaseClient();
  const alerts: string[] = [];
  const today = new Date().toISOString().split('T')[0];
  const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    // 1. 延迟订单预警
    const { data: delayedOrders } = await client
      .from('production_orders')
      .select('id, order_no, status, plan_end_date, quantity, completed_quantity, style_name')
      .lt('plan_end_date', today)
      .not('status', 'eq', 'completed');

    if (delayedOrders && delayedOrders.length > 0) {
      alerts.push(`【🚨 延迟订单预警】共 ${delayedOrders.length} 个订单已超期：`);
      delayedOrders.slice(0, 5).forEach(o => {
        const completionRate = o.quantity > 0 ? ((o.completed_quantity || 0) / o.quantity * 100).toFixed(1) : 0;
        alerts.push(`- ${o.order_no}: ${o.style_name || '未知款号'}, 计划完成日 ${o.plan_end_date}, 完成率 ${completionRate}%`);
      });
    }

    // 2. 即将到期订单
    const { data: upcomingOrders } = await client
      .from('production_orders')
      .select('id, order_no, status, plan_end_date, quantity, completed_quantity, style_name')
      .gte('plan_end_date', today)
      .lte('plan_end_date', threeDaysLater)
      .not('status', 'eq', 'completed');

    if (upcomingOrders && upcomingOrders.length > 0) {
      alerts.push(`\n【⚠️ 即将到期订单】共 ${upcomingOrders.length} 个订单3天内到期：`);
      upcomingOrders.slice(0, 5).forEach(o => {
        const remaining = (o.quantity || 0) - (o.completed_quantity || 0);
        alerts.push(`- ${o.order_no}: ${o.style_name || '未知款号'}, 剩余 ${remaining} 件, 到期日 ${o.plan_end_date}`);
      });
    }

    // 3. 库存预警
    const { data: inventory } = await client
      .from('inventory')
      .select('id, material_name, quantity, safety_stock, unit');

    if (inventory && inventory.length > 0) {
      const lowStock = inventory.filter(i => 
        i.quantity <= (i.safety_stock || 0)
      );
      
      if (lowStock.length > 0) {
        alerts.push(`\n【📦 库存不足预警】共 ${lowStock.length} 种物料低于安全库存：`);
        lowStock.slice(0, 5).forEach(i => {
          alerts.push(`- ${i.material_name || '未知物料'}: 当前 ${i.quantity || 0} ${i.unit || '件'}, 安全库存 ${i.safety_stock || 0}`);
        });
      }
    }

    // 4. 长期未完成订单
    const { data: longRunningOrders } = await client
      .from('production_orders')
      .select('id, order_no, status, created_at, quantity, completed_quantity, style_name')
      .in('status', ['confirmed', 'in_progress'])
      .lt('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

    if (longRunningOrders && longRunningOrders.length > 0) {
      alerts.push(`\n【⏰ 长期未完成订单】共 ${longRunningOrders.length} 个订单超过14天未完成：`);
      longRunningOrders.slice(0, 5).forEach(o => {
        const days = Math.floor((Date.now() - new Date(o.created_at).getTime()) / (24 * 60 * 60 * 1000));
        alerts.push(`- ${o.order_no}: 已运行 ${days} 天, 完成率 ${((o.completed_quantity || 0) / (o.quantity || 1) * 100).toFixed(1)}%`);
      });
    }

    // 5. 待处理订单积压
    const { data: pendingOrders } = await client
      .from('production_orders')
      .select('id, order_no, created_at, quantity, style_name')
      .eq('status', 'pending');

    if (pendingOrders && pendingOrders.length > 0) {
      alerts.push(`\n【📋 待处理订单积压】共 ${pendingOrders.length} 个订单待安排生产：`);
      pendingOrders.slice(0, 5).forEach(o => {
        const waitingDays = Math.floor((Date.now() - new Date(o.created_at).getTime()) / (24 * 60 * 60 * 1000));
        alerts.push(`- ${o.order_no}: ${o.style_name || '未知款号'}, 等待 ${waitingDays} 天, 数量 ${o.quantity}`);
      });
    }

    // 6. 财务预警
    const { data: bills } = await client
      .from('bills')
      .select('id, type, amount, bill_date, category');

    if (bills && bills.length > 0) {
      const income = bills.filter(b => b.type === 'income').reduce((sum, b) => sum + (b.amount || 0), 0);
      const expense = bills.filter(b => b.type === 'expense').reduce((sum, b) => sum + (b.amount || 0), 0);
      const profit = income - expense;

      if (profit < 0) {
        alerts.push(`\n【💰 财务预警】当前处于亏损状态：`);
        alerts.push(`- 总收入：¥${income.toLocaleString()}`);
        alerts.push(`- 总支出：¥${expense.toLocaleString()}`);
        alerts.push(`- 净利润：¥${profit.toLocaleString()}（亏损）`);
      }
    }

    if (alerts.length === 0) {
      alerts.push('【✅ 系统状态良好】暂无发现需要预警的异常情况。');
    }

  } catch (error) {
    console.error('Error getting alert context:', error);
    alerts.push('获取预警数据时出现错误');
  }

  return alerts.join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const { stream = true } = await request.json();

    // 获取预警数据上下文
    const alertContext = await getAlertContext();

    const systemPrompt = `你是一位专业的生产管理预警分析师，负责分析生产系统中的异常和风险。

你的任务：
1. 分析预警数据的严重程度和影响范围
2. 给出具体的问题根因分析
3. 提供可操作的解决方案
4. 按优先级排序处理建议

输出格式要求：
- 使用清晰的分类展示各类预警
- 对每个问题给出影响评估（高/中/低）
- 提供具体的解决步骤
- 标注处理优先级和预计解决时间`;

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: `当前预警数据：\n${alertContext}` },
      { role: 'user', content: '请分析以上预警数据，给出：1) 风险等级评估 2) 问题根因分析 3) 解决方案建议 4) 处理优先级排序' },
    ];

    // 初始化LLM客户端
    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const llmClient = new LLMClient(config, customHeaders);

    if (stream) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            const llmStream = llmClient.stream(messages, {
              model: 'doubao-seed-1-6-251015',
              temperature: 0.7,
            });

            for await (const chunk of llmStream) {
              if (chunk.content) {
                const text = chunk.content.toString();
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
              }
            }

            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            console.error('Stream error:', error);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '生成预警分析时出错' })}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      const response = await llmClient.invoke(messages, {
        model: 'doubao-seed-1-6-251015',
        temperature: 0.7,
      });

      return new Response(JSON.stringify({ content: response.content }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Smart alert error:', error);
    return new Response(JSON.stringify({ 
      error: '生成预警分析失败',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
