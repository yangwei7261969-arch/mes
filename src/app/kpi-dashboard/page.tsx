'use client';

import React, { useState, useEffect } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp, TrendingDown, Users, Award, AlertTriangle,
  RefreshCw, BarChart2, Target, Zap, Clock, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface LeaderboardItem {
  rank: number;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  department_name: string;
  total_quantity: number;
  avg_efficiency: number;
  avg_quality: number;
  performance_score: number;
}

interface Bottleneck {
  process_id: string;
  process_name: string;
  line_name: string;
  utilization_rate: number;
  worker_count: number;
  bottleneck_score: number;
  is_bottleneck: boolean;
  recommendation: string;
  priority: number;
}

interface KPISummary {
  today: {
    count: number;
    avg_efficiency: number;
    avg_quality: number;
    total_output: number;
    avg_score: number;
  };
  month: {
    count: number;
    avg_efficiency: number;
    avg_quality: number;
    total_output: number;
    avg_score: number;
  };
}

export default function KPIDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<KPISummary | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
  const [period, setPeriod] = useState('daily');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState('leaderboard');

  useEffect(() => {
    loadData();
  }, [date, period]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 并行加载所有数据
      const [summaryRes, leaderboardRes, bottleneckRes] = await Promise.all([
        fetch(`/api/kpi?type=summary&date=${date}`),
        fetch(`/api/kpi?type=leaderboard&period=${period}&date=${date}`),
        fetch(`/api/kpi?type=bottleneck&date=${date}`),
      ]);

      const [summaryData, leaderboardData, bottleneckData] = await Promise.all([
        summaryRes.json(),
        leaderboardRes.json(),
        bottleneckRes.json(),
      ]);

      if (summaryData.success) setSummary(summaryData.data);
      if (leaderboardData.success) setLeaderboard(leaderboardData.data.rankings || []);
      if (bottleneckData.success) setBottlenecks(bottleneckData.data.bottlenecks || []);
    } catch (error) {
      console.error('Load data error:', error);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const calculateKPIs = async () => {
    try {
      toast.info('正在计算KPI...');
      // 批量计算所有员工今日KPI
      const res = await fetch('/api/kpi/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`计算完成: ${data.message}`);
        loadData();
      }
    } catch (error) {
      toast.error('计算失败');
    }
  };

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;
  const formatNumber = (value: number) => new Intl.NumberFormat('zh-CN').format(Math.round(value));

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center font-bold text-white">1</div>;
    if (rank === 2) return <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center font-bold text-white">2</div>;
    if (rank === 3) return <div className="w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center font-bold text-white">3</div>;
    return <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-medium">{rank}</div>;
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 100) return 'text-green-600';
    if (efficiency >= 80) return 'text-blue-600';
    if (efficiency >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBottleneckSeverity = (score: number) => {
    if (score >= 90) return { bg: 'bg-red-100', text: 'text-red-700', label: '严重' };
    if (score >= 80) return { bg: 'bg-orange-100', text: 'text-orange-700', label: '警告' };
    return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '注意' };
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">KPI绩效中心</h1>
          <p className="text-muted-foreground">员工效率排行 · 工序瓶颈分析 · 产能统计</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">今日</SelectItem>
              <SelectItem value="weekly">本周</SelectItem>
              <SelectItem value="monthly">本月</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* KPI概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">平均效率</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getEfficiencyColor(summary?.today?.avg_efficiency || 0)}`}>
              {formatPercent(summary?.today?.avg_efficiency || 0)}
            </div>
            <Progress value={summary?.today?.avg_efficiency || 0} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              本月平均: {formatPercent(summary?.month?.avg_efficiency || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">合格率</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatPercent(summary?.today?.avg_quality || 0)}
            </div>
            <Progress value={summary?.today?.avg_quality || 0} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              本月平均: {formatPercent(summary?.month?.avg_quality || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">总产量</CardTitle>
            <BarChart2 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(summary?.today?.total_output || 0)}
            </div>
            <p className="text-xs text-muted-foreground">件</p>
            <p className="text-xs text-muted-foreground mt-2">
              本月累计: {formatNumber(summary?.month?.total_output || 0)} 件
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">绩效评分</CardTitle>
            <Award className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {(summary?.today?.avg_score || 0).toFixed(1)}
            </div>
            <Progress value={summary?.today?.avg_score || 0} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              统计人数: {summary?.today?.count || 0} 人
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="leaderboard">
            <Award className="h-4 w-4 mr-2" />
            效率排行
          </TabsTrigger>
          <TabsTrigger value="bottleneck">
            <AlertTriangle className="h-4 w-4 mr-2" />
            瓶颈分析
          </TabsTrigger>
          <TabsTrigger value="process">
            <Target className="h-4 w-4 mr-2" />
            工序分析
          </TabsTrigger>
        </TabsList>

        {/* 效率排行 */}
        <TabsContent value="leaderboard" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>员工绩效排行榜</CardTitle>
              <CardDescription>
                按综合绩效评分排名 · 统计周期: {period === 'daily' ? '今日' : period === 'weekly' ? '本周' : '本月'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-16 w-16 mx-auto mb-4" />
                  <p>暂无数据</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">排名</TableHead>
                      <TableHead>员工</TableHead>
                      <TableHead>部门</TableHead>
                      <TableHead className="text-right">产量</TableHead>
                      <TableHead className="text-right">效率</TableHead>
                      <TableHead className="text-right">合格率</TableHead>
                      <TableHead className="text-right">综合分</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.map((item) => (
                      <TableRow key={item.employee_id}>
                        <TableCell>{getRankBadge(item.rank)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.employee_name}</p>
                            <p className="text-xs text-muted-foreground">{item.employee_code}</p>
                          </div>
                        </TableCell>
                        <TableCell>{item.department_name || '-'}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatNumber(item.total_quantity)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${getEfficiencyColor(item.avg_efficiency)}`}>
                          {formatPercent(item.avg_efficiency)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPercent(item.avg_quality)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={item.performance_score >= 80 ? 'default' : 'secondary'}>
                            {item.performance_score.toFixed(1)}
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

        {/* 瓶颈分析 */}
        <TabsContent value="bottleneck" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                工序瓶颈分析
                {bottlenecks.length > 0 && (
                  <Badge variant="destructive">{bottlenecks.length} 个瓶颈</Badge>
                )}
              </CardTitle>
              <CardDescription>
                识别产能受限的工序，提供优化建议
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : bottlenecks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
                  <p className="text-lg">生产顺畅</p>
                  <p className="text-sm">当前没有明显的瓶颈工序</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bottlenecks.map((bn) => {
                    const severity = getBottleneckSeverity(bn.bottleneck_score);
                    return (
                      <Card key={bn.process_id} className={`border-l-4 border-l-orange-500`}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-medium">{bn.process_name}</h3>
                                <Badge className={`${severity.bg} ${severity.text}`}>
                                  {severity.label}
                                </Badge>
                                <Badge variant="outline">优先级 {bn.priority}</Badge>
                              </div>
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">利用率</p>
                                  <p className="font-medium">{formatPercent(bn.utilization_rate)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">瓶颈分数</p>
                                  <p className="font-medium text-orange-600">{bn.bottleneck_score.toFixed(1)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">工人数</p>
                                  <p className="font-medium">{bn.worker_count} 人</p>
                                </div>
                              </div>
                              {bn.recommendation && (
                                <div className="mt-3 p-2 bg-orange-50 rounded text-sm text-orange-700">
                                  💡 {bn.recommendation}
                                </div>
                              )}
                            </div>
                            <Zap className="h-6 w-6 text-orange-500" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 工序分析 */}
        <TabsContent value="process" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>效率分布</CardTitle>
                <CardDescription>各工序平均效率对比</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 示例数据 */}
                  <EfficiencyBar label="裁床" value={95} />
                  <EfficiencyBar label="缝制" value={82} />
                  <EfficiencyBar label="整烫" value={88} />
                  <EfficiencyBar label="包装" value={91} />
                  <EfficiencyBar label="质检" value={96} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>产量趋势</CardTitle>
                <CardDescription>近7日产量变化</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-end justify-between gap-2">
                  {[65, 72, 80, 75, 88, 92, 85].map((value, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-blue-500 rounded-t"
                        style={{ height: `${value}%` }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {['一', '二', '三', '四', '五', '六', '日'][i]}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 效率条形图组件
function EfficiencyBar({ label, value }: { label: string; value: number }) {
  const getColor = (v: number) => {
    if (v >= 90) return 'bg-green-500';
    if (v >= 80) return 'bg-blue-500';
    if (v >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor(value)} rounded-full transition-all`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
