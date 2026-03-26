import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// AI智能分析API - 流式输出
export async function POST(request: NextRequest) {
  try {
    const { question, context } = await request.json();
    const client = getSupabaseClient();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    // 获取当前生产数据作为上下文
    const [orders, bundles, crafts, outsources] = await Promise.all([
      client.from('production_orders').select('*').limit(50),
      client.from('cutting_bundles').select('*').limit(50),
      client.from('craft_processes').select('*').limit(50),
      client.from('cut_piece_outsources').select('*').limit(50),
    ]);

    const systemPrompt = `你是一个服装生产管理系统的AI助手，具备以下能力：

1. **生产进度分析**：分析订单完成情况、生产瓶颈、延期风险
2. **智能预警**：识别异常情况，如超期订单、库存不足、外发延误
3. **数据洞察**：提供生产效率分析、成本优化建议
4. **问题诊断**：帮助用户快速定位生产问题
5. **决策支持**：提供生产排程建议、资源调配方案

当前系统数据概览：
- 生产订单：${orders.data?.length || 0} 条
- 裁床分扎：${bundles.data?.length || 0} 条
- 二次工艺：${crafts.data?.length || 0} 条
- 外发记录：${outsources.data?.length || 0} 条

回答要求：
1. 简洁明了，突出重点
2. 提供具体数据支撑
3. 给出可操作建议
4. 使用Markdown格式（列表、加粗、表格等）
5. 如果需要数据，告诉用户可以导出Excel查看详细数据`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: question || '请分析当前生产情况' },
    ];

    // 使用流式输出
    const encoder = new TextEncoder();
    let isClosed = false;
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const llmStream = llmClient.stream(messages, {
            temperature: 0.7,
            model: 'doubao-seed-1-6-lite-251015',
          });

          for await (const chunk of llmStream) {
            if (isClosed) break;
            if (chunk.content) {
              const text = chunk.content.toString();
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
            }
          }

          if (!isClosed) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            isClosed = true;
          }
        } catch (error) {
          console.error('AI Stream error:', error);
          if (!isClosed) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'AI分析出错，请重试' })}\n\n`));
            controller.close();
            isClosed = true;
          }
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('AI Analysis error:', error);
    return NextResponse.json({ error: 'AI分析失败' }, { status: 500 });
  }
}
