'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, AlertCircle } from 'lucide-react';

interface SizeQuantityTableProps {
  sizes: string[];
  items: Array<{
    id: string;
    name: string;
    quantities: Record<string, number>;
  }>;
  onItemsChange: (items: Array<{ id: string; name: string; quantities: Record<string, number> }>) => void;
  title?: string;
  showCard?: boolean;
  quickMode?: boolean;
  showAddButton?: boolean;
  itemNamePrefix?: string;
  onQuickFill?: (itemId: string, value: string) => void;
}

export function SizeQuantityTable({
  sizes,
  items,
  onItemsChange,
  title = '数量录入',
  showCard = true,
  quickMode = false,
  showAddButton = true,
  itemNamePrefix = '条目',
  onQuickFill,
}: SizeQuantityTableProps) {
  const addItem = () => {
    onItemsChange([
      ...items,
      { id: Date.now().toString(), name: `${itemNamePrefix}${items.length + 1}`, quantities: {} }
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      onItemsChange(items.filter(item => item.id !== id));
    }
  };

  const updateItemName = (id: string, name: string) => {
    onItemsChange(items.map(item => 
      item.id === id ? { ...item, name } : item
    ));
  };

  const updateQuantity = (itemId: string, size: string, value: string) => {
    const qty = parseInt(value) || 0;
    onItemsChange(items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          quantities: { ...item.quantities, [size]: qty }
        };
      }
      return item;
    }));
  };

  // 计算行合计
  const getRowTotal = (item: typeof items[0]) => {
    return Object.values(item.quantities).reduce((sum, q) => sum + (q || 0), 0);
  };

  // 计算列合计
  const getColumnTotal = (size: string) => {
    return items.reduce((sum, item) => sum + (item.quantities[size] || 0), 0);
  };

  // 计算总计
  const getGrandTotal = () => {
    return items.reduce((sum, item) => sum + getRowTotal(item), 0);
  };

  // 快选模式批量填充
  const handleQuickFill = (itemId: string, value: string) => {
    const qty = parseInt(value) || 0;
    if (onQuickFill) {
      onQuickFill(itemId, value);
    } else {
      onItemsChange(items.map(item => {
        if (item.id === itemId) {
          const newQuantities: Record<string, number> = {};
          sizes.forEach(size => {
            newQuantities[size] = qty;
          });
          return { ...item, quantities: newQuantities };
        }
        return item;
      }));
    }
  };

  const content = (
    <div className="space-y-4">
      {sizes.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <AlertCircle className="h-5 w-5 mr-2" />
          请先选择尺码
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="border p-2 text-left w-12">序号</th>
                <th className="border p-2 text-left w-32">条目名称</th>
                {sizes.map(size => (
                  <th key={size} className="border p-2 text-center w-24">
                    {size}
                    {quickMode && (
                      <div className="mt-1">
                        <input
                          type="number"
                          placeholder="快填"
                          className="w-full px-1 py-0.5 text-xs border rounded"
                          onChange={(e) => {
                            items.forEach(item => handleQuickFill(item.id, e.target.value));
                          }}
                        />
                      </div>
                    )}
                  </th>
                ))}
                <th className="border p-2 text-center w-20">合计</th>
                <th className="border p-2 w-16">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td className="border p-2 text-center">{index + 1}</td>
                  <td className="border p-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItemName(item.id, e.target.value)}
                      className="w-full px-2 py-1 border rounded"
                      placeholder={`${itemNamePrefix}名称`}
                    />
                  </td>
                  {sizes.map(size => (
                    <td key={size} className="border p-1">
                      <input
                        type="number"
                        value={item.quantities[size] || ''}
                        onChange={(e) => updateQuantity(item.id, size, e.target.value)}
                        className="w-full px-2 py-1 border rounded text-center"
                        placeholder="数量"
                        min="0"
                      />
                    </td>
                  ))}
                  <td className="border p-2 text-center font-medium">
                    {getRowTotal(item)}
                  </td>
                  <td className="border p-2 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))}
              {/* 合计行 */}
              <tr className="bg-muted/30 font-medium">
                <td className="border p-2" colSpan={2}>合计</td>
                {sizes.map(size => (
                  <td key={size} className="border p-2 text-center">
                    {getColumnTotal(size)}
                  </td>
                ))}
                <td className="border p-2 text-center text-primary font-bold">
                  {getGrandTotal()}
                </td>
                <td className="border p-2"></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {showAddButton && sizes.length > 0 && (
        <Button variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-4 w-4 mr-1" />
          添加条目
        </Button>
      )}
    </div>
  );

  if (showCard) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{title}</CardTitle>
            {showAddButton && sizes.length > 0 && (
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                添加条目
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  return content;
}

export default SizeQuantityTable;
