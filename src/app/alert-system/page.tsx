'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  Package,
  TrendingDown,
  Bell,
  Settings,
  CheckCircle,
  XCircle,
  BellOff,
  RefreshCw,
  Filter,
  ChevronRight,
  Calendar,
  Database,
  Zap,
} from 'lucide-react';

// 预警类型
type AlertType = 'inventory' | 'delivery' | 'quality' | 'production' | 'equipment';
type AlertLevel = 'critical' | 'warning' | 'info';

// 预警记录
interface AlertRecord {
  id: string;
  type: AlertType;
  level: AlertLevel;
  title: string;
  message: string;
  source: string;
  relatedOrder?: string;
  relatedProduct?: string;
  createdAt: string;
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledgedBy?: string;
  resolvedAt?: string;
  action?: string;
}

// 预警规则
interface AlertRule {
  id: string;
  name: string;
  type: AlertType;
  condition: string;
  threshold: number;
  unit: string;
  enabled: boolean;
  notifyMethods: string[];
}

// 库存预警数据
interface InventoryAlert {
  id: string;
  productName: string;
  sku: string;
  currentStock: number;
  safeStock: number;
  unit: string;
  shortage: number;
  status: AlertLevel;
}

// 交期预警数据
interface DeliveryAlert {
  id: string;
  orderNo: string;
  customer: string;
  product: string;
  quantity: number;
  deliveryDate: string;
  daysRemaining: number;
  progress: number;
  status: AlertLevel;
}

export default function AlertSystemPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // 预警记录
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<AlertRecord | null>(null);
  const [alertDetailOpen, setAlertDetailOpen] = useState(false);
  
  // 预警规则
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  
  // 库存预警
  const [inventoryAlerts, setInventoryAlerts] = useState<InventoryAlert[]>([]);
  
  // 交期预警
  const [deliveryAlerts, setDeliveryAlerts] = useState<DeliveryAlert[]>([]);

  // 统计
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    warning: 0,
    info: 0,
    unhandled: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 模拟预警记录
      const mockAlerts: AlertRecord[] = [
        {
          id: '1',
          type: 'inventory',
          level: 'critical',
          title: '面料库存不足',
          message: '红色T恤面料库存仅剩 50 米，低于安全库存 200 米',
          source: '库存监控系统',
          relatedProduct: '红色T恤面料',
          createdAt: '2024-01-15 10:30',
          status: 'active',
        },
        {
          id: '2',
          type: 'delivery',
          level: 'critical',
          title: '订单即将逾期',
          message: '订单 PO-2024-001 将于明天交货，当前完成进度仅 65%',
          source: '交期监控系统',
          relatedOrder: 'PO-2024-001',
          createdAt: '2024-01-15 09:00',
          status: 'active',
        },
        {
          id: '3',
          type: 'quality',
          level: 'warning',
          title: '不良率超标',
          message: '缝制工序不良率达到 8%，超过标准值 5%',
          source: '质量监控系统',
          relatedOrder: 'PO-2024-003',
          createdAt: '2024-01-15 08:45',
          status: 'acknowledged',
          acknowledgedBy: '张主管',
        },
        {
          id: '4',
          type: 'production',
          level: 'warning',
          title: '产能落后',
          message: '缝制线A 今日产量落后计划 15%',
          source: '生产监控系统',
          createdAt: '2024-01-15 11:00',
          status: 'active',
        },
        {
          id: '5',
          type: 'equipment',
          level: 'info',
          title: '设备维护提醒',
          message: '平车机 #12 已运行 500 小时，建议进行保养',
          source: '设备管理系统',
          createdAt: '2024-01-15 07:00',
          status: 'resolved',
          resolvedAt: '2024-01-15 09:30',
          action: '已安排下午保养',
        },
      ];
      setAlerts(mockAlerts);

      // 预警规则
      setRules([
        { id: '1', name: '库存安全预警', type: 'inventory', condition: '库存量 < 安全库存', threshold: 0, unit: '%', enabled: true, notifyMethods: ['系统通知', '短信'] },
        { id: '2', name: '交期预警', type: 'delivery', condition: '距离交货日期 <=', threshold: 3, unit: '天', enabled: true, notifyMethods: ['系统通知', '邮件'] },
        { id: '3', name: '不良率预警', type: 'quality', condition: '不良率 >', threshold: 5, unit: '%', enabled: true, notifyMethods: ['系统通知'] },
        { id: '4', name: '产能落后预警', type: 'production', condition: '落后计划 >', threshold: 10, unit: '%', enabled: true, notifyMethods: ['系统通知'] },
      ]);

      // 库存预警数据
      setInventoryAlerts([
        { id: '1', productName: '红色T恤面料', sku: 'FAB-001', currentStock: 50, safeStock: 200, unit: '米', shortage: 150, status: 'critical' },
        { id: '2', productName: '黑色拉链', sku: 'ZIP-002', currentStock: 100, safeStock: 500, unit: '条', shortage: 400, status: 'critical' },
        { id: '3', productName: '白色纽扣', sku: 'BTN-003', currentStock: 800, safeStock: 1000, unit: '颗', shortage: 200, status: 'warning' },
        { id: '4', productName: '蓝色标签', sku: 'LBL-004', currentStock: 450, safeStock: 500, unit: '张', shortage: 50, status: 'warning' },
      ]);

      // 交期预警数据
      setDeliveryAlerts([
        { id: '1', orderNo: 'PO-2024-001', customer: '客户A', product: '红色T恤', quantity: 500, deliveryDate: '2024-01-16', daysRemaining: 1, progress: 65, status: 'critical' },
        { id: '2', orderNo: 'PO-2024-002', customer: '客户B', product: '蓝色衬衫', quantity: 300, deliveryDate: '2024-01-18', daysRemaining: 3, progress: 80, status: 'warning' },
        { id: '3', orderNo: 'PO-2024-003', customer: '客户C', product: '黑色裤子', quantity: 200, deliveryDate: '2024-01-20', daysRemaining: 5, progress: 45, status: 'warning' },
      ]);

      // 统计
      setStats({
        total: mockAlerts.length,
        critical: mockAlerts.filter(a => a.level === 'critical').length,
        warning: mockAlerts.filter(a => a.level === 'warning').length,
        info: mockAlerts.filter(a => a.level === 'info').length,
        unhandled: mockAlerts.filter(a => a.status === 'active').length,
      });

    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = (alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId 
        ? { ...a, status: 'acknowledged', acknowledgedBy: '当前用户' }
        : a
    ));
    setAlertDetailOpen(false);
  };

  const handleResolve = (alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId 
        ? { ...a, status: 'resolved', resolvedAt: new Date().toLocaleString(), action: '已处理' }
        : a
    ));
    setAlertDetailOpen(false);
  };

  const getAlertTypeIcon = (type: AlertType) => {
    const icons = {
      inventory: <Package className="h-4 w-4" />,
      delivery: <Calendar className="h-4 w-4" />,
      quality: <AlertCircle className="h-4 w-4" />,
      production: <Zap className="h-4 w-4" />,
      equipment: <Settings className="h-4 w-4" />,
    };
    return icons[type];
  };

  const getAlertTypeLabel = (type: AlertType) => {
    const labels = {
      inventory: '库存预警',
      delivery: '交期预警',
      quality: '质量预警',
      production: '生产预警',
      equipment: '设备预警',
    };
    return labels[type];
  };

  const getLevelBadge = (level: AlertLevel) => {
    const config = {
      critical: { label: '严重', className: 'bg-red-100 text-red-800 border-red-300' },
      warning: { label: '警告', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      info: { label: '提示', className: 'bg-blue-100 text-blue-800 border-blue-300' },
    };
    return config[level];
  };

  const getStatusBadge = (status: string) => {
    const config = {
      active: { label: '待处理', className: 'bg-red-100 text-red-800' },
      acknowledged: { label: '已确认', className: 'bg-yellow-100 text-yellow-800' },
      resolved: { label: '已解决', className: 'bg-green-100 text-green-800' },
    };
    return config[status as keyof typeof config];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">生产异常预警</h1>
        <div className="flex gap-2">
          <Button variant="outline">
            <Bell className="h-4 w-4 mr-2" />
            通知设置
          </Button>
          <Button onClick={() => setRuleDialogOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            预警规则
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">严重预警</p>
                <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">警告</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.warning}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">提示</p>
                <p className="text-2xl font-bold text-blue-600">{stats.info}</p>
              </div>
              <Bell className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">待处理</p>
                <p className="text-2xl font-bold text-orange-600">{stats.unhandled}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">今日预警</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主内容区 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <AlertTriangle className="h-4 w-4 mr-2" />
            预警列表
          </TabsTrigger>
          <TabsTrigger value="inventory">
            <Package className="h-4 w-4 mr-2" />
            库存预警
          </TabsTrigger>
          <TabsTrigger value="delivery">
            <Calendar className="h-4 w-4 mr-2" />
            交期预警
          </TabsTrigger>
          <TabsTrigger value="rules">
            <Settings className="h-4 w-4 mr-2" />
            预警规则
          </TabsTrigger>
        </TabsList>

        {/* 预警列表 */}
        <TabsContent value="overview" className="space-y-4">
          <div className="flex justify-between">
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                筛选
              </Button>
              <Button variant="outline" size="sm" className="text-red-600">
                仅显示待处理
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>类型</TableHead>
                    <TableHead>级别</TableHead>
                    <TableHead>标题</TableHead>
                    <TableHead>消息</TableHead>
                    <TableHead>时间</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => {
                    const levelConfig = getLevelBadge(alert.level);
                    const statusConfig = getStatusBadge(alert.status);
                    return (
                      <TableRow key={alert.id} className={alert.status === 'active' && alert.level === 'critical' ? 'bg-red-50' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getAlertTypeIcon(alert.type)}
                            <span>{getAlertTypeLabel(alert.type)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={levelConfig.className}>
                            {levelConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{alert.title}</TableCell>
                        <TableCell className="max-w-xs truncate">{alert.message}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{alert.createdAt}</TableCell>
                        <TableCell>
                          <Badge className={statusConfig.className}>
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedAlert(alert);
                              setAlertDetailOpen(true);
                            }}
                          >
                            详情 <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 库存预警 */}
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-5 w-5" />
                库存预警详情
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>产品名称</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>当前库存</TableHead>
                    <TableHead>安全库存</TableHead>
                    <TableHead>缺口</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryAlerts.map((item) => {
                    const levelConfig = getLevelBadge(item.status);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="font-mono">{item.sku}</TableCell>
                        <TableCell>
                          <span className="text-red-600 font-medium">{item.currentStock}</span>
                          <span className="text-muted-foreground"> {item.unit}</span>
                        </TableCell>
                        <TableCell>{item.safeStock} {item.unit}</TableCell>
                        <TableCell className="text-red-600">-{item.shortage} {item.unit}</TableCell>
                        <TableCell>
                          <Badge className={levelConfig.className}>
                            {levelConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm">立即采购</Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 交期预警 */}
        <TabsContent value="delivery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                交期预警详情
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>订单号</TableHead>
                    <TableHead>客户</TableHead>
                    <TableHead>产品</TableHead>
                    <TableHead>数量</TableHead>
                    <TableHead>交货日期</TableHead>
                    <TableHead>剩余天数</TableHead>
                    <TableHead>完成进度</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveryAlerts.map((item) => {
                    const levelConfig = getLevelBadge(item.status);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.orderNo}</TableCell>
                        <TableCell>{item.customer}</TableCell>
                        <TableCell>{item.product}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.deliveryDate}</TableCell>
                        <TableCell>
                          <span className={`${item.daysRemaining <= 1 ? 'text-red-600 font-bold' : 'text-orange-600'}`}>
                            {item.daysRemaining} 天
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={item.progress} className="w-20 h-2" />
                            <span className="text-sm">{item.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={levelConfig.className}>
                            {levelConfig.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 预警规则 */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setRuleDialogOpen(true)}>
              新建规则
            </Button>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>规则名称</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>触发条件</TableHead>
                    <TableHead>通知方式</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getAlertTypeIcon(rule.type)}
                          <span>{getAlertTypeLabel(rule.type)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {rule.condition} {rule.threshold} {rule.unit}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {rule.notifyMethods.map((method, i) => (
                            <Badge key={i} variant="outline">{method}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={rule.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {rule.enabled ? '启用' : '停用'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">编辑</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 预警详情对话框 */}
      <Dialog open={alertDetailOpen} onOpenChange={setAlertDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAlert && getAlertTypeIcon(selectedAlert.type)}
              {selectedAlert?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedAlert && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={getLevelBadge(selectedAlert.level).className}>
                  {getLevelBadge(selectedAlert.level).label}
                </Badge>
                <Badge className={getStatusBadge(selectedAlert.status).className}>
                  {getStatusBadge(selectedAlert.status).label}
                </Badge>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <p>{selectedAlert.message}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">预警类型:</span>{' '}
                  {getAlertTypeLabel(selectedAlert.type)}
                </div>
                <div>
                  <span className="text-muted-foreground">来源:</span>{' '}
                  {selectedAlert.source}
                </div>
                {selectedAlert.relatedOrder && (
                  <div>
                    <span className="text-muted-foreground">关联订单:</span>{' '}
                    {selectedAlert.relatedOrder}
                  </div>
                )}
                {selectedAlert.relatedProduct && (
                  <div>
                    <span className="text-muted-foreground">关联产品:</span>{' '}
                    {selectedAlert.relatedProduct}
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">发生时间:</span>{' '}
                  {selectedAlert.createdAt}
                </div>
                {selectedAlert.acknowledgedBy && (
                  <div>
                    <span className="text-muted-foreground">确认人:</span>{' '}
                    {selectedAlert.acknowledgedBy}
                  </div>
                )}
                {selectedAlert.resolvedAt && (
                  <div>
                    <span className="text-muted-foreground">解决时间:</span>{' '}
                    {selectedAlert.resolvedAt}
                  </div>
                )}
              </div>
              
              {selectedAlert.action && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-green-800">
                    <CheckCircle className="h-4 w-4 inline mr-1" />
                    处理措施: {selectedAlert.action}
                  </p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            {selectedAlert?.status === 'active' && (
              <>
                <Button variant="outline" onClick={() => handleAcknowledge(selectedAlert.id)}>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  确认
                </Button>
                <Button onClick={() => handleResolve(selectedAlert.id)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  解决
                </Button>
              </>
            )}
            {selectedAlert?.status === 'acknowledged' && (
              <Button onClick={() => handleResolve(selectedAlert.id)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                标记已解决
              </Button>
            )}
            {selectedAlert?.status === 'resolved' && (
              <Button variant="outline" onClick={() => setAlertDetailOpen(false)}>
                关闭
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 预警规则对话框 */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>预警规则管理</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              配置预警规则，当条件触发时自动发送通知。
            </p>
            
            <div className="space-y-2">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{rule.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {rule.condition} {rule.threshold} {rule.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRules(prev => prev.map(r => 
                          r.id === rule.id ? { ...r, enabled: !r.enabled } : r
                        ));
                      }}
                    >
                      {rule.enabled ? (
                        <Bell className="h-4 w-4 text-green-500" />
                      ) : (
                        <BellOff className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
