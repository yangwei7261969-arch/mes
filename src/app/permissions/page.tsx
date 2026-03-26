'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Shield,
  Users,
  Key,
  Plus,
  Edit,
  Trash2,
  Search,
  Building2,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  level: number;
  is_system: boolean;
  permissions?: Permission[];
}

interface Permission {
  id: string;
  module: string;
  action: string;
  description: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  status: string;
  roles: { id: string; name: string; display_name: string }[];
  created_at: string;
}

export default function PermissionManagementPage() {
  const [activeTab, setActiveTab] = useState('roles');
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 对话框
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [factoryAdminDialogOpen, setFactoryAdminDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // 表单
  const [roleForm, setRoleForm] = useState({
    name: '',
    display_name: '',
    description: '',
    level: 5,
    permission_ids: [] as string[],
  });
  
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    role_ids: [] as string[],
  });
  
  const [factoryAdminForm, setFactoryAdminForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    factory_name: '',
  });
  
  const [factoryAdminExists, setFactoryAdminExists] = useState(false);

  useEffect(() => {
    fetchData();
    checkFactoryAdmin();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 获取角色和权限
      const rolesRes = await fetch('/api/roles?include_permissions=true');
      const rolesData = await rolesRes.json();
      if (rolesData.success) {
        setRoles(rolesData.data || []);
        setAllPermissions(rolesData.allPermissions || []);
      }
      
      // 获取用户
      const usersRes = await fetch('/api/users?pageSize=100');
      const usersData = await usersRes.json();
      if (usersData.success) {
        setUsers(usersData.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFactoryAdmin = async () => {
    try {
      const res = await fetch('/api/init-database?action=check-factory-admin');
      const data = await res.json();
      setFactoryAdminExists(data.exists);
    } catch (error) {
      console.error('Failed to check factory admin:', error);
    }
  };

  // 按模块分组权限
  const permissionsByModule = (allPermissions || []).reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const moduleNames: Record<string, string> = {
    dashboard: '数据概览',
    production: '生产管理',
    cutting: '裁床管理',
    outsource: '外发管理',
    supplier: '供应商管理',
    inventory: '库存管理',
    employee: '人事管理',
    finance: '财务管理',
    system: '系统设置',
    permission: '权限管理',
  };

  const handleOpenRoleDialog = (role?: Role) => {
    if (role) {
      setSelectedRole(role);
      // permissions 可能是字符串数组或对象数组
      const permIds = role.permissions?.map(p => typeof p === 'string' ? p : p.id) || [];
      setRoleForm({
        name: role.name,
        display_name: role.display_name,
        description: role.description || '',
        level: role.level,
        permission_ids: permIds,
      });
    } else {
      setSelectedRole(null);
      setRoleForm({
        name: '',
        display_name: '',
        description: '',
        level: 5,
        permission_ids: [],
      });
    }
    setRoleDialogOpen(true);
  };

  const handleSaveRole = async () => {
    try {
      if (selectedRole) {
        // 更新角色权限
        const res = await fetch('/api/roles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role_id: selectedRole.id,
            permission_ids: roleForm.permission_ids,
          }),
        });
        const data = await res.json();
        if (data.success) {
          alert('角色权限更新成功');
          setRoleDialogOpen(false);
          fetchData();
        } else {
          alert(data.error || '更新失败');
        }
      } else {
        // 创建新角色
        const res = await fetch('/api/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(roleForm),
        });
        const data = await res.json();
        if (data.success) {
          alert('角色创建成功');
          setRoleDialogOpen(false);
          fetchData();
        } else {
          alert(data.error || '创建失败');
        }
      }
    } catch (error) {
      alert('操作失败');
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm('确定要删除此角色吗？')) return;
    
    try {
      const res = await fetch(`/api/roles?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      alert('删除失败');
    }
  };

  const handleOpenUserDialog = (user?: User) => {
    if (user) {
      setSelectedUser(user);
      setUserForm({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        department: user.department || '',
        position: user.position || '',
        role_ids: user.roles?.map(r => r.id) || [],
      });
    } else {
      setSelectedUser(null);
      setUserForm({
        name: '',
        email: '',
        phone: '',
        department: '',
        position: '',
        role_ids: [],
      });
    }
    setUserDialogOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      if (selectedUser) {
        // 更新用户
        const res = await fetch('/api/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: selectedUser.id,
            ...userForm,
          }),
        });
        const data = await res.json();
        if (data.success) {
          alert('用户更新成功');
          setUserDialogOpen(false);
          fetchData();
        } else {
          alert(data.error || '更新失败');
        }
      } else {
        // 创建用户
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...userForm,
            password: '123456', // 默认密码
          }),
        });
        const data = await res.json();
        if (data.success) {
          alert('用户创建成功，默认密码：123456');
          setUserDialogOpen(false);
          fetchData();
        } else {
          alert(data.error || '创建失败');
        }
      }
    } catch (error) {
      alert('操作失败');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('确定要删除此用户吗？')) return;
    
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      alert('删除失败');
    }
  };

  const handleInitFactoryAdmin = async () => {
    if (!factoryAdminForm.name || !factoryAdminForm.email || !factoryAdminForm.password) {
      alert('请填写必填项');
      return;
    }
    
    try {
      const res = await fetch('/api/init-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'factory-admin',
          ...factoryAdminForm 
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('分厂主账户创建成功！');
        setFactoryAdminDialogOpen(false);
        setFactoryAdminExists(true);
        fetchData();
      } else {
        alert(data.error || '创建失败');
      }
    } catch (error) {
      alert('创建失败');
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLevelBadge = (level: number) => {
    const colors: Record<number, string> = {
      1: 'bg-red-100 text-red-800',
      2: 'bg-orange-100 text-orange-800',
      3: 'bg-yellow-100 text-yellow-800',
      4: 'bg-blue-100 text-blue-800',
      5: 'bg-green-100 text-green-800',
      6: 'bg-gray-100 text-gray-800',
    };
    return <Badge className={colors[level] || colors[6]}>{level}级</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-2xl font-bold">权限管理</h1>
            <p className="text-gray-500">管理角色权限和用户账户</p>
          </div>
        </div>
        
        {!factoryAdminExists && (
          <Button 
            className="bg-orange-500 hover:bg-orange-600"
            onClick={() => setFactoryAdminDialogOpen(true)}
          >
            <Building2 className="h-4 w-4 mr-2" />
            初始化分厂主账户
          </Button>
        )}
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{roles.length}</div>
                <div className="text-sm text-gray-500">角色数量</div>
              </div>
              <Key className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{users.length}</div>
                <div className="text-sm text-gray-500">用户数量</div>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{allPermissions.length}</div>
                <div className="text-sm text-gray-500">权限项</div>
              </div>
              <Shield className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold flex items-center gap-2">
                  {factoryAdminExists ? (
                    <><CheckCircle className="h-5 w-5 text-green-500" /> 已创建</>
                  ) : (
                    <><AlertTriangle className="h-5 w-5 text-orange-500" /> 未创建</>
                  )}
                </div>
                <div className="text-sm text-gray-500">分厂主账户</div>
              </div>
              <Building2 className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主内容区 */}
      <Card>
        <CardHeader>
          <CardTitle>权限配置</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="roles">
                <Key className="h-4 w-4 mr-2" />
                角色管理
              </TabsTrigger>
              <TabsTrigger value="users">
                <Users className="h-4 w-4 mr-2" />
                用户管理
              </TabsTrigger>
            </TabsList>

            {/* 角色管理 */}
            <TabsContent value="roles">
              <div className="flex justify-end mb-4">
                <Button onClick={() => handleOpenRoleDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  新建角色
                </Button>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>角色名称</TableHead>
                    <TableHead>标识</TableHead>
                    <TableHead>等级</TableHead>
                    <TableHead>权限数</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : roles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        暂无角色
                      </TableCell>
                    </TableRow>
                  ) : (
                    roles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">{role.display_name}</TableCell>
                        <TableCell className="font-mono text-sm">{role.name}</TableCell>
                        <TableCell>{getLevelBadge(role.level)}</TableCell>
                        <TableCell>{role.permissions?.length || 0}</TableCell>
                        <TableCell>
                          {role.is_system ? (
                            <Badge className="bg-blue-100 text-blue-800">系统</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800">自定义</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenRoleDialog(role)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              编辑权限
                            </Button>
                            {!role.is_system && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteRole(role.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            {/* 用户管理 */}
            <TabsContent value="users">
              <div className="flex justify-between items-center mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    className="pl-10 w-64"
                    placeholder="搜索用户..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button onClick={() => handleOpenUserDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  新建用户
                </Button>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>邮箱</TableHead>
                    <TableHead>电话</TableHead>
                    <TableHead>部门</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        暂无用户
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone || '-'}</TableCell>
                        <TableCell>{user.department || '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles?.map((role) => (
                              <Badge key={role.id} className="bg-blue-100 text-blue-800">
                                {role.display_name}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {user.status === 'active' ? '正常' : '停用'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenUserDialog(user)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              编辑
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 角色权限编辑对话框 */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedRole ? `编辑角色权限 - ${selectedRole.display_name}` : '新建角色'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {!selectedRole && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>角色名称 *</Label>
                    <Input
                      value={roleForm.display_name}
                      onChange={(e) => setRoleForm({...roleForm, display_name: e.target.value})}
                      placeholder="如：仓库管理员"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>角色标识 *</Label>
                    <Input
                      value={roleForm.name}
                      onChange={(e) => setRoleForm({...roleForm, name: e.target.value.toLowerCase().replace(/\s+/g, '_')})}
                      placeholder="如：warehouse_manager"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>等级</Label>
                    <Select value={roleForm.level.toString()} onValueChange={(v) => setRoleForm({...roleForm, level: parseInt(v)})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,6].map(n => (
                          <SelectItem key={n} value={n.toString()}>{n}级</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>描述</Label>
                    <Input
                      value={roleForm.description}
                      onChange={(e) => setRoleForm({...roleForm, description: e.target.value})}
                      placeholder="角色描述"
                    />
                  </div>
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label>权限配置</Label>
              {selectedRole?.is_system && (
                <p className="text-sm text-orange-600 mb-2">系统角色的权限不可修改</p>
              )}
              <div className="border rounded-lg p-4 space-y-4">
                {Object.entries(permissionsByModule).map(([module, perms]) => (
                  <div key={module} className="space-y-2">
                    <div className="font-medium text-gray-700">{moduleNames[module] || module}</div>
                    <div className="grid grid-cols-3 gap-2 pl-4">
                      {perms.map((perm) => (
                        <div key={perm.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={perm.id}
                            checked={roleForm.permission_ids.includes(perm.id)}
                            disabled={selectedRole?.is_system}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setRoleForm({...roleForm, permission_ids: [...roleForm.permission_ids, perm.id]});
                              } else {
                                setRoleForm({...roleForm, permission_ids: roleForm.permission_ids.filter(id => id !== perm.id)});
                              }
                            }}
                          />
                          <label htmlFor={perm.id} className="text-sm">{perm.description}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSaveRole} disabled={selectedRole?.is_system}>
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 用户编辑对话框 */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedUser ? '编辑用户' : '新建用户'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>姓名 *</Label>
                <Input
                  value={userForm.name}
                  onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>邮箱 *</Label>
                <Input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>电话</Label>
                <Input
                  value={userForm.phone}
                  onChange={(e) => setUserForm({...userForm, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>部门</Label>
                <Input
                  value={userForm.department}
                  onChange={(e) => setUserForm({...userForm, department: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>职位</Label>
              <Input
                value={userForm.position}
                onChange={(e) => setUserForm({...userForm, position: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>角色</Label>
              <div className="grid grid-cols-2 gap-2 border rounded-lg p-4">
                {roles.map((role) => (
                  <div key={role.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`role_${role.id}`}
                      checked={userForm.role_ids.includes(role.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setUserForm({...userForm, role_ids: [...userForm.role_ids, role.id]});
                        } else {
                          setUserForm({...userForm, role_ids: userForm.role_ids.filter(id => id !== role.id)});
                        }
                      }}
                    />
                    <label htmlFor={`role_${role.id}`} className="text-sm">{role.display_name}</label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setUserDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSaveUser}>
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 分厂主账户初始化对话框 */}
      <Dialog open={factoryAdminDialogOpen} onOpenChange={setFactoryAdminDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-orange-500" />
              初始化分厂主账户
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
              分厂主账户是分厂的最高管理员，拥有除系统配置外的所有管理权限。每个分厂只能有一个主账户。
            </div>
            
            <div className="space-y-2">
              <Label>账户名称 *</Label>
              <Input
                value={factoryAdminForm.name}
                onChange={(e) => setFactoryAdminForm({...factoryAdminForm, name: e.target.value})}
                placeholder="如：张厂长"
              />
            </div>
            
            <div className="space-y-2">
              <Label>登录邮箱 *</Label>
              <Input
                type="email"
                value={factoryAdminForm.email}
                onChange={(e) => setFactoryAdminForm({...factoryAdminForm, email: e.target.value})}
                placeholder="用于登录系统"
              />
            </div>
            
            <div className="space-y-2">
              <Label>登录密码 *</Label>
              <Input
                type="password"
                value={factoryAdminForm.password}
                onChange={(e) => setFactoryAdminForm({...factoryAdminForm, password: e.target.value})}
                placeholder="设置登录密码"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>联系电话</Label>
                <Input
                  value={factoryAdminForm.phone}
                  onChange={(e) => setFactoryAdminForm({...factoryAdminForm, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>分厂名称</Label>
                <Input
                  value={factoryAdminForm.factory_name}
                  onChange={(e) => setFactoryAdminForm({...factoryAdminForm, factory_name: e.target.value})}
                  placeholder="如：一厂"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setFactoryAdminDialogOpen(false)}>
                取消
              </Button>
              <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleInitFactoryAdmin}>
                <Building2 className="h-4 w-4 mr-2" />
                创建主账户
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
