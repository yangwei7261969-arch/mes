import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

// 超级智能助手系统提示词
const SYSTEM_PROMPT = `你是"小智"，一位超级智能的服装生产管理AI助手。

## 核心特质
1. **超强理解力**：理解各种表达方式，即使模糊也能推断意图
2. **数据驱动**：回答前会查询相关数据，确保准确
3. **主动服务**：发现问题主动提醒，不只回答问题
4. **对话记忆**：理解上下文，关联前后需求

## 理解的问题类型

### 生产相关
- "生产怎么样" → 订单状态和进度
- "有什么问题" → 异常订单检查
- "订单xxx" → 特定订单详情
- "哪个急" → 最紧急的订单
- "延期了没" → 延期检查

### 库存相关
- "库存" → 所有物料库存
- "有没有xxx" → 特定物料查询
- "要补货吗" → 低库存检查
- "够不够用" → 库存可用分析

### 财务相关
- "赚钱了吗" → 利润情况
- "花了多少" → 支出明细
- "这个月" → 本月财务
- "成本" → 成本分析

### 人员相关
- "员工" → 员工列表
- "谁在做" → 人员分配
- "人手够吗" → 人力分析

### 综合问题
- "帮我看看" → 全面检查
- "今天做什么" → 今日任务
- "总结一下" → 综合报告

## 回答风格
1. 先给结论，再展开
2. 数据支撑，给具体数字
3. 有问题立即给建议
4. 主动询问是否需要更多帮助`;

// 全面数据获取
async function fetchAllData(): Promise<string> {
  const client = getSupabaseClient();
  const data: string[] = [];

  try {
    // 1. 生产订单
    const { data: orders } = await client
      .from('production_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (orders && orders.length > 0) {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const totalQty = orders.reduce((s, o) => s + (o.quantity || 0), 0);
      const completedQty = orders.reduce((s, o) => s + (o.completed_quantity || 0), 0);
      const delayed = orders.filter(o => o.plan_end_date && o.plan_end_date < today && !['completed', 'cancelled'].includes(o.status));
      const inProgress = orders.filter(o => o.status === 'in_progress');
      const pending = orders.filter(o => o.status === 'pending');

      data.push(`【生产订单】${orders.length}个订单，总数${totalQty}件，完成${completedQty}件(${totalQty > 0 ? ((completedQty/totalQty)*100).toFixed(0) : 0}%)
状态：待确认${pending.length}个、生产中${inProgress.length}个、已完成${orders.filter(o=>o.status==='completed').length}个
${delayed.length > 0 ? `⚠️延期：${delayed.map(o => `${o.order_no}(${o.style_name||'未知'})`).join('、')}` : '✅无延期'}
${inProgress.length > 0 ? `生产中：${inProgress.map(o => `${o.order_no} ${o.style_name||''} 完成${o.completed_quantity||0}/${o.quantity}件`).join('；')}` : ''}`);
    }

    // 2. 物料库存
    const { data: materials } = await client.from('materials').select('*').limit(50);
    const { data: inventory } = await client.from('inventory').select('*').limit(50);

    if (inventory && inventory.length > 0) {
      const invList = inventory.map((i: any) => {
        const mat = materials?.find((m: any) => m.id === i.material_id);
        const qty = typeof i.quantity === 'object' ? (i.quantity as any).val || i.quantity : i.quantity;
        const safetyStock = mat?.safety_stock;
        const isLow = safetyStock && qty < safetyStock;
        return {
          name: mat?.name || '未知物料',
          code: mat?.code || '',
          qty: qty,
          unit: mat?.unit || '件',
          safetyStock: safetyStock,
          isLow: isLow
        };
      });

      const lowStock = invList.filter(i => i.isLow);
      
      data.push(`【物料库存】${invList.length}种
${invList.map(i => `${i.name}:${i.qty}${i.unit}`).join('、')}
${lowStock.length > 0 ? `⚠️低库存：${lowStock.map(i => `${i.name}仅${i.qty}${i.unit}(安全${i.safetyStock})`).join('、')}` : '✅库存充足'}`);
    }

    // 3. 财务
    const { data: bills } = await client.from('bills').select('*').order('bill_date', { ascending: false }).limit(50);

    if (bills && bills.length > 0) {
      const income = bills.filter(b => b.type === 'income').reduce((s, b) => s + (b.amount || 0), 0);
      const expense = bills.filter(b => b.type === 'expense').reduce((s, b) => s + (b.amount || 0), 0);
      const thisMonth = new Date().toISOString().slice(0, 7);
      const monthBills = bills.filter(b => b.bill_date?.startsWith(thisMonth));
      const monthIncome = monthBills.filter(b => b.type === 'income').reduce((s, b) => s + (b.amount || 0), 0);
      const monthExpense = monthBills.filter(b => b.type === 'expense').reduce((s, b) => s + (b.amount || 0), 0);

      data.push(`【财务】累计收入¥${income.toLocaleString()} 支出¥${expense.toLocaleString()} 净利润¥${(income-expense).toLocaleString()}
本月收入¥${monthIncome.toLocaleString()} 支出¥${monthExpense.toLocaleString()} 净利¥${(monthIncome-monthExpense).toLocaleString()}
${income - expense < 0 ? '⚠️当前亏损' : '✅盈利中'}`);
    }

    // 4. 员工
    const { data: employees } = await client.from('employees').select('*').limit(50);

    if (employees && employees.length > 0) {
      const active = employees.filter(e => e.status === 'active');
      const depts: Record<string, number> = {};
      active.forEach(e => {
        depts[e.department || '未分配'] = (depts[e.department || '未分配'] || 0) + 1;
      });

      data.push(`【员工】${active.length}人在职
部门：${Object.entries(depts).map(([d, c]) => `${d}${c}人`).join('、')}`);
    }

    // 5. 裁床
    const { data: cutting } = await client.from('cutting_orders').select('*').limit(20);

    if (cutting && cutting.length > 0) {
      const totalCut = cutting.reduce((s, c) => s + (c.cutting_qty || 0), 0);
      const completedCut = cutting.reduce((s, c) => s + (c.completed_qty || 0), 0);
      data.push(`【裁床】${cutting.length}个裁床单，裁${totalCut}件，完成${completedCut}件`);
    }

    // 6. 外发
    const { data: outsource } = await client.from('outsource_orders').select('*').limit(20);

    if (outsource && outsource.length > 0) {
      const totalAmt = outsource.reduce((s, o) => s + (o.total_amount || 0), 0);
      data.push(`【外发】${outsource.length}个订单，金额¥${totalAmt.toLocaleString()}`);
    }

    // 7. 供应商
    const { data: suppliers } = await client.from('suppliers').select('*').limit(20);

    if (suppliers && suppliers.length > 0) {
      data.push(`【供应商】${suppliers.length}家，合作${suppliers.filter(s => s.status === 'active').length}家`);
    }

    // 8. 发货
    const { data: shipments } = await client.from('shipments').select('*').limit(20);

    if (shipments && shipments.length > 0) {
      const pending = shipments.filter(s => s.status === 'pending').length;
      data.push(`【发货】${shipments.length}个发货单，待发${pending}个`);
    }

  } catch (error) {
    console.error('Error fetching data:', error);
  }

  return data.join('\n\n');
}

export async function POST(request: NextRequest) {
  try {
    const { messages, stream = true } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: '无效的消息格式' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 获取全部业务数据
    const businessData = await fetchAllData();

    // 构建消息
    const fullMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: `当前时间：${new Date().toLocaleString('zh-CN')}\n\n业务数据：\n${businessData}` },
      ...messages,
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
            const llmStream = llmClient.stream(fullMessages, {
              model: 'doubao-seed-1-8-251228',
              temperature: 0.7,
            });

            for await (const chunk of llmStream) {
              if (chunk.content) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk.content.toString() })}\n\n`));
              }
            }

            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            console.error('Stream error:', error);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '生成回复时出错' })}\n\n`));
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
      const response = await llmClient.invoke(fullMessages, {
        model: 'doubao-seed-1-8-251228',
        temperature: 0.7,
      });

      return new Response(JSON.stringify({ content: response.content }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('AI chat error:', error);
    return new Response(JSON.stringify({ 
      error: '处理请求失败',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
