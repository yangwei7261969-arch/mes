'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Search,
  Filter,
  Download,
  AlertTriangle,
  Package,
  ArrowUpDown,
  MoreHorizontal,
  Eye,
  Edit,
  ArrowRight,
  ArrowLeftRight,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Mock data
const materials = [
  {
    id: 'M001',
    code: 'BL001',
    name: '蓝色棉布',
    category: 'fabric',
    unit: '米',
    color: '蓝色',
    warehouse: 'A仓库',
    location: 'A-1-1',
    quantity: 500,
    safetyStock: 100,
    unitPrice: 35,
    status: 'normal',
  },
  {
    id: 'M002',
    code: 'BL002',
    name: '黑色涤纶布',
    category: 'fabric',
    unit: '米',
    color: '黑色',
    warehouse: 'A仓库',
    location: 'A-1-2',
    quantity: 80,
    safetyStock: 100,
    unitPrice: 28,
    status: 'warning',
  },
  {
    id: 'M003',
    code: 'AC001',
    name: '金属拉链',
    category: 'accessory',
    unit: '条',
    color: '银色',
    warehouse: 'B仓库',
    location: 'B-2-1',
    quantity: 2000,
    safetyStock: 500,
    unitPrice: 2.5,
    status: 'normal',
  },
  {
    id: 'M004',
    code: 'AC002',
    name: '纽扣（大号）',
    category: 'accessory',
    unit: '颗',
    color: '白色',
    warehouse: 'B仓库',
    location: 'B-2-2',
    quantity: 5000,
    safetyStock: 1000,
    unitPrice: 0.5,
    status: 'normal',
  },
  {
    id: 'M005',
    code: 'BL003',
    name: '红色雪纺',
    category: 'fabric',
    unit: '米',
    color: '红色',
    warehouse: 'A仓库',
    location: 'A-2-1',
    quantity: 30,
    safetyStock: 50,
    unitPrice: 45,
    status: 'critical',
  },
];

const inventoryLogs = [
  { id: 1, material: '蓝色棉布', type: 'in', quantity: 500, date: '2024-01-15', operator: '张三', related: '采购入库' },
  { id: 2, material: '金属拉链', type: 'out', quantity: 200, date: '2024-01-15', operator: '李四', related: '生产领料' },
  { id: 3, material: '黑色涤纶布', type: 'out', quantity: 100, date: '2024-01-14', operator: '王五', related: '生产领料' },
  { id: 4, material: '纽扣（大号）', type: 'in', quantity: 3000, date: '2024-01-13', operator: '张三', related: '采购入库' },
];

export default function WarehousePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">仓库库存</h1>
          <p className="text-muted-foreground">管理布料、辅料库存与出入库</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            导出
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                入库登记
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>入库登记</DialogTitle>
                <DialogDescription>填写入库信息</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>物料</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="选择物料" />
                    </SelectTrigger>
                    <SelectContent>
                      {materials.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>入库数量</Label>
                  <Input type="number" placeholder="数量" />
                </div>
                <div className="space-y-2">
                  <Label>关联单据</Label>
                  <Input placeholder="采购单号/生产单号" />
                </div>
                <div className="space-y-2">
                  <Label>备注</Label>
                  <Textarea placeholder="备注..." />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline">取消</Button>
                <Button>确认入库</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">物料总数</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">256</div>
            <p className="text-xs text-muted-foreground">布料 120 / 辅料 136</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">库存预警</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">5</div>
            <p className="text-xs text-muted-foreground">需要补货</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">今日入库</CardTitle>
            <ArrowRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3,500</div>
            <p className="text-xs text-muted-foreground">件/米</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">今日出库</CardTitle>
            <ArrowRight className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,200</div>
            <p className="text-xs text-muted-foreground">件/米</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger value="inventory">库存列表</TabsTrigger>
          <TabsTrigger value="logs">出入库记录</TabsTrigger>
          <TabsTrigger value="alerts">库存预警</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="搜索物料编码、名称..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="物料类别" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类别</SelectItem>
                    <SelectItem value="fabric">布料</SelectItem>
                    <SelectItem value="accessory">辅料</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  更多筛选
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Table */}
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>物料编码</TableHead>
                    <TableHead>名称</TableHead>
                    <TableHead>类别</TableHead>
                    <TableHead>颜色</TableHead>
                    <TableHead>仓库/库位</TableHead>
                    <TableHead>库存数量</TableHead>
                    <TableHead>安全库存</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell className="font-medium">{material.code}</TableCell>
                      <TableCell>{material.name}</TableCell>
                      <TableCell>
                        <Badge variant={material.category === 'fabric' ? 'default' : 'secondary'}>
                          {material.category === 'fabric' ? '布料' : '辅料'}
                        </Badge>
                      </TableCell>
                      <TableCell>{material.color}</TableCell>
                      <TableCell>{material.warehouse} / {material.location}</TableCell>
                      <TableCell>
                        <span className={material.quantity < material.safetyStock ? 'text-red-500 font-bold' : ''}>
                          {material.quantity} {material.unit}
                        </span>
                      </TableCell>
                      <TableCell>{material.safetyStock} {material.unit}</TableCell>
                      <TableCell>
                        {material.status === 'critical' && (
                          <Badge variant="destructive">严重不足</Badge>
                        )}
                        {material.status === 'warning' && (
                          <Badge variant="outline" className="border-orange-500 text-orange-500">库存不足</Badge>
                        )}
                        {material.status === 'normal' && (
                          <Badge variant="outline">正常</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <ArrowRight className="mr-2 h-4 w-4" />
                              出库
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <ArrowLeftRight className="mr-2 h-4 w-4" />
                              调拨
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              编辑
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>物料</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>数量</TableHead>
                    <TableHead>日期</TableHead>
                    <TableHead>操作人</TableHead>
                    <TableHead>关联单据</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{log.material}</TableCell>
                      <TableCell>
                        <Badge variant={log.type === 'in' ? 'default' : 'secondary'}>
                          {log.type === 'in' ? '入库' : '出库'}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.quantity}</TableCell>
                      <TableCell>{log.date}</TableCell>
                      <TableCell>{log.operator}</TableCell>
                      <TableCell>{log.related}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                库存预警列表
              </CardTitle>
              <CardDescription>以下物料库存低于安全库存，请及时补货</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {materials.filter(m => m.status !== 'normal').map((material) => (
                  <div key={material.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        material.status === 'critical' ? 'bg-red-100' : 'bg-orange-100'
                      }`}>
                        <Package className={`h-5 w-5 ${
                          material.status === 'critical' ? 'text-red-600' : 'text-orange-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium">{material.name}</p>
                        <p className="text-sm text-muted-foreground">
                          当前库存: {material.quantity} {material.unit} / 安全库存: {material.safetyStock} {material.unit}
                        </p>
                      </div>
                    </div>
                    <Button size="sm">立即采购</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
