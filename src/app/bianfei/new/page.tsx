'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Save,
  Plus,
  Loader2,
  FileText,
} from 'lucide-react';
import { ColorSelector } from '@/components/common/ColorSelector';
import { SizeSelector } from '@/components/common/SizeSelector';
import { SizeQuantityTable } from '@/components/common/SizeQuantityTable';

interface BianfeiItem {
  id: string;
  name: string;
  quantities: Record<string, number>;
}

export default function NewBianfeiPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const isEdit = !!editId;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 表单数据
  const [orderNo, setOrderNo] = useState('');
  const [styleName, setStyleName] = useState('');
  const [styleCode, setStyleCode] = useState('');
  const [color, setColor] = useState('');
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [quickMode, setQuickMode] = useState(false);
  const [mergeSame, setMergeSame] = useState(false);
  const [autoIncrement, setAutoIncrement] = useState(false);
  const [remark, setRemark] = useState('');
  
  // 编菲条目
  const [items, setItems] = useState<BianfeiItem[]>([
    { id: '1', name: '条目1', quantities: {} }
  ]);

  // 加载编辑数据
  useEffect(() => {
    if (editId) {
      loadBianfei(editId);
    }
  }, [editId]);

  const loadBianfei = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bianfei?id=${id}`);
      const data = await res.json();
      if (data.success && data.data) {
        const record = data.data;
        setOrderNo(record.order_no || '');
        setStyleName(record.style_name || '');
        setStyleCode(record.style_code || '');
        setColor(record.color || '');
        setSelectedSizes(JSON.parse(record.sizes || '[]'));
        setQuickMode(record.quick_mode || false);
        setMergeSame(record.merge_same || false);
        setAutoIncrement(record.auto_increment || false);
        setRemark(record.remark || '');
        
        if (record.bianfei_items) {
          setItems(record.bianfei_items.map((item: any) => ({
            id: item.id,
            name: item.item_name,
            quantities: JSON.parse(item.quantities || '{}')
          })));
        }
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 计算总数量
  const getTotalQuantity = () => {
    return items.reduce((sum, item) => 
      sum + Object.values(item.quantities).reduce((s, q) => s + (q || 0), 0), 0
    );
  };

  // 保存
  const handleSave = async () => {
    if (!orderNo.trim()) {
      alert('请输入订单号');
      return;
    }
    if (!color) {
      alert('请选择颜色');
      return;
    }
    if (selectedSizes.length === 0) {
      alert('请选择至少一个尺码');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/bianfei', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_no: orderNo,
          style_name: styleName,
          style_code: styleCode,
          color,
          sizes: selectedSizes,
          items,
          quick_mode: quickMode,
          merge_same: mergeSame,
          auto_increment: autoIncrement,
          remark
        })
      });

      const data = await res.json();
      if (data.success) {
        alert('保存成功！');
        router.push('/bianfei');
      } else {
        alert(data.error || '保存失败');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 新增（清空表单继续添加）
  const handleAddNew = async () => {
    await handleSave();
    if (!saving) {
      // 清空表单
      setOrderNo('');
      setStyleName('');
      setStyleCode('');
      setColor('');
      setSelectedSizes([]);
      setRemark('');
      setItems([{ id: '1', name: '条目1', quantities: {} }]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 标题区域 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/bianfei')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            <FileText className="h-8 w-8 text-blue-500" />
            <div>
              <h1 className="text-3xl font-bold">{isEdit ? '编辑扎号' : '新增扎号'}</h1>
              <p className="text-muted-foreground">录入扎号详细信息</p>
            </div>
          </div>
        </div>
      </div>

      {/* 基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                订单号 <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="请输入订单号"
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>款名</Label>
              <Input
                placeholder="请输入款名"
                value={styleName}
                onChange={(e) => setStyleName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>款号</Label>
              <Input
                placeholder="请输入款号"
                value={styleCode}
                onChange={(e) => setStyleCode(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                颜色 <span className="text-red-500">*</span>
              </Label>
              <ColorSelector
                value={color}
                onChange={setColor}
                showCard={false}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 尺码选择 */}
      <SizeSelector
        multiple
        selectedSizes={selectedSizes}
        onSelectionChange={setSelectedSizes}
      />

      {/* 高级设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">高级设置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={quickMode}
                onCheckedChange={setQuickMode}
              />
              <Label>快选模式</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={mergeSame}
                onCheckedChange={setMergeSame}
              />
              <Label>合并相同条目</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={autoIncrement}
                onCheckedChange={setAutoIncrement}
              />
              <Label>自动递增序号</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 数量录入表格 */}
      <SizeQuantityTable
        sizes={selectedSizes}
        items={items}
        onItemsChange={setItems}
        quickMode={quickMode}
      />

      {/* 备注 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">备注</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="输入备注信息..."
            className="w-full min-h-24 p-3 border rounded-lg resize-none"
          />
        </CardContent>
      </Card>

      {/* 底部操作按钮 */}
      <div className="sticky bottom-4 flex justify-center gap-4">
        <Button variant="outline" size="lg" onClick={() => router.push('/bianfei')}>
          取消
        </Button>
        <Button size="lg" onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          保存扎号
        </Button>
        {!isEdit && (
          <Button variant="secondary" size="lg" onClick={handleAddNew} disabled={saving}>
            <Plus className="h-4 w-4 mr-2" />
            新增扎号
          </Button>
        )}
      </div>
    </div>
  );
}
