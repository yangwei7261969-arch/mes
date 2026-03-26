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
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieChartIcon,
  BarChart3,
  FileText,
  Download,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Target,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

// 成本分析数据
interface CostAnalysis {
  styleNo: string;
  styleName: string;
  totalCost: number;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  otherCost: number;
  targetCost: number;
  variance: number;
  variancePercent: number;
  quantity: number;
  unitCost: number;
}

// 成本构成
interface CostBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

// 成本趋势
interface CostTrend {
  month: string;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
}

// 成本项
interface CostItem {
  id: string;
  category: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  supplier?: string;
  remark?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function CostAnalysisPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // 成本分析数据
  const [costAnalysisList, setCostAnalysisList] = useState<CostAnalysis[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<CostAnalysis | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  
  // 成本构成
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown[]>([]);
  
  // 成本趋势
  const [costTrend, setCostTrend] = useState<CostTrend[]>([]);
  
  // 成本明细
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  
  // 新增成本项
  const [newCostItem, setNewCostItem] = useState({
    category: '',
    name: '',
    unit: '',
    quantity: 0,
    unitPrice: 0,
    supplier: '',
    remark: '',
  });

  // 统计数据
  const [stats, setStats] = useState({
    totalCost: 0,
    avgUnitCost: 0,
    totalVariance: 0,
    varianceCount: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 模拟成本分析数据
      const mockCostAnalysis: CostAnalysis[] = [
        {
          styleNo: 'STYLE-A',
          styleName: '红色T恤',
          totalCost: 125000,
          materialCost: 75000,
          laborCost: 30000,
          overheadCost: 15000,
          otherCost: 5000,
          targetCost: 120000,
          variance: 5000,
          variancePercent: 4.2,
          quantity: 1000,
          unitCost: 125,
        },
        {
          styleNo: 'STYLE-B',
          styleName: '蓝色衬衫',
          totalCost: 85000,
          materialCost: 45000,
          laborCost: 25000,
          overheadCost: 10000,
          otherCost: 5000,
          targetCost: 90000,
          variance: -5000,
          variancePercent: -5.6,
          quantity: 500,
          unitCost: 170,
        },
        {
          styleNo: 'STYLE-C',
          styleName: '黑色裤子',
          totalCost: 180000,
          materialCost: 100000,
          laborCost: 50000,
          overheadCost: 20000,
          otherCost: 10000,
          targetCost: 170000,
          variance: 10000,
          variancePercent: 5.9,
          quantity: 800,
          unitCost: 225,
        },
        {
          styleNo: 'STYLE-D',
          styleName: '白色连衣裙',
          totalCost: 95000,
          materialCost: 55000,
          laborCost: 28000,
          overheadCost: 8000,
          otherCost: 4000,
          targetCost: 95000,
          variance: 0,
          variancePercent: 0,
          quantity: 400,
          unitCost: 237.5,
        },
      ];
      setCostAnalysisList(mockCostAnalysis);

      // 成本构成
      setCostBreakdown([
        { category: '面料', amount: 180000, percentage: 42 },
        { category: '辅料', amount: 55000, percentage: 13 },
        { category: '人工', amount: 95000, percentage: 22 },
        { category: '制造费用', amount: 48000, percentage: 11 },
        { category: '包装', amount: 28000, percentage: 7 },
        { category: '其他', amount: 23000, percentage: 5 },
      ]);

      // 成本趋势
      setCostTrend([
        { month: '01', materialCost: 150000, laborCost: 80000, overheadCost: 30000, totalCost: 260000 },
        { month: '02', materialCost: 165000, laborCost: 85000, overheadCost: 32000, totalCost: 282000 },
        { month: '03', materialCost: 145000, laborCost: 78000, overheadCost: 28000, totalCost: 251000 },
        { month: '04', materialCost: 180000, laborCost: 95000, overheadCost: 35000, totalCost: 310000 },
        { month: '05', materialCost: 175000, laborCost: 92000, overheadCost: 33000, totalCost: 300000 },
        { month: '06', materialCost: 195000, laborCost: 102000, overheadCost: 38000, totalCost: 335000 },
      ]);

      // 成本明细
      setCostItems([
        { id: '1', category: '面料', name: '红色棉布', unit: '米', quantity: 2000, unitPrice: 25, amount: 50000, supplier: '供应商A' },
        { id: '2', category: '面料', name: '里布', unit: '米', quantity: 1000, unitPrice: 15, amount: 15000, supplier: '供应商B' },
        { id: '3', category: '辅料', name: '拉链', unit: '条', quantity: 1000, unitPrice: 3, amount: 3000, supplier: '供应商C' },
        { id: '4', category: '辅料', name: '纽扣', unit: '颗', quantity: 5000, unitPrice: 0.5, amount: 2500, supplier: '供应商D' },
        { id: '5', category: '包装', name: '包装袋', unit: '个', quantity: 1000, unitPrice: 2, amount: 2000, supplier: '供应商E' },
      ]);

      // 统计
      setStats({
        totalCost: mockCostAnalysis.reduce((sum, item) => sum + item.totalCost, 0),
        avgUnitCost: Math.round(mockCostAnalysis.reduce((sum, item) => sum + item.unitCost, 0) / mockCostAnalysis.length),
        totalVariance: mockCostAnalysis.reduce((sum, item) => sum + item.variance, 0),
        varianceCount: mockCostAnalysis.filter(item => item.variance > 0).length,
      });

    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCostItem = () => {
    const item: CostItem = {
      id: Date.now().toString(),
      ...newCostItem,
      amount: newCostItem.quantity * newCostItem.unitPrice,
    };
    setCostItems(prev => [...prev, item]);
    setAddItemDialogOpen(false);
    setNewCostItem({
      category: '',
      name: '',
      unit: '',
      quantity: 0,
      unitPrice: 0,
      supplier: '',
      remark: '',
    });
  };

  const getVarianceBadge = (variance: number) => {
    if (variance > 0) {
      return { label: '超支', className: 'bg-red-100 text-red-800' };
    } else if (variance < 0) {
      return { label: '节约', className: 'bg-green-100 text-green-800' };
    }
    return { label: '持平', className: 'bg-gray-100 text-gray-800' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">成本核算</h1>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            导出报表
          </Button>
          <Button onClick={() => setAddItemDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            录入成本
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总成本</p>
                <p className="text-2xl font-bold">¥{stats.totalCost.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">平均单件成本</p>
                <p className="text-2xl font-bold">¥{stats.avgUnitCost}</p>
              </div>
              <Calculator className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">成本偏差</p>
                <p className={`text-2xl font-bold ${stats.totalVariance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {stats.totalVariance > 0 ? '+' : ''}¥{stats.totalVariance.toLocaleString()}
                </p>
              </div>
              <TrendingUp className={`h-8 w-8 ${stats.totalVariance > 0 ? 'text-red-500' : 'text-green-500'}`} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">超支款数</p>
                <p className="text-2xl font-bold text-orange-600">{stats.varianceCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
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
          <TabsTrigger value="analysis">
            <PieChartIcon className="h-4 w-4 mr-2" />
            单款分析
          </TabsTrigger>
          <TabsTrigger value="details">
            <FileText className="h-4 w-4 mr-2" />
            成本明细
          </TabsTrigger>
        </TabsList>

        {/* 概览 */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* 成本构成 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">成本构成</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={costBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ category, percentage }) => `${category} ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="amount"
                      >
                        {costBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 成本趋势 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">成本趋势</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={costTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
                      <Legend />
                      <Bar dataKey="materialCost" name="材料成本" fill="#0088FE" />
                      <Bar dataKey="laborCost" name="人工成本" fill="#00C49F" />
                      <Bar dataKey="overheadCost" name="制造费用" fill="#FFBB28" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 成本构成明细 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">成本构成明细</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>类别</TableHead>
                    <TableHead className="text-right">金额</TableHead>
                    <TableHead className="text-right">占比</TableHead>
                    <TableHead>趋势</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costBreakdown.map((item) => (
                    <TableRow key={item.category}>
                      <TableCell className="font-medium">{item.category}</TableCell>
                      <TableCell className="text-right">¥{item.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{item.percentage}%</TableCell>
                      <TableCell>
                        {item.percentage > 20 ? (
                          <Badge className="bg-red-100 text-red-800">需关注</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800">正常</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 单款分析 */}
        <TabsContent value="analysis" className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="搜索款号..." className="pl-10" />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              筛选
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>款号</TableHead>
                    <TableHead>款式名称</TableHead>
                    <TableHead className="text-right">总成本</TableHead>
                    <TableHead className="text-right">材料成本</TableHead>
                    <TableHead className="text-right">人工成本</TableHead>
                    <TableHead className="text-right">制造费用</TableHead>
                    <TableHead className="text-right">单件成本</TableHead>
                    <TableHead className="text-right">目标成本</TableHead>
                    <TableHead className="text-right">偏差</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costAnalysisList.map((item) => {
                    const badge = getVarianceBadge(item.variance);
                    return (
                      <TableRow key={item.styleNo}>
                        <TableCell className="font-medium">{item.styleNo}</TableCell>
                        <TableCell>{item.styleName}</TableCell>
                        <TableCell className="text-right">¥{item.totalCost.toLocaleString()}</TableCell>
                        <TableCell className="text-right">¥{item.materialCost.toLocaleString()}</TableCell>
                        <TableCell className="text-right">¥{item.laborCost.toLocaleString()}</TableCell>
                        <TableCell className="text-right">¥{item.overheadCost.toLocaleString()}</TableCell>
                        <TableCell className="text-right">¥{item.unitCost}</TableCell>
                        <TableCell className="text-right">¥{item.targetCost.toLocaleString()}</TableCell>
                        <TableCell className={`text-right font-medium ${item.variance > 0 ? 'text-red-600' : item.variance < 0 ? 'text-green-600' : ''}`}>
                          {item.variance > 0 ? '+' : ''}{item.variancePercent}%
                        </TableCell>
                        <TableCell>
                          <Badge className={badge.className}>{badge.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedStyle(item);
                              setDetailDialogOpen(true);
                            }}
                          >
                            详情
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 成本明细 */}
        <TabsContent value="details" className="space-y-6">
          <div className="flex justify-between">
            <div className="flex gap-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="类别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="面料">面料</SelectItem>
                  <SelectItem value="辅料">辅料</SelectItem>
                  <SelectItem value="包装">包装</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setAddItemDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              新增成本项
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>类别</TableHead>
                    <TableHead>名称</TableHead>
                    <TableHead>单位</TableHead>
                    <TableHead className="text-right">数量</TableHead>
                    <TableHead className="text-right">单价</TableHead>
                    <TableHead className="text-right">金额</TableHead>
                    <TableHead>供应商</TableHead>
                    <TableHead>备注</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant="outline">{item.category}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">¥{item.unitPrice}</TableCell>
                      <TableCell className="text-right font-medium">¥{item.amount.toLocaleString()}</TableCell>
                      <TableCell>{item.supplier}</TableCell>
                      <TableCell className="text-muted-foreground">{item.remark || '-'}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">编辑</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* 合计行 */}
              <div className="flex justify-end mt-4 pt-4 border-t">
                <div className="text-right">
                  <span className="text-muted-foreground">合计金额: </span>
                  <span className="text-xl font-bold">
                    ¥{costItems.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 单款详情对话框 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>成本分析详情 - {selectedStyle?.styleNo}</DialogTitle>
          </DialogHeader>
          
          {selectedStyle && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">款式名称</p>
                  <p className="font-medium">{selectedStyle.styleName}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">生产数量</p>
                  <p className="font-medium">{selectedStyle.quantity} 件</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">单件成本</p>
                  <p className="font-medium">¥{selectedStyle.unitCost}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">成本构成</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">材料成本</span>
                      <span>¥{selectedStyle.materialCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">人工成本</span>
                      <span>¥{selectedStyle.laborCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">制造费用</span>
                      <span>¥{selectedStyle.overheadCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">其他费用</span>
                      <span>¥{selectedStyle.otherCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t font-medium">
                      <span>总成本</span>
                      <span>¥{selectedStyle.totalCost.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">成本偏差分析</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">目标成本</span>
                      <span>¥{selectedStyle.targetCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">实际成本</span>
                      <span>¥{selectedStyle.totalCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">偏差金额</span>
                      <span className={selectedStyle.variance > 0 ? 'text-red-600' : selectedStyle.variance < 0 ? 'text-green-600' : ''}>
                        {selectedStyle.variance > 0 ? '+' : ''}¥{selectedStyle.variance.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="font-medium">偏差率</span>
                      <Badge className={getVarianceBadge(selectedStyle.variance).className}>
                        {selectedStyle.variancePercent > 0 ? '+' : ''}{selectedStyle.variancePercent}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              
              {selectedStyle.variance > 0 && (
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-sm text-red-800">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    成本超支提醒: 该款成本超出目标 {selectedStyle.variancePercent}%，建议检查材料采购价格或优化生产工艺。
                  </p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              关闭
            </Button>
            <Button>
              <FileText className="h-4 w-4 mr-2" />
              导出报告
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新增成本项对话框 */}
      <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增成本项</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>类别 *</Label>
                <Select
                  value={newCostItem.category}
                  onValueChange={(value) => setNewCostItem(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择类别" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="面料">面料</SelectItem>
                    <SelectItem value="辅料">辅料</SelectItem>
                    <SelectItem value="包装">包装</SelectItem>
                    <SelectItem value="人工">人工</SelectItem>
                    <SelectItem value="其他">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>名称 *</Label>
                <Input
                  value={newCostItem.name}
                  onChange={(e) => setNewCostItem(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="成本项名称"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>单位 *</Label>
                <Input
                  value={newCostItem.unit}
                  onChange={(e) => setNewCostItem(prev => ({ ...prev, unit: e.target.value }))}
                  placeholder="米/条/个"
                />
              </div>
              <div className="space-y-2">
                <Label>数量 *</Label>
                <Input
                  type="number"
                  value={newCostItem.quantity}
                  onChange={(e) => setNewCostItem(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>单价 (元) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newCostItem.unitPrice}
                  onChange={(e) => setNewCostItem(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>供应商</Label>
              <Input
                value={newCostItem.supplier}
                onChange={(e) => setNewCostItem(prev => ({ ...prev, supplier: e.target.value }))}
                placeholder="供应商名称"
              />
            </div>
            
            <div className="space-y-2">
              <Label>备注</Label>
              <Input
                value={newCostItem.remark}
                onChange={(e) => setNewCostItem(prev => ({ ...prev, remark: e.target.value }))}
                placeholder="备注信息"
              />
            </div>
            
            {newCostItem.quantity > 0 && newCostItem.unitPrice > 0 && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <span className="text-muted-foreground">金额小计: </span>
                <span className="font-bold text-blue-600">
                  ¥{(newCostItem.quantity * newCostItem.unitPrice).toLocaleString()}
                </span>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAddCostItem}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
