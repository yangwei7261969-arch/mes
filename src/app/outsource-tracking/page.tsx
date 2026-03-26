'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExportButton } from '@/components/export-button';
import {
  Truck,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Download,
} from 'lucide-react';

interface OutsourceRecord {
  id: string;
  type: 'cut_piece' | 'craft';
  order_no?: string;
  style_name?: string;
  item_name: string;
  quantity: number;
  supplier_name: string;
  supplier_level: string | number;
  out_date: string;
  start_time?: string;
  end_time?: string;
  expected_return_date?: string;
  actual_return_date?: string;
  status: string;
  notes?: string;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive', icon: React.ReactNode }> = {
  pending: { label: '待发料', variant: 'outline', icon: <Clock className="h-4 w-4" /> },
  in_transit: { label: '运输中', variant: 'secondary', icon: <Truck className="h-4 w-4" /> },
  processing: { label: '加工中', variant: 'secondary', icon: <Package className="h-4 w-4" /> },
  completed: { label: '已完成', variant: 'default', icon: <CheckCircle className="h-4 w-4" /> },
  delayed: { label: '延期', variant: 'destructive', icon: <AlertCircle className="h-4 w-4" /> },
};

export default function OutsourceTrackingPage() {
  const [cutPieceOutsources, setCutPieceOutsources] = useState<any[]>([]);
  const [craftProcesses, setCraftProcesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 获取裁片外发数据
      const cutPieceRes = await fetch('/api/cut-piece-outsource');
      const cutPieceResult = await cutPieceRes.json();
      if (cutPieceResult.success) {
        setCutPieceOutsources(cutPieceResult.data || []);
      }

      // 获取二次工艺数据
      const craftRes = await fetch('/api/craft-processes?pageSize=100');
      const craftResult = await craftRes.json();
      if (craftResult.success) {
        setCraftProcesses(craftResult.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 转换裁片外发数据
  const cutPieceRecords: OutsourceRecord[] = cutPieceOutsources.map(item => ({
    id: item.id,
    type: 'cut_piece' as const,
    order_no: item.production_orders?.order_no || '-',
    style_name: item.production_orders?.style_name || '-',
    item_name: item.piece_name || '裁片',
    quantity: item.quantity,
    supplier_name: item.suppliers?.name || '-',
    supplier_level: item.suppliers?.supplier_level || item.suppliers?.level || '-',
    out_date: item.out_date || item.created_at,
    start_time: item.start_time,
    end_time: item.end_time,
    expected_return_date: item.expected_return_date,
    actual_return_date: item.actual_return_date,
    status: item.status,
    notes: item.notes,
  }));

  // 转换二次工艺数据
  const craftRecords: OutsourceRecord[] = craftProcesses
    .filter(item => item.supplier_id) // 只显示已分配供应商的
    .map(item => ({
      id: item.id,
      type: 'craft' as const,
      order_no: item.production_orders?.order_no || '-',
      style_name: item.production_orders?.style_name || '-',
      item_name: item.process_name || '工艺',
      quantity: item.quantity,
      supplier_name: item.suppliers?.name || '-',
      supplier_level: item.suppliers?.supplier_level || item.suppliers?.level || '-',
      out_date: item.created_at,
      start_time: item.start_time,
      end_time: item.end_time,
      status: item.status === 'completed' ? 'completed' : item.status === 'in_progress' ? 'processing' : 'pending',
      notes: item.notes,
    }));

  // 合并所有记录
  const allRecords = [...cutPieceRecords, ...craftRecords];

  // 根据标签筛选
  const filteredRecords = activeTab === 'all' 
    ? allRecords 
    : activeTab === 'cut_piece' 
      ? cutPieceRecords 
      : craftRecords;

  // 统计
  const stats = {
    total: allRecords.length,
    pending: allRecords.filter(r => r.status === 'pending').length,
    processing: allRecords.filter(r => ['in_transit', 'processing'].includes(r.status)).length,
    completed: allRecords.filter(r => r.status === 'completed').length,
    delayed: allRecords.filter(r => r.status === 'delayed').length,
  };

  const getSupplierLevelLabel = (level: string | number) => {
    const levelNum = typeof level === 'string' ? parseInt(level) : level;
    switch (levelNum) {
      case 1: return '一级';
      case 2: return '二级';
      case 3: return '三级';
      default: return '-';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">外发跟踪</h1>
          <p className="text-muted-foreground">跟踪裁片外发和二次工艺加工进度</p>
        </div>
        <div className="flex gap-3">
          <ExportButton dataType="outsource_tracking" />
          <Button onClick={fetchData}>
            刷新数据
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">外发总数</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">待发料</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">加工中</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.processing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">已完成</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">延期</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.delayed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">全部 ({allRecords.length})</TabsTrigger>
          <TabsTrigger value="cut_piece">裁片外发 ({cutPieceRecords.length})</TabsTrigger>
          <TabsTrigger value="craft">二次工艺 ({craftRecords.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">加载中...</div>
              ) : filteredRecords.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">暂无数据</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>类型</TableHead>
                      <TableHead>订单号</TableHead>
                      <TableHead>款式</TableHead>
                      <TableHead>项目</TableHead>
                      <TableHead>数量</TableHead>
                      <TableHead>供应商</TableHead>
                      <TableHead>供应商等级</TableHead>
                      <TableHead>开始时间</TableHead>
                      <TableHead>结束时间</TableHead>
                      <TableHead>状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow key={`${record.type}-${record.id}`}>
                        <TableCell>
                          <Badge variant={record.type === 'cut_piece' ? 'default' : 'secondary'}>
                            {record.type === 'cut_piece' ? '裁片' : '工艺'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{record.order_no}</TableCell>
                        <TableCell>{record.style_name}</TableCell>
                        <TableCell className="font-medium">{record.item_name}</TableCell>
                        <TableCell>{record.quantity}</TableCell>
                        <TableCell>{record.supplier_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getSupplierLevelLabel(record.supplier_level)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {record.start_time ? new Date(record.start_time).toLocaleString('zh-CN', { 
                            month: '2-digit', 
                            day: '2-digit', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          }) : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {record.end_time ? new Date(record.end_time).toLocaleString('zh-CN', { 
                            month: '2-digit', 
                            day: '2-digit', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          }) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig[record.status]?.variant || 'outline'}>
                            <span className="flex items-center gap-1">
                              {statusConfig[record.status]?.icon}
                              {statusConfig[record.status]?.label || record.status}
                            </span>
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
