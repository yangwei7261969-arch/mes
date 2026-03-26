/**
 * 服装行业通用常量
 */

// 常用颜色选项
export const COLOR_OPTIONS = [
  { value: '白色', label: '白色', hex: '#FFFFFF' },
  { value: '黑色', label: '黑色', hex: '#000000' },
  { value: '红色', label: '红色', hex: '#E53935' },
  { value: '蓝色', label: '蓝色', hex: '#1E88E5' },
  { value: '灰色', label: '灰色', hex: '#9E9E9E' },
  { value: '绿色', label: '绿色', hex: '#43A047' },
  { value: '黄色', label: '黄色', hex: '#FDD835' },
  { value: '粉色', label: '粉色', hex: '#F48FB1' },
  { value: '紫色', label: '紫色', hex: '#8E24AA' },
  { value: '卡其色', label: '卡其色', hex: '#C5A572' },
  { value: '藏青色', label: '藏青色', hex: '#1A237E' },
  { value: '军绿色', label: '军绿色', hex: '#4E5E3A' },
  { value: '棕色', label: '棕色', hex: '#795548' },
  { value: '橙色', label: '橙色', hex: '#FF9800' },
  { value: '米色', label: '米色', hex: '#F5F5DC' },
  { value: '驼色', label: '驼色', hex: '#C19A6B' },
] as const;

// 常用尺码选项 - 成衣
export const SIZE_OPTIONS_APPAREL = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '2XL', '3XL', '4XL', '5XL'];

// 常用尺码选项 - 裤装
export const SIZE_OPTIONS_PANTS = ['28', '29', '30', '31', '32', '33', '34', '36', '38', '40', '42', '44', '46', '48', '50'];

// 所有尺码选项
export const SIZE_OPTIONS = [...SIZE_OPTIONS_APPAREL, ...SIZE_OPTIONS_PANTS];

// 尺码分组
export const SIZE_GROUPS = {
  apparel: {
    label: '成衣尺码',
    options: SIZE_OPTIONS_APPAREL,
  },
  pants: {
    label: '裤装尺码',
    options: SIZE_OPTIONS_PANTS,
  },
} as const;

// 订单状态
export const ORDER_STATUS_OPTIONS = [
  { value: 'pending', label: '待处理', color: 'amber' },
  { value: 'confirmed', label: '已确认', color: 'blue' },
  { value: 'in_progress', label: '进行中', color: 'blue' },
  { value: 'completed', label: '已完成', color: 'green' },
  { value: 'cancelled', label: '已取消', color: 'gray' },
] as const;

// 生产状态
export const PRODUCTION_STATUS_OPTIONS = [
  { value: 'pending', label: '待开始', color: 'gray' },
  { value: 'preparing', label: '准备中', color: 'amber' },
  { value: 'in_progress', label: '生产中', color: 'blue' },
  { value: 'paused', label: '已暂停', color: 'orange' },
  { value: 'completed', label: '已完成', color: 'green' },
  { value: 'cancelled', label: '已取消', color: 'red' },
] as const;

// 质检状态
export const QUALITY_STATUS_OPTIONS = [
  { value: 'pending', label: '待检', color: 'amber' },
  { value: 'passed', label: '合格', color: 'green' },
  { value: 'failed', label: '不合格', color: 'red' },
  { value: 'rework', label: '返工', color: 'orange' },
] as const;

// 优先级
export const PRIORITY_OPTIONS = [
  { value: 'low', label: '低', color: 'gray' },
  { value: 'normal', label: '普通', color: 'blue' },
  { value: 'high', label: '高', color: 'orange' },
  { value: 'urgent', label: '紧急', color: 'red' },
] as const;

// 获取状态配置
export function getStatusConfig(status: string, type: 'order' | 'production' | 'quality' = 'order') {
  const options = {
    order: ORDER_STATUS_OPTIONS,
    production: PRODUCTION_STATUS_OPTIONS,
    quality: QUALITY_STATUS_OPTIONS,
  }[type];
  
  return options.find(o => o.value === status) || { value: status, label: status, color: 'gray' };
}

// 生成单号
export function generateOrderNo(prefix: string = 'ORD'): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${dateStr}${random}`;
}

// 生成UUID
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
