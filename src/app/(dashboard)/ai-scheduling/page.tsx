'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calendar, 
  Clock, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Users,
  Factory,
  TrendingUp,
  Brain,
  RefreshCw,
  CalendarDays,
  BarChart3,
  ListChecks,
  Settings
} from 'lucide-react';

interface ScheduleItem {
  id: string;
  orderId: string;
  orderNo: string;
  styleNo: string;
  quantity: number;
  lineId: string;
  lineName: string;
  scheduleDate: string;
  deliveryDate: string;
  priority: string;
  status?: string;
  progress?: number;
}

interface LineCapacity {
  lineId: string;
  lineCode: string;
  lineName: string;
  workshop: string;
  dailyCapacity: number;
  scheduledQuantity: number;
  availableCapacity: number;
  utilizationRate: number;
  status: 'available' | 'busy' | 'full';
}

interface Conflict {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
  affectedOrders?: string[];
}

interface Suggestion {
  type: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  message: string;
  detail?: string;
  action: string;
}

export default function AISchedulingPage() {
  const [activeTab, setActiveTab] = useState('gantt');
  const [loading, setLoading] = useState(false);
  const [aiReasoning, setAiReasoning] = useState('');
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [capacities, setCapacities] = useState<LineCapacity[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  // 获取甘特图数据
  const fetchGanttData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/ai-scheduling?action=gantt&start_date=${dateRange.start}&end_date=${dateRange.end}`
      );
      const result = await response.json();
      if (result.success) {
        // 展平甘特图数据
        const flatSchedules: ScheduleItem[] = [];
        result.data.lines.forEach((line: any) => {
          line.schedule.forEach((day: any) => {
            day.orders.forEach((order: any) => {
              flatSchedules.push({
                id: order.id,
                orderId: order.orderId,
                orderNo: order.orderNo,
                styleNo: order.styleNo,
                quantity: order.quantity,
                lineId: line.lineId,
                lineName: line.lineName,
                scheduleDate: day.date,
                deliveryDate: order.deliveryDate,
                priority: order.status === 'urgent' ? 'urgent' : 'normal',
                progress: order.progress
              });
            });
          });
        });
        setSchedules(flatSchedules);
      }
    } catch (error) {
      console.error('Fetch gantt data error:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // 获取产能数据
  const fetchCapacityData = useCallback(async () => {
    try {
      const response = await fetch(`/api/ai-scheduling?action=capacity&date=${selectedDate}`);
      const result = await response.json();
      if (result.success) {
        setCapacities(result.data.lines);
      }
    } catch (error) {
      console.error('Fetch capacity error:', error);
    }
  }, [selectedDate]);

  // 获取冲突数据
  const fetchConflictData = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/ai-scheduling?action=conflicts&start_date=${dateRange.start}&end_date=${dateRange.end}`
      );
      const result = await response.json();
      if (result.success) {
        setConflicts(result.data.conflicts);
      }
    } catch (error) {
      console.error('Fetch conflicts error:', error);
    }
  }, [dateRange]);

  // 获取优化建议
  const fetchSuggestions = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/ai-scheduling?action=optimization&start_date=${dateRange.start}&end_date=${dateRange.end}`
      );
      const result = await response.json();
      if (result.success) {
        setSuggestions(result.data.suggestions);
      }
    } catch (error) {
      console.error('Fetch suggestions error:', error);
    }
  }, [dateRange]);

  // 初始加载
  useEffect(() => {
    fetchGanttData();
    fetchCapacityData();
    fetchConflictData();
    fetchSuggestions();
  }, [fetchGanttData, fetchCapacityData, fetchConflictData, fetchSuggestions]);

  // AI自动排产
  const handleAutoSchedule = async () => {
    setLoading(true);
    setAiReasoning('');

    try {
      const response = await fetch('/api/ai-scheduling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auto-schedule',
          data: {
            startDate: dateRange.start,
            endDate: dateRange.end,
            constraints: {
              maxUtilization: 0.95,
              minUtilization: 0.7
            }
          }
        })
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
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
                if (parsed.type === 'reasoning') {
                  setAiReasoning(prev => prev + parsed.content);
                } else if (parsed.type === 'plan') {
                  // 更新排产计划
                  setSchedules(parsed.data);
                } else if (parsed.type === 'capacity') {
                  setCapacities(parsed.data);
                }
              } catch {
                // 忽略解析错误
              }
            }
          }
        }
      }

      // 刷新数据
      fetchConflictData();
      fetchSuggestions();
    } catch (error) {
      console.error('Auto schedule error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取优先级颜色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'normal': return 'bg-blue-500';
      case 'low': return 'bg-gray-400';
      default: return 'bg-blue-500';
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'busy': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'full': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  // 获取冲突严重程度颜色
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI智能排产</h2>
          <p className="text-muted-foreground">
            基于AI的自动排产、产能分析和优化建议
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => {
            fetchGanttData();
            fetchCapacityData();
            fetchConflictData();
            fetchSuggestions();
          }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新数据
          </Button>
          <Button onClick={handleAutoSchedule} disabled={loading}>
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                AI排产中...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                AI自动排产
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 产能概览 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总产能</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {capacities.reduce((sum, c) => sum + c.dailyCapacity, 0).toLocaleString()} 件/天
            </div>
            <p className="text-xs text-muted-foreground">
              {capacities.length} 条活跃产线
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已排产</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {capacities.reduce((sum, c) => sum + c.scheduledQuantity, 0).toLocaleString()} 件
            </div>
            <p className="text-xs text-muted-foreground">
              {schedules.length} 个订单
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">产能利用率</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {capacities.length > 0 
                ? Math.round(capacities.reduce((sum, c) => sum + c.utilizationRate, 0) / capacities.length)
                : 0}%
            </div>
            <Progress 
              value={capacities.length > 0 
                ? capacities.reduce((sum, c) => sum + c.utilizationRate, 0) / capacities.length
                : 0} 
              className="mt-2" 
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">排产冲突</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {conflicts.filter(c => c.severity === 'critical' || c.severity === 'high').length}
            </div>
            <p className="text-xs text-muted-foreground">
              需要立即处理
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 主内容区 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="gantt">
            <Calendar className="h-4 w-4 mr-2" />
            甘特图
          </TabsTrigger>
          <TabsTrigger value="capacity">
            <BarChart3 className="h-4 w-4 mr-2" />
            产能分析
          </TabsTrigger>
          <TabsTrigger value="conflicts">
            <AlertTriangle className="h-4 w-4 mr-2" />
            冲突检测
          </TabsTrigger>
          <TabsTrigger value="optimization">
            <Zap className="h-4 w-4 mr-2" />
            优化建议
          </TabsTrigger>
          <TabsTrigger value="ai-reasoning">
            <Brain className="h-4 w-4 mr-2" />
            AI推理
          </TabsTrigger>
        </TabsList>

        {/* 甘特图视图 */}
        <TabsContent value="gantt" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>排产甘特图</CardTitle>
                  <CardDescription>
                    可视化展示各产线的排产情况
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="px-2 py-1 border rounded"
                  />
                  <span>至</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="px-2 py-1 border rounded"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {schedules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mb-4" />
                  <p>暂无排产数据</p>
                  <p className="text-sm">点击"AI自动排产"按钮开始智能排产</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {Array.from(new Set(schedules.map(s => s.lineName))).map(lineName => (
                      <div key={lineName} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold">{lineName}</h4>
                          <Badge variant="outline">
                            {schedules.filter(s => s.lineName === lineName).length} 个订单
                          </Badge>
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {Array.from({ length: 14 }, (_, i) => {
                            const date = new Date(dateRange.start);
                            date.setDate(date.getDate() + i);
                            const dateStr = date.toISOString().split('T')[0];
                            const daySchedules = schedules.filter(
                              s => s.lineName === lineName && s.scheduleDate === dateStr
                            );
                            const isToday = dateStr === new Date().toISOString().split('T')[0];
                            
                            return (
                              <div
                                key={dateStr}
                                className={`p-2 border rounded text-center min-h-[80px] ${
                                  isToday ? 'border-primary bg-primary/5' : ''
                                }`}
                              >
                                <div className="text-xs text-muted-foreground mb-1">
                                  {date.toLocaleDateString('zh-CN', { weekday: 'short' })}
                                </div>
                                <div className="text-xs font-medium mb-1">
                                  {date.getDate()}
                                </div>
                                {daySchedules.map((s, idx) => (
                                  <div
                                    key={idx}
                                    className={`text-xs p-1 rounded mb-1 ${getPriorityColor(s.priority)} text-white`}
                                    title={`${s.orderNo}: ${s.quantity}件`}
                                  >
                                    {s.orderNo?.slice(-4)}
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 产能分析 */}
        <TabsContent value="capacity" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>产线产能分析</CardTitle>
                  <CardDescription>
                    各产线的产能利用率和可用产能
                  </CardDescription>
                </div>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-2 py-1 border rounded"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {capacities.map(cap => (
                  <div key={cap.lineId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(cap.status)}
                        <h4 className="font-semibold">{cap.lineName}</h4>
                        <Badge variant="outline">{cap.workshop}</Badge>
                      </div>
                      <Badge 
                        variant={cap.status === 'available' ? 'default' : cap.status === 'busy' ? 'secondary' : 'destructive'}
                      >
                        {cap.status === 'available' ? '空闲' : cap.status === 'busy' ? '繁忙' : '已满'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">日产能：</span>
                        <span className="font-medium">{cap.dailyCapacity} 件</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">已排产：</span>
                        <span className="font-medium">{cap.scheduledQuantity} 件</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">可用产能：</span>
                        <span className="font-medium text-green-600">{cap.availableCapacity} 件</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">利用率：</span>
                        <span className="font-medium">{cap.utilizationRate}%</span>
                      </div>
                    </div>
                    <Progress value={cap.utilizationRate} className="mt-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 冲突检测 */}
        <TabsContent value="conflicts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>排产冲突检测</CardTitle>
              <CardDescription>
                自动检测产能过载、交付冲突等问题
              </CardDescription>
            </CardHeader>
            <CardContent>
              {conflicts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mb-4 text-green-500" />
                  <p>未发现排产冲突</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conflicts.map((conflict, idx) => (
                    <div
                      key={idx}
                      className={`border-l-4 p-4 rounded ${getSeverityColor(conflict.severity)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge 
                              variant={conflict.severity === 'critical' ? 'destructive' : 'secondary'}
                            >
                              {conflict.severity === 'critical' ? '严重' : 
                               conflict.severity === 'high' ? '高' : 
                               conflict.severity === 'medium' ? '中' : '低'}
                            </Badge>
                            <span className="font-medium">{conflict.type}</span>
                          </div>
                          <p className="text-sm">{conflict.message}</p>
                          {conflict.suggestion && (
                            <p className="text-sm text-muted-foreground mt-1">
                              建议：{conflict.suggestion}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 优化建议 */}
        <TabsContent value="optimization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>排产优化建议</CardTitle>
              <CardDescription>
                AI分析排产数据，提供优化建议
              </CardDescription>
            </CardHeader>
            <CardContent>
              {suggestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Zap className="h-12 w-12 mb-4" />
                  <p>运行AI排产后将生成优化建议</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {suggestions.map((suggestion, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge 
                          variant={
                            suggestion.priority === 'high' ? 'destructive' : 
                            suggestion.priority === 'medium' ? 'secondary' : 'outline'
                          }
                        >
                          {suggestion.category}
                        </Badge>
                        <Badge variant="outline">
                          {suggestion.priority === 'high' ? '高优先级' : 
                           suggestion.priority === 'medium' ? '中优先级' : '低优先级'}
                        </Badge>
                      </div>
                      <p className="font-medium">{suggestion.message}</p>
                      {suggestion.detail && (
                        <p className="text-sm text-muted-foreground mt-1">{suggestion.detail}</p>
                      )}
                      <p className="text-sm text-blue-600 mt-2">
                        行动建议：{suggestion.action}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI推理过程 */}
        <TabsContent value="ai-reasoning" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI排产推理过程</CardTitle>
              <CardDescription>
                查看AI如何分析数据并做出排产决策
              </CardDescription>
            </CardHeader>
            <CardContent>
              {aiReasoning ? (
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap bg-muted p-4 rounded-lg text-sm">
                    {aiReasoning}
                  </pre>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Brain className="h-12 w-12 mb-4" />
                  <p>点击"AI自动排产"按钮查看推理过程</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 排产列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            排产明细
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <table className="w-full">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="text-left p-2">订单号</th>
                  <th className="text-left p-2">款号</th>
                  <th className="text-left p-2">产线</th>
                  <th className="text-left p-2">数量</th>
                  <th className="text-left p-2">排产日期</th>
                  <th className="text-left p-2">交付日期</th>
                  <th className="text-left p-2">进度</th>
                  <th className="text-left p-2">优先级</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((schedule, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/50">
                    <td className="p-2">{schedule.orderNo}</td>
                    <td className="p-2">{schedule.styleNo}</td>
                    <td className="p-2">{schedule.lineName}</td>
                    <td className="p-2">{schedule.quantity}</td>
                    <td className="p-2">{schedule.scheduleDate}</td>
                    <td className="p-2">{schedule.deliveryDate}</td>
                    <td className="p-2">
                      {schedule.progress !== undefined && (
                        <div className="flex items-center gap-2">
                          <Progress value={schedule.progress} className="w-16" />
                          <span className="text-xs">{schedule.progress}%</span>
                        </div>
                      )}
                    </td>
                    <td className="p-2">
                      <Badge className={`${getPriorityColor(schedule.priority)} text-white`}>
                        {schedule.priority === 'urgent' ? '紧急' : 
                         schedule.priority === 'high' ? '高' : 
                         schedule.priority === 'low' ? '低' : '普通'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
