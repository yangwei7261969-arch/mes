import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

// 获取排产相关数据
async function getScheduleContext(): Promise<string> {
  const client = getSupabaseClient();
  const context: string[] = [];

  try {
    // 获取待排产和进行中的订单
    const { data: orders } = await client
      .from('production_orders')
      .select('id, order_no, status, quantity, completed_quantity, plan_start_date, plan_end_date, priority, style_name, color, size')
      .in('status', ['pending', 'confirmed', 'in_progress'])
      .order('priority', { ascending: false });

    if (orders && orders.length > 0) {
      context.push(`【待排产订单】`);
      orders.forEach((order, index) => {
        context.push(`${index + 1}. ${order.order_no}: ${order.style_name || '未知款号'} ${order.color || ''} ${order.size || ''}
   - 数量：${order.quantity || 0} 件，已完成：${order.completed_quantity || 0} 件
   - 计划周期：${order.plan_start_date || '未设定'} 至 ${order.plan_end_date || '未设定'}
   - 优先级：${order.priority || '普通'}
   - 状态：${order.status}`);
      });
    }

    // 获取员工产能数据
    const { data: employees } = await client
      .from('employees')
      .select('id, name, department, status')
      .eq('status', 'active');

    if (employees && employees.length > 0) {
      context.push(`\n【可用人力资源】`);
      context.push(`总在职员工：${employees.length} 人`);
      
      const deptCount: Record<string, number> = {};
      employees.forEach(e => {
        const dept = e.department || '未分配';
        deptCount[dept] = (deptCount[dept] || 0) + 1;
      });
      
      Object.entries(deptCount).forEach(([dept, count]) => {
        context.push(`- ${dept}: ${count} 人`);
      });
    }

    // 获取工序数据
    const { data: processes } = await client
      .from('processes')
      .select('id, name, category, standard_time')
      .limit(20);

    if (processes && processes.length > 0) {
      context.push(`\n【工序信息】`);
      context.push(`总工序数：${processes.length} 个`);
    }

    // 获取设备信息（如果有）
    const { data: machines } = await client
      .from('machines')
      .select('id, name, status')
      .limit(10);

    if (machines && machines.length > 0) {
      const activeMachines = machines.filter(m => m.status === 'active').length;
      context.push(`\n【设备资源】`);
      context.push(`总设备：${machines.length} 台，可用：${activeMachines} 台`);
    }

  } catch (error) {
    console.error('Error getting schedule context:', error);
  }

  return context.join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const { stream = true } = await request.json();

    // 获取排产数据上下文
    const scheduleContext = await getScheduleContext();

    const systemPrompt = `你是一位专业的服装生产排产师，负责制定最优的生产排程计划。

你的任务：
1. 分析当前待排产订单的优先级和紧急程度
2. 根据订单交付日期和当前产能，给出排产建议
3. 识别潜在的排产冲突和瓶颈
4. 提供具体可执行的排产方案

输出格式要求：
- 使用表格展示排产计划
- 标注每个订单的建议开始时间和完成时间
- 列出风险点和注意事项
- 给出资源分配建议`;

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: `当前排产数据：\n${scheduleContext}` },
      { role: 'user', content: '请根据以上数据，生成智能排产建议，包括：1) 订单优先级排序 2) 排产时间建议 3) 资源分配方案 4) 风险预警' },
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
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '生成排产建议时出错' })}\n\n`));
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
    console.error('Smart schedule error:', error);
    return new Response(JSON.stringify({ 
      error: '生成排产建议失败',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
