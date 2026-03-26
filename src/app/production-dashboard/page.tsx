'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { BatchExportDialog } from '@/components/export-button';
import { AIAssistant } from '@/components/ai-assistant';
import {
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Truck,
  Scissors,
  Printer,
  Download,
  Bot,
  Sparkles,
} from 'lucide-react';

interface ProductionStats {
  totalOrders: number;
  completedOrders: number;
  inProgressOrders: number;
  pendingOrders: number;
  todayOutput: number;
  weekOutput: number;
  defectRate: number;
  onTimeRate: number;
}

interface ProcessStatus {
  processName: string;
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
}

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  time: string;
}

export default function ProductionDashboard() {
  const [stats, setStats] = useState<ProductionStats>({
    totalOrders: 0,
    completedOrders: 0,
    inProgressOrders: 0,
    pendingOrders: 0,
    todayOutput: 0,
    weekOutput: 0,
    defectRate: 0,
    onTimeRate: 0,
  });
  const [processStatus, setProcessStatus] = useState<ProcessStatus[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [aiAssistantOpen, setAIAssistantOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    // 每30秒刷新一次
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      // 获取统计数据
      const statsRes = await fetch('/api/dashboard/stats');
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.data);
      }

      // 获取工序状态
      const processRes = await fetch('/api/process-tracking/dashboard');
      const processData = await processRes.json();
      if (processData.success) {
        setProcessStatus(processData.data);
      }

      // 获取预警信息
      const alertsRes = await fetch('/api/dashboard/alerts');
      const alertsData = await alertsRes.json();
      if (alertsData.success) {
        setAlerts(alertsData.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">生产看板</h1>
          <p className="text-muted-foreground mt-1">实时监控生产进度，智能预警管理</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white"
            onClick={() => setAIAssistantOpen(true)}
          >
            <Bot className="h-4 w-4 mr-2" />
            AI助手
            <Sparkles className="h-3 w-3 ml-1" />
          </Button>
          <Button variant="outline" onClick={() => setExportDialogOpen(true)}>
            <Download className="h-4 w-4 mr-2" />
            数据导出
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>自动刷新: 30秒</span>
          </div>
        </div>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">今日产量</p>
                <p className="text-2xl font-bold">{stats.todayOutput}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  本周: {stats.weekOutput}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">进行中订单</p>
                <p className="text-2xl font-bold">{stats.inProgressOrders}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  总订单: {stats.totalOrders}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">准时交付率</p>
                <p className="text-2xl font-bold">{stats.onTimeRate}%</p>
                <Progress value={stats.onTimeRate} className="h-2 mt-2" />
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">次品率</p>
                <p className="text-2xl font-bold">{stats.defectRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.defectRate < 2 ? '达标' : '需关注'}
                </p>
              </div>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                stats.defectRate < 2 ? 'bg-green-100' : 'bg-orange-100'
              }`}>
                <AlertTriangle className={`h-6 w-6 ${
                  stats.defectRate < 2 ? 'text-green-600' : 'text-orange-600'
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主内容区 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 工序进度 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5" />
              工序进度
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {processStatus.map((process, index) => {
                const progress = process.total > 0 
                  ? Math.round((process.completed / process.total) * 100) 
                  : 0;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{process.processName}</span>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>完成: {process.completed}</span>
                        <span>进行中: {process.inProgress}</span>
                        <span>待处理: {process.pending}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={progress} className="flex-1" />
                      <span className="text-sm font-medium w-12 text-right">
                        {progress}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 预警信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              预警信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>暂无预警信息</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${getAlertColor(alert.type)}`}
                  >
                    <div className="flex items-start gap-2">
                      {alert.type === 'error' && (
                        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      )}
                      {alert.type === 'warning' && (
                        <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      )}
                      {alert.type === 'info' && (
                        <Truck className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm">{alert.message}</p>
                        <p className="text-xs opacity-70 mt-1">{alert.time}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 快捷操作 */}
      <Card>
        <CardHeader>
          <CardTitle>快捷操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a
              href="/cutting-bundles"
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Scissors className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">裁床分扎</p>
                <p className="text-sm text-muted-foreground">创建和管理分扎</p>
              </div>
            </a>

            <a
              href="/cutting-bundles"
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Printer className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">批量打菲</p>
                <p className="text-sm text-muted-foreground">打印工票标签</p>
              </div>
            </a>

            <a
              href="/process-tracking"
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">工序追溯</p>
                <p className="text-sm text-muted-foreground">扫码查看进度</p>
              </div>
            </a>

            <a
              href="/outsource-tracking"
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Truck className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="font-medium">外发跟踪</p>
                <p className="text-sm text-muted-foreground">外发加工管理</p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* 批量导出对话框 */}
      <BatchExportDialog 
        open={exportDialogOpen} 
        onOpenChange={setExportDialogOpen} 
      />

      {/* AI智能助手 */}
      <AIAssistant 
        open={aiAssistantOpen} 
        onOpenChange={setAIAssistantOpen} 
      />
    </div>
  );
}
