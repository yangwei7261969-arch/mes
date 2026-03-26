'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Sparkles,
  Clock,
  Package,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Bell,
} from 'lucide-react';

export default function SmartAlertPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [result]);

  const handleAnalyze = async () => {
    setLoading(true);
    setStreaming(true);
    setResult('');
    
    try {
      const response = await fetch('/api/smart-alert', {
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
      console.error('Smart alert error:', error);
      setResult('生成预警分析失败，请稍后重试');
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  };

  // 模拟预警数据
  const alerts = [
    { type: 'danger', title: '订单延迟', desc: 'PO-2024001 已延期2天', icon: Clock, color: 'text-red-500' },
    { type: 'warning', title: '库存不足', desc: '面料A001 低于安全库存', icon: Package, color: 'text-amber-500' },
    { type: 'warning', title: '外发逾期', desc: '外发订单 WO-0028 即将到期', icon: AlertCircle, color: 'text-amber-500' },
    { type: 'info', title: '质量异常', desc: '车间B 返工率偏高', icon: XCircle, color: 'text-blue-500' },
  ];

  const alertTypes = [
    { label: '延迟预警', count: 3, color: 'bg-red-500' },
    { label: '库存预警', count: 5, color: 'bg-amber-500' },
    { label: '财务预警', count: 1, color: 'bg-blue-500' },
    { label: '质量预警', count: 2, color: 'bg-violet-500' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* 标题区域 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <div>
            <h1 className="text-3xl font-bold">智能预警</h1>
            <p className="text-muted-foreground">实时监控生产异常，AI自动识别风险并提供解决方案</p>
          </div>
        </div>
        <Badge className="bg-red-100 text-red-700 text-sm">
          {alerts.length} 项预警
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左侧面板 */}
        <div className="space-y-4">
          {/* 预警统计 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">预警统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alertTypes.map((type, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 ${type.color} rounded-full`} />
                      <span className="text-sm">{type.label}</span>
                    </div>
                    <Badge variant="secondary">{type.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 预警列表 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">当前预警</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alerts.map((alert, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <alert.icon className={`h-5 w-5 ${alert.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{alert.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{alert.desc}</div>
                    </div>
                    <Badge 
                      variant={alert.type === 'danger' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {alert.type === 'danger' ? '紧急' : alert.type === 'warning' ? '警告' : '提示'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <Card>
            <CardContent className="pt-4">
              <Button 
                onClick={handleAnalyze} 
                disabled={loading}
                className="w-full"
                size="lg"
                variant="destructive"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    正在分析预警数据...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    AI分析预警根因
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
                预警分析报告
              </CardTitle>
              {streaming && (
                <Badge variant="secondary" className="animate-pulse">
                  分析中...
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
                      <span className="inline-block w-2 h-4 ml-1 bg-red-500 animate-pulse" />
                    )}
                  </pre>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-12">
                  <Bell className="h-16 w-16 mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">暂无分析报告</p>
                  <p className="text-sm max-w-sm">
                    点击"AI分析预警根因"按钮，AI将分析当前预警的根本原因并提供解决方案
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
