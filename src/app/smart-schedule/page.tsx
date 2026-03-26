'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  Sparkles,
  Clock,
  Factory,
  Package,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  Loader2,
} from 'lucide-react';

export default function SmartSchedulePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [result]);

  const handleGenerate = async () => {
    setLoading(true);
    setStreaming(true);
    setResult('');
    
    try {
      const response = await fetch('/api/smart-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stream: true }),
      });
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应');
      }

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              break;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                setResult(fullContent);
              }
              if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      console.error('Smart schedule error:', error);
      setResult('生成排产建议失败，请稍后重试');
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  };

  const scheduleMetrics = [
    { label: '待排产订单', value: '12', icon: Package, color: 'text-amber-600' },
    { label: '产能利用率', value: '85%', icon: Factory, color: 'text-green-600' },
    { label: '预计完成率', value: '92%', icon: TrendingUp, color: 'text-blue-600' },
    { label: '风险订单', value: '3', icon: AlertTriangle, color: 'text-red-600' },
  ];

  const scheduleRules = [
    { label: '优先级规则', items: ['交期紧迫度', '客户优先级', '订单金额'] },
    { label: '资源约束', items: ['设备产能', '人力配置', '物料供应'] },
    { label: '优化目标', items: ['按时交付率', '产能利用率', '成本最小化'] },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* 标题区域 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-3xl font-bold">智能排产</h1>
            <p className="text-muted-foreground">AI驱动排产优化，自动分析订单优先级和产能瓶颈</p>
          </div>
        </div>
        <Badge className="bg-violet-100 text-violet-700 text-sm">
          AI 已接入
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左侧面板 */}
        <div className="space-y-4">
          {/* 排产指标 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">当前排产指标</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {scheduleMetrics.map((metric, index) => (
                  <div key={index} className="p-3 bg-muted rounded-lg text-center">
                    <metric.icon className={`h-5 w-5 ${metric.color} mx-auto mb-1`} />
                    <div className="text-xl font-bold">{metric.value}</div>
                    <div className="text-xs text-muted-foreground">{metric.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 排产规则 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">排产规则</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scheduleRules.map((rule, index) => (
                  <div key={index}>
                    <div className="text-sm font-medium mb-1">{rule.label}</div>
                    <div className="flex flex-wrap gap-1">
                      {rule.items.map((item, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <Card>
            <CardContent className="pt-4">
              <Button 
                onClick={handleGenerate} 
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    正在生成排产建议...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    生成智能排产建议
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 右侧结果区域 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-500" />
                排产建议
              </CardTitle>
              {streaming && (
                <Badge variant="secondary" className="animate-pulse">
                  生成中...
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              {result ? (
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed bg-muted p-4 rounded-lg">
                    {result}
                    {streaming && (
                      <span className="inline-block w-2 h-4 ml-1 bg-violet-500 animate-pulse" />
                    )}
                  </pre>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-12">
                  <BarChart3 className="h-16 w-16 mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">暂无排产建议</p>
                  <p className="text-sm max-w-sm">
                    点击"生成智能排产建议"按钮，AI将基于订单优先级、产能瓶颈等数据生成优化方案
                  </p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
