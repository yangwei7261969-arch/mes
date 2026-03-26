'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Activity,
  Package,
  Users,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Zap,
  RefreshCw,
  BarChart3,
  PieChart,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

interface ProductionLine {
  id: string;
  name: string;
  status: 'running' | 'idle' | 'maintenance' | 'offline';
  currentOrder: string;
  efficiency: number;
  workers: number;
  targetQty: number;
  completedQty: number;
  defectRate: number;
}

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  source: string;
  time: string;
}

export default function MESDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // 实时数据
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    completedOrders: 0,
    totalOutput: 0,
    avgEfficiency: 0,
    defectRate: 0,
    onTimeRate: 0,
  });
  
  // 产能趋势数据
  const [outputTrend, setOutputTrend] = useState<{hour: string; output: number; target: number}[]>([]);
  
  // 工序效率数据
  const [processEfficiency, setProcessEfficiency] = useState<{name: string; value: number}[]>([]);

  useEffect(() => {
    fetchDashboardData();
    // 每30秒自动刷新
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    setRefreshing(true);
    try {
      // 获取生产订单数据
      const ordersRes = await fetch('/api/production-orders');
      const ordersData = await ordersRes.json();
      
      if (ordersData.success) {
        const orders = ordersData.data || [];
        const completed = orders.filter((o: any) => o.status === 'completed').length;
        const totalOutput = orders.reduce((sum: number, o: any) => sum + (o.completed_quantity || 0), 0);
        
        setStats(prev => ({
          ...prev,
          totalOrders: orders.length,
          completedOrders: completed,
          totalOutput,
          onTimeRate: Math.round((completed / Math.max(orders.length, 1)) * 100),
        }));

        // 生成模拟的产线数据
        const lines: ProductionLine[] = [
          { id: '1', name: '裁床线A', status: 'running', currentOrder: 'PO-2024-001', efficiency: 85, workers: 12, targetQty: 500, completedQty: 380, defectRate: 2.1 },
          { id: '2', name: '缝制线B', status: 'running', currentOrder: 'PO-2024-002', efficiency: 92, workers: 18, targetQty: 300, completedQty: 256, defectRate: 1.5 },
          { id: '3', name: '整烫线C', status: 'idle', currentOrder: '-', efficiency: 0, workers: 8, targetQty: 0, completedQty: 0, defectRate: 0 },
          { id: '4', name: '包装线D', status: 'running', currentOrder: 'PO-2024-003', efficiency: 78, workers: 10, targetQty: 200, completedQty: 145, defectRate: 0.8 },
        ];
        setProductionLines(lines);
        
        const avgEff = lines.filter(l => l.status === 'running').reduce((sum, l) => sum + l.efficiency, 0) / Math.max(lines.filter(l => l.status === 'running').length, 1);
        const avgDefect = lines.filter(l => l.status === 'running').reduce((sum, l) => sum + l.defectRate, 0) / Math.max(lines.filter(l => l.status === 'running').length, 1);
        
        setStats(prev => ({
          ...prev,
          avgEfficiency: Math.round(avgEff),
          defectRate: parseFloat(avgDefect.toFixed(2)),
        }));
      }

      // 获取裁床分扎数据
      const bundlesRes = await fetch('/api/cutting-bundles');
      const bundlesData = await bundlesRes.json();
      
      // 获取外发数据
      const outsourceRes = await fetch('/api/cut-piece-outsources');
      const outsourceData = await outsourceRes.json();

      // 生成预警数据
      const alertList: Alert[] = [];
      
      if (outsourceData.success) {
        const pending = (outsourceData.data || []).filter((o: any) => o.status === 'pending' || o.status === 'sent');
        pending.slice(0, 3).forEach((o: any) => {
          alertList.push({
            id: o.id,
            type: 'warning',
            message: `外发单 ${o.bundle_no} 待处理`,
            source: '外发管理',
            time: new Date().toLocaleTimeString(),
          });
        });
      }
      
      // 添加模拟预警
      alertList.push(
        { id: '1', type: 'critical', message: '缝制线B 产能落后计划15%', source: '生产监控', time: '10:30' },
        { id: '2', type: 'warning', message: '面料库存即将不足（红色T恤）', source: '库存预警', time: '09:45' },
        { id: '3', type: 'info', message: 'PO-2024-004 已完成全部工序', source: '订单跟踪', time: '09:20' },
      );
      
      setAlerts(alertList);

      // 生成产能趋势数据
      const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
      const trend = hours.map((hour, i) => ({
        hour,
        output: Math.floor(150 + Math.random() * 100),
        target: 180,
      }));
      setOutputTrend(trend);

      // 工序效率
      setProcessEfficiency([
        { name: '裁床', value: 92 },
        { name: '缝制', value: 85 },
        { name: '整烫', value: 88 },
        { name: '质检', value: 95 },
        { name: '包装', value: 90 },
      ]);

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      running: 'bg-green-500',
      idle: 'bg-yellow-500',
      maintenance: 'bg-blue-500',
      offline: 'bg-gray-400',
    };
    return colors[status] || 'bg-gray-400';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      running: '运行中',
      idle: '待机',
      maintenance: '维护中',
      offline: '离线',
    };
    return texts[status] || status;
  };

  const getAlertColor = (type: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-100 border-red-300 text-red-800',
      warning: 'bg-yellow-100 border-yellow-300 text-yellow-800',
      info: 'bg-blue-100 border-blue-300 text-blue-800',
    };
    return colors[type] || 'bg-gray-100 border-gray-300 text-gray-800';
  };

  const getAlertIcon = (type: string) => {
    if (type === 'critical') return <XCircle className="h-4 w-4 text-red-500" />;
    if (type === 'warning') return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-blue-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* 顶部统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">在产订单</p>
                <p className="text-2xl font-bold">{stats.totalOrders - stats.completedOrders}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">今日产量</p>
                <p className="text-2xl font-bold">{stats.totalOutput}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">平均效率</p>
                <p className="text-2xl font-bold">{stats.avgEfficiency}%</p>
              </div>
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">不良率</p>
                <p className="text-2xl font-bold">{stats.defectRate}%</p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">准时交付</p>
                <p className="text-2xl font-bold">{stats.onTimeRate}%</p>
              </div>
              <Clock className="h-8 w-8 text-teal-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">预警数量</p>
                <p className="text-2xl font-bold text-red-500">{alerts.filter(a => a.type === 'critical').length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主要内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：产线状态 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 产线实时状态 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                产线实时状态
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={fetchDashboardData}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                刷新
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {productionLines.map((line) => (
                  <div key={line.id} className="border rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(line.status)}`} />
                        <span className="font-medium">{line.name}</span>
                        <Badge variant={line.status === 'running' ? 'default' : 'secondary'}>
                          {getStatusText(line.status)}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        当前订单: <span className="font-medium text-foreground">{line.currentOrder}</span>
                      </div>
                    </div>
                    
                    {line.status === 'running' && (
                      <>
                        <div className="grid grid-cols-4 gap-4 mb-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">人数</span>
                            <p className="font-medium">{line.workers} 人</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">目标</span>
                            <p className="font-medium">{line.targetQty}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">完成</span>
                            <p className="font-medium">{line.completedQty}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">不良率</span>
                            <p className={`font-medium ${line.defectRate > 2 ? 'text-red-500' : ''}`}>
                              {line.defectRate}%
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">进度</span>
                            <span className="font-medium">{Math.round((line.completedQty / line.targetQty) * 100)}%</span>
                          </div>
                          <Progress value={(line.completedQty / line.targetQty) * 100} className="h-2" />
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm text-muted-foreground">效率</span>
                          <Badge variant={line.efficiency >= 85 ? 'default' : 'destructive'}>
                            {line.efficiency}%
                          </Badge>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 产能趋势图 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                今日产能趋势
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={outputTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="output" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="实际产量" />
                    <Line type="monotone" dataKey="target" stroke="#94a3b8" strokeDasharray="5 5" name="目标产量" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 工序效率 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-purple-500" />
                工序效率对比
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {processEfficiency.map((process) => (
                  <div key={process.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{process.name}</span>
                      <span className="font-medium">{process.value}%</span>
                    </div>
                    <Progress 
                      value={process.value} 
                      className={`h-3 ${process.value >= 90 ? 'bg-green-100' : process.value >= 80 ? 'bg-blue-100' : 'bg-yellow-100'}`}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：预警和快速操作 */}
        <div className="space-y-6">
          {/* 实时预警 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                实时预警
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`p-3 rounded-lg border ${getAlertColor(alert.type)}`}
                  >
                    <div className="flex items-start gap-2">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{alert.message}</p>
                        <div className="flex justify-between text-xs mt-1 opacity-70">
                          <span>{alert.source}</span>
                          <span>{alert.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 快速操作 */}
          <Card>
            <CardHeader>
              <CardTitle>快速操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" variant="outline">
                <Package className="h-4 w-4 mr-2" />
                新建生产订单
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Activity className="h-4 w-4 mr-2" />
                裁床分扎
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                外发跟踪
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <CheckCircle className="h-4 w-4 mr-2" />
                质量检验
              </Button>
            </CardContent>
          </Card>

          {/* 今日概览 */}
          <Card>
            <CardHeader>
              <CardTitle>今日概览</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">计划产量</span>
                  <span className="font-bold text-lg">1,500</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">实际产量</span>
                  <span className="font-bold text-lg text-green-600">{stats.totalOutput}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">达成率</span>
                  <Badge variant={stats.totalOutput >= 1500 ? 'default' : 'secondary'}>
                    {Math.round((stats.totalOutput / 1500) * 100)}%
                  </Badge>
                </div>
                <Progress value={(stats.totalOutput / 1500) * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
