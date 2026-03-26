# 服装生产管理系统 - 功能汇总报告

## 一、系统概述

本系统是一个完整的服装生产管理ERP系统，涵盖从订单管理、生产排程、裁床分扎、工序追踪、质量管理到出货财务的全流程管理。

---

## 二、功能模块清单（共 51 个页面 + 60+ API接口）

### 1. 数据概览模块

| 功能 | 页面路径 | API接口 | 功能说明 |
|------|---------|---------|----------|
| 数据大屏 | `/` | `/api/dashboard/stats`<br>`/api/dashboard/alerts` | 首页数据看板，展示关键业务指标、预警信息 |
| MES实时看板 | `/mes-dashboard` | `/api/process-tracking/dashboard` | 生产实时监控，工序进度追踪 |
| 预警系统 | `/alert-system` | `/api/dashboard/alerts` | 库存预警、订单超期、质量异常等多维度预警 |

### 2. 生产管理模块

| 功能 | 页面路径 | API接口 | 功能说明 |
|------|---------|---------|----------|
| 生产订单 | `/production` | `/api/production-orders` | 订单创建、编辑、状态管理、进度追踪 |
| 生产准备 | `/production-prep` | `/api/production-orders` | 订单确认、物料准备、生产排程 |
| 裁床管理 | `/cutting` | `/api/cutting-orders` | 裁床单管理、床次安排、尺码配比 |
| 裁床分扎 | `/cutting-bundles` | `/api/cutting-bundles` | 分扎管理、条码生成、扎包状态 |
| 条码工票 | `/work-tickets` | - | 工票打印、工票管理 |
| 工序扫码 | `/process-scan` | `/api/process-tracking` | 扫码报工、产量记录 |
| 工序追溯 | `/process-tracking` | `/api/process-tracking` | 工序进度、产量统计、效率分析 |
| 二次工艺 | `/craft-processes` | `/api/craft-processes` | 印花、刺绣、水洗等外发工艺管理 |
| 尾部处理 | `/finishing` | - | 整烫、包装、入库 |

### 3. 工序配置模块

| 功能 | 页面路径 | API接口 | 功能说明 |
|------|---------|---------|----------|
| 工序管理 | `/processes` | `/api/processes`<br>`/api/process-templates` | 工序定义、工价设置、标准工时 |
| 款式工序 | `/style-processes` | `/api/style-processes` | 款式工艺路线、工序顺序配置 |

### 4. 质量管理模块

| 功能 | 页面路径 | API接口 | 功能说明 |
|------|---------|---------|----------|
| 质量管理 | `/quality-management` | - | 质检记录、缺陷统计、质量分析 |

### 5. 成本核算模块

| 功能 | 页面路径 | API接口 | 功能说明 |
|------|---------|---------|----------|
| 成本分析 | `/cost-analysis` | - | 生产成本、材料成本、人工成本分析 |

### 6. 库存管理模块

| 功能 | 页面路径 | API接口 | 功能说明 |
|------|---------|---------|----------|
| 物料库存 | `/inventory` | `/api/inventory`<br>`/api/materials`<br>`/api/inventory-logs` | 物料管理、入库出库、库存预警 |
| 成衣库存 | `/finished-inventory` | `/api/finished-inventory` | 成品入库、库存查询 |
| 装箱管理 | `/packing-management` | - | 装箱单、箱唛管理 |
| 仓库管理 | `/warehouse` | - | 仓库布局、库位管理 |

### 7. 出货管理模块

| 功能 | 页面路径 | API接口 | 功能说明 |
|------|---------|---------|----------|
| 出货日历 | `/shipping-calendar` | `/api/shipping-calendar` | 可视化出货计划、交期管理 |
| 发货任务 | `/shipping-tasks` | `/api/shipping-tasks` | 发货任务分配、执行跟踪 |
| 出货记录 | `/shipment` | `/api/shipments` | 发货记录、物流追踪 |

### 8. 外发管理模块

| 功能 | 页面路径 | API接口 | 功能说明 |
|------|---------|---------|----------|
| 外发订单 | `/outsource-orders` | `/api/outsource-orders` | 外发加工单管理 |
| 外发跟踪 | `/outsource-tracking` | `/api/outsource-progress`<br>`/api/bundle-outsource` | 外发进度、回货跟踪 |
| 供应商管理 | `/suppliers` | `/api/suppliers`<br>`/api/suppliers/audit` | 供应商档案、资质审核 |
| 供应商付款 | `/supplier-payment` | `/api/supplier-payments` | 应付账款、付款记录 |

### 9. 人事工资模块

| 功能 | 页面路径 | API接口 | 功能说明 |
|------|---------|---------|----------|
| 员工管理 | `/employees` | `/api/employees` | 员工档案、技能管理 |
| 计件工资 | `/piece-wages` | `/api/piece-wages` | 计件统计、工资核算 |
| 工资管理 | `/salary` | `/api/salaries`<br>`/api/salaries/generate` | 工资单生成、发放管理 |
| 人事管理 | `/hr` | - | 考勤、培训、绩效 |

### 10. 财务客户模块

| 功能 | 页面路径 | API接口 | 功能说明 |
|------|---------|---------|----------|
| 财务中心 | `/finance` | `/api/bills` | 应收应付、财务报表 |
| 采购管理 | `/purchase` | `/api/purchase-orders` | 采购申请、订单跟踪 |
| 客户管理 | `/customers` | `/api/customers` | 客户档案、信用管理 |

### 11. 系统工具模块

| 功能 | 页面路径 | API接口 | 功能说明 |
|------|---------|---------|----------|
| AI 助手 | `/ai-assistant` | `/api/ai/analyze` | AI智能问答、数据分析 |
| 通知管理 | `/notification-management` | `/api/notifications` | 系统通知、消息推送 |
| 公告中心 | `/announcements` | `/api/announcements` | 企业公告发布 |
| 权限管理 | `/permissions` | `/api/user-permissions`<br>`/api/roles` | 角色权限配置 |
| 系统设置 | `/settings` | - | 系统参数配置 |
| 后台管理 | `/admin` | `/api/users`<br>`/api/operation-logs` | 用户管理、操作日志 |
| 数据库初始化 | `/database-init` | `/api/init-tables` | **【新增】** 数据库表结构管理 |

### 12. 供应商门户模块

| 功能 | 页面路径 | API接口 | 功能说明 |
|------|---------|---------|----------|
| 供应商登录 | `/supplier-login` | `/api/supplier-login`<br>`/api/supplier-auth/login` | 供应商独立登录入口 |
| 供应商注册 | `/supplier-register` | `/api/supplier-auth/register` | 供应商自助注册 |
| 供应商工作台 | `/supplier-workbench` | `/api/supplier-auth` | 外发任务、进度上报 |
| 供应商门户 | `/supplier-portal` | - | 供应商信息管理 |

### 13. 移动端支持

| 功能 | 页面路径 | API接口 | 功能说明 |
|------|---------|---------|----------|
| 移动扫码 | `/mobile-scan` | - | 移动端扫码报工 |
| 系统登录 | `/login` | `/api/auth/login`<br>`/api/auth/user` | 用户登录认证 |

---

## 三、数据库表结构（39张核心业务表）

### 用户与权限
- `users` - 用户表
- `roles` - 角色表
- `system_config` - 系统配置
- `operation_logs` - 操作日志

### 客户与供应商
- `customers` - 客户表
- `suppliers` - 供应商表
- `outsource_suppliers` - 外发供应商表

### 物料与库存
- `materials` - 物料表
- `material_categories` - 物料分类
- `inventory` - 库存表
- `inventory_transactions` - 库存出入记录

### 产品与款式
- `styles` - 款式表
- `style_boms` - 产品BOM表

### 生产管理
- `production_orders` - 生产订单主表
- `order_details` - 订单明细表
- `production_lines` - 生产线表
- `processes` - 工序定义表
- `style_processes` - 工序流程表

### 裁床管理
- `cutting_records` - 裁床记录表
- `cutting_bundles` - 裁床分扎表
- `work_tickets` - 工票表
- `process_tracking` - 工序追踪表

### 外发管理
- `bundle_outsource` - 外发记录表
- `secondary_processes` - 二次工艺类型
- `secondary_process_orders` - 二次工艺加工单

### 质量管理
- `quality_standards` - 质检标准表
- `quality_inspections` - 质检记录表
- `quality_defects` - 缺陷记录表

### 发货管理
- `shipments` - 发货记录表
- `shipment_details` - 发货明细表

### 设备管理
- `equipment` - 设备表
- `equipment_maintenance` - 设备维护记录

### 人事工资
- `employees` - 员工表
- `attendance` - 考勤记录表
- `salary_records` - 工资记录表

### 财务管理
- `bills` - 账单表
- `payments` - 付款记录表

### 通知系统
- `notifications` - 通知表
- `notification_rules` - 通知规则表

---

## 四、本次更新/新增功能

### 1. 数据库初始化系统【新增】

#### 功能描述
创建完整的数据库表结构管理系统，支持一键初始化和状态监控。

#### 新增文件
| 文件 | 说明 |
|------|------|
| `database/schema.sql` | 完整数据库表结构（39张表） |
| `database/seed-data-part1.sql` | 测试数据第一部分 |
| `database/seed-data-part2.sql` | 测试数据第二部分 |
| `src/app/database-init/page.tsx` | 数据库初始化管理页面 |

#### 新增API
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/init-tables` | GET | 获取SQL脚本内容 |
| `/api/init-tables` | POST | 检查数据库表状态 |

#### 页面功能
- 📊 显示数据库表状态统计（总数/已存在/缺失）
- 📋 列出每张表的创建状态（绿色=已存在，红色=缺失）
- 📄 查看完整SQL脚本（表结构 + 测试数据）
- 📋 一键复制SQL到剪贴板
- 📥 下载SQL文件
- 📖 清晰的使用说明引导

#### 访问方式
- 侧边栏：系统工具 → 数据库初始化
- 直接访问：`/database-init`

### 2. 侧边栏导航更新

- 新增「数据库初始化」菜单项
- 路径：系统工具分组下
- 权限：仅管理员可见

---

## 五、技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| 核心库 | React 19 |
| 语言 | TypeScript 5 |
| UI组件 | shadcn/ui (Radix UI) |
| 样式 | Tailwind CSS 4 |
| 数据库 | Supabase (PostgreSQL) |
| 包管理 | pnpm |

---

## 六、统计汇总

| 类型 | 数量 |
|------|------|
| 页面总数 | 51 |
| API接口 | 60+ |
| 数据库表 | 39 |
| 功能模块 | 13 |

---

## 七、待优化建议

1. **质量管理模块**：质检记录API待完善
2. **成本分析模块**：成本计算逻辑待实现
3. **设备管理模块**：设备维护提醒待开发
4. **移动端优化**：移动扫码页面体验优化
5. **报表导出**：Excel导出功能增强

---

*报告生成时间：2024年*
