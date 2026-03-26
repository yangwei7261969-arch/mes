'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  GitBranch, 
  Clock, 
  User,
  Package,
  CheckCircle,
  AlertCircle,
  Filter,
  Download
} from 'lucide-react';

interface TrackingRecord {
  id: string;
  bundle_id: string;
  process_id: string;
  worker_id: string;
  quantity: number;
  wage: number;
  status: string;
  notes?: string;
  created_at: string;
  processes?: {
    id: string;
    name: string;
    code: string;
    category: string;
    unit_price: number;
  };
  employees?: {
    id: string;
    name: string;
    employee_no: string;
    department: string;
  };
  cutting_bundles?: {
    id: string;
    bundle_no: string;
    size: string;
    color: string;
    quantity: number;
    cutting_orders?: {
      style_no: string;
      color: string;
    };
  };
}

interface Process {
  id: string;
  name: string;
  code: string;
  category: string;
}

interface Employee {
  id: string;
  name: string;
  employee_no: string;
}

export default function ProcessTrackingPage() {
  const [records, setRecords] = useState<TrackingRecord[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // 筛选条件
  const [bundleNo, setBundleNo] = useState('');
  const [workerId, setWorkerId] = useState('all');
  const [processId, setProcessId] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 汇总统计
  const [stats, setStats] = useState({
    totalQuantity: 0,
    totalWage: 0,
    totalRecords: 0,
  });

  useEffect(() => {
    fetchProcesses();
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [page, bundleNo, workerId, processId, startDate, endDate]);

  const fetchProcesses = async () => {
    try {
      const res = await fetch('/api/processes');
      const data = await res.json();
      if (data.success) {
        setProcesses(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch processes:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      let url = `/api/process-tracking?page=${page}&pageSize=${pageSize}`;
      if (workerId && workerId !== 'all') url += `&worker_id=${workerId}`;
      if (processId && processId !== 'all') url += `&process_id=${processId}`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;
      
      // 如果有扎号，需要先查找bundle_id
      if (bundleNo) {
        const bundleRes = await fetch(`/api/cutting-bundles?bundle_no=${bundleNo}`);
        const bundleData = await bundleRes.json();
        if (bundleData.success && bundleData.data.length > 0) {
          url += `&bundle_id=${bundleData.data[0].id}`;
        }
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setRecords(data.data);
        setTotal(data.total);
        
        // 计算统计
        setStats({
          totalQuantity: data.data.reduce((sum: number, r: TrackingRecord) => sum + r.quantity, 0),
          totalWage: data.data.reduce((sum: number, r: TrackingRecord) => sum + r.wage, 0),
          totalRecords: data.total,
        });
      }
    } catch (error) {
      console.error('Failed to fetch records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchRecords();
  };

  const handleReset = () => {
    setBundleNo('');
    setWorkerId('');
    setProcessId('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const handleExport = () => {
    if (records.length === 0) {
      alert('暂无数据可导出');
      return;
    }

    const headers = ['扎号', '款号', '颜色', '尺码', '工序', '员工', '数量', '工资', '时间'];
    const rows = records.map(r => [
      r.cutting_bundles?.bundle_no || '',
      r.cutting_bundles?.cutting_orders?.style_no || '',
      r.cutting_bundles?.color || '',
      r.cutting_bundles?.size || '',
      r.processes?.name || '',
      r.employees?.name || '',
      r.quantity,
      r.wage,
      new Date(r.created_at).toLocaleString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `工序追溯_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GitBranch className="h-8 w-8" />
            工序追溯
          </h1>
          <p className="text-gray-500 mt-1">追踪每扎的完整工序流转记录</p>
        </div>
        
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          导出报表
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{stats.totalQuantity}</div>
                <div className="text-sm text-gray-500">完成数量</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{stats.totalRecords}</div>
                <div className="text-sm text-gray-500">记录总数</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">¥{stats.totalWage.toFixed(2)}</div>
                <div className="text-sm text-gray-500">工资合计</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <User className="h-8 w-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">
                  {new Set(records.map(r => r.worker_id)).size}
                </div>
                <div className="text-sm text-gray-500">参与员工</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选条件 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            筛选条件
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">扎号</label>
              <Input
                placeholder="输入扎号"
                value={bundleNo}
                onChange={(e) => setBundleNo(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">员工</label>
              <Select value={workerId} onValueChange={setWorkerId}>
                <SelectTrigger>
                  <SelectValue placeholder="全部员工" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部员工</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.employee_no} - {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">工序</label>
              <Select value={processId} onValueChange={setProcessId}>
                <SelectTrigger>
                  <SelectValue placeholder="全部工序" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部工序</SelectItem>
                  {processes.map(proc => (
                    <SelectItem key={proc.id} value={proc.id}>
                      {proc.code} - {proc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">开始日期</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">结束日期</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={handleReset}>
              重置
            </Button>
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              查询
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 记录列表 */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>扎号</TableHead>
                <TableHead>款号</TableHead>
                <TableHead>颜色/尺码</TableHead>
                <TableHead>工序</TableHead>
                <TableHead>员工</TableHead>
                <TableHead className="text-right">数量</TableHead>
                <TableHead className="text-right">工资</TableHead>
                <TableHead>时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    暂无记录
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-mono font-medium">
                      {record.cutting_bundles?.bundle_no || '-'}
                    </TableCell>
                    <TableCell>
                      {record.cutting_bundles?.cutting_orders?.style_no || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {record.cutting_bundles?.color} / {record.cutting_bundles?.size}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{record.processes?.name || '-'}</div>
                        <div className="text-xs text-gray-500">
                          {record.processes?.code} | ¥{record.processes?.unit_price}/件
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{record.employees?.name || '-'}</div>
                        <div className="text-xs text-gray-500">
                          {record.employees?.employee_no}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {record.quantity}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      ¥{record.wage.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(record.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-gray-500">
                共 {total} 条记录，第 {page}/{totalPages} 页
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 流程图示 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            工序流转示意
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between overflow-x-auto py-4">
            {processes.slice(0, 8).map((process, index) => (
              <div key={process.id} className="flex items-center">
                <div className="flex flex-col items-center min-w-[100px]">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    index === 0 ? 'bg-blue-500 text-white' :
                    index < processes.length - 1 ? 'bg-green-500 text-white' :
                    'bg-gray-300 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="text-sm mt-2 text-center whitespace-nowrap">
                    {process.name}
                  </div>
                </div>
                {index < processes.length - 1 && index < 7 && (
                  <div className="w-16 h-0.5 bg-gray-300 mx-2" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
