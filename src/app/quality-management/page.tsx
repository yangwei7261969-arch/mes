'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ClipboardCheck,
  FileText,
  TrendingUp,
  Search,
  Plus,
  Filter,
  Download,
  RefreshCw,
  Bug,
  Award,
  BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react';

// 质检标准
interface QualityStandard {
  id: string;
  name: string;
  category: string;
  checkPoints: CheckPoint[];
  version: string;
  effectiveDate: string;
  status: 'active' | 'inactive';
}

interface CheckPoint {
  id: string;
  name: string;
  description: string;
  standard: string;
  weight: number;
}

// 质检记录
interface QualityRecord {
  id: string;
  orderNo: string;
  styleNo: string;
  process: string;
  inspector: string;
  inspectTime: string;
  totalQty: number;
  passQty: number;
  failQty: number;
  passRate: number;
  status: 'passed' | 'failed' | 'pending';
  defects: Defect[];
}

// 缺陷记录
interface Defect {
  id: string;
  type: string;
  description: string;
  quantity: number;
  severity: 'critical' | 'major' | 'minor';
  position: string;
  photo?: string;
  solution?: string;
}

// 缺陷类型统计
interface DefectStat {
  type: string;
  count: number;
  percentage: number;
}

// 质量追溯
interface QualityTrace {
  id: string;
  orderNo: string;
  styleNo: string;
  customer: string;
  color: string;
  size: string;
  bundleNo: string;
  process: string;
  inspector: string;
  inspectTime: string;
  result: 'pass' | 'fail';
  defects: Defect[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function QualityManagementPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // 质检标准
  const [standards, setStandards] = useState<QualityStandard[]>([]);
  const [standardDialogOpen, setStandardDialogOpen] = useState(false);
  const [selectedStandard, setSelectedStandard] = useState<QualityStandard | null>(null);
  
  // 质检记录
  const [records, setRecords] = useState<QualityRecord[]>([]);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  
  // 质量追溯
  const [traces, setTraces] = useState<QualityTrace[]>([]);
  const [traceSearch, setTraceSearch] = useState('');
  
  // 缺陷统计
  const [defectStats, setDefectStats] = useState<DefectStat[]>([]);
  
  // 质量趋势
  const [qualityTrend, setQualityTrend] = useState<{date: string; passRate: number; defects: number}[]>([]);

  // 新增质检记录表单
  const [newRecord, setNewRecord] = useState({
    orderNo: '',
    styleNo: '',
    process: '',
    inspector: '',
    totalQty: 0,
    passQty: 0,
    failQty: 0,
    defects: [] as Defect[],
  });

  // 新增缺陷表单
  const [newDefect, setNewDefect] = useState<Defect>({
    id: '',
    type: '',
    description: '',
    quantity: 0,
    severity: 'minor',
    position: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 模拟质检标准数据
      setStandards([
        {
          id: '1',
          name: '成衣外观检验标准',
          category: '成衣',
          version: 'V2.0',
          effectiveDate: '2024-01-01',
          status: 'active',
          checkPoints: [
            { id: '1', name: '缝线质量', description: '检查缝线是否均匀、无断线', standard: '无跳线、无断线', weight: 20 },
            { id: '2', name: '尺寸偏差', description: '测量关键尺寸偏差', standard: '±0.5cm', weight: 25 },
            { id: '3', name: '色差', description: '检查颜色一致性', standard: '同批无色差', weight: 20 },
            { id: '4', name: '线头处理', description: '检查线头是否修剪干净', standard: '无残留线头', weight: 15 },
            { id: '5', name: '辅料完整', description: '检查拉链、纽扣等辅料', standard: '无缺件', weight: 20 },
          ],
        },
        {
          id: '2',
          name: '面料检验标准',
          category: '面料',
          version: 'V1.5',
          effectiveDate: '2024-01-01',
          status: 'active',
          checkPoints: [
            { id: '1', name: '色牢度', description: '检查色牢度等级', standard: '≥4级', weight: 30 },
            { id: '2', name: '缩水率', description: '测量缩水率', standard: '≤3%', weight: 25 },
            { id: '3', name: '瑕疵点', description: '检查面料瑕疵', standard: '每米≤3处', weight: 25 },
            { id: '4', name: '克重', description: '测量面料克重', standard: '±5%', weight: 20 },
          ],
        },
      ]);

      // 模拟质检记录
      setRecords([
        {
          id: '1',
          orderNo: 'PO-2024-001',
          styleNo: 'STYLE-A',
          process: '整烫',
          inspector: '王检验',
          inspectTime: '2024-01-15 14:30',
          totalQty: 100,
          passQty: 95,
          failQty: 5,
          passRate: 95,
          status: 'passed',
          defects: [
            { id: '1', type: '色差', description: '轻微色差', quantity: 2, severity: 'minor', position: '袖口' },
            { id: '2', type: '线头', description: '线头未修剪', quantity: 3, severity: 'minor', position: '下摆' },
          ],
        },
        {
          id: '2',
          orderNo: 'PO-2024-002',
          styleNo: 'STYLE-B',
          process: '缝制',
          inspector: '李检验',
          inspectTime: '2024-01-15 16:00',
          totalQty: 50,
          passQty: 42,
          failQty: 8,
          passRate: 84,
          status: 'failed',
          defects: [
            { id: '1', type: '缝线', description: '跳线严重', quantity: 5, severity: 'major', position: '侧缝' },
            { id: '2', type: '尺寸', description: '尺寸偏差大', quantity: 3, severity: 'major', position: '衣长' },
          ],
        },
        {
          id: '3',
          orderNo: 'PO-2024-003',
          styleNo: 'STYLE-C',
          process: '包装',
          inspector: '张检验',
          inspectTime: '2024-01-15 17:15',
          totalQty: 200,
          passQty: 198,
          failQty: 2,
          passRate: 99,
          status: 'passed',
          defects: [
            { id: '1', type: '污渍', description: '轻微污渍', quantity: 2, severity: 'minor', position: '前片' },
          ],
        },
      ]);

      // 模拟质量追溯数据
      setTraces([
        {
          id: '1',
          orderNo: 'PO-2024-001',
          styleNo: 'STYLE-A',
          customer: '客户A',
          color: '黑色',
          size: 'M',
          bundleNo: 'B-001',
          process: '裁床',
          inspector: '王检验',
          inspectTime: '2024-01-15 09:00',
          result: 'pass',
          defects: [],
        },
        {
          id: '2',
          orderNo: 'PO-2024-001',
          styleNo: 'STYLE-A',
          customer: '客户A',
          color: '黑色',
          size: 'M',
          bundleNo: 'B-001',
          process: '缝制',
          inspector: '李检验',
          inspectTime: '2024-01-15 11:00',
          result: 'pass',
          defects: [],
        },
        {
          id: '3',
          orderNo: 'PO-2024-001',
          styleNo: 'STYLE-A',
          customer: '客户A',
          color: '黑色',
          size: 'M',
          bundleNo: 'B-001',
          process: '整烫',
          inspector: '王检验',
          inspectTime: '2024-01-15 14:30',
          result: 'pass',
          defects: [
            { id: '1', type: '色差', description: '轻微色差', quantity: 2, severity: 'minor', position: '袖口' },
          ],
        },
      ]);

      // 缺陷统计
      setDefectStats([
        { type: '缝线问题', count: 45, percentage: 28 },
        { type: '色差', count: 32, percentage: 20 },
        { type: '尺寸偏差', count: 28, percentage: 17 },
        { type: '线头', count: 25, percentage: 15 },
        { type: '污渍', count: 18, percentage: 11 },
        { type: '其他', count: 13, percentage: 8 },
      ]);

      // 质量趋势
      setQualityTrend([
        { date: '01-09', passRate: 92, defects: 15 },
        { date: '01-10', passRate: 94, defects: 12 },
        { date: '01-11', passRate: 89, defects: 22 },
        { date: '01-12', passRate: 95, defects: 10 },
        { date: '01-13', passRate: 93, defects: 14 },
        { date: '01-14', passRate: 96, defects: 8 },
        { date: '01-15', passRate: 95, defects: 10 },
      ]);

    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecord = () => {
    const record: QualityRecord = {
      id: Date.now().toString(),
      ...newRecord,
      inspectTime: new Date().toLocaleString(),
      passRate: Math.round((newRecord.passQty / Math.max(newRecord.totalQty, 1)) * 100),
      status: newRecord.passQty >= newRecord.totalQty * 0.9 ? 'passed' : 'failed',
    };
    setRecords(prev => [record, ...prev]);
    setRecordDialogOpen(false);
    setNewRecord({
      orderNo: '',
      styleNo: '',
      process: '',
      inspector: '',
      totalQty: 0,
      passQty: 0,
      failQty: 0,
      defects: [],
    });
  };

  const handleAddDefect = () => {
    if (!newDefect.type) return;
    setNewRecord(prev => ({
      ...prev,
      defects: [...prev.defects, { ...newDefect, id: Date.now().toString() }],
    }));
    setNewDefect({
      id: '',
      type: '',
      description: '',
      quantity: 0,
      severity: 'minor',
      position: '',
    });
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      passed: { label: '合格', className: 'bg-green-100 text-green-800' },
      failed: { label: '不合格', className: 'bg-red-100 text-red-800' },
      pending: { label: '待检', className: 'bg-yellow-100 text-yellow-800' },
    };
    return config[status] || config.pending;
  };

  const getSeverityBadge = (severity: string) => {
    const config: Record<string, { label: string; className: string }> = {
      critical: { label: '严重', className: 'bg-red-100 text-red-800' },
      major: { label: '主要', className: 'bg-orange-100 text-orange-800' },
      minor: { label: '次要', className: 'bg-yellow-100 text-yellow-800' },
    };
    return config[severity] || config.minor;
  };

  // 计算统计数据
  const stats = {
    totalInspections: records.length,
    passRate: records.length > 0 
      ? Math.round(records.reduce((sum, r) => sum + r.passRate, 0) / records.length)
      : 0,
    totalDefects: records.reduce((sum, r) => sum + r.failQty, 0),
    criticalDefects: records.reduce((sum, r) => 
      sum + r.defects.filter(d => d.severity === 'critical').reduce((s, d) => s + d.quantity, 0), 0),
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">质量管理</h1>
        <Button onClick={() => setRecordDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新建质检记录
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">质检次数</p>
                <p className="text-2xl font-bold">{stats.totalInspections}</p>
              </div>
              <ClipboardCheck className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">平均合格率</p>
                <p className="text-2xl font-bold text-green-600">{stats.passRate}%</p>
              </div>
              <Award className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">缺陷总数</p>
                <p className="text-2xl font-bold text-orange-600">{stats.totalDefects}</p>
              </div>
              <Bug className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">严重缺陷</p>
                <p className="text-2xl font-bold text-red-600">{stats.criticalDefects}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主内容区 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            概览
          </TabsTrigger>
          <TabsTrigger value="standards">
            <FileText className="h-4 w-4 mr-2" />
            质检标准库
          </TabsTrigger>
          <TabsTrigger value="records">
            <ClipboardCheck className="h-4 w-4 mr-2" />
            质检记录
          </TabsTrigger>
          <TabsTrigger value="trace">
            <Search className="h-4 w-4 mr-2" />
            质量追溯
          </TabsTrigger>
        </TabsList>

        {/* 概览 */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* 质量趋势图 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">近7日质量趋势</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={qualityTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Line yAxisId="left" type="monotone" dataKey="passRate" stroke="#22c55e" name="合格率(%)" />
                      <Line yAxisId="right" type="monotone" dataKey="defects" stroke="#ef4444" name="缺陷数" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 缺陷类型分布 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">缺陷类型分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={defectStats}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ type, percentage }) => `${type} ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {defectStats.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 最近质检记录 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">最近质检记录</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>订单号</TableHead>
                    <TableHead>款号</TableHead>
                    <TableHead>工序</TableHead>
                    <TableHead>检验员</TableHead>
                    <TableHead>检验时间</TableHead>
                    <TableHead>合格率</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.slice(0, 5).map((record) => {
                    const statusConfig = getStatusBadge(record.status);
                    return (
                      <TableRow key={record.id}>
                        <TableCell>{record.orderNo}</TableCell>
                        <TableCell>{record.styleNo}</TableCell>
                        <TableCell>{record.process}</TableCell>
                        <TableCell>{record.inspector}</TableCell>
                        <TableCell>{record.inspectTime}</TableCell>
                        <TableCell>
                          <span className={record.passRate >= 90 ? 'text-green-600' : 'text-red-600'}>
                            {record.passRate}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusConfig.className}>
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 质检标准库 */}
        <TabsContent value="standards" className="space-y-6">
          <div className="flex justify-between">
            <div className="text-muted-foreground">管理质检标准和检验要点</div>
            <Button onClick={() => setStandardDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              新建标准
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {standards.map((standard) => (
              <Card key={standard.id} className="cursor-pointer hover:border-primary"
                onClick={() => {
                  setSelectedStandard(standard);
                  setStandardDialogOpen(true);
                }}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base">{standard.name}</CardTitle>
                    <Badge variant={standard.status === 'active' ? 'default' : 'secondary'}>
                      {standard.status === 'active' ? '启用' : '停用'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">分类</span>
                      <span>{standard.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">版本</span>
                      <span>{standard.version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">检验点数</span>
                      <span>{standard.checkPoints.length} 个</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">生效日期</span>
                      <span>{standard.effectiveDate}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">检验要点:</p>
                    <div className="flex flex-wrap gap-1">
                      {standard.checkPoints.slice(0, 4).map((point) => (
                        <Badge key={point.id} variant="outline" className="text-xs">
                          {point.name}
                        </Badge>
                      ))}
                      {standard.checkPoints.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{standard.checkPoints.length - 4}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 质检记录 */}
        <TabsContent value="records" className="space-y-6">
          <div className="flex justify-between">
            <div className="flex gap-2">
              <Input placeholder="搜索订单号..." className="w-64" />
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                筛选
              </Button>
            </div>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              导出
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>订单号</TableHead>
                    <TableHead>款号</TableHead>
                    <TableHead>工序</TableHead>
                    <TableHead>检验员</TableHead>
                    <TableHead>检验时间</TableHead>
                    <TableHead>总数</TableHead>
                    <TableHead>合格</TableHead>
                    <TableHead>不合格</TableHead>
                    <TableHead>合格率</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => {
                    const statusConfig = getStatusBadge(record.status);
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.orderNo}</TableCell>
                        <TableCell>{record.styleNo}</TableCell>
                        <TableCell>{record.process}</TableCell>
                        <TableCell>{record.inspector}</TableCell>
                        <TableCell>{record.inspectTime}</TableCell>
                        <TableCell>{record.totalQty}</TableCell>
                        <TableCell className="text-green-600">{record.passQty}</TableCell>
                        <TableCell className="text-red-600">{record.failQty}</TableCell>
                        <TableCell>
                          <span className={record.passRate >= 90 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                            {record.passRate}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusConfig.className}>
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">详情</Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 质量追溯 */}
        <TabsContent value="trace" className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="输入订单号、款号、扎号进行追溯..."
                className="pl-10"
                value={traceSearch}
                onChange={(e) => setTraceSearch(e.target.value)}
              />
            </div>
            <Button>
              <Search className="h-4 w-4 mr-2" />
              追溯查询
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">追溯结果: {traceSearch || 'PO-2024-001'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* 追溯时间线 */}
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                  
                  {traces.map((trace, index) => (
                    <div key={trace.id} className="relative pl-12 pb-6 last:pb-0">
                      <div className={`absolute left-2.5 w-4 h-4 rounded-full ${
                        trace.result === 'pass' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium">{trace.process}</h4>
                              <p className="text-sm text-muted-foreground">
                                检验员: {trace.inspector} | {trace.inspectTime}
                              </p>
                            </div>
                            <Badge className={trace.result === 'pass' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {trace.result === 'pass' ? '合格' : '不合格'}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-2 text-sm mb-2">
                            <div>
                              <span className="text-muted-foreground">客户:</span> {trace.customer}
                            </div>
                            <div>
                              <span className="text-muted-foreground">颜色:</span> {trace.color}
                            </div>
                            <div>
                              <span className="text-muted-foreground">尺码:</span> {trace.size}
                            </div>
                            <div>
                              <span className="text-muted-foreground">扎号:</span> {trace.bundleNo}
                            </div>
                          </div>
                          
                          {trace.defects.length > 0 && (
                            <div className="mt-2 p-2 bg-red-50 rounded">
                              <p className="text-sm font-medium text-red-800 mb-1">发现缺陷:</p>
                              {trace.defects.map((defect) => (
                                <div key={defect.id} className="flex items-center gap-2 text-sm">
                                  <Badge className={getSeverityBadge(defect.severity).className}>
                                    {getSeverityBadge(defect.severity).label}
                                  </Badge>
                                  <span>{defect.type} - {defect.description}</span>
                                  <span className="text-muted-foreground">x{defect.quantity}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 新建质检记录对话框 */}
      <Dialog open={recordDialogOpen} onOpenChange={setRecordDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>新建质检记录</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>订单号 *</Label>
                <Input
                  value={newRecord.orderNo}
                  onChange={(e) => setNewRecord(prev => ({ ...prev, orderNo: e.target.value }))}
                  placeholder="PO-2024-001"
                />
              </div>
              <div className="space-y-2">
                <Label>款号 *</Label>
                <Input
                  value={newRecord.styleNo}
                  onChange={(e) => setNewRecord(prev => ({ ...prev, styleNo: e.target.value }))}
                  placeholder="STYLE-A"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>工序 *</Label>
                <Select
                  value={newRecord.process}
                  onValueChange={(value) => setNewRecord(prev => ({ ...prev, process: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择工序" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="裁床">裁床</SelectItem>
                    <SelectItem value="缝制">缝制</SelectItem>
                    <SelectItem value="整烫">整烫</SelectItem>
                    <SelectItem value="质检">质检</SelectItem>
                    <SelectItem value="包装">包装</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>检验员 *</Label>
                <Input
                  value={newRecord.inspector}
                  onChange={(e) => setNewRecord(prev => ({ ...prev, inspector: e.target.value }))}
                  placeholder="检验员姓名"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>检验总数 *</Label>
                <Input
                  type="number"
                  value={newRecord.totalQty}
                  onChange={(e) => {
                    const total = parseInt(e.target.value) || 0;
                    setNewRecord(prev => ({
                      ...prev,
                      totalQty: total,
                      passQty: total - prev.failQty,
                    }));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>合格数量</Label>
                <Input
                  type="number"
                  value={newRecord.passQty}
                  onChange={(e) => {
                    const pass = parseInt(e.target.value) || 0;
                    setNewRecord(prev => ({
                      ...prev,
                      passQty: pass,
                      failQty: prev.totalQty - pass,
                    }));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>不合格数量</Label>
                <Input
                  type="number"
                  value={newRecord.failQty}
                  onChange={(e) => {
                    const fail = parseInt(e.target.value) || 0;
                    setNewRecord(prev => ({
                      ...prev,
                      failQty: fail,
                      passQty: prev.totalQty - fail,
                    }));
                  }}
                />
              </div>
            </div>
            
            {/* 缺陷记录 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>缺陷记录</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // 打开添加缺陷对话框
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  添加缺陷
                </Button>
              </div>
              
              {newRecord.defects.length > 0 ? (
                <div className="border rounded-lg p-3 space-y-2">
                  {newRecord.defects.map((defect) => (
                    <div key={defect.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityBadge(defect.severity).className}>
                          {getSeverityBadge(defect.severity).label}
                        </Badge>
                        <span>{defect.type}</span>
                        <span className="text-muted-foreground">- {defect.description}</span>
                      </div>
                      <span>x{defect.quantity}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed rounded-lg p-6 text-center text-muted-foreground">
                  暂无缺陷记录
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAddRecord}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 质检标准详情对话框 */}
      <Dialog open={standardDialogOpen} onOpenChange={setStandardDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedStandard ? selectedStandard.name : '新建质检标准'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedStandard && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">分类:</span> {selectedStandard.category}
                </div>
                <div>
                  <span className="text-muted-foreground">版本:</span> {selectedStandard.version}
                </div>
                <div>
                  <span className="text-muted-foreground">状态:</span> 
                  <Badge className="ml-2">
                    {selectedStandard.status === 'active' ? '启用' : '停用'}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">生效日期:</span> {selectedStandard.effectiveDate}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3">检验要点</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>检验点</TableHead>
                      <TableHead>描述</TableHead>
                      <TableHead>标准</TableHead>
                      <TableHead>权重</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedStandard.checkPoints.map((point) => (
                      <TableRow key={point.id}>
                        <TableCell className="font-medium">{point.name}</TableCell>
                        <TableCell>{point.description}</TableCell>
                        <TableCell>{point.standard}</TableCell>
                        <TableCell>{point.weight}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setStandardDialogOpen(false);
              setSelectedStandard(null);
            }}>
              关闭
            </Button>
            {selectedStandard && (
              <Button>编辑标准</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
