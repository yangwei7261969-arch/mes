'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  BarChart3, 
  Lightbulb,
  Send,
  RefreshCw,
  Target,
  Zap,
  LineChart,
  PieChart,
  Activity,
  Shield
} from 'lucide-react';

interface Insight {
  category: string;
  type: string;
  message: string;
  impact: string;
}

interface Anomaly {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  recommendation: string;
  orderId?: string;
  orderNo?: string;
}

interface Alert {
  type: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  createdAt: string;
}

interface Prediction {
  trend: string;
  nextMonth: number;
  confidence: number;
}

export default function AIInsightsPage() {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [predictions, setPredictions] = useState<Prediction | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatStreaming, setChatStreaming] = useState(false);
  const [overviewData, setOverviewData] = useState<any>(null);

  // 获取AI概览
  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai-insights?action=overview');
      const result = await response.json();
      if (result.success) {
        setOverviewData(result.data);
        setInsights(result.data.insights || []);
      }
    } catch (error) {
      console.error('Fetch overview error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取异常检测
  const fetchAnomalies = useCallback(async () => {
    try {
      const response = await fetch('/api/ai-insights?action=anomaly-detection&days=30');
      const result = await response.json();
      if (result.success) {
        setAnomalies(result.data.anomalies);
      }
    } catch (error) {
      console.error('Fetch anomalies error:', error);
    }
  }, []);

  // 获取智能预警
  const fetchAlerts = useCallback(async () => {
    try {
      const response = await fetch('/api/ai-insights?action=smart-alerts');
      const result = await response.json();
      if (result.success) {
        setAlerts(result.data.alerts);
      }
    } catch (error) {
      console.error('Fetch alerts error:', error);
    }
  }, []);

  // 获取趋势预测
  const fetchPredictions = useCallback(async () => {
    try {
      const response = await fetch('/api/ai-insights?action=prediction&type=all');
      const result = await response.json();
      if (result.success) {
        setPredictions(result.data.production);
      }
    } catch (error) {
      console.error('Fetch predictions error:', error);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    fetchOverview();
    fetchAnomalies();
    fetchAlerts();
    fetchPredictions();
  }, [fetchOverview, fetchAnomalies, fetchAlerts, fetchPredictions]);

  // 发送聊天消息
  const handleSendMessage = async () => {
    if (!chatInput.trim() || chatStreaming) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatStreaming(true);

    try {
      const response = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          question: userMessage
        })
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponse = '';

      if (reader) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: '' }]);
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  aiResponse += parsed.content;
                  setChatMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      role: 'assistant',
                      content: aiResponse
                    };
                    return newMessages;
                  });
                }
              } catch {
                // 忽略解析错误
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '抱歉，AI回答失败，请重试。' 
      }]);
    } finally {
      setChatStreaming(false);
    }
  };

  // 获取严重程度颜色
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  // 获取类型图标
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'alert': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'info': return <Lightbulb className="h-4 w-4 text-blue-500" />;
      default: return <Lightbulb className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI智能洞察</h2>
          <p className="text-muted-foreground">
            智能分析、异常检测、趋势预测、决策支持
          </p>
        </div>
        <Button variant="outline" onClick={() => {
          fetchOverview();
          fetchAnomalies();
          fetchAlerts();
          fetchPredictions();
        }}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新数据
        </Button>
      </div>

      {/* 概览卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">订单完成率</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {overviewData?.orderStats?.completionRate || 0}%
            </div>
            <Progress 
              value={overviewData?.orderStats?.completionRate || 0} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">质检合格率</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {overviewData?.qualityStats?.passRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {overviewData?.qualityStats?.total || 0} 次质检
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">异常数量</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {anomalies.filter(a => a.severity === 'critical' || a.severity === 'high').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              需要立即处理
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">智能预警</CardTitle>
            <Activity className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {alerts.filter(a => a.severity === 'high').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              高优先级预警
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 主内容区 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* AI洞察 */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              AI洞察
            </CardTitle>
            <CardDescription>基于数据分析的智能洞察</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {insights.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Brain className="h-8 w-8 mb-2" />
                  <p>暂无洞察</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {insights.map((insight, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                      {getTypeIcon(insight.type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{insight.category}</Badge>
                        </div>
                        <p className="text-sm">{insight.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          影响: {insight.impact}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* 异常检测 */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              异常检测
            </CardTitle>
            <CardDescription>自动识别业务异常</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {anomalies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Shield className="h-8 w-8 mb-2 text-green-500" />
                  <p>未检测到异常</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {anomalies.slice(0, 10).map((anomaly, idx) => (
                    <div 
                      key={idx} 
                      className={`border-l-4 pl-3 py-2 ${getSeverityColor(anomaly.severity).replace('bg-', 'border-')}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant={anomaly.severity === 'critical' ? 'destructive' : 'secondary'}
                        >
                          {anomaly.severity === 'critical' ? '严重' : 
                           anomaly.severity === 'high' ? '高' : 
                           anomaly.severity === 'medium' ? '中' : '低'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{anomaly.type}</span>
                      </div>
                      <p className="text-sm">{anomaly.message}</p>
                      {anomaly.recommendation && (
                        <p className="text-xs text-blue-600 mt-1">
                          建议: {anomaly.recommendation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* 智能预警 */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              智能预警
            </CardTitle>
            <CardDescription>实时业务预警</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Shield className="h-8 w-8 mb-2 text-green-500" />
                  <p>暂无预警</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts.map((alert, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded border ${
                        alert.severity === 'high' ? 'border-red-300 bg-red-50 dark:bg-red-950' :
                        alert.severity === 'medium' ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-950' :
                        'border-blue-300 bg-blue-50 dark:bg-blue-950'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant={alert.severity === 'high' ? 'destructive' : 'secondary'}
                        >
                          {alert.type}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">{alert.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* 趋势预测和AI对话 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 趋势预测 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              趋势预测
            </CardTitle>
            <CardDescription>AI预测未来业务趋势</CardDescription>
          </CardHeader>
          <CardContent>
            {predictions ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <LineChart className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                    <p className="text-2xl font-bold">{predictions.nextMonth}</p>
                    <p className="text-xs text-muted-foreground">下月预测产量</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <PieChart className="h-6 w-6 mx-auto mb-2 text-green-500" />
                    <p className="text-2xl font-bold">{Math.round(predictions.confidence * 100)}%</p>
                    <p className="text-xs text-muted-foreground">预测置信度</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <TrendingUp className={`h-6 w-6 mx-auto mb-2 ${
                      predictions.trend === 'increasing' ? 'text-green-500' :
                      predictions.trend === 'decreasing' ? 'text-red-500' : 'text-gray-500'
                    }`} />
                    <p className="text-lg font-bold">
                      {predictions.trend === 'increasing' ? '上升' :
                       predictions.trend === 'decreasing' ? '下降' : '稳定'}
                    </p>
                    <p className="text-xs text-muted-foreground">趋势方向</p>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">AI预测分析</h4>
                  <p className="text-sm text-muted-foreground">
                    基于历史数据分析，预计下月产量将达到 <strong>{predictions.nextMonth}</strong> 件，
                    预测置信度为 <strong>{Math.round(predictions.confidence * 100)}%</strong>。
                    整体趋势呈现 <strong>
                      {predictions.trend === 'increasing' ? '上升' :
                       predictions.trend === 'decreasing' ? '下降' : '稳定'}
                    </strong> 态势。
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <TrendingUp className="h-8 w-8 mb-2" />
                <p>加载预测数据...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI对话 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI智能问答
            </CardTitle>
            <CardDescription>与AI助手对话，获取业务洞察</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px] mb-4">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Brain className="h-8 w-8 mb-2" />
                  <p>开始与AI助手对话</p>
                  <p className="text-xs mt-1">例如："分析本月订单完成情况"</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {chatMessages.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[80%] p-3 rounded-lg ${
                          msg.role === 'user' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}
                      >
                        <pre className="whitespace-pre-wrap text-sm font-sans">
                          {msg.content}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="输入问题..."
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={chatStreaming}
              />
              <Button onClick={handleSendMessage} disabled={chatStreaming || !chatInput.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 快速分析入口 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            快速分析
          </CardTitle>
          <CardDescription>一键获取AI分析报告</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2">
              <BarChart3 className="h-6 w-6" />
              <span>生产效率分析</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2">
              <Shield className="h-6 w-6" />
              <span>质量趋势分析</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2">
              <TrendingUp className="h-6 w-6" />
              <span>成本效益分析</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2">
              <Target className="h-6 w-6" />
              <span>瓶颈识别</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
