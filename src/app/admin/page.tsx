'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Users,
  Shield,
  Building2,
  Package,
  FileText,
  History,
  ArrowLeft,
  Database,
  UserCog,
  Key,
  Activity,
} from 'lucide-react';

const adminModules = [
  {
    title: '供应商管理',
    description: '审核供应商、管理下线关系',
    icon: Building2,
    href: '/admin/suppliers',
    color: 'bg-blue-500',
  },
  {
    title: '订单管理',
    description: '订单查询、外发分配',
    icon: Package,
    href: '/admin/orders',
    color: 'bg-green-500',
  },
  {
    title: '权限管理',
    description: '角色权限、部门权限配置',
    icon: Shield,
    href: '/admin/permissions',
    color: 'bg-purple-500',
  },
  {
    title: '用户管理',
    description: '员工账号、部门分配',
    icon: Users,
    href: '/admin/users',
    color: 'bg-orange-500',
  },
  {
    title: '操作日志',
    description: '操作记录、数据回溯',
    icon: History,
    href: '/admin/logs',
    color: 'bg-indigo-500',
  },
  {
    title: '数据备份',
    description: '数据备份与恢复',
    icon: Database,
    href: '/admin/backup',
    color: 'bg-cyan-500',
  },
];

export default function AdminPage() {
  const [stats, setStats] = useState({
    suppliers: 0,
    orders: 0,
    users: 0,
    logs: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [suppliersRes, ordersRes, usersRes, logsRes] = await Promise.all([
        fetch('/api/suppliers'),
        fetch('/api/production-orders'),
        fetch('/api/employees'),
        fetch('/api/operation-logs?page_size=1'),
      ]);

      const [suppliersData, ordersData, usersData, logsData] = await Promise.all([
        suppliersRes.json(),
        ordersRes.json(),
        usersRes.json(),
        logsRes.json(),
      ]);

      setStats({
        suppliers: suppliersData.data?.length || 0,
        orders: ordersData.data?.length || 0,
        users: usersData.data?.length || 0,
        logs: logsData.pagination?.total || 0,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              返回前台
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="h-8 w-8" />
              后台管理系统
            </h1>
            <p className="text-gray-500 mt-1">仅管理员可访问的系统配置区域</p>
          </div>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          <Key className="h-3 w-3 mr-1" />
          管理员模式
        </Badge>
      </div>

      {/* 统计概览 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">供应商</div>
                <div className="text-2xl font-bold">{stats.suppliers}</div>
              </div>
              <Building2 className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">订单总数</div>
                <div className="text-2xl font-bold">{stats.orders}</div>
              </div>
              <Package className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">员工数</div>
                <div className="text-2xl font-bold">{stats.users}</div>
              </div>
              <Users className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">操作记录</div>
                <div className="text-2xl font-bold">{stats.logs}</div>
              </div>
              <Activity className="h-8 w-8 text-indigo-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 功能模块 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {adminModules.map((module) => (
          <Link key={module.href} href={module.href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 ${module.color} rounded-lg flex items-center justify-center`}>
                    <module.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{module.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{module.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* 权限说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            权限体系说明
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="font-medium text-red-800">超级管理员</div>
                <div className="text-sm text-red-600 mt-1">
                  拥有所有权限，可管理所有模块
                </div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="font-medium text-blue-800">部门主管</div>
                <div className="text-sm text-blue-600 mt-1">
                  管理本部门权限，可审批部门事务
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="font-medium text-gray-800">普通员工</div>
                <div className="text-sm text-gray-600 mt-1">
                  仅能访问分配的模块，只读或编辑权限
                </div>
              </div>
            </div>
            
            <div className="text-sm text-gray-500">
              <strong>权限细分：</strong>
              <span className="ml-2">查看 | 创建 | 编辑 | 删除 | 审批</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
