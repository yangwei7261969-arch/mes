'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  Edit,
  FileText,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { StatusBadge, STATUS_CONFIGS } from '@/components/common/StatusBadge';

interface BianfeiRecord {
  id: string;
  bianfei_no: string;
  order_no: string;
  style_name: string;
  style_code: string;
  color: string;
  sizes: string;
  total_quantity: number;
  status: string;
  created_at: string;
  remark: string;
}

export default function BianfeiListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<BianfeiRecord[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bianfei');
      const data = await res.json();
      if (data.success) {
        setRecords(data.data || []);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条扎号记录吗？')) return;
    
    try {
      const res = await fetch(`/api/bianfei?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchRecords();
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const filteredRecords = records.filter(r => {
    const matchSearch = !search || 
      r.bianfei_no?.toLowerCase().includes(search.toLowerCase()) ||
      r.order_no?.toLowerCase().includes(search.toLowerCase()) ||
      r.style_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

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
          <FileText className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-3xl font-bold">扎号管理</h1>
            <p className="text-muted-foreground">管理和查询扎号记录</p>
          </div>
        </div>
        <Link href="/bianfei/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            新增扎号
          </Button>
        </Link>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索扎号单号、订单号、款名..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待处理</SelectItem>
                <SelectItem value="in_progress">进行中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="cancelled">已取消</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              导出
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 数据表格 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>扎号单号</TableHead>
                <TableHead>订单号</TableHead>
                <TableHead>款名</TableHead>
                <TableHead>颜色</TableHead>
                <TableHead>尺码</TableHead>
                <TableHead>总数量</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    {records.length === 0 ? '暂无扎号记录，点击"新增扎号"创建第一条记录' : '没有匹配的记录'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.bianfei_no}</TableCell>
                    <TableCell>{record.order_no}</TableCell>
                    <TableCell>{record.style_name}</TableCell>
                    <TableCell>{record.color}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(JSON.parse(record.sizes || '[]') as string[]).map((size, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {size}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{record.total_quantity}</TableCell>
                    <TableCell>
                      <StatusBadge 
                        status={record.status} 
                        customConfig={STATUS_CONFIGS.production} 
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(record.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Link href={`/bianfei/new?id=${record.id}`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDelete(record.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 统计信息 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{records.length}</div>
            <div className="text-sm text-muted-foreground">总记录数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-600">
              {records.filter(r => r.status === 'pending').length}
            </div>
            <div className="text-sm text-muted-foreground">待处理</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">
              {records.filter(r => r.status === 'in_progress').length}
            </div>
            <div className="text-sm text-muted-foreground">进行中</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {records.reduce((sum, r) => sum + (r.total_quantity || 0), 0).toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">总数量</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
