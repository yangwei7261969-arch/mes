'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle, 
  Clock, 
  Database, 
  Package, 
  RefreshCw, 
  Settings, 
  Truck, 
  Users, 
  Wallet,
  Zap,
  Play,
  Pause,
  ChevronRight
} from 'lucide-react';

interface WorkflowModule {
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'error';
  lastRun?: string;
  nextRun?: string;
  actions: string[];
}

interface Alert {
  id: string;
  alert_type: string;
  alert_level: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
}

export default function WorkflowManagementPage() {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [modules, setModules] = useState<WorkflowModule[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [taskResults, setTaskResults] = useState<any>(null);

  useEffect(() => {
    fetchWorkflowStatus();
    fetchAlerts();
  }, []);

  const fetchWorkflowStatus = async () => {
    try {
      const response = await fetch('/api/workflow');
      const data = await response.json();
      
      if (data.success) {
        setModules(data.data.modules.map((m: any) => ({
          ...m,
          status: 'active' as const,
        })));
      }
    } catch (error) {
      console.error('Failed to fetch workflow status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts?status=active&limit=10');
      const data = await response.json();
      
      if (data.success) {
        setAlerts(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  const runScheduledTasks = async () => {
    setRunning(true);
    try {
      const response = await fetch('/api/scheduled-tasks?task=all');
      const data = await response.json();
      setTaskResults(data.results);
      
      // 刷新预警
      await fetchAlerts();
    } catch (error) {
      console.error('Failed to run scheduled tasks:', error);
    } finally {
      setRunning(false);
    }
  };

  const getModuleIcon = (name: string) => {
    const icons: Record<string, any> = {
      order: Package,
      cutting: Activity,
      production: Settings,
      quality: CheckCircle,
      inventory: Database,
      outsource: Truck,
      finance: Wallet,
      alert: AlertTriangle,
      notification: Users,
      salary: Wallet,
    };
    return icons[name] || Activity;
  };

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-500',
      warning: 'bg-yellow-500',
      info: 'bg-blue-500',
    };
    return colors[level] || 'bg-gray-500';
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      active: 'default',
      inactive: 'secondary',
      error: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">业务流程管理</h1>
          <p className="text-muted-foreground mt-1">管理系统业务逻辑闭环和定时任务</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={runScheduledTasks}
            disabled={running}
          >
            {running ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {running ? '执行中...' : '执行定时任务'}
          </Button>
        </div>
      </div>

      {/* 业务流程图 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            业务流程闭环图
          </CardTitle>
          <CardDescription>
            展示从订单创建到完成出货的完整业务流程
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* 流程图 */}
            <div className="flex items-center justify-between overflow-x-auto pb-4">
              {[
                { name: '订单创建', icon: Package, status: 'completed' },
                { name: '订单确认', icon: CheckCircle, status: 'completed' },
                { name: '裁床管理', icon: Activity, status: 'active' },
                { name: '生产管理', icon: Settings, status: 'pending' },
                { name: '质量检验', icon: CheckCircle, status: 'pending' },
                { name: '出货管理', icon: Truck, status: 'pending' },
                { name: '财务结算', icon: Wallet, status: 'pending' },
              ].map((step, index) => (
                <div key={step.name} className="flex items-center">
                  <div className={`
                    flex flex-col items-center p-4 rounded-lg border-2 min-w-[120px]
                    ${step.status === 'completed' ? 'bg-green-50 border-green-300' : ''}
                    ${step.status === 'active' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-300' : ''}
                    ${step.status === 'pending' ? 'bg-gray-50 border-gray-200' : ''}
                  `}>
                    <step.icon className={`
                      h-8 w-8 mb-2
                      ${step.status === 'completed' ? 'text-green-600' : ''}
                      ${step.status === 'active' ? 'text-blue-600' : ''}
                      ${step.status === 'pending' ? 'text-gray-400' : ''}
                    `} />
                    <span className={`
                      text-sm font-medium text-center
                      ${step.status === 'completed' ? 'text-green-700' : ''}
                      ${step.status === 'active' ? 'text-blue-700' : ''}
                      ${step.status === 'pending' ? 'text-gray-500' : ''}
                    `}>
                      {step.name}
                    </span>
                    {step.status === 'active' && (
                      <Badge variant="default" className="mt-2 text-xs">进行中</Badge>
                    )}
                  </div>
                  {index < 6 && (
                    <ChevronRight className="h-6 w-6 mx-2 text-gray-300" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 主要内容区 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：业务模块 */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="modules" className="space-y-4">
            <TabsList>
              <TabsTrigger value="modules">业务模块</TabsTrigger>
              <TabsTrigger value="tasks">定时任务</TabsTrigger>
              <TabsTrigger value="logs">执行日志</TabsTrigger>
            </TabsList>

            <TabsContent value="modules" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {modules.map((module) => {
                  const Icon = getModuleIcon(module.name);
                  return (
                    <Card key={module.name} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="h-5 w-5 text-primary" />
                            <CardTitle className="text-base">{module.description}</CardTitle>
                          </div>
                          {getStatusBadge(module.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">可用操作：</div>
                          <div className="flex flex-wrap gap-1">
                            {module.actions.map((action) => (
                              <Badge key={action} variant="outline" className="text-xs">
                                {action}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: '交期预警检测', icon: Clock, desc: '检测即将到期的订单' },
                  { name: '库存预警检测', icon: Database, desc: '检测库存不足的物料' },
                  { name: '订单进度更新', icon: Activity, desc: '自动更新订单生产进度' },
                  { name: '质量问题预警', icon: AlertTriangle, desc: '检测质量问题' },
                  { name: '财务到期提醒', icon: Wallet, desc: '检测即将到期的账单' },
                  { name: '数据清理', icon: RefreshCw, desc: '清理过期的临时数据' },
                ].map((task) => (
                  <Card key={task.name}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <task.icon className="h-5 w-5 text-primary" />
                          <CardTitle className="text-base">{task.name}</CardTitle>
                        </div>
                        <Button size="sm" variant="outline">
                          <Play className="h-3 w-3 mr-1" />
                          执行
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{task.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="logs" className="space-y-4">
              {taskResults ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">最近执行结果</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto max-h-96">
                      {JSON.stringify(taskResults, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    暂无执行日志，点击"执行定时任务"按钮开始
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* 右侧：预警监控 */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                预警监控
              </CardTitle>
              <CardDescription>
                实时显示系统预警信息
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.length > 0 ? (
                  alerts.map((alert) => (
                    <div 
                      key={alert.id} 
                      className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-2 h-2 rounded-full mt-2 ${getLevelColor(alert.alert_level)}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm truncate">{alert.title}</span>
                            <Badge 
                              variant={alert.alert_level === 'critical' ? 'destructive' : 'secondary'}
                              className="text-xs ml-2"
                            >
                              {alert.alert_level}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {alert.content}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(alert.created_at).toLocaleString('zh-CN')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>暂无预警</p>
                    <p className="text-xs mt-1">系统运行正常</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 快速操作 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">快速操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" variant="outline">
                <Package className="mr-2 h-4 w-4" />
                创建新订单
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Activity className="mr-2 h-4 w-4" />
                创建裁床单
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Truck className="mr-2 h-4 w-4" />
                外发管理
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Wallet className="mr-2 h-4 w-4" />
                财务结算
              </Button>
            </CardContent>
          </Card>

          {/* 系统状态 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">系统状态</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">业务模块</span>
                <Badge variant="default" className="bg-green-500">运行中</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">定时任务</span>
                <Badge variant="default" className="bg-green-500">正常</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">数据库连接</span>
                <Badge variant="default" className="bg-green-500">正常</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">API服务</span>
                <Badge variant="default" className="bg-green-500">正常</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 业务闭环说明 */}
      <Card>
        <CardHeader>
          <CardTitle>业务闭环说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: '订单管理闭环',
                flow: '创建 → 确认 → 排产 → 生产 → 质检 → 出货 → 完结',
                color: 'border-blue-300 bg-blue-50',
              },
              {
                title: '裁床管理闭环',
                flow: '计划 → 执行 → 分扎 → 发放 → 跟踪',
                color: 'border-green-300 bg-green-50',
              },
              {
                title: '质量管理闭环',
                flow: 'IQC → IPQC → OQC → 缺陷记录 → 返工 → 复检',
                color: 'border-amber-300 bg-amber-50',
              },
              {
                title: '库存管理闭环',
                flow: '入库 → 出库 → 盘点 → 预警 → 补货',
                color: 'border-purple-300 bg-purple-50',
              },
            ].map((item) => (
              <div key={item.title} className={`p-4 rounded-lg border ${item.color}`}>
                <h4 className="font-medium mb-2">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.flow}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
