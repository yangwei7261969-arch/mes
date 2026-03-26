'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  BellOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  Truck,
  Calendar,
  Clock,
  AlertCircle,
  Info,
  Trash2,
  Check,
  ExternalLink,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';

// 通知类型
export type NotificationType = 
  | 'shipping'      // 发货提醒
  | 'overdue'       // 超期提醒
  | 'inventory'     // 库存不足
  | 'quality'       // 质量问题
  | 'production'    // 生产异常
  | 'payment'       // 付款提醒
  | 'system';       // 系统通知

// 通知级别
export type NotificationLevel = 'critical' | 'warning' | 'info';

// 通知状态
export type NotificationStatus = 'unread' | 'read' | 'handled';

// 通知接口
export interface Notification {
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

// 通知类型配置
const NOTIFICATION_CONFIG = {
  shipping: { 
    label: '发货提醒', 
    icon: Truck, 
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  overdue: { 
    label: '超期提醒', 
    icon: Clock, 
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  inventory: { 
    label: '库存不足', 
    icon: Package, 
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  quality: { 
    label: '质量问题', 
    icon: AlertTriangle, 
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  production: { 
    label: '生产异常', 
    icon: AlertCircle, 
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  payment: { 
    label: '付款提醒', 
    icon: Calendar, 
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  system: { 
    label: '系统通知', 
    icon: Info, 
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
};

// 级别配置
const LEVEL_CONFIG = {
  critical: { label: '紧急', className: 'bg-red-100 text-red-800' },
  warning: { label: '警告', className: 'bg-yellow-100 text-yellow-800' },
  info: { label: '提示', className: 'bg-blue-100 text-blue-800' },
};

export default function NotificationCenter() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();
    // 每30秒检查新通知
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = () => {
    // 模拟获取通知数据
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'overdue',
        level: 'critical',
        title: '订单超期预警',
        message: '订单 PO-2024-001 已超过交货日期 2 天',
        detail: '客户: 客户A\n产品: 红色T恤 x 500件\n原定交期: 2024-01-14\n当前进度: 65%\n请尽快安排生产或与客户沟通延期。',
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
        detail: '当前库存: 50米\n安全库存: 200米\n缺口: 150米\n建议立即采购，否则将影响生产进度。',
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
        detail: '客户: 客户B\n产品: 蓝色衬衫 x 300件\n交货日期: 明天\n当前状态: 生产完成，待发货',
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
        detail: '订单总数: 200件\n已发货: 150件\n未发货: 50件 (黑色裤子 L码)\n请核实是否需要分批发货。',
        relatedOrder: 'PO-2024-003',
        relatedPage: '/shipment',
        createdAt: new Date(Date.now() - 14400000).toISOString(),
        status: 'unread',
      },
      {
        id: '5',
        type: 'quality',
        level: 'warning',
        title: '不良率超标',
        message: '缝制工序不良率达到 8%，超过标准值 5%',
        detail: '生产线: 缝制线A\n订单: PO-2024-002\n主要问题: 跳线、断线\n建议: 检查设备状态，加强质检。',
        relatedPage: '/quality-management',
        createdAt: new Date(Date.now() - 18000000).toISOString(),
        status: 'read',
      },
      {
        id: '6',
        type: 'production',
        level: 'info',
        title: '产能落后提醒',
        message: '缝制线B 今日产量落后计划 15%',
        detail: '计划产量: 180件\n实际产量: 153件\n差异: -27件\n原因分析: 新员工熟练度不足',
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
        detail: '供应商: 供应商A\n付款单号: PAY-2024-004\n金额: ¥25,000\n到期日: 明天\n银行: 工商银行',
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
        detail: '维护时间: 今晚 22:00 - 23:00\n影响范围: 所有功能暂停使用\n请提前保存工作内容。',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        status: 'read',
      },
    ];

    setNotifications(mockNotifications);
    setUnreadCount(mockNotifications.filter(n => n.status === 'unread').length);
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, status: 'read' } : n
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, status: 'read' })));
    setUnreadCount(0);
  };

  const handleHandle = (id: string, action: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id 
        ? { ...n, status: 'handled', handledAt: new Date().toISOString(), handledBy: '当前用户', action }
        : n
    ));
    setDetailDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    const notification = notifications.find(n => n.id === id);
    if (notification?.status === 'unread') {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleClearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return date.toLocaleDateString();
  };

  const getTypeConfig = (type: NotificationType) => NOTIFICATION_CONFIG[type];
  const getLevelConfig = (level: NotificationLevel) => LEVEL_CONFIG[level];

  // 按类型分组
  const groupedNotifications = {
    unread: notifications.filter(n => n.status === 'unread'),
    read: notifications.filter(n => n.status === 'read'),
    handled: notifications.filter(n => n.status === 'handled'),
  };

  // 播放通知音效
  const playNotificationSound = () => {
    if (soundEnabled && typeof window !== 'undefined') {
      // 使用Web Audio API播放简单提示音
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;
      
      oscillator.start();
      setTimeout(() => oscillator.stop(), 100);
    }
  };

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-96 p-0" align="end">
          {/* 头部 */}
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="font-medium">通知中心</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} 条未读
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? '关闭提示音' : '开启提示音'}
              >
                {soundEnabled ? (
                  <Volume2 className="h-3.5 w-3.5" />
                ) : (
                  <VolumeX className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
              >
                全部已读
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleClearAll}
                title="清空全部"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          
          {/* 通知列表 */}
          <Tabs defaultValue="unread" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="unread" className="text-xs">
                未读 ({groupedNotifications.unread.length})
              </TabsTrigger>
              <TabsTrigger value="read" className="text-xs">
                已读 ({groupedNotifications.read.length})
              </TabsTrigger>
              <TabsTrigger value="handled" className="text-xs">
                已处理 ({groupedNotifications.handled.length})
              </TabsTrigger>
            </TabsList>
            
            <ScrollArea className="h-80">
              {['unread', 'read', 'handled'].map((tab) => (
                <TabsContent key={tab} value={tab} className="m-0">
                  {groupedNotifications[tab as keyof typeof groupedNotifications].length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <BellOff className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-sm">暂无通知</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {groupedNotifications[tab as keyof typeof groupedNotifications].map((notification) => {
                        const typeConfig = getTypeConfig(notification.type);
                        const levelConfig = getLevelConfig(notification.level);
                        const Icon = typeConfig.icon;
                        
                        return (
                          <div
                            key={notification.id}
                            className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                              notification.status === 'unread' ? 'bg-blue-50/50' : ''
                            }`}
                            onClick={() => {
                              setSelectedNotification(notification);
                              setDetailDialogOpen(true);
                              if (notification.status === 'unread') {
                                handleMarkAsRead(notification.id);
                              }
                            }}
                          >
                            <div className="flex gap-3">
                              <div className={`mt-0.5 ${typeConfig.color}`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm truncate">
                                    {notification.title}
                                  </span>
                                  <Badge className={`${levelConfig.className} text-xs`}>
                                    {levelConfig.label}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {notification.message}
                                </p>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs text-muted-foreground">
                                    {formatTime(notification.createdAt)}
                                  </span>
                                  {notification.status === 'handled' && (
                                    <span className="text-xs text-green-600 flex items-center gap-1">
                                      <Check className="h-3 w-3" />
                                      已处理
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(notification.id);
                                }}
                              >
                                <XCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              ))}
            </ScrollArea>
          </Tabs>
          
          {/* 底部 */}
          <div className="p-2 border-t bg-gray-50">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => {
                setIsOpen(false);
                router.push('/notification-management');
              }}
            >
              <Settings className="h-3.5 w-3.5 mr-2" />
              通知设置
            </Button>
          </div>
        </PopoverContent>
      </Popover>

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
              
              <div className={`p-3 rounded-lg border ${getTypeConfig(selectedNotification.type).bgColor} ${getTypeConfig(selectedNotification.type).borderColor}`}>
                <p className="text-sm">{selectedNotification.message}</p>
              </div>
              
              {selectedNotification.detail && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap font-sans">
                    {selectedNotification.detail}
                  </pre>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                {selectedNotification.relatedOrder && (
                  <div>
                    <span className="text-muted-foreground">关联订单: </span>
                    <span className="font-medium">{selectedNotification.relatedOrder}</span>
                  </div>
                )}
                {selectedNotification.relatedPage && (
                  <div>
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="h-auto p-0"
                      onClick={() => {
                        setDetailDialogOpen(false);
                        setIsOpen(false);
                        router.push(selectedNotification.relatedPage!);
                      }}
                    >
                      查看相关页面
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
              
              {selectedNotification.status === 'handled' && selectedNotification.handledBy && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-green-800">
                    <CheckCircle className="h-4 w-4 inline mr-1" />
                    已由 {selectedNotification.handledBy} 于 {selectedNotification.handledAt && formatTime(selectedNotification.handledAt)} 处理
                    {selectedNotification.action && ` - ${selectedNotification.action}`}
                  </p>
                </div>
              )}
              
              <div className="flex gap-2 pt-4 border-t">
                {selectedNotification.status !== 'handled' && (
                  <>
                    <Button 
                      className="flex-1"
                      onClick={() => handleHandle(selectedNotification.id, '已处理')}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      标记已处理
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        if (selectedNotification.relatedPage) {
                          setDetailDialogOpen(false);
                          setIsOpen(false);
                          router.push(selectedNotification.relatedPage);
                        }
                      }}
                    >
                      前往处理
                    </Button>
                  </>
                )}
                {selectedNotification.status === 'handled' && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setDetailDialogOpen(false)}
                  >
                    关闭
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
