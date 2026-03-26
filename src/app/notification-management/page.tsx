'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Bell,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Edit,
  Eye,
  Send,
  Settings,
  Truck,
  Clock,
  Package,
  AlertTriangle,
  AlertCircle,
  Calendar,
  Info,
  CheckCircle,
  Volume2,
  VolumeX,
} from 'lucide-react';

// 通知类型
type NotificationType = 'shipping' | 'overdue' | 'inventory' | 'quality' | 'production' | 'payment' | 'system';
type NotificationLevel = 'critical' | 'warning' | 'info';
type NotificationStatus = 'unread' | 'read' | 'handled';

// 通知接口
interface Notification {
  id: string;
  type: NotificationType;
  level: NotificationLevel;
  title: string;
  message: string;
  detail?: string;
  relatedOrder?: string;
  relatedPage?: string;
  createdAt: string;
  status: NotificationStatus;
  handledAt?: string;
  handledBy?: string;
  action?: string;
}

// 通知规则
interface NotificationRule {
  id: string;
  name: string;
  type: NotificationType;
  condition: string;
  threshold: number;
  unit: string;
  enabled: boolean;
  notifyMethods: ('system' | 'email' | 'sms')[];
  recipients: string[];
}

// 类型配置
const TYPE_CONFIG: Record<NotificationType, { label: string; icon: typeof Truck; color: string; bgColor: string }> = {
  shipping: { label: '发货提醒', icon: Truck, color: 'text-blue-500', bgColor: 'bg-blue-50' },
  overdue: { label: '超期提醒', icon: Clock, color: 'text-red-500', bgColor: 'bg-red-50' },
  inventory: { label: '库存不足', icon: Package, color: 'text-orange-500', bgColor: 'bg-orange-50' },
  quality: { label: '质量问题', icon: AlertTriangle, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  production: { label: '生产异常', icon: AlertCircle, color: 'text-purple-500', bgColor: 'bg-purple-50' },
  payment: { label: '付款提醒', icon: Calendar, color: 'text-green-600', bgColor: 'bg-green-50' },
  system: { label: '系统通知', icon: Info, color: 'text-gray-500', bgColor: 'bg-gray-50' },
};

// 级别配置
const LEVEL_CONFIG: Record<NotificationLevel, { label: string; className: string }> = {
  critical: { label: '紧急', className: 'bg-red-100 text-red-800' },
  warning: { label: '警告', className: 'bg-yellow-100 text-yellow-800' },
  info: { label: '提示', className: 'bg-blue-100 text-blue-800' },
};

// 状态配置
const STATUS_CONFIG: Record<NotificationStatus, { label: string; className: string }> = {
  unread: { label: '未读', className: 'bg-red-100 text-red-800' },
  read: { label: '已读', className: 'bg-gray-100 text-gray-800' },
  handled: { label: '已处理', className: 'bg-green-100 text-green-800' },
};

// 接收人列表
const RECIPIENTS_OPTIONS = [
  '采购部', '生产主管', '质检', '仓库', '销售', '财务', '人事', '总经理'
];

export default function NotificationManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('notifications');
  
  // 通知列表
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  
  // 搜索和筛选
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<NotificationStatus | 'all'>('all');
  const [filterLevel, setFilterLevel] = useState<NotificationLevel | 'all'>('all');
  
  // 通知规则
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  
  // 新建公告
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    type: 'system' as NotificationType,
    level: 'info' as NotificationLevel,
    title: '',
    message: '',
    detail: '',
    relatedOrder: '',
  });
  
  // 通知设置
  const [settings, setSettings] = useState({
    soundEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
    autoRefresh: true,
    refreshInterval: 30,
  });
  
  // 保存设置
  const [settingsSaved, setSettingsSaved] = useState(false);

  // 统计
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    critical: 0,
    today: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  // 筛选通知
  useEffect(() => {
    let filtered = [...notifications];
    
    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(search) ||
        n.message.toLowerCase().includes(search) ||
        (n.relatedOrder && n.relatedOrder.toLowerCase().includes(search))
      );
    }
    
    if (filterType !== 'all') {
      filtered = filtered.filter(n => n.type === filterType);
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(n => n.status === filterStatus);
    }
    
    if (filterLevel !== 'all') {
      filtered = filtered.filter(n => n.level === filterLevel);
    }
    
    setFilteredNotifications(filtered);
  }, [notifications, searchText, filterType, filterStatus, filterLevel]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 模拟通知数据
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'overdue',
          level: 'critical',
          title: '订单超期预警',
          message: '订单 PO-2024-001 已超过交货日期 2 天',
          detail: '客户: 客户A\n产品: 红色T恤 x 500件\n原定交期: 2024-01-14\n当前进度: 65%',
          relatedOrder: 'PO-2024-001',
          relatedPage: '/production',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          status: 'unread',
        },
        {
          id: '2',
          type: 'inventory',
          level: 'critical',
          title: '面料库存不足',
          message: '红色T恤面料库存仅剩 50 米，低于安全库存',
          detail: '当前库存: 50米\n安全库存: 200米\n缺口: 150米',
          relatedPage: '/inventory',
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          status: 'unread',
        },
        {
          id: '3',
          type: 'shipping',
          level: 'warning',
          title: '发货提醒',
          message: '订单 PO-2024-005 明天交货，请确认发货状态',
          detail: '客户: 客户B\n产品: 蓝色衬衫 x 300件\n交货日期: 明天',
          relatedOrder: 'PO-2024-005',
          relatedPage: '/shipping-tasks',
          createdAt: new Date(Date.now() - 10800000).toISOString(),
          status: 'unread',
        },
        {
          id: '4',
          type: 'shipping',
          level: 'warning',
          title: '可能漏发',
          message: '订单 PO-2024-003 部分产品未发货，请核实',
          detail: '订单总数: 200件\n已发货: 150件\n未发货: 50件',
          relatedOrder: 'PO-2024-003',
          relatedPage: '/shipment',
          createdAt: new Date(Date.now() - 14400000).toISOString(),
          status: 'read',
        },
        {
          id: '5',
          type: 'quality',
          level: 'warning',
          title: '不良率超标',
          message: '缝制工序不良率达到 8%，超过标准值 5%',
          relatedPage: '/quality-management',
          createdAt: new Date(Date.now() - 18000000).toISOString(),
          status: 'handled',
          handledAt: new Date(Date.now() - 3600000).toISOString(),
          handledBy: '张主管',
          action: '已安排返工',
        },
        {
          id: '6',
          type: 'production',
          level: 'info',
          title: '产能落后提醒',
          message: '缝制线B 今日产量落后计划 15%',
          relatedPage: '/mes-dashboard',
          createdAt: new Date(Date.now() - 21600000).toISOString(),
          status: 'read',
        },
        {
          id: '7',
          type: 'payment',
          level: 'warning',
          title: '付款到期提醒',
          message: '供应商A 应付款 ¥25,000 将于明天到期',
          relatedPage: '/supplier-payment',
          createdAt: new Date(Date.now() - 25200000).toISOString(),
          status: 'handled',
          handledAt: new Date(Date.now() - 3600000).toISOString(),
          handledBy: '财务张三',
          action: '已安排付款',
        },
        {
          id: '8',
          type: 'system',
          level: 'info',
          title: '系统维护通知',
          message: '系统将于今晚 22:00 进行例行维护',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          status: 'read',
        },
      ];
      setNotifications(mockNotifications);
      setFilteredNotifications(mockNotifications);

      // 通知规则
      setRules([
        { id: '1', name: '库存安全预警', type: 'inventory', condition: '库存量 < 安全库存', threshold: 0, unit: '%', enabled: true, notifyMethods: ['system', 'email'], recipients: ['采购部', '生产主管'] },
        { id: '2', name: '交期预警', type: 'overdue', condition: '距离交货日期 <=', threshold: 3, unit: '天', enabled: true, notifyMethods: ['system', 'email', 'sms'], recipients: ['生产主管', '销售'] },
        { id: '3', name: '发货漏发预警', type: 'shipping', condition: '发货数量 < 订单数量', threshold: 0, unit: '%', enabled: true, notifyMethods: ['system'], recipients: ['仓库', '销售'] },
        { id: '4', name: '不良率预警', type: 'quality', condition: '不良率 >', threshold: 5, unit: '%', enabled: true, notifyMethods: ['system', 'email'], recipients: ['质检', '生产主管'] },
        { id: '5', name: '产能落后预警', type: 'production', condition: '落后计划 >', threshold: 10, unit: '%', enabled: true, notifyMethods: ['system'], recipients: ['生产主管'] },
        { id: '6', name: '付款到期预警', type: 'payment', condition: '距离到期日 <=', threshold: 3, unit: '天', enabled: true, notifyMethods: ['system', 'email'], recipients: ['财务', '采购'] },
      ]);

      // 统计
      setStats({
        total: mockNotifications.length,
        unread: mockNotifications.filter(n => n.status === 'unread').length,
        critical: mockNotifications.filter(n => n.level === 'critical').length,
        today: mockNotifications.filter(n => {
          const today = new Date().toDateString();
          return new Date(n.createdAt).toDateString() === today;
        }).length,
      });

    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendAnnouncement = () => {
    if (!newAnnouncement.title || !newAnnouncement.message) {
      alert('请填写完整信息');
      return;
    }

    const notification: Notification = {
      id: Date.now().toString(),
      type: newAnnouncement.type,
      level: newAnnouncement.level,
      title: newAnnouncement.title,
      message: newAnnouncement.message,
      detail: newAnnouncement.detail,
      relatedOrder: newAnnouncement.relatedOrder,
      createdAt: new Date().toISOString(),
      status: 'unread',
    };

    setNotifications(prev => [notification, ...prev]);
    setCreateDialogOpen(false);
    setNewAnnouncement({
      type: 'system',
      level: 'info',
      title: '',
      message: '',
      detail: '',
      relatedOrder: '',
    });
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => prev.map(n =>
      n.id === id ? { ...n, status: 'read' } : n
    ));
    // 更新统计
    setStats(prev => ({
      ...prev,
      unread: Math.max(0, prev.unread - 1),
    }));
  };

  const handleDelete = (id: string) => {
    const notification = notifications.find(n => n.id === id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (notification?.status === 'unread') {
      setStats(prev => ({
        ...prev,
        unread: Math.max(0, prev.unread - 1),
        total: prev.total - 1,
      }));
    } else {
      setStats(prev => ({
        ...prev,
        total: prev.total - 1,
      }));
    }
  };

  const handleBatchDelete = (status: NotificationStatus) => {
    const count = notifications.filter(n => n.status === status).length;
    setNotifications(prev => prev.filter(n => n.status !== status));
    if (status === 'unread') {
      setStats(prev => ({
        ...prev,
        unread: 0,
        total: prev.total - count,
      }));
    } else {
      setStats(prev => ({
        ...prev,
        total: prev.total - count,
      }));
    }
  };

  const handleToggleRule = (id: string) => {
    setRules(prev => prev.map(r =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    ));
  };

  const handleEditRule = (rule: NotificationRule) => {
    setEditingRule({ ...rule });
    setRuleDialogOpen(true);
  };

  const handleSaveRule = () => {
    if (!editingRule) return;
    
    setRules(prev => prev.map(r =>
      r.id === editingRule.id ? editingRule : r
    ));
    setRuleDialogOpen(false);
    setEditingRule(null);
  };

  const handleCreateRule = () => {
    const newRule: NotificationRule = {
      id: Date.now().toString(),
      name: '新规则',
      type: 'inventory',
      condition: '',
      threshold: 0,
      unit: '%',
      enabled: true,
      notifyMethods: ['system'],
      recipients: [],
    };
    setEditingRule(newRule);
    setRuleDialogOpen(true);
  };

  const handleDeleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const handleSaveSettings = () => {
    // 这里可以保存到后端
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  const handleGoToPage = (page: string) => {
    router.push(page);
  };

  const getTypeConfig = (type: NotificationType) => TYPE_CONFIG[type];
  const getLevelConfig = (level: NotificationLevel) => LEVEL_CONFIG[level];
  const getStatusConfig = (status: NotificationStatus) => STATUS_CONFIG[status];

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
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
        <h1 className="text-2xl font-bold">通知公告管理</h1>
        <div className="flex gap-2">
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Send className="h-4 w-4 mr-2" />
            发布公告
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">通知总数</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Bell className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">未读通知</p>
                <p className="text-2xl font-bold text-red-600">{stats.unread}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">紧急通知</p>
                <p className="text-2xl font-bold text-orange-600">{stats.critical}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">今日通知</p>
                <p className="text-2xl font-bold text-blue-600">{stats.today}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主内容区 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            通知列表
          </TabsTrigger>
          <TabsTrigger value="rules">
            <Settings className="h-4 w-4 mr-2" />
            通知规则
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Volume2 className="h-4 w-4 mr-2" />
            通知设置
          </TabsTrigger>
        </TabsList>

        {/* 通知列表 */}
        <TabsContent value="notifications" className="space-y-4">
          <div className="flex justify-between">
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="搜索通知..." 
                  className="pl-10 w-64"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as NotificationType | 'all')}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as NotificationStatus | 'all')}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterLevel} onValueChange={(v) => setFilterLevel(v as NotificationLevel | 'all')}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="级别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部级别</SelectItem>
                  {Object.entries(LEVEL_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleBatchDelete('read')}>
                清除已读
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleBatchDelete('handled')}>
                清除已处理
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setSearchText(''); setFilterType('all'); setFilterStatus('all'); setFilterLevel('all'); }}>
                重置筛选
              </Button>
            </div>
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
                    <TableHead>关联订单</TableHead>
                    <TableHead>时间</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNotifications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        暂无匹配的通知
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredNotifications.map((notification) => {
                      const typeConfig = getTypeConfig(notification.type);
                      const levelConfig = getLevelConfig(notification.level);
                      const statusConfig = getStatusConfig(notification.status);
                      const Icon = typeConfig.icon;
                      
                      return (
                        <TableRow key={notification.id} className={notification.status === 'unread' ? 'bg-blue-50/50' : ''}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${typeConfig.color}`} />
                              <span>{typeConfig.label}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={levelConfig.className}>{levelConfig.label}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{notification.title}</TableCell>
                          <TableCell className="max-w-xs truncate">{notification.message}</TableCell>
                          <TableCell>{notification.relatedOrder || '-'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatTime(notification.createdAt)}</TableCell>
                          <TableCell>
                            <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedNotification(notification);
                                  setDetailDialogOpen(true);
                                }}
                                title="查看详情"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {notification.status === 'unread' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMarkAsRead(notification.id)}
                                  title="标记已读"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                              {notification.relatedPage && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleGoToPage(notification.relatedPage!)}
                                  title="前往相关页面"
                                >
                                  <AlertCircle className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(notification.id)}
                                title="删除"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              <div className="mt-4 text-sm text-muted-foreground">
                显示 {filteredNotifications.length} / {notifications.length} 条通知
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 通知规则 */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleCreateRule}>
              <Plus className="h-4 w-4 mr-2" />
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
                    <TableHead>接收人</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => {
                    const typeConfig = getTypeConfig(rule.type);
                    const Icon = typeConfig.icon;
                    
                    return (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${typeConfig.color}`} />
                            <span>{typeConfig.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {rule.condition} {rule.threshold} {rule.unit}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {rule.notifyMethods.includes('system') && <Badge variant="outline">系统</Badge>}
                            {rule.notifyMethods.includes('email') && <Badge variant="outline">邮件</Badge>}
                            {rule.notifyMethods.includes('sms') && <Badge variant="outline">短信</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {rule.recipients.map((r, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{r}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={rule.enabled}
                            onCheckedChange={() => handleToggleRule(rule.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditRule(rule)}
                              title="编辑"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRule(rule.id)}
                              title="删除"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 通知设置 */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>通知设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">提示音</p>
                  <p className="text-sm text-muted-foreground">收到新通知时播放提示音</p>
                </div>
                <Switch
                  checked={settings.soundEnabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, soundEnabled: checked }))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">邮件通知</p>
                  <p className="text-sm text-muted-foreground">重要通知同时发送邮件</p>
                </div>
                <Switch
                  checked={settings.emailEnabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, emailEnabled: checked }))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">短信通知</p>
                  <p className="text-sm text-muted-foreground">紧急通知同时发送短信</p>
                </div>
                <Switch
                  checked={settings.smsEnabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, smsEnabled: checked }))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">自动刷新</p>
                  <p className="text-sm text-muted-foreground">自动检查新通知</p>
                </div>
                <Switch
                  checked={settings.autoRefresh}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoRefresh: checked }))}
                />
              </div>
              
              {settings.autoRefresh && (
                <div className="space-y-2">
                  <Label>刷新间隔 (秒)</Label>
                  <Input
                    type="number"
                    value={settings.refreshInterval}
                    onChange={(e) => setSettings(prev => ({ ...prev, refreshInterval: parseInt(e.target.value) || 30 }))}
                    className="w-32"
                  />
                </div>
              )}
              
              <div className="pt-4 border-t">
                <Button onClick={handleSaveSettings}>
                  {settingsSaved ? '已保存' : '保存设置'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 通知详情对话框 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedNotification && (
                <>
                  {(() => {
                    const typeConfig = getTypeConfig(selectedNotification.type);
                    const Icon = typeConfig.icon;
                    return <Icon className={`h-5 w-5 ${typeConfig.color}`} />;
                  })()}
                  {selectedNotification.title}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedNotification && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={getLevelConfig(selectedNotification.level).className}>
                  {getLevelConfig(selectedNotification.level).label}
                </Badge>
                <Badge variant="outline">
                  {getTypeConfig(selectedNotification.type).label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {formatTime(selectedNotification.createdAt)}
                </span>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <p>{selectedNotification.message}</p>
              </div>
              
              {selectedNotification.detail && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap font-sans">
                    {selectedNotification.detail}
                  </pre>
                </div>
              )}
              
              {selectedNotification.relatedOrder && (
                <div className="text-sm">
                  <span className="text-muted-foreground">关联订单: </span>
                  <span className="font-medium">{selectedNotification.relatedOrder}</span>
                </div>
              )}
              
              {selectedNotification.status === 'handled' && selectedNotification.handledBy && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-green-800">
                    <CheckCircle className="h-4 w-4 inline mr-1" />
                    已由 {selectedNotification.handledBy} 处理
                    {selectedNotification.action && ` - ${selectedNotification.action}`}
                  </p>
                </div>
              )}
              
              <div className="flex gap-2 pt-4 border-t">
                {selectedNotification.relatedPage && (
                  <Button 
                    onClick={() => {
                      setDetailDialogOpen(false);
                      handleGoToPage(selectedNotification.relatedPage!);
                    }}
                  >
                    前往处理
                  </Button>
                )}
                <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
                  关闭
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 发布公告对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>发布公告</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>类型</Label>
                <Select
                  value={newAnnouncement.type}
                  onValueChange={(value: NotificationType) => 
                    setNewAnnouncement(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>级别</Label>
                <Select
                  value={newAnnouncement.level}
                  onValueChange={(value: NotificationLevel) => 
                    setNewAnnouncement(prev => ({ ...prev, level: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LEVEL_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>标题 *</Label>
              <Input
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                placeholder="通知标题"
              />
            </div>
            
            <div className="space-y-2">
              <Label>消息 *</Label>
              <Input
                value={newAnnouncement.message}
                onChange={(e) => setNewAnnouncement(prev => ({ ...prev, message: e.target.value }))}
                placeholder="简短消息"
              />
            </div>
            
            <div className="space-y-2">
              <Label>详细内容</Label>
              <Textarea
                value={newAnnouncement.detail}
                onChange={(e) => setNewAnnouncement(prev => ({ ...prev, detail: e.target.value }))}
                placeholder="详细信息"
                rows={4}
              />
            </div>
            
            <div className="space-y-2">
              <Label>关联订单</Label>
              <Input
                value={newAnnouncement.relatedOrder}
                onChange={(e) => setNewAnnouncement(prev => ({ ...prev, relatedOrder: e.target.value }))}
                placeholder="PO-2024-001"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSendAnnouncement}>
              <Send className="h-4 w-4 mr-2" />
              发布
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 规则编辑对话框 */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRule?.id.includes('new') ? '新建规则' : '编辑规则'}</DialogTitle>
          </DialogHeader>
          
          {editingRule && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>规则名称</Label>
                <Input
                  value={editingRule.name}
                  onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>通知类型</Label>
                <Select
                  value={editingRule.type}
                  onValueChange={(value: NotificationType) => 
                    setEditingRule({ ...editingRule, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label>条件</Label>
                  <Input
                    value={editingRule.condition}
                    onChange={(e) => setEditingRule({ ...editingRule, condition: e.target.value })}
                    placeholder="如: 库存量 <"
                  />
                </div>
                <div className="space-y-2">
                  <Label>阈值</Label>
                  <Input
                    type="number"
                    value={editingRule.threshold}
                    onChange={(e) => setEditingRule({ ...editingRule, threshold: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>单位</Label>
                  <Input
                    value={editingRule.unit}
                    onChange={(e) => setEditingRule({ ...editingRule, unit: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>通知方式</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={editingRule.notifyMethods.includes('system')}
                      onCheckedChange={(checked) => {
                        const methods = checked
                          ? [...editingRule.notifyMethods, 'system']
                          : editingRule.notifyMethods.filter(m => m !== 'system');
                        setEditingRule({ ...editingRule, notifyMethods: methods as any });
                      }}
                    />
                    系统
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={editingRule.notifyMethods.includes('email')}
                      onCheckedChange={(checked) => {
                        const methods = checked
                          ? [...editingRule.notifyMethods, 'email']
                          : editingRule.notifyMethods.filter(m => m !== 'email');
                        setEditingRule({ ...editingRule, notifyMethods: methods as any });
                      }}
                    />
                    邮件
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={editingRule.notifyMethods.includes('sms')}
                      onCheckedChange={(checked) => {
                        const methods = checked
                          ? [...editingRule.notifyMethods, 'sms']
                          : editingRule.notifyMethods.filter(m => m !== 'sms');
                        setEditingRule({ ...editingRule, notifyMethods: methods as any });
                      }}
                    />
                    短信
                  </label>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>接收人</Label>
                <div className="flex flex-wrap gap-2">
                  {RECIPIENTS_OPTIONS.map((recipient) => (
                    <label key={recipient} className="flex items-center gap-2">
                      <Checkbox
                        checked={editingRule.recipients.includes(recipient)}
                        onCheckedChange={(checked) => {
                          const recipients = checked
                            ? [...editingRule.recipients, recipient]
                            : editingRule.recipients.filter(r => r !== recipient);
                          setEditingRule({ ...editingRule, recipients });
                        }}
                      />
                      {recipient}
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <Label>启用规则</Label>
                <Switch
                  checked={editingRule.enabled}
                  onCheckedChange={(checked) => setEditingRule({ ...editingRule, enabled: checked })}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveRule}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
