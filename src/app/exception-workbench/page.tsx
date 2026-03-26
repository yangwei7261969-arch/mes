'use client';

import React, { useState, useEffect } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertTriangle, AlertCircle, CheckCircle, Clock, User, RefreshCw,
  ArrowUpRight, MessageSquare, XCircle, Bell, BellRing, Zap
} from 'lucide-react';
import { toast } from 'sonner';

interface Exception {
  id: string;
  exception_no: string;
  exception_type_code: string;
  exception_type_name: string;
  severity: string;
  priority: number;
  status: string;
  title: string;
  description: string;
  source: string;
  order_code?: string;
  style_name?: string;
  process_name?: string;
  employee_name?: string;
  handler_name?: string;
  actual_value?: number;
  expected_value?: number;
  deviation_rate?: number;
  created_at: string;
  deadline: string;
  is_overdue: boolean;
}

interface ExceptionStats {
  today_total: number;
  pending_total: number;
  overdue_count: number;
  by_severity: Record<string, number>;
  by_status: Record<string, number>;
}

export default function ExceptionWorkbenchPage() {
  const [loading, setLoading] = useState(true);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [stats, setStats] = useState<ExceptionStats | null>(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selectedException, setSelectedException] = useState<Exception | null>(null);
  const [actionDialog, setActionDialog] = useState<'resolve' | 'close' | 'escalate' | null>(null);
  const [actionForm, setActionForm] = useState({
    root_cause: '',
    resolution: '',
    preventive_action: '',
    close_note: '',
    satisfaction_rating: 3,
  });

  useEffect(() => {
    loadData();
    // 每5分钟自动刷新
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [activeTab, severityFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 加载统计
      const statsRes = await fetch('/api/exceptions');
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.data);
      }

      // 加载异常列表
      const status = activeTab === 'pending' ? 'open,acknowledged,in_progress' :
                     activeTab === 'resolved' ? 'resolved' :
                     activeTab === 'overdue' ? 'open,acknowledged,in_progress' : '';
      
      let url = `/api/exceptions?limit=50`;
      if (status) {
        url += `&status=${status.split(',')[0]}`;
      }
      if (severityFilter !== 'all') {
        url += `&severity=${severityFilter}`;
      }
      if (activeTab === 'overdue') {
        // 超时过滤需要在前端处理或后端支持
      }

      const listRes = await fetch(url);
      const listData = await listRes.json();
      if (listData.success) {
        let filtered = listData.data || [];
        if (activeTab === 'overdue') {
          filtered = filtered.filter((e: Exception) => e.is_overdue);
        }
        setExceptions(filtered);
      }
    } catch (error) {
      console.error('Load data error:', error);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const runAutoDetection = async () => {
    try {
      toast.info('正在执行自动检测...');
      const res = await fetch('/api/exceptions?action=detect');
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        loadData();
      }
    } catch (error) {
      toast.error('自动检测失败');
    }
  };

  const handleAction = async () => {
    if (!selectedException || !actionDialog) return;

    try {
      const operatorId = 'current_user'; // TODO: 从上下文获取
      const operatorName = '当前用户';

      const body: any = {
        exception_id: selectedException.id,
        action: actionDialog,
        operator_id: operatorId,
        operator_name: operatorName,
      };

      if (actionDialog === 'resolve') {
        body.root_cause = actionForm.root_cause;
        body.resolution = actionForm.resolution;
        body.preventive_action = actionForm.preventive_action;
      } else if (actionDialog === 'close') {
        body.close_note = actionForm.close_note;
        body.satisfaction_rating = actionForm.satisfaction_rating;
      }

      const res = await fetch('/api/exceptions/handle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('操作成功');
        setActionDialog(null);
        setSelectedException(null);
        setActionForm({
          root_cause: '',
          resolution: '',
          preventive_action: '',
          close_note: '',
          satisfaction_rating: 3,
        });
        loadData();
      } else {
        toast.error(data.error || '操作失败');
      }
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const acknowledgeException = async (exception: Exception) => {
    try {
      const res = await fetch('/api/exceptions/handle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exception_id: exception.id,
          action: 'acknowledge',
          operator_id: 'current_user',
          operator_name: '当前用户',
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('已确认');
        loadData();
      }
    } catch (error) {
      toast.error('确认失败');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'emergency':
        return 'bg-red-500 text-white';
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'warning':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'info':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-700';
      case 'acknowledged':
        return 'bg-blue-100 text-blue-700';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-700';
      case 'resolved':
        return 'bg-green-100 text-green-700';
      case 'closed':
        return 'bg-gray-100 text-gray-700';
      default:
        return '';
    }
  };

  const getStatusText = (status: string) => {
    const map: Record<string, string> = {
      open: '待处理',
      acknowledged: '已确认',
      in_progress: '处理中',
      resolved: '已解决',
      closed: '已关闭',
    };
    return map[status] || status;
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'emergency':
        return <Zap className="h-4 w-4" />;
      case 'critical':
        return <AlertCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(Math.abs(diff) / (1000 * 60 * 60));
    
    if (diff < 0 && hours < 24) {
      return `超时 ${hours} 小时`;
    } else if (diff > 0 && hours < 24) {
      return `剩余 ${hours} 小时`;
    }
    return date.toLocaleDateString();
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">异常管理中心</h1>
          <p className="text-muted-foreground">异常闭环系统 · 自动检测 · 责任到人</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={runAutoDetection}>
            <Zap className="h-4 w-4 mr-2" />
            执行检测
          </Button>
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">待处理</p>
                <p className="text-3xl font-bold text-red-700">{stats?.pending_total || 0}</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">已超时</p>
                <p className="text-3xl font-bold text-orange-700">{stats?.overdue_count || 0}</p>
              </div>
              <Clock className="h-10 w-10 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">今日新增</p>
                <p className="text-3xl font-bold text-blue-700">{stats?.today_total || 0}</p>
              </div>
              <BellRing className="h-10 w-10 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">紧急异常</p>
                <p className="text-3xl font-bold text-green-700">
                  {(stats?.by_severity?.critical || 0) + (stats?.by_severity?.emergency || 0)}
                </p>
              </div>
              <AlertCircle className="h-10 w-10 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 异常列表 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="pending">
              待处理
              {stats?.pending_total && stats.pending_total > 0 && (
                <Badge variant="destructive" className="ml-2">{stats.pending_total}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="overdue">
              已超时
              {stats?.overdue_count && stats.overdue_count > 0 && (
                <Badge variant="destructive" className="ml-2">{stats.overdue_count}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="resolved">已解决</TabsTrigger>
            <TabsTrigger value="all">全部</TabsTrigger>
          </TabsList>

          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="严重程度" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="emergency">紧急</SelectItem>
              <SelectItem value="critical">严重</SelectItem>
              <SelectItem value="warning">警告</SelectItem>
              <SelectItem value="info">提示</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : exceptions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <p className="text-lg">暂无异常</p>
              <p className="text-sm">当前筛选条件下没有异常数据</p>
            </div>
          ) : (
            <div className="space-y-3">
              {exceptions.map((exception) => (
                <Card
                  key={exception.id}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    exception.is_overdue ? 'border-red-300 bg-red-50/30' : ''
                  }`}
                  onClick={() => setSelectedException(exception)}
                >
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${getSeverityColor(exception.severity)}`}>
                          {getSeverityIcon(exception.severity)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{exception.title}</h3>
                            <Badge variant="outline" className={getSeverityColor(exception.severity)}>
                              {exception.severity}
                            </Badge>
                            <Badge variant="outline" className={getStatusColor(exception.status)}>
                              {getStatusText(exception.status)}
                            </Badge>
                            {exception.is_overdue && (
                              <Badge variant="destructive">超时</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {exception.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>单号: {exception.exception_no}</span>
                            {exception.order_code && <span>订单: {exception.order_code}</span>}
                            {exception.handler_name && <span>处理人: {exception.handler_name}</span>}
                            <span>时限: {formatTime(exception.deadline)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {exception.status === 'open' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              acknowledgeException(exception);
                            }}
                          >
                            确认
                          </Button>
                        )}
                        {(exception.status === 'acknowledged' || exception.status === 'in_progress') && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedException(exception);
                              setActionDialog('resolve');
                            }}
                          >
                            解决
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedException(exception);
                          }}
                        >
                          详情
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 详情对话框 */}
      <Dialog open={!!selectedException && !actionDialog} onOpenChange={() => setSelectedException(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedException?.title}
              <Badge className={getSeverityColor(selectedException?.severity || '')}>
                {selectedException?.severity}
              </Badge>
            </DialogTitle>
            <DialogDescription>{selectedException?.exception_no}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">异常类型</p>
                <p className="font-medium">{selectedException?.exception_type_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">状态</p>
                <Badge className={getStatusColor(selectedException?.status || '')}>
                  {getStatusText(selectedException?.status || '')}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">处理人</p>
                <p className="font-medium">{selectedException?.handler_name || '未指派'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">时限</p>
                <p className={`font-medium ${selectedException?.is_overdue ? 'text-red-600' : ''}`}>
                  {selectedException && formatTime(selectedException.deadline)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-muted-foreground text-sm">描述</p>
              <p className="mt-1">{selectedException?.description}</p>
            </div>

            {selectedException?.actual_value !== undefined && (
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">实际值</p>
                  <p className="text-xl font-bold">{selectedException.actual_value}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">期望值</p>
                  <p className="text-xl font-bold">{selectedException.expected_value}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">偏差率</p>
                  <p className={`text-xl font-bold ${
                    (selectedException.deviation_rate || 0) > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {selectedException.deviation_rate?.toFixed(1)}%
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedException(null)}>
              关闭
            </Button>
            {selectedException?.status === 'open' && (
              <Button onClick={() => acknowledgeException(selectedException)}>
                确认处理
              </Button>
            )}
            {['acknowledged', 'in_progress'].includes(selectedException?.status || '') && (
              <Button onClick={() => setActionDialog('resolve')}>
                解决异常
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 解决对话框 */}
      <Dialog open={actionDialog === 'resolve'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>解决异常</DialogTitle>
            <DialogDescription>请填写解决信息</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>根本原因 *</Label>
              <Textarea
                value={actionForm.root_cause}
                onChange={(e) => setActionForm({ ...actionForm, root_cause: e.target.value })}
                placeholder="请分析异常的根本原因"
                rows={3}
              />
            </div>
            <div>
              <Label>解决方案 *</Label>
              <Textarea
                value={actionForm.resolution}
                onChange={(e) => setActionForm({ ...actionForm, resolution: e.target.value })}
                placeholder="请描述如何解决问题"
                rows={3}
              />
            </div>
            <div>
              <Label>预防措施</Label>
              <Textarea
                value={actionForm.preventive_action}
                onChange={(e) => setActionForm({ ...actionForm, preventive_action: e.target.value })}
                placeholder="如何防止此类问题再次发生"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              取消
            </Button>
            <Button onClick={handleAction}>
              提交解决
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
