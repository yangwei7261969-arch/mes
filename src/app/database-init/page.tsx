'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Database, CheckCircle, XCircle, AlertTriangle, 
  Copy, Download, RefreshCw, FileCode, Info 
} from 'lucide-react';
import { toast } from 'sonner';

interface TableStatus {
  total: number;
  existing: number;
  missing: number;
  tableStatus: Record<string, boolean>;
  missingTables: string[];
}

interface DatabaseStatus {
  checked: boolean;
  tableStatus?: TableStatus;
  loading: boolean;
  error?: string;
}

export default function DatabaseInitPage() {
  const [status, setStatus] = useState<DatabaseStatus>({
    checked: false,
    loading: false
  });
  const [sqlContent, setSqlContent] = useState<{
    schema?: string;
    seed_part1?: string;
    seed_part2?: string;
    permission_tables?: string;
    permission_data?: string;
  }>({});
  const [activeTab, setActiveTab] = useState('status');
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{success: boolean; message: string; counts?: Record<string, number>} | null>(null);

  // 检查数据库状态
  const checkDatabase = async () => {
    setStatus(prev => ({ ...prev, loading: true, error: undefined }));
    try {
      const response = await fetch('/api/init-tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check' })
      });
      const data = await response.json();
      
      if (data.success) {
        setStatus({
          checked: true,
          tableStatus: {
            total: data.total,
            existing: data.existing,
            missing: data.missing,
            tableStatus: data.tableStatus,
            missingTables: data.missingTables
          },
          loading: false
        });
      } else {
        setStatus({
          checked: true,
          loading: false,
          error: data.error || '检查失败'
        });
      }
    } catch (error) {
      setStatus({
        checked: true,
        loading: false,
        error: String(error)
      });
    }
  };

  // 加载SQL内容
  const loadSqlContent = async () => {
    try {
      const response = await fetch('/api/init-tables');
      const data = await response.json();
      if (data.success) {
        setSqlContent(data.sql);
      }
    } catch (error) {
      console.error('Load SQL error:', error);
    }
  };

  useEffect(() => {
    checkDatabase();
    loadSqlContent();
  }, []);

  // 复制SQL到剪贴板
  const copyToClipboard = (content: string, name: string) => {
    navigator.clipboard.writeText(content);
    toast.success(`${name} 已复制到剪贴板`);
  };

  // 下载SQL文件
  const downloadSql = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filename} 下载完成`);
  };

  // 一键填充演示数据
  const seedDemoData = async () => {
    setSeeding(true);
    setSeedResult(null);
    try {
      const response = await fetch('/api/seed-demo-data');
      const data = await response.json();
      
      setSeedResult({
        success: data.success,
        message: data.message || (data.success ? '演示数据填充成功' : '填充失败'),
        counts: data.counts
      });
      
      if (data.success) {
        toast.success('演示数据已成功填充');
      } else {
        toast.error('演示数据填充失败: ' + (data.error || '未知错误'));
      }
    } catch (error) {
      setSeedResult({
        success: false,
        message: '请求失败: ' + String(error)
      });
      toast.error('请求失败');
    } finally {
      setSeeding(false);
    }
  };

  // 渲染表状态
  const renderTableStatus = () => {
    if (!status.checked || !status.tableStatus) return null;

    const { tableStatus, missingTables } = status.tableStatus;
    const tables = Object.entries(tableStatus);

    return (
      <div className="space-y-4">
        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{status.tableStatus.total}</div>
                <div className="text-sm text-muted-foreground">总表数</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{status.tableStatus.existing}</div>
                <div className="text-sm text-muted-foreground">已存在</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{status.tableStatus.missing}</div>
                <div className="text-sm text-muted-foreground">缺失</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 状态提示 */}
        {status.tableStatus.missing === 0 ? (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertTitle>数据库完整</AlertTitle>
            <AlertDescription>
              所有 {status.tableStatus.total} 个表已正确创建，数据库结构完整。
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-yellow-500 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertTitle>数据库不完整</AlertTitle>
            <AlertDescription>
              缺失 {status.tableStatus.missing} 个表，请前往 Supabase SQL 编辑器执行初始化脚本。
            </AlertDescription>
          </Alert>
        )}

        {/* 表列表 */}
        <Card>
          <CardHeader>
            <CardTitle>表状态详情</CardTitle>
            <CardDescription>
              显示所有数据表的创建状态
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {tables.map(([name, exists]) => (
                <div
                  key={name}
                  className={`flex items-center gap-2 p-2 rounded-md text-sm ${
                    exists ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}
                >
                  {exists ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <span className="font-mono">{name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 缺失的表 */}
        {missingTables.length > 0 && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">缺失的表</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {missingTables.map(name => (
                  <Badge key={name} variant="destructive">{name}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // 渲染SQL内容
  const renderSqlContent = (content: string | undefined, title: string, filename: string) => {
    if (!content) return <div className="text-muted-foreground">加载中...</div>;

    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => copyToClipboard(content, title)}>
            <Copy className="h-4 w-4 mr-2" />
            复制SQL
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadSql(content, filename)}>
            <Download className="h-4 w-4 mr-2" />
            下载文件
          </Button>
        </div>
        <div className="relative">
          <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg overflow-auto max-h-[600px] text-sm font-mono">
            <code>{content}</code>
          </pre>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">数据库初始化</h1>
            <p className="text-muted-foreground">管理数据库表结构和初始数据</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={seedDemoData} 
            disabled={seeding}
            variant="default"
            className="bg-green-600 hover:bg-green-700"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${seeding ? 'animate-spin' : ''}`} />
            一键填充演示数据
          </Button>
          <Button onClick={checkDatabase} disabled={status.loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${status.loading ? 'animate-spin' : ''}`} />
            刷新状态
          </Button>
        </div>
      </div>

      {/* 演示数据填充结果 */}
      {seedResult && (
        <Alert className={seedResult.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
          {seedResult.success ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
          <AlertTitle>{seedResult.success ? '填充成功' : '填充失败'}</AlertTitle>
          <AlertDescription>
            <p>{seedResult.message}</p>
            {seedResult.counts && (
              <div className="mt-2 grid grid-cols-4 md:grid-cols-6 gap-2 text-sm">
                {Object.entries(seedResult.counts).map(([key, value]) => (
                  <div key={key} className="bg-white/50 px-2 py-1 rounded">
                    <span className="font-medium">{value}</span> {key}
                  </div>
                ))}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* 使用说明 */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>使用说明</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>1. 首先在「状态检查」页面查看当前数据库表状态</p>
          <p>2. 如有缺失的表，前往 Supabase 控制台的 SQL 编辑器</p>
          <p>3. 依次执行以下SQL脚本：schema.sql → seed-data-part1.sql → seed-data-part2.sql</p>
          <p>4. 如需权限系统，执行：permission-tables.sql → permission-data.sql</p>
          <p>5. 执行完成后刷新状态确认所有表已创建</p>
        </AlertDescription>
      </Alert>

      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="status">
            <CheckCircle className="h-4 w-4 mr-2" />
            状态检查
          </TabsTrigger>
          <TabsTrigger value="schema">
            <FileCode className="h-4 w-4 mr-2" />
            表结构 (schema.sql)
          </TabsTrigger>
          <TabsTrigger value="seed1">
            <FileCode className="h-4 w-4 mr-2" />
            测试数据 1
          </TabsTrigger>
          <TabsTrigger value="seed2">
            <FileCode className="h-4 w-4 mr-2" />
            测试数据 2
          </TabsTrigger>
          <TabsTrigger value="permission_tables">
            <FileCode className="h-4 w-4 mr-2" />
            权限表结构
          </TabsTrigger>
          <TabsTrigger value="permission_data">
            <FileCode className="h-4 w-4 mr-2" />
            权限数据
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="mt-4">
          {status.loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : status.error ? (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>检查失败</AlertTitle>
              <AlertDescription>{status.error}</AlertDescription>
            </Alert>
          ) : (
            renderTableStatus()
          )}
        </TabsContent>

        <TabsContent value="schema" className="mt-4">
          {renderSqlContent(sqlContent.schema, '表结构SQL', 'schema.sql')}
        </TabsContent>

        <TabsContent value="seed1" className="mt-4">
          {renderSqlContent(sqlContent.seed_part1, '测试数据SQL (第一部分)', 'seed-data-part1.sql')}
        </TabsContent>

        <TabsContent value="seed2" className="mt-4">
          {renderSqlContent(sqlContent.seed_part2, '测试数据SQL (第二部分)', 'seed-data-part2.sql')}
        </TabsContent>

        <TabsContent value="permission_tables" className="mt-4">
          {renderSqlContent(sqlContent.permission_tables, '权限表结构SQL', 'permission-tables.sql')}
        </TabsContent>

        <TabsContent value="permission_data" className="mt-4">
          {renderSqlContent(sqlContent.permission_data, '权限数据SQL', 'permission-data.sql')}
        </TabsContent>
      </Tabs>
    </div>
  );
}
