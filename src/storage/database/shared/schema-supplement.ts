// 数据库表结构定义 - 补充

// ==================== 质量检验表 ====================

export const qualityTables = {
  // 来料检验
  quality_iqc: {
    id: 'uuid primary key',
    inspection_no: 'varchar(50) unique not null',
    purchase_order_id: 'uuid',
    material_id: 'uuid',
    supplier_id: 'uuid',
    quantity: 'decimal(15,2)',
    inspected_qty: 'decimal(15,2) default 0',
    passed_qty: 'decimal(15,2) default 0',
    failed_qty: 'decimal(15,2) default 0',
    result: "varchar(20) default 'pending'", // pending, passed, failed, conditional
    inspector: 'varchar(100)',
    inspection_date: 'date',
    notes: 'text',
    defects: 'jsonb',
    created_at: 'timestamp with time zone default now()',
    updated_at: 'timestamp with time zone'
  },

  // 过程检验
  quality_ipqc: {
    id: 'uuid primary key',
    inspection_no: 'varchar(50) unique not null',
    order_id: 'uuid',
    process_id: 'uuid',
    line_id: 'uuid',
    quantity: 'integer',
    inspected_qty: 'integer default 0',
    passed_qty: 'integer default 0',
    failed_qty: 'integer default 0',
    result: "varchar(20) default 'pending'",
    inspector: 'varchar(100)',
    inspection_date: 'date',
    defect_types: 'jsonb',
    notes: 'text',
    created_at: 'timestamp with time zone default now()',
    updated_at: 'timestamp with time zone'
  },

  // 终检
  quality_oqc: {
    id: 'uuid primary key',
    inspection_no: 'varchar(50) unique not null',
    order_id: 'uuid',
    shipment_id: 'uuid',
    quantity: 'integer',
    inspected_qty: 'integer default 0',
    passed_qty: 'integer default 0',
    failed_qty: 'integer default 0',
    result: "varchar(20) default 'pending'",
    inspector: 'varchar(100)',
    inspection_date: 'date',
    aql_level: 'varchar(20)',
    sample_size: 'integer',
    defect_details: 'jsonb',
    notes: 'text',
    created_at: 'timestamp with time zone default now()',
    updated_at: 'timestamp with time zone'
  },

  // 缺陷记录
  quality_defects: {
    id: 'uuid primary key',
    inspection_id: 'uuid',
    inspection_type: 'varchar(20)', // iqc, ipqc, oqc
    defect_type: 'varchar(100)',
    defect_description: 'text',
    quantity: 'integer default 1',
    severity: "varchar(20) default 'minor'", // minor, major, critical
    location: 'varchar(100)',
    image_url: 'text',
    status: "varchar(20) default 'open'", // open, resolved, closed
    resolved_at: 'timestamp with time zone',
    resolved_by: 'uuid',
    created_at: 'timestamp with time zone default now()'
  }
};

// ==================== 返工返修表 ====================

export const reworkTables = {
  // 返工单
  rework_orders: {
    id: 'uuid primary key',
    rework_no: 'varchar(50) unique not null',
    order_id: 'uuid',
    process_id: 'uuid',
    quantity: 'integer not null',
    reason: 'varchar(200)',
    reason_detail: 'text',
    defect_type: 'varchar(100)',
    source_type: 'varchar(50)', // ipqc, oqc, customer
    source_id: 'uuid',
    status: "varchar(20) default 'pending'", // pending, in_progress, completed, cancelled
    priority: "varchar(20) default 'normal'", // low, normal, high, urgent
    assigned_to: 'uuid',
    estimated_hours: 'decimal(10,2)',
    actual_hours: 'decimal(10,2)',
    start_time: 'timestamp with time zone',
    end_time: 'timestamp with time zone',
    completed_qty: 'integer default 0',
    scrapped_qty: 'integer default 0',
    cost: 'decimal(15,2)',
    notes: 'text',
    created_by: 'uuid',
    created_at: 'timestamp with time zone default now()',
    updated_at: 'timestamp with time zone'
  },

  // 返工追踪
  rework_tracking: {
    id: 'uuid primary key',
    rework_id: 'uuid not null',
    worker_id: 'uuid',
    quantity: 'integer',
    status: 'varchar(20)',
    notes: 'text',
    created_at: 'timestamp with time zone default now()'
  }
};

// ==================== 齐套管理表 ====================

export const completeSetTables = {
  // 齐套检查
  complete_set_checks: {
    id: 'uuid primary key',
    check_no: 'varchar(50) unique not null',
    order_id: 'uuid not null',
    check_date: 'date',
    status: "varchar(20) default 'pending'", // pending, complete, incomplete
    completion_rate: 'decimal(5,2) default 0',
    ready_to_produce: 'boolean default false',
    notes: 'text',
    checked_by: 'uuid',
    created_at: 'timestamp with time zone default now()',
    updated_at: 'timestamp with time zone'
  },

  // 齐套明细
  complete_set_items: {
    id: 'uuid primary key',
    check_id: 'uuid not null',
    material_id: 'uuid',
    material_code: 'varchar(50)',
    material_name: 'varchar(200)',
    required_qty: 'decimal(15,2)',
    available_qty: 'decimal(15,2)',
    shortage_qty: 'decimal(15,2)',
    unit: 'varchar(20)',
    status: "varchar(20) default 'shortage'", // sufficient, shortage, ordered
    notes: 'text',
    created_at: 'timestamp with time zone default now()'
  }
};

// ==================== 排料优化表 ====================

export const fabricLayoutTables = {
  // 排料方案
  fabric_layouts: {
    id: 'uuid primary key',
    layout_no: 'varchar(50) unique not null',
    order_id: 'uuid',
    style_no: 'varchar(100)',
    fabric_id: 'uuid',
    fabric_code: 'varchar(50)',
    fabric_width: 'decimal(10,2)',
    marker_length: 'decimal(10,2)',
    utilization_rate: 'decimal(5,2)',
    layers: 'integer',
    total_pieces: 'integer',
    sizes: 'jsonb',
    status: "varchar(20) default 'draft'", // draft, active, archived
    created_by: 'uuid',
    created_at: 'timestamp with time zone default now()',
    updated_at: 'timestamp with time zone'
  },

  // 排料明细
  fabric_layout_items: {
    id: 'uuid primary key',
    layout_id: 'uuid not null',
    size: 'varchar(50)',
    piece_count: 'integer',
    marker_data: 'jsonb',
    created_at: 'timestamp with time zone default now()'
  },

  // 排料历史
  fabric_layout_history: {
    id: 'uuid primary key',
    layout_id: 'uuid',
    version: 'integer',
    utilization_rate: 'decimal(5,2)',
    changes: 'text',
    created_at: 'timestamp with time zone default now()'
  }
};

// ==================== 产线平衡表 ====================

export const lineBalanceTables = {
  // 产线配置
  production_lines: {
    id: 'uuid primary key',
    line_code: 'varchar(50) unique not null',
    line_name: 'varchar(100) not null',
    workshop: 'varchar(100)',
    capacity: 'integer',
    status: "varchar(20) default 'active'",
    created_at: 'timestamp with time zone default now()'
  },

  // 工位配置
  line_stations: {
    id: 'uuid primary key',
    line_id: 'uuid not null',
    station_no: 'integer',
    process_id: 'uuid',
    worker_id: 'uuid',
    target_takt: 'decimal(10,2)',
    current_takt: 'decimal(10,2)',
    status: "varchar(20) default 'active'",
    created_at: 'timestamp with time zone default now()'
  },

  // 节拍记录
  process_timing: {
    id: 'uuid primary key',
    process_id: 'uuid',
    employee_id: 'uuid',
    line_id: 'uuid',
    order_id: 'uuid',
    quantity_completed: 'integer',
    total_time_seconds: 'integer',
    takt_time: 'decimal(10,2)',
    start_time: 'timestamp with time zone',
    end_time: 'timestamp with time zone',
    created_at: 'timestamp with time zone default now()'
  },

  // 瓶颈记录
  bottleneck_records: {
    id: 'uuid primary key',
    process_id: 'uuid',
    line_id: 'uuid',
    takt_time: 'decimal(10,2)',
    avg_line_takt: 'decimal(10,2)',
    impact_on_output: 'integer',
    detected_at: 'timestamp with time zone',
    resolved_at: 'timestamp with time zone',
    status: "varchar(20) default 'active'",
    notes: 'text'
  }
};

// ==================== 订单拆分表 ====================

export const orderSplitTables = {
  // 父订单
  parent_orders: {
    id: 'uuid primary key',
    parent_order_no: 'varchar(50) unique not null',
    original_order_id: 'uuid',
    total_quantity: 'integer',
    split_count: 'integer',
    status: "varchar(20) default 'pending'",
    split_strategy: 'varchar(50)', // by_line, by_date, by_size
    notes: 'text',
    created_by: 'uuid',
    created_at: 'timestamp with time zone default now()'
  },

  // 拆分订单
  split_orders: {
    id: 'uuid primary key',
    parent_order_id: 'uuid',
    order_id: 'uuid',
    split_no: 'integer',
    quantity: 'integer',
    line_id: 'uuid',
    delivery_date: 'date',
    priority: 'integer',
    status: "varchar(20) default 'pending'",
    created_at: 'timestamp with time zone default now()'
  }
};

// ==================== 模板系统表 ====================

export const templateTables = {
  // 模板主表
  templates: {
    id: 'uuid primary key',
    template_code: 'varchar(50) unique not null',
    template_name: 'varchar(200) not null',
    template_type: 'varchar(50) not null', // tech_pack, bom, size, process
    category: 'varchar(100)',
    description: 'text',
    is_public: 'boolean default false',
    is_active: 'boolean default true',
    usage_count: 'integer default 0',
    last_used_at: 'timestamp with time zone',
    parent_id: 'uuid',
    created_by: 'uuid',
    created_at: 'timestamp with time zone default now()',
    updated_at: 'timestamp with time zone',
    deleted_at: 'timestamp with time zone'
  },

  // 模板项目
  template_items: {
    id: 'uuid primary key',
    template_id: 'uuid not null',
    item_type: 'varchar(50)',
    item_data: 'jsonb',
    sequence: 'integer',
    created_at: 'timestamp with time zone default now()'
  },

  // BOM模板
  bom_templates: {
    id: 'uuid primary key',
    template_code: 'varchar(50) unique not null',
    template_name: 'varchar(200) not null',
    category: 'varchar(100)',
    style_type: 'varchar(100)',
    description: 'text',
    is_active: 'boolean default true',
    usage_count: 'integer default 0',
    created_by: 'uuid',
    created_at: 'timestamp with time zone default now()'
  },

  // BOM模板项目
  bom_template_items: {
    id: 'uuid primary key',
    template_id: 'uuid not null',
    material_type: 'varchar(100)',
    material_name: 'varchar(200)',
    default_quantity: 'decimal(15,2)',
    unit: 'varchar(20)',
    notes: 'text',
    created_at: 'timestamp with time zone default now()'
  },

  // 尺寸模板
  size_templates: {
    id: 'uuid primary key',
    template_code: 'varchar(50) unique not null',
    template_name: 'varchar(200) not null',
    category: 'varchar(100)',
    size_range: 'varchar(200)',
    description: 'text',
    is_active: 'boolean default true',
    usage_count: 'integer default 0',
    created_by: 'uuid',
    created_at: 'timestamp with time zone default now()'
  },

  // 尺寸模板测量
  size_template_measurements: {
    id: 'uuid primary key',
    template_id: 'uuid not null',
    measurement_name: 'varchar(100)',
    tolerance: 'decimal(10,2)',
    sizes: 'jsonb',
    created_at: 'timestamp with time zone default now()'
  },

  // 模板使用日志
  template_usage_logs: {
    id: 'uuid primary key',
    template_id: 'uuid',
    order_id: 'uuid',
    applied_by: 'uuid',
    applied_at: 'timestamp with time zone default now()',
    overrides: 'jsonb'
  }
};

// ==================== 对账系统表 ====================

export const statementTables = {
  // 对账单
  statements: {
    id: 'uuid primary key',
    statement_no: 'varchar(50) unique not null',
    customer_id: 'uuid not null',
    statement_date: 'date not null',
    due_date: 'date',
    total_amount: 'decimal(15,2) default 0',
    paid_amount: 'decimal(15,2) default 0',
    balance: 'decimal(15,2) default 0',
    status: "varchar(20) default 'draft'", // draft, sent, confirmed, paid
    notes: 'text',
    created_by: 'uuid',
    created_at: 'timestamp with time zone default now()',
    updated_at: 'timestamp with time zone',
    confirmed_by: 'uuid',
    confirmed_at: 'timestamp with time zone',
    confirmation_notes: 'text'
  },

  // 对账单明细
  statement_items: {
    id: 'uuid primary key',
    statement_id: 'uuid not null',
    item_type: 'varchar(50)', // order, adjustment, other
    reference_no: 'varchar(100)',
    reference_date: 'date',
    description: 'text',
    quantity: 'integer',
    unit_price: 'decimal(15,2)',
    amount: 'decimal(15,2)',
    order_id: 'uuid',
    created_at: 'timestamp with time zone default now()'
  },

  // 对账单付款
  statement_payments: {
    id: 'uuid primary key',
    statement_id: 'uuid not null',
    payment_no: 'varchar(50)',
    payment_date: 'date',
    amount: 'decimal(15,2)',
    payment_method: 'varchar(50)', // bank, cash, check
    reference_no: 'varchar(100)',
    notes: 'text',
    recorded_by: 'uuid',
    created_at: 'timestamp with time zone default now()'
  },

  // 对账单历史
  statement_history: {
    id: 'uuid primary key',
    statement_id: 'uuid not null',
    action: 'varchar(50)', // created, sent, confirmed, paid, adjusted
    action_by: 'uuid',
    action_at: 'timestamp with time zone default now()',
    notes: 'text',
    previous_data: 'jsonb'
  },

  // 对账单提醒
  statement_reminders: {
    id: 'uuid primary key',
    statement_id: 'uuid',
    reminder_type: 'varchar(50)', // email, sms
    sent_to: 'varchar(200)',
    sent_at: 'timestamp with time zone',
    sent_by: 'uuid'
  }
};

// ==================== 客户门户表 ====================

export const customerPortalTables = {
  // 客户会话
  customer_sessions: {
    id: 'uuid primary key',
    customer_id: 'uuid not null',
    token: 'varchar(200) unique not null',
    expires_at: 'timestamp with time zone',
    created_at: 'timestamp with time zone default now()'
  },

  // 客户通知
  customer_notifications: {
    id: 'uuid primary key',
    customer_id: 'uuid not null',
    type: 'varchar(50)', // order_update, shipment, document
    title: 'varchar(200)',
    content: 'text',
    read_at: 'timestamp with time zone',
    created_at: 'timestamp with time zone default now()'
  },

  // 客户文档
  customer_documents: {
    id: 'uuid primary key',
    customer_id: 'uuid not null',
    order_id: 'uuid',
    document_name: 'varchar(200)',
    document_type: 'varchar(50)', // invoice, packing_list, certificate
    file_url: 'text',
    file_size: 'integer',
    created_at: 'timestamp with time zone default now()'
  },

  // 客户反馈
  customer_feedback: {
    id: 'uuid primary key',
    customer_id: 'uuid',
    order_id: 'uuid',
    feedback_type: 'varchar(50)', // quality, delivery, service
    content: 'text',
    rating: 'integer', // 1-5
    status: "varchar(20) default 'submitted'",
    created_at: 'timestamp with time zone default now()'
  },

  // 客户活动日志
  customer_activity_logs: {
    id: 'uuid primary key',
    customer_id: 'uuid',
    activity_type: 'varchar(50)', // login, view, download
    description: 'text',
    ip_address: 'varchar(50)',
    created_at: 'timestamp with time zone default now()'
  },

  // 文档下载记录
  document_downloads: {
    id: 'uuid primary key',
    customer_id: 'uuid',
    document_id: 'uuid',
    downloaded_at: 'timestamp with time zone default now()'
  },

  // 客户设置
  customer_settings: {
    id: 'uuid primary key',
    customer_id: 'uuid unique not null',
    notification_preferences: 'jsonb',
    language: "varchar(10) default 'zh'",
    timezone: "varchar(50) default 'Asia/Shanghai'",
    created_at: 'timestamp with time zone default now()',
    updated_at: 'timestamp with time zone'
  },

  // 客户请求
  customer_requests: {
    id: 'uuid primary key',
    customer_id: 'uuid',
    order_id: 'uuid',
    request_type: 'varchar(50)', // change, update, complaint
    message: 'text',
    status: "varchar(20) default 'pending'",
    created_at: 'timestamp with time zone default now()'
  }
};

// 导出所有表定义
export const allTableDefinitions = {
  ...qualityTables,
  ...reworkTables,
  ...completeSetTables,
  ...fabricLayoutTables,
  ...lineBalanceTables,
  ...orderSplitTables,
  ...templateTables,
  ...statementTables,
  ...customerPortalTables
};
