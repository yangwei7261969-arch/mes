'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  ORDER_STATUS_OPTIONS, 
  PRODUCTION_STATUS_OPTIONS, 
  QUALITY_STATUS_OPTIONS,
  PRIORITY_OPTIONS 
} from '@/lib/constants';

type StatusType = 'order' | 'production' | 'quality' | 'priority';

interface StatusBadgeProps {
  status: string;
  type?: StatusType;
  customConfig?: Record<string, { label: string; className: string }>;
  className?: string;
}

const DEFAULT_CLASSES = {
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  gray: 'bg-gray-100 text-gray-700',
  red: 'bg-red-100 text-red-700',
  orange: 'bg-orange-100 text-orange-700',
  purple: 'bg-purple-100 text-purple-700',
};

// 颜色映射
type ColorKey = keyof typeof DEFAULT_CLASSES;

export function StatusBadge({ 
  status, 
  type = 'order', 
  customConfig,
  className = ''
}: StatusBadgeProps) {
  // 获取状态配置
  const getConfig = () => {
    if (customConfig && customConfig[status]) {
      return customConfig[status];
    }

    let found: { value: string; label: string; color: string } | undefined;
    
    switch (type) {
      case 'order':
        found = ORDER_STATUS_OPTIONS.find(o => o.value === status);
        break;
      case 'production':
        found = PRODUCTION_STATUS_OPTIONS.find(o => o.value === status);
        break;
      case 'quality':
        found = QUALITY_STATUS_OPTIONS.find(o => o.value === status);
        break;
      case 'priority':
        found = PRIORITY_OPTIONS.find(o => o.value === status);
        break;
    }

    if (found) {
      return {
        label: found.label,
        className: DEFAULT_CLASSES[found.color as ColorKey] || DEFAULT_CLASSES.gray,
      };
    }

    return { label: status, className: DEFAULT_CLASSES.gray };
  };

  const config = getConfig();

  return (
    <Badge className={`${config.className} ${className}`}>
      {config.label}
    </Badge>
  );
}

// 预定义的状态配置（用于自定义类型）
export const STATUS_CONFIGS = {
  // 生产相关
  production: {
    pending: { label: '待开始', className: DEFAULT_CLASSES.gray },
    preparing: { label: '准备中', className: DEFAULT_CLASSES.amber },
    in_progress: { label: '生产中', className: DEFAULT_CLASSES.blue },
    paused: { label: '已暂停', className: DEFAULT_CLASSES.orange },
    completed: { label: '已完成', className: DEFAULT_CLASSES.green },
    cancelled: { label: '已取消', className: DEFAULT_CLASSES.red },
  },
  // 质检相关
  quality: {
    pending: { label: '待检', className: DEFAULT_CLASSES.amber },
    passed: { label: '合格', className: DEFAULT_CLASSES.green },
    failed: { label: '不合格', className: DEFAULT_CLASSES.red },
    rework: { label: '返工', className: DEFAULT_CLASSES.orange },
  },
  // 条码/工票状态
  ticket: {
    pending: { label: '待处理', className: DEFAULT_CLASSES.amber },
    in_progress: { label: '进行中', className: DEFAULT_CLASSES.blue },
    completed: { label: '已完成', className: DEFAULT_CLASSES.green },
    cancelled: { label: '已取消', className: DEFAULT_CLASSES.gray },
  },
  // 库存状态
  inventory: {
    normal: { label: '正常', className: DEFAULT_CLASSES.green },
    low: { label: '库存不足', className: DEFAULT_CLASSES.amber },
    out: { label: '缺货', className: DEFAULT_CLASSES.red },
  },
  // 供应商状态
  supplier: {
    active: { label: '合作中', className: DEFAULT_CLASSES.green },
    inactive: { label: '已停用', className: DEFAULT_CLASSES.gray },
    pending: { label: '待审核', className: DEFAULT_CLASSES.amber },
  },
  // 预警状态
  alert: {
    active: { label: '活动', className: DEFAULT_CLASSES.red },
    resolved: { label: '已解决', className: DEFAULT_CLASSES.green },
    ignored: { label: '已忽略', className: DEFAULT_CLASSES.gray },
  },
  // 裁床分扎状态
  bundle: {
    pending: { label: '待分发', className: DEFAULT_CLASSES.amber },
    in_production: { label: '生产中', className: DEFAULT_CLASSES.blue },
    completed: { label: '已完成', className: DEFAULT_CLASSES.green },
    rework: { label: '返工中', className: DEFAULT_CLASSES.orange },
  },
};

export default StatusBadge;
