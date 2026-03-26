'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Shield,
  Users,
  Check,
  X,
  Save,
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  status: string;
  permissions: UserPermission[];
  departments: UserDepartment[];
}

interface UserPermission {
  id: string;
  user_id: string;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
}

interface UserDepartment {
  id: string;
  user_id: string;
  department: string;
  position: string;
  is_manager: boolean;
}

// 系统模块定义
const systemModules = [
  { key: 'dashboard', name: '数据大屏' },
  { key: 'production', name: '生产管理' },
  { key: 'cutting', name: '裁床管理' },
  { key: 'cutting_bundles', name: '裁床分扎' },
  { key: 'process_scan', name: '工序扫码' },
  { key: 'process_tracking', name: '工序追溯' },
  { key: 'processes', name: '工序管理' },
  { key: 'style_processes', name: '款式工序配置' },
  { key: 'piece_wages', name: '计件工资' },
  { key: 'craft_processes', name: '二次工艺' },
  { key: 'finishing', name: '尾部处理' },
  { key: 'shipping_tasks', name: '发货任务' },
  { key: 'inventory', name: '物料库存' },
  { key: 'finished_inventory', name: '成衣库存' },
  { key: 'outsource_orders', name: '外发订单' },
  { key: 'suppliers', name: '供应商管理' },
  { key: 'finance', name: '财务中心' },
  { key: 'purchase', name: '采购管理' },
  { key: 'employees', name: '人事管理' },
  { key: 'salary', name: '工资管理' },
  { key: 'customers', name: '客户管理' },
  { key: 'shipment', name: '出货管理' },
];

// 部门定义
const departments = [
  { key: 'production', name: '生产部' },
  { key: 'cutting', name: '裁床部' },
  { key: 'workshop', name: '车间' },
  { key: 'craft', name: '二次工艺部' },
  { key: 'finishing', name: '尾部' },
  { key: 'warehouse', name: '仓库' },
  { key: 'finance', name: '财务部' },
  { key: 'hr', name: '人事部' },
  { key: 'purchase', name: '采购部' },
  { key: 'sales', name: '销售部' },
];

export default function AdminPermissionsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // 权限表单
  const [permissionForm, setPermissionForm] = useState<Record<string, {
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
    can_approve: boolean;
  }>>({});

  // 部门表单
  const [departmentForm, setDepartmentForm] = useState<{
    department: string;
    position: string;
    is_manager: boolean;
  }[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user-permissions');
      const result = await response.json();
      if (result.success) {
        setUsers(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPermissions = (user: User) => {
    setSelectedUser(user);
    
    // 初始化权限表单
    const form: typeof permissionForm = {};
    systemModules.forEach((m) => {
      const existing = user.permissions?.find((p) => p.module === m.key);
      form[m.key] = existing ? {
        can_view: existing.can_view,
        can_create: existing.can_create,
        can_edit: existing.can_edit,
        can_delete: existing.can_delete,
        can_approve: existing.can_approve,
      } : {
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false,
        can_approve: false,
      };
    });
    setPermissionForm(form);
    
    // 初始化部门表单
    setDepartmentForm(user.departments?.map((d) => ({
      department: d.department,
      position: d.position || '',
      is_manager: d.is_manager,
    })) || []);
    
    setDialogOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;

    try {
      // 保存权限
      const permissions = Object.entries(permissionForm).map(([module, perms]) => ({
        module,
        ...perms,
      }));

      const permResponse = await fetch('/api/user-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUser.id,
          permissions,
        }),
      });

      // 保存部门
      const deptResponse = await fetch('/api/user-permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUser.id,
          departments: departmentForm,
        }),
      });

      const [permResult, deptResult] = await Promise.all([
        permResponse.json(),
        deptResponse.json(),
      ]);

      if (permResult.success && deptResult.success) {
        setDialogOpen(false);
        fetchUsers();
        alert('保存成功！');
      } else {
        alert('保存失败');
      }
    } catch (error) {
      alert('保存失败');
    }
  };

  const togglePermission = (module: string, perm: string, value: boolean) => {
    setPermissionForm((prev) => ({
      ...prev,
      [module]: {
        ...prev[module],
        [perm]: value,
      },
    }));
  };

  const addDepartment = () => {
    setDepartmentForm((prev) => [
      ...prev,
      { department: '', position: '', is_manager: false },
    ]);
  };

  const removeDepartment = (index: number) => {
    setDepartmentForm((prev) => prev.filter((_, i) => i !== index));
  };

  const updateDepartment = (index: number, field: string, value: any) => {
    setDepartmentForm((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // 快捷设置
  const applyTemplate = (template: 'full' | 'readonly' | 'department') => {
    const form: typeof permissionForm = {};
    
    systemModules.forEach((m) => {
      if (template === 'full') {
        form[m.key] = {
          can_view: true,
          can_create: true,
          can_edit: true,
          can_delete: true,
          can_approve: true,
        };
      } else if (template === 'readonly') {
        form[m.key] = {
          can_view: true,
          can_create: false,
          can_edit: false,
          can_delete: false,
          can_approve: false,
        };
      } else {
        form[m.key] = permissionForm[m.key] || {
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false,
          can_approve: false,
        };
      }
    });
    
    setPermissionForm(form);
  };

  return (
    <div className="p-6 space-y-6">
      {/* 顶部导航 */}
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            权限管理
          </h1>
          <p className="text-gray-500 text-sm">配置用户权限和部门归属</p>
        </div>
      </div>

      {/* 用户列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            用户权限配置
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>部门</TableHead>
                  <TableHead>职位</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>权限模块数</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.departments?.map((d) => (
                        <Badge key={d.id} variant="outline" className="mr-1">
                          {departments.find((dep) => dep.key === d.department)?.name || d.department}
                          {d.is_manager && ' (主管)'}
                        </Badge>
                      )) || user.department || '-'}
                    </TableCell>
                    <TableCell>{user.position || '-'}</TableCell>
                    <TableCell>
                      <Badge className={user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {user.status === 'active' ? '正常' : '停用'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.permissions?.filter((p) => p.can_view).length || 0} 个
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm"
                        onClick={() => handleEditPermissions(user)}
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        配置权限
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 权限配置弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              配置权限 - {selectedUser?.name}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="permissions">
            <TabsList>
              <TabsTrigger value="permissions">模块权限</TabsTrigger>
              <TabsTrigger value="departments">部门归属</TabsTrigger>
            </TabsList>

            <TabsContent value="permissions" className="space-y-4">
              {/* 快捷设置 */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => applyTemplate('full')}>
                  全部权限
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyTemplate('readonly')}>
                  只读权限
                </Button>
              </div>

              {/* 权限表格 */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>模块</TableHead>
                    <TableHead className="text-center">查看</TableHead>
                    <TableHead className="text-center">创建</TableHead>
                    <TableHead className="text-center">编辑</TableHead>
                    <TableHead className="text-center">删除</TableHead>
                    <TableHead className="text-center">审批</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {systemModules.map((module) => (
                    <TableRow key={module.key}>
                      <TableCell>{module.name}</TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={permissionForm[module.key]?.can_view || false}
                          onCheckedChange={(checked) => 
                            togglePermission(module.key, 'can_view', !!checked)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={permissionForm[module.key]?.can_create || false}
                          onCheckedChange={(checked) => 
                            togglePermission(module.key, 'can_create', !!checked)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={permissionForm[module.key]?.can_edit || false}
                          onCheckedChange={(checked) => 
                            togglePermission(module.key, 'can_edit', !!checked)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={permissionForm[module.key]?.can_delete || false}
                          onCheckedChange={(checked) => 
                            togglePermission(module.key, 'can_delete', !!checked)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={permissionForm[module.key]?.can_approve || false}
                          onCheckedChange={(checked) => 
                            togglePermission(module.key, 'can_approve', !!checked)
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="departments" className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>分配部门</Label>
                <Button variant="outline" size="sm" onClick={addDepartment}>
                  添加部门
                </Button>
              </div>

              {departmentForm.map((dept, index) => (
                <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                  <Select
                    value={dept.department}
                    onValueChange={(v) => updateDepartment(index, 'department', v)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="选择部门" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.key} value={d.key}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    placeholder="职位"
                    value={dept.position}
                    onChange={(e) => updateDepartment(index, 'position', e.target.value)}
                    className="w-32"
                  />

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={dept.is_manager}
                      onCheckedChange={(checked) => 
                        updateDepartment(index, 'is_manager', !!checked)
                      }
                    />
                    <span className="text-sm">主管</span>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDepartment(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {departmentForm.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  暂无部门分配，点击"添加部门"进行配置
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSavePermissions}>
              <Save className="h-4 w-4 mr-1" />
              保存配置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
