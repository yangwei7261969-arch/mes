'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, X, ChevronRight, Bell, Package, Truck, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// 公告类型
export type AnnouncementType = 'critical' | 'warning' | 'info';

// 公告数据
export interface Announcement {
  id: string;
  type: AnnouncementType;
  title: string;
  message: string;
  actionText?: string;
  actionUrl?: string;
  createdAt: string;
  dismissible: boolean;
}

// 公告配置
const ANNOUNCEMENT_CONFIG = {
  critical: {
    bgColor: 'bg-red-600',
    textColor: 'text-white',
    icon: AlertTriangle,
    animate: true,
  },
  warning: {
    bgColor: 'bg-amber-500',
    textColor: 'text-white',
    icon: AlertCircle,
    animate: false,
  },
  info: {
    bgColor: 'bg-blue-500',
    textColor: 'text-white',
    icon: Bell,
    animate: false,
  },
};

interface PageAnnouncementProps {
  pageId?: string; // 页面标识，用于过滤相关公告
  className?: string;
}

export default function PageAnnouncement({ pageId, className }: PageAnnouncementProps) {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchAnnouncements();
    // 从localStorage读取已关闭的公告
    const dismissed = localStorage.getItem('dismissedAnnouncements');
    if (dismissed) {
      setDismissedIds(JSON.parse(dismissed));
    }
  }, [pageId]);

  const fetchAnnouncements = () => {
    // 模拟获取公告数据 - 实际项目中应从API获取
    const allAnnouncements: Announcement[] = [
      {
        id: '1',
        type: 'critical',
        title: '紧急',
        message: '订单 PO-2024-001 已超期 2 天，请立即处理！',
        actionText: '查看订单',
        actionUrl: '/production',
        createdAt: new Date().toISOString(),
        dismissible: false,
      },
      {
        id: '2',
        type: 'warning',
        title: '库存预警',
        message: '红色T恤面料库存不足，仅剩 50 米',
        actionText: '立即采购',
        actionUrl: '/inventory',
        createdAt: new Date().toISOString(),
        dismissible: true,
      },
      {
        id: '3',
        type: 'warning',
        title: '发货提醒',
        message: '订单 PO-2024-005 明天交货，请确认发货状态',
        actionText: '查看详情',
        actionUrl: '/shipping-tasks',
        createdAt: new Date().toISOString(),
        dismissible: true,
      },
      {
        id: '4',
        type: 'info',
        title: '漏发提醒',
        message: '订单 PO-2024-003 部分产品未发货（50件），请核实',
        actionText: '查看详情',
        actionUrl: '/shipment',
        createdAt: new Date().toISOString(),
        dismissible: true,
      },
    ];

    setAnnouncements(allAnnouncements);
  };

  const handleDismiss = (id: string) => {
    const newDismissed = [...dismissedIds, id];
    setDismissedIds(newDismissed);
    localStorage.setItem('dismissedAnnouncements', JSON.stringify(newDismissed));
    
    // 如果当前显示的被关闭，切换到下一个
    const visibleAnnouncements = announcements.filter(a => !dismissedIds.includes(a.id));
    if (currentIndex >= visibleAnnouncements.length - 1) {
      setCurrentIndex(0);
    }
  };

  const handleAction = (announcement: Announcement) => {
    if (announcement.actionUrl) {
      router.push(announcement.actionUrl);
    }
  };

  // 过滤掉已关闭的公告
  const visibleAnnouncements = announcements.filter(a => !dismissedIds.includes(a.id));

  if (visibleAnnouncements.length === 0) {
    return null;
  }

  const currentAnnouncement = visibleAnnouncements[currentIndex];
  const config = ANNOUNCEMENT_CONFIG[currentAnnouncement.type];
  const Icon = config.icon;

  return (
    <div className={cn('relative', className)}>
      {/* 多条公告轮播指示器 */}
      {visibleAnnouncements.length > 1 && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex gap-1">
          {visibleAnnouncements.map((_, index) => (
            <button
              key={index}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                index === currentIndex ? 'bg-white' : 'bg-white/50'
              )}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      )}

      <div
        className={cn(
          'flex items-center gap-3 px-4 py-2',
          config.bgColor,
          config.textColor,
          config.animate && 'animate-pulse'
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <Badge variant="outline" className="shrink-0 border-white/50 text-white">
            {currentAnnouncement.title}
          </Badge>
          <span className="truncate text-sm">
            {currentAnnouncement.message}
          </span>
        </div>

        {currentAnnouncement.actionText && (
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-white/30 text-white hover:bg-white/20"
            onClick={() => handleAction(currentAnnouncement)}
          >
            {currentAnnouncement.actionText}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}

        {currentAnnouncement.dismissible && (
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0 h-6 w-6 text-white/80 hover:text-white hover:bg-white/20"
            onClick={() => handleDismiss(currentAnnouncement.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* 自动轮播 */}
      {visibleAnnouncements.length > 1 && (
        <AutoRotate
          interval={5000}
          onRotate={() => {
            setCurrentIndex((prev) => (prev + 1) % visibleAnnouncements.length);
          }}
        />
      )}
    </div>
  );
}

// 自动轮播组件
function AutoRotate({ interval, onRotate }: { interval: number; onRotate: () => void }) {
  useEffect(() => {
    const timer = setInterval(onRotate, interval);
    return () => clearInterval(timer);
  }, [interval, onRotate]);
  return null;
}

// 简化版公告横幅 - 用于特定场景
export function SimpleAnnouncementBanner({ 
  type = 'warning',
  message,
  actionText,
  onAction,
  onDismiss,
}: {
  type?: AnnouncementType;
  message: string;
  actionText?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}) {
  const config = ANNOUNCEMENT_CONFIG[type];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-3 px-4 py-2', config.bgColor, config.textColor)}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-sm truncate">{message}</span>
      {actionText && (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 border-white/30 text-white hover:bg-white/20 h-7"
          onClick={onAction}
        >
          {actionText}
        </Button>
      )}
      {onDismiss && (
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0 h-6 w-6 text-white/80 hover:text-white hover:bg-white/20"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// 快捷公告提示组件 - 用于页面内特定位置
export function QuickAnnouncement({
  type,
  icon: CustomIcon,
  title,
  message,
  action,
  className,
}: {
  type: 'shipping' | 'overdue' | 'inventory' | 'quality' | 'production';
  icon?: React.ReactNode;
  title: string;
  message: string;
  action?: React.ReactNode;
  className?: string;
}) {
  const typeStyles = {
    shipping: 'bg-blue-50 border-blue-200 text-blue-800',
    overdue: 'bg-red-50 border-red-200 text-red-800',
    inventory: 'bg-orange-50 border-orange-200 text-orange-800',
    quality: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    production: 'bg-purple-50 border-purple-200 text-purple-800',
  };

  const defaultIcons = {
    shipping: <Truck className="h-5 w-5" />,
    overdue: <Clock className="h-5 w-5" />,
    inventory: <Package className="h-5 w-5" />,
    quality: <AlertTriangle className="h-5 w-5" />,
    production: <AlertCircle className="h-5 w-5" />,
  };

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-lg border',
      typeStyles[type],
      className
    )}>
      <div className="shrink-0 mt-0.5">
        {CustomIcon || defaultIcons[type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{title}</p>
        <p className="text-sm opacity-90">{message}</p>
      </div>
      {action && (
        <div className="shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}
