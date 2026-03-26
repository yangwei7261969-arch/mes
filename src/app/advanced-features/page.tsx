'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Brain,
  Cpu,
  MapPin,
  Building,
  Calculator,
  Users,
  ShoppingCart,
  FileCode,
  Layers,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Package,
  TrendingUp,
  Loader2,
} from 'lucide-react';

const features = [
  {
    id: 'ai-core',
    title: 'AI智能核心',
    description: '基于真实业务数据的智能分析，支持自然语言交互，实时查询订单、库存、财务数据',
    icon: Brain,
    color: 'text-violet-600',
    status: 'AI已接入',
    capabilities: ['智能对话分析', '实时数据查询', '异常预警检测', '优化建议生成'],
    link: '/ai-assistant',
    highlight: true,
  },
  {
    id: 'smart-schedule',
    title: '智能排产',
    description: 'AI驱动排产优化，自动分析订单优先级、产能瓶颈、交付风险，生成最优排产方案',
    icon: BarChart3,
    color: 'text-blue-600',
    status: 'AI已接入',
    capabilities: ['订单优先级分析', '产能瓶颈识别', '排产方案生成', '风险预警提示'],
    link: '/smart-schedule',
    highlight: true,
  },
  {
    id: 'smart-alert',
    title: '智能预警',
    description: '实时监控生产异常，AI自动识别延迟订单、库存不足、财务风险等问题',
    icon: AlertTriangle,
    color: 'text-red-600',
    status: 'AI已接入',
    capabilities: ['延迟订单预警', '库存不足预警', '财务风险预警', '根因分析建议'],
    link: '/smart-alert',
    highlight: true,
  },
  {
    id: 'equipment',
    title: '设备管理',
    description: 'IoT设备接入、状态监控、预测性维护、OEE分析',
    icon: Cpu,
    color: 'text-blue-600',
    status: '已上线',
    capabilities: ['设备状态实时监控', '预测性维护', 'OEE效率分析', '设备台账管理'],
    link: '/production-dashboard',
  },
  {
    id: 'tracking',
    title: '全流程追踪',
    description: 'RFID/条码追踪、生产进度可视化、工序流转记录',
    icon: MapPin,
    color: 'text-green-600',
    status: '已上线',
    capabilities: ['RFID实时追踪', '工序流转记录', '生产进度可视化', '质量追溯查询'],
    link: '/process-tracking',
  },
  {
    id: 'multi-factory',
    title: '多工厂协同',
    description: '多工厂管理、产能调度、跨厂协同生产',
    icon: Building,
    color: 'text-amber-600',
    status: '已上线',
    capabilities: ['多工厂统一管理', '产能智能调度', '跨厂协同生产', '工厂绩效对比'],
    link: '/production-prep',
  },
  {
    id: 'profit-sharing',
    title: '智能分账',
    description: '多角色利润分配、自动结算、账务透明',
    icon: Calculator,
    color: 'text-rose-600',
    status: '已上线',
    capabilities: ['多角色利润分配', '自动结算分账', '账务透明可查', '结算报表导出'],
    link: '/supplier-payment',
  },
  {
    id: 'saas',
    title: 'SaaS多租户',
    description: '多企业独立部署、数据隔离、权限分级',
    icon: Users,
    color: 'text-indigo-600',
    status: '已上线',
    capabilities: ['多企业独立空间', '数据完全隔离', '权限分级管理', '企业独立域名'],
    link: '/permissions',
  },
  {
    id: 'customer-order',
    title: '客户自助下单',
    description: '客户在线下单、进度查询、交付确认',
    icon: ShoppingCart,
    color: 'text-teal-600',
    status: '已上线',
    capabilities: ['在线自助下单', '实时进度查询', '交付确认签收', '历史订单查看'],
    link: '/customers',
  },
  {
    id: 'cad-integration',
    title: 'CAD对接',
    description: 'CAD文件导入、工艺解析、BOM自动生成',
    icon: FileCode,
    color: 'text-cyan-600',
    status: '已上线',
    capabilities: ['CAD文件导入', '工艺自动解析', 'BOM自动生成', '版型智能识别'],
    link: '/style-processes',
  },
  {
    id: 'batch-management',
    title: '批次管理',
    description: '生产批次追溯、批次属性、批次关联查询',
    icon: Layers,
    color: 'text-orange-600',
    status: '已上线',
    capabilities: ['批次全程追溯', '批次属性管理', '批次关联查询', '批次质量分析'],
    link: '/cutting-bundles',
  },
];

// 快速分析卡片组件
function QuickAnalysisCard() {
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  const handleQuickAnalysis = async (type: string) => {
    setLoading(type);
    setResult(null);
    
    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ 
            role: 'user', 
            content: type === 'production' 
              ? '快速分析当前生产订单状态，列出需要关注的关键问题' 
              : type === 'inventory'
              ? '检查当前库存状态，列出库存不足的物料'
              : type === 'alert'
              ? '分析当前有哪些需要预警的问题，按严重程度排序'
              : '分析本月财务状况'
          }],
          stream: false,
        }),
      });
      
      const data = await response.json();
      if (data.content) {
        setResult(data.content);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setResult('分析失败，请稍后重试');
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-violet-50 to-blue-50 border-violet-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-500" />
          <CardTitle className="text-lg">AI 快速分析</CardTitle>
        </div>
        <CardDescription>一键获取智能分析报告</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Button 
            variant="outline" 
            className="h-auto flex-col gap-1 py-3"
            onClick={() => handleQuickAnalysis('production')}
            disabled={loading !== null}
          >
            {loading === 'production' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BarChart3 className="h-4 w-4" />
            )}
            <span className="text-xs">生产分析</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto flex-col gap-1 py-3"
            onClick={() => handleQuickAnalysis('inventory')}
            disabled={loading !== null}
          >
            {loading === 'inventory' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Package className="h-4 w-4" />
            )}
            <span className="text-xs">库存检查</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto flex-col gap-1 py-3"
            onClick={() => handleQuickAnalysis('alert')}
            disabled={loading !== null}
          >
            {loading === 'alert' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <span className="text-xs">异常预警</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto flex-col gap-1 py-3"
            onClick={() => handleQuickAnalysis('finance')}
            disabled={loading !== null}
          >
            {loading === 'finance' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <TrendingUp className="h-4 w-4" />
            )}
            <span className="text-xs">财务概览</span>
          </Button>
        </div>
        
        {result && (
          <div className="mt-4 p-4 bg-background rounded-lg border text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
            {result}
          </div>
        )}
        
        <div className="mt-4 pt-4 border-t">
          <Button 
            className="w-full"
            onClick={() => router.push('/ai-assistant')}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            打开完整AI助手
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdvancedFeaturesPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* 标题区域 */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-8 w-8 text-violet-500" />
          <h1 className="text-3xl font-bold">高级功能中心</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          AI驱动的智能生产管理系统，助力企业降本增效、提升竞争力
        </p>
      </div>

      {/* AI 快速分析 */}
      <QuickAnalysisCard />

      {/* AI功能区域 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Brain className="h-5 w-5 text-violet-500" />
          AI 智能功能
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {features.filter(f => f.highlight).map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.id} className="group hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Icon className={`h-6 w-6 ${feature.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{feature.title}</CardTitle>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {feature.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4">{feature.description}</CardDescription>
                  <div className="space-y-2 mb-4">
                    {feature.capabilities.map((cap, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>{cap}</span>
                      </div>
                    ))}
                  </div>
                  <Link href={feature.link}>
                    <Button className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      立即使用
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 其他功能区域 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">更多功能</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.filter(f => !f.highlight).map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Icon className={`h-5 w-5 ${feature.color}`} />
                    </div>
                    <div>
                      <h3 className="font-medium">{feature.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        {feature.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{feature.description}</p>
                  <Link href={feature.link}>
                    <Button variant="outline" size="sm" className="w-full">
                      进入功能
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
