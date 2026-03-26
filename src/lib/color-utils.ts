// 颜色名称到实际颜色的映射
export const colorMap: Record<string, string> = {
  '白色': '#FFFFFF',
  '黑色': '#000000',
  '红色': '#DC2626',
  '蓝色': '#2563EB',
  '绿色': '#16A34A',
  '黄色': '#EAB308',
  '橙色': '#EA580C',
  '紫色': '#9333EA',
  '粉色': '#EC4899',
  '灰色': '#6B7280',
  '深灰': '#374151',
  '浅灰': '#D1D5DB',
  '藏青': '#1E3A5F',
  '卡其': '#C3B091',
  '米色': '#F5F5DC',
  '咖啡': '#6F4E37',
  '棕色': '#A0522D',
  '深蓝': '#1E40AF',
  '浅蓝': '#60A5FA',
  '军绿': '#4D5D53',
  '墨绿': '#2F4F4F',
  '酒红': '#722F37',
  '杏色': '#FFDAB9',
  '花灰': '#B8B8B8',
  '白': '#FFFFFF',
  '黑': '#000000',
  '红': '#DC2626',
  '蓝': '#2563EB',
  '绿': '#16A34A',
  '黄': '#EAB308',
  '橙': '#EA580C',
  '紫': '#9333EA',
  '粉': '#EC4899',
  '灰': '#6B7280',
};

/**
 * 获取颜色名称对应的色值
 * @param colorName 颜色名称
 * @returns 十六进制颜色值
 */
export const getColorValue = (colorName: string): string => {
  if (!colorName) return '#9CA3AF';
  
  // 尝试直接匹配
  if (colorMap[colorName]) {
    return colorMap[colorName];
  }
  
  // 尝试部分匹配
  const lowerName = colorName.toLowerCase();
  for (const [name, value] of Object.entries(colorMap)) {
    if (colorName.includes(name) || name.includes(colorName) || 
        lowerName.includes(name.toLowerCase()) || name.toLowerCase().includes(lowerName)) {
      return value;
    }
  }
  
  // 默认返回灰色
  return '#9CA3AF';
};

/**
 * 判断颜色是否为浅色（用于决定文字颜色）
 * @param hexColor 十六进制颜色值
 * @returns 是否为浅色
 */
export const isLightColor = (hexColor: string): boolean => {
  if (!hexColor) return true;
  
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // 使用相对亮度公式
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
};
