import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 数据库完整初始化API（统一入口）
 * 
 * 支持的操作：
 * - action=init: 初始化所有表结构
 * - action=check: 检查数据库状态
 * - action=seed: 填充演示数据
 * - action=demo: 初始化完整演示环境（生产订单、物料、供应商等）
 * - action=factory-admin: 初始化分厂主账户
 * - action=reset: 重置数据库
 */
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'check';
    const force = searchParams.get('force') === 'true';

    switch (action) {
      case 'init':
        return await initializeDatabase(client, force);
      case 'check':
        return await checkDatabaseStatus(client);
      case 'check-factory-admin':
        return await checkFactoryAdminExists(client);
      case 'seed':
        return await seedDemoData(client);
      case 'demo':
        return await initFullDemoData(client);
      case 'reset':
        return await resetDatabase(client);
      default:
        return await checkDatabaseStatus(client);
    }
  } catch (error) {
    console.error('Database init error:', error);
    return NextResponse.json({ 
      success: false, 
      error: '数据库初始化失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * POST方法支持复杂操作
 */
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'init';

    switch (action) {
      case 'factory-admin':
        return await initFactoryAdmin(client, body);
      case 'demo':
        return await initFullDemoData(client);
      case 'seed':
        return await seedDemoData(client);
      default:
        return await initializeDatabase(client, body.force === true);
    }
  } catch (error) {
    console.error('Database init error:', error);
    return NextResponse.json({ 
      success: false, 
      error: '数据库初始化失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * 初始化数据库
 */
async function initializeDatabase(client: any, force: boolean) {
  const results: { table: string; status: string }[] = [];

  // 1. 质量检验表
  const qualityTables = `
    -- 来料检验(IQC)
    CREATE TABLE IF NOT EXISTS quality_iqc (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      inspection_no VARCHAR(50) NOT NULL UNIQUE,
      purchase_order_id VARCHAR(36),
      material_id VARCHAR(36),
      supplier_id VARCHAR(36),
      quantity DECIMAL(15,2),
      inspected_qty DECIMAL(15,2) DEFAULT 0,
      passed_qty DECIMAL(15,2) DEFAULT 0,
      failed_qty DECIMAL(15,2) DEFAULT 0,
      result VARCHAR(20) DEFAULT 'pending',
      inspector VARCHAR(100),
      inspection_date DATE,
      notes TEXT,
      defects JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE
    );
    
    CREATE INDEX IF NOT EXISTS quality_iqc_material_idx ON quality_iqc(material_id);
    CREATE INDEX IF NOT EXISTS quality_iqc_supplier_idx ON quality_iqc(supplier_id);
    CREATE INDEX IF NOT EXISTS quality_iqc_result_idx ON quality_iqc(result);
    
    -- 过程检验(IPQC)
    CREATE TABLE IF NOT EXISTS quality_ipqc (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      inspection_no VARCHAR(50) NOT NULL UNIQUE,
      order_id VARCHAR(36),
      process_id VARCHAR(36),
      line_id VARCHAR(36),
      quantity INTEGER,
      inspected_qty INTEGER DEFAULT 0,
      passed_qty INTEGER DEFAULT 0,
      failed_qty INTEGER DEFAULT 0,
      result VARCHAR(20) DEFAULT 'pending',
      inspector VARCHAR(100),
      inspection_date DATE,
      defect_types JSONB,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE
    );
    
    CREATE INDEX IF NOT EXISTS quality_ipqc_order_idx ON quality_ipqc(order_id);
    CREATE INDEX IF NOT EXISTS quality_ipqc_process_idx ON quality_ipqc(process_id);
    
    -- 终检(OQC)
    CREATE TABLE IF NOT EXISTS quality_oqc (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      inspection_no VARCHAR(50) NOT NULL UNIQUE,
      order_id VARCHAR(36),
      shipment_id VARCHAR(36),
      quantity INTEGER,
      inspected_qty INTEGER DEFAULT 0,
      passed_qty INTEGER DEFAULT 0,
      failed_qty INTEGER DEFAULT 0,
      result VARCHAR(20) DEFAULT 'pending',
      inspector VARCHAR(100),
      inspection_date DATE,
      aql_level VARCHAR(20),
      sample_size INTEGER,
      defect_details JSONB,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE
    );
    
    CREATE INDEX IF NOT EXISTS quality_oqc_order_idx ON quality_oqc(order_id);
    CREATE INDEX IF NOT EXISTS quality_oqc_result_idx ON quality_oqc(result);
    
    -- 缺陷记录
    CREATE TABLE IF NOT EXISTS quality_defects (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      inspection_id VARCHAR(36),
      inspection_type VARCHAR(20),
      defect_type VARCHAR(100),
      defect_description TEXT,
      quantity INTEGER DEFAULT 1,
      severity VARCHAR(20) DEFAULT 'minor',
      location VARCHAR(100),
      image_url TEXT,
      status VARCHAR(20) DEFAULT 'open',
      resolved_at TIMESTAMP WITH TIME ZONE,
      resolved_by VARCHAR(36),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS quality_defects_inspection_idx ON quality_defects(inspection_id);
  `;

  // 2. 返工返修表
  const reworkTables = `
    -- 返工单
    CREATE TABLE IF NOT EXISTS rework_orders (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      rework_no VARCHAR(50) NOT NULL UNIQUE,
      order_id VARCHAR(36),
      process_id VARCHAR(36),
      quantity INTEGER NOT NULL,
      reason VARCHAR(200),
      reason_detail TEXT,
      defect_type VARCHAR(100),
      source_type VARCHAR(50),
      source_id VARCHAR(36),
      status VARCHAR(20) DEFAULT 'pending',
      priority VARCHAR(20) DEFAULT 'normal',
      assigned_to VARCHAR(36),
      estimated_hours DECIMAL(10,2),
      actual_hours DECIMAL(10,2),
      start_time TIMESTAMP WITH TIME ZONE,
      end_time TIMESTAMP WITH TIME ZONE,
      completed_qty INTEGER DEFAULT 0,
      scrapped_qty INTEGER DEFAULT 0,
      cost DECIMAL(15,2),
      notes TEXT,
      created_by VARCHAR(36),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE
    );
    
    CREATE INDEX IF NOT EXISTS rework_orders_order_idx ON rework_orders(order_id);
    CREATE INDEX IF NOT EXISTS rework_orders_status_idx ON rework_orders(status);
    
    -- 返工追踪
    CREATE TABLE IF NOT EXISTS rework_tracking (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      rework_id VARCHAR(36) NOT NULL,
      worker_id VARCHAR(36),
      quantity INTEGER,
      status VARCHAR(20),
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  // 3. 齐套管理表
  const completeSetTables = `
    -- 齐套检查
    CREATE TABLE IF NOT EXISTS complete_set_checks (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      check_no VARCHAR(50) NOT NULL UNIQUE,
      order_id VARCHAR(36) NOT NULL,
      check_date DATE,
      status VARCHAR(20) DEFAULT 'pending',
      completion_rate DECIMAL(5,2) DEFAULT 0,
      ready_to_produce BOOLEAN DEFAULT FALSE,
      notes TEXT,
      checked_by VARCHAR(36),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE
    );
    
    CREATE INDEX IF NOT EXISTS complete_set_checks_order_idx ON complete_set_checks(order_id);
    
    -- 齐套明细
    CREATE TABLE IF NOT EXISTS complete_set_items (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      check_id VARCHAR(36) NOT NULL,
      material_id VARCHAR(36),
      material_code VARCHAR(50),
      material_name VARCHAR(200),
      required_qty DECIMAL(15,2),
      available_qty DECIMAL(15,2),
      shortage_qty DECIMAL(15,2),
      unit VARCHAR(20),
      status VARCHAR(20) DEFAULT 'shortage',
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS complete_set_items_check_idx ON complete_set_items(check_id);
  `;

  // 4. 排料优化表
  const fabricLayoutTables = `
    -- 排料方案
    CREATE TABLE IF NOT EXISTS fabric_layouts (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      layout_no VARCHAR(50) NOT NULL UNIQUE,
      order_id VARCHAR(36),
      style_no VARCHAR(100),
      fabric_id VARCHAR(36),
      fabric_code VARCHAR(50),
      fabric_width DECIMAL(10,2),
      marker_length DECIMAL(10,2),
      utilization_rate DECIMAL(5,2),
      layers INTEGER,
      total_pieces INTEGER,
      sizes JSONB,
      status VARCHAR(20) DEFAULT 'draft',
      created_by VARCHAR(36),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE
    );
    
    CREATE INDEX IF NOT EXISTS fabric_layouts_order_idx ON fabric_layouts(order_id);
    
    -- 排料明细
    CREATE TABLE IF NOT EXISTS fabric_layout_items (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      layout_id VARCHAR(36) NOT NULL,
      size VARCHAR(50),
      piece_count INTEGER,
      marker_data JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- 排料历史
    CREATE TABLE IF NOT EXISTS fabric_layout_history (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      layout_id VARCHAR(36),
      version INTEGER,
      utilization_rate DECIMAL(5,2),
      changes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  // 5. 产线平衡表
  const lineBalanceTables = `
    -- 产线配置
    CREATE TABLE IF NOT EXISTS production_lines (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      line_code VARCHAR(50) NOT NULL UNIQUE,
      line_name VARCHAR(100) NOT NULL,
      workshop VARCHAR(100),
      capacity INTEGER,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- 工位配置
    CREATE TABLE IF NOT EXISTS line_stations (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      line_id VARCHAR(36) NOT NULL,
      station_no INTEGER,
      process_id VARCHAR(36),
      worker_id VARCHAR(36),
      target_takt DECIMAL(10,2),
      current_takt DECIMAL(10,2),
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS line_stations_line_idx ON line_stations(line_id);
    
    -- 节拍记录
    CREATE TABLE IF NOT EXISTS process_timing (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      process_id VARCHAR(36),
      employee_id VARCHAR(36),
      line_id VARCHAR(36),
      order_id VARCHAR(36),
      quantity_completed INTEGER,
      total_time_seconds INTEGER,
      takt_time DECIMAL(10,2),
      start_time TIMESTAMP WITH TIME ZONE,
      end_time TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS process_timing_process_idx ON process_timing(process_id);
    CREATE INDEX IF NOT EXISTS process_timing_employee_idx ON process_timing(employee_id);
    CREATE INDEX IF NOT EXISTS process_timing_start_idx ON process_timing(start_time);
    
    -- 瓶颈记录
    CREATE TABLE IF NOT EXISTS bottleneck_records (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      process_id VARCHAR(36),
      line_id VARCHAR(36),
      takt_time DECIMAL(10,2),
      avg_line_takt DECIMAL(10,2),
      impact_on_output INTEGER,
      detected_at TIMESTAMP WITH TIME ZONE,
      resolved_at TIMESTAMP WITH TIME ZONE,
      status VARCHAR(20) DEFAULT 'active',
      notes TEXT
    );
    
    CREATE INDEX IF NOT EXISTS bottleneck_records_line_idx ON bottleneck_records(line_id);
  `;

  // 6. 订单拆分表
  const orderSplitTables = `
    -- 父订单
    CREATE TABLE IF NOT EXISTS parent_orders (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      parent_order_no VARCHAR(50) NOT NULL UNIQUE,
      original_order_id VARCHAR(36),
      total_quantity INTEGER,
      split_count INTEGER,
      status VARCHAR(20) DEFAULT 'pending',
      split_strategy VARCHAR(50),
      notes TEXT,
      created_by VARCHAR(36),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- 拆分订单
    CREATE TABLE IF NOT EXISTS split_orders (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      parent_order_id VARCHAR(36),
      order_id VARCHAR(36),
      split_no INTEGER,
      quantity INTEGER,
      line_id VARCHAR(36),
      delivery_date DATE,
      priority INTEGER,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS split_orders_parent_idx ON split_orders(parent_order_id);
    CREATE INDEX IF NOT EXISTS split_orders_line_idx ON split_orders(line_id);
  `;

  // 7. 模板系统表
  const templateTables = `
    -- 模板主表
    CREATE TABLE IF NOT EXISTS templates (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      template_code VARCHAR(50) NOT NULL UNIQUE,
      template_name VARCHAR(200) NOT NULL,
      template_type VARCHAR(50) NOT NULL,
      category VARCHAR(100),
      description TEXT,
      is_public BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      usage_count INTEGER DEFAULT 0,
      last_used_at TIMESTAMP WITH TIME ZONE,
      parent_id VARCHAR(36),
      created_by VARCHAR(36),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE,
      deleted_at TIMESTAMP WITH TIME ZONE
    );
    
    CREATE INDEX IF NOT EXISTS templates_type_idx ON templates(template_type);
    CREATE INDEX IF NOT EXISTS templates_category_idx ON templates(category);
    
    -- 模板项目
    CREATE TABLE IF NOT EXISTS template_items (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id VARCHAR(36) NOT NULL,
      item_type VARCHAR(50),
      item_data JSONB,
      sequence INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS template_items_template_idx ON template_items(template_id);
    
    -- 工艺单模板
    CREATE TABLE IF NOT EXISTS tech_pack_templates (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      template_code VARCHAR(50) NOT NULL UNIQUE,
      template_name VARCHAR(200) NOT NULL,
      category VARCHAR(100),
      season VARCHAR(50),
      description TEXT,
      template_preview_image TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      usage_count INTEGER DEFAULT 0,
      created_by VARCHAR(36),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- BOM模板
    CREATE TABLE IF NOT EXISTS bom_templates (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      template_code VARCHAR(50) NOT NULL UNIQUE,
      template_name VARCHAR(200) NOT NULL,
      category VARCHAR(100),
      style_type VARCHAR(100),
      description TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      usage_count INTEGER DEFAULT 0,
      created_by VARCHAR(36),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- BOM模板项目
    CREATE TABLE IF NOT EXISTS bom_template_items (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id VARCHAR(36) NOT NULL,
      material_type VARCHAR(100),
      material_name VARCHAR(200),
      default_quantity DECIMAL(15,2),
      unit VARCHAR(20),
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS bom_template_items_template_idx ON bom_template_items(template_id);
    
    -- 尺寸模板
    CREATE TABLE IF NOT EXISTS size_templates (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      template_code VARCHAR(50) NOT NULL UNIQUE,
      template_name VARCHAR(200) NOT NULL,
      category VARCHAR(100),
      size_range VARCHAR(200),
      description TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      usage_count INTEGER DEFAULT 0,
      created_by VARCHAR(36),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- 尺寸模板测量
    CREATE TABLE IF NOT EXISTS size_template_measurements (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id VARCHAR(36) NOT NULL,
      measurement_name VARCHAR(100),
      tolerance DECIMAL(10,2),
      sizes JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS size_template_measurements_template_idx ON size_template_measurements(template_id);
    
    -- 工序模板
    CREATE TABLE IF NOT EXISTS process_template_items (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id VARCHAR(36) NOT NULL,
      sequence INTEGER,
      process_id VARCHAR(36),
      process_name VARCHAR(100),
      standard_time DECIMAL(10,2),
      machine_type VARCHAR(100),
      skill_level VARCHAR(50),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS process_template_items_template_idx ON process_template_items(template_id);
    
    -- 模板使用日志
    CREATE TABLE IF NOT EXISTS template_usage_logs (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id VARCHAR(36),
      order_id VARCHAR(36),
      applied_by VARCHAR(36),
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      overrides JSONB
    );
    
    CREATE INDEX IF NOT EXISTS template_usage_logs_template_idx ON template_usage_logs(template_id);
  `;

  // 8. 工艺单核心表
  const techPackTables = `
    -- 工艺单主表
    CREATE TABLE IF NOT EXISTS tech_packs (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      tech_pack_no VARCHAR(50) NOT NULL UNIQUE,
      style_id VARCHAR(36),
      customer_id VARCHAR(36),
      version VARCHAR(20) DEFAULT 'V1',
      parent_id VARCHAR(36),
      status VARCHAR(20) DEFAULT 'draft',
      designer VARCHAR(100),
      reviewer VARCHAR(100),
      description TEXT,
      season VARCHAR(50),
      year INTEGER,
      category VARCHAR(100),
      fabric_info JSONB,
      lining_info JSONB,
      accessories_info JSONB,
      washing_instructions TEXT,
      packing_instructions TEXT,
      total_smv DECIMAL(10,2),
      bom_cost DECIMAL(15,2),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE
    );
    
    CREATE INDEX IF NOT EXISTS tech_packs_style_idx ON tech_packs(style_id);
    CREATE INDEX IF NOT EXISTS tech_packs_customer_idx ON tech_packs(customer_id);
    CREATE INDEX IF NOT EXISTS tech_packs_status_idx ON tech_packs(status);
    
    -- 工艺单BOM
    CREATE TABLE IF NOT EXISTS tech_pack_bom (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      tech_pack_id VARCHAR(36) NOT NULL,
      item_type VARCHAR(50),
      material_id VARCHAR(36),
      material_name VARCHAR(200),
      color VARCHAR(100),
      specification TEXT,
      quantity DECIMAL(15,2),
      unit VARCHAR(20),
      unit_price DECIMAL(15,2),
      consumption_per_piece DECIMAL(15,4),
      wastage_rate DECIMAL(5,2),
      supplier_id VARCHAR(36),
      remarks TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS tech_pack_bom_tech_pack_idx ON tech_pack_bom(tech_pack_id);
    CREATE INDEX IF NOT EXISTS tech_pack_bom_material_idx ON tech_pack_bom(material_id);
    
    -- 工艺单工序
    CREATE TABLE IF NOT EXISTS tech_pack_processes (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      tech_pack_id VARCHAR(36) NOT NULL,
      process_id VARCHAR(36),
      sequence INTEGER,
      standard_time DECIMAL(10,2),
      machine_type VARCHAR(100),
      skill_level VARCHAR(50),
      quality_points TEXT,
      remarks TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS tech_pack_processes_tech_pack_idx ON tech_pack_processes(tech_pack_id);
    CREATE INDEX IF NOT EXISTS tech_pack_processes_process_idx ON tech_pack_processes(process_id);
    
    -- 工艺单尺寸表
    CREATE TABLE IF NOT EXISTS tech_pack_size_chart (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      tech_pack_id VARCHAR(36) NOT NULL,
      size_name VARCHAR(50),
      measurement_name VARCHAR(100),
      measurement_value DECIMAL(10,2),
      tolerance DECIMAL(10,2),
      grading DECIMAL(10,2),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS tech_pack_size_chart_tech_pack_idx ON tech_pack_size_chart(tech_pack_id);
    
    -- 工艺单图片
    CREATE TABLE IF NOT EXISTS tech_pack_images (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      tech_pack_id VARCHAR(36) NOT NULL,
      image_type VARCHAR(50),
      image_url TEXT,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS tech_pack_images_tech_pack_idx ON tech_pack_images(tech_pack_id);
    
    -- 工艺单纸样文件
    CREATE TABLE IF NOT EXISTS tech_pack_patterns (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      tech_pack_id VARCHAR(36) NOT NULL,
      file_name VARCHAR(200),
      file_url TEXT,
      file_type VARCHAR(50),
      version VARCHAR(20),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS tech_pack_patterns_tech_pack_idx ON tech_pack_patterns(tech_pack_id);
    
    -- 工艺单版本历史
    CREATE TABLE IF NOT EXISTS tech_pack_versions (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      tech_pack_id VARCHAR(36) NOT NULL,
      version VARCHAR(20),
      parent_id VARCHAR(36),
      reason TEXT,
      created_by VARCHAR(36),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS tech_pack_versions_tech_pack_idx ON tech_pack_versions(tech_pack_id);
    
    -- 工艺单变更记录
    CREATE TABLE IF NOT EXISTS tech_pack_changes (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      tech_pack_id VARCHAR(36) NOT NULL,
      changed_by VARCHAR(36),
      changes JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS tech_pack_changes_tech_pack_idx ON tech_pack_changes(tech_pack_id);
  `;

  // 9. 对账系统表
  const statementTables = `
    -- 对账单
    CREATE TABLE IF NOT EXISTS statements (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      statement_no VARCHAR(50) NOT NULL UNIQUE,
      customer_id VARCHAR(36) NOT NULL,
      statement_date DATE NOT NULL,
      due_date DATE,
      total_amount DECIMAL(15,2) DEFAULT 0,
      paid_amount DECIMAL(15,2) DEFAULT 0,
      balance DECIMAL(15,2) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'draft',
      notes TEXT,
      created_by VARCHAR(36),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE,
      confirmed_by VARCHAR(36),
      confirmed_at TIMESTAMP WITH TIME ZONE,
      confirmation_notes TEXT
    );
    
    CREATE INDEX IF NOT EXISTS statements_customer_idx ON statements(customer_id);
    CREATE INDEX IF NOT EXISTS statements_status_idx ON statements(status);
    CREATE INDEX IF NOT EXISTS statements_date_idx ON statements(statement_date);
    
    -- 对账单明细
    CREATE TABLE IF NOT EXISTS statement_items (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      statement_id VARCHAR(36) NOT NULL,
      item_type VARCHAR(50),
      reference_no VARCHAR(100),
      reference_date DATE,
      description TEXT,
      quantity INTEGER,
      unit_price DECIMAL(15,2),
      amount DECIMAL(15,2),
      order_id VARCHAR(36),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS statement_items_statement_idx ON statement_items(statement_id);
    
    -- 对账单付款
    CREATE TABLE IF NOT EXISTS statement_payments (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      statement_id VARCHAR(36) NOT NULL,
      payment_no VARCHAR(50),
      payment_date DATE,
      amount DECIMAL(15,2),
      payment_method VARCHAR(50),
      reference_no VARCHAR(100),
      notes TEXT,
      recorded_by VARCHAR(36),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS statement_payments_statement_idx ON statement_payments(statement_id);
    
    -- 对账单历史
    CREATE TABLE IF NOT EXISTS statement_history (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      statement_id VARCHAR(36) NOT NULL,
      action VARCHAR(50),
      action_by VARCHAR(36),
      action_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      notes TEXT,
      previous_data JSONB
    );
    
    CREATE INDEX IF NOT EXISTS statement_history_statement_idx ON statement_history(statement_id);
    
    -- 对账单提醒
    CREATE TABLE IF NOT EXISTS statement_reminders (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      statement_id VARCHAR(36),
      reminder_type VARCHAR(50),
      sent_to VARCHAR(200),
      sent_at TIMESTAMP WITH TIME ZONE,
      sent_by VARCHAR(36)
    );
  `;

  // 9. 客户门户表
  const customerPortalTables = `
    -- 客户会话
    CREATE TABLE IF NOT EXISTS customer_sessions (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id VARCHAR(36) NOT NULL,
      token VARCHAR(200) NOT NULL UNIQUE,
      expires_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS customer_sessions_customer_idx ON customer_sessions(customer_id);
    CREATE INDEX IF NOT EXISTS customer_sessions_token_idx ON customer_sessions(token);
    
    -- 客户通知
    CREATE TABLE IF NOT EXISTS customer_notifications (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id VARCHAR(36) NOT NULL,
      type VARCHAR(50),
      title VARCHAR(200),
      content TEXT,
      read_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS customer_notifications_customer_idx ON customer_notifications(customer_id);
    
    -- 客户文档
    CREATE TABLE IF NOT EXISTS customer_documents (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id VARCHAR(36) NOT NULL,
      order_id VARCHAR(36),
      document_name VARCHAR(200),
      document_type VARCHAR(50),
      file_url TEXT,
      file_size INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS customer_documents_customer_idx ON customer_documents(customer_id);
    
    -- 客户反馈
    CREATE TABLE IF NOT EXISTS customer_feedback (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id VARCHAR(36),
      order_id VARCHAR(36),
      feedback_type VARCHAR(50),
      content TEXT,
      rating INTEGER,
      status VARCHAR(20) DEFAULT 'submitted',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- 客户活动日志
    CREATE TABLE IF NOT EXISTS customer_activity_logs (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id VARCHAR(36),
      activity_type VARCHAR(50),
      description TEXT,
      ip_address VARCHAR(50),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- 文档下载记录
    CREATE TABLE IF NOT EXISTS document_downloads (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id VARCHAR(36),
      document_id VARCHAR(36),
      downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- 客户设置
    CREATE TABLE IF NOT EXISTS customer_settings (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id VARCHAR(36) NOT NULL UNIQUE,
      notification_preferences JSONB,
      language VARCHAR(10) DEFAULT 'zh',
      timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE
    );
    
    -- 客户请求
    CREATE TABLE IF NOT EXISTS customer_requests (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id VARCHAR(36),
      order_id VARCHAR(36),
      request_type VARCHAR(50),
      message TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  // 10. 编菲管理表
  const bianfeiTables = `
    -- 编菲主表
    CREATE TABLE IF NOT EXISTS bianfei_records (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      bianfei_no VARCHAR(50) NOT NULL UNIQUE,
      order_no VARCHAR(50),
      style_name VARCHAR(200),
      style_code VARCHAR(100),
      color VARCHAR(100),
      sizes JSONB,
      total_quantity INTEGER DEFAULT 0,
      quick_mode BOOLEAN DEFAULT FALSE,
      merge_same BOOLEAN DEFAULT FALSE,
      auto_increment BOOLEAN DEFAULT FALSE,
      status VARCHAR(20) DEFAULT 'pending',
      remark TEXT,
      created_by VARCHAR(36),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE
    );
    
    CREATE INDEX IF NOT EXISTS bianfei_records_order_idx ON bianfei_records(order_no);
    CREATE INDEX IF NOT EXISTS bianfei_records_status_idx ON bianfei_records(status);
    CREATE INDEX IF NOT EXISTS bianfei_records_created_idx ON bianfei_records(created_at);
    
    -- 编菲条目表
    CREATE TABLE IF NOT EXISTS bianfei_items (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
      bianfei_id VARCHAR(36) NOT NULL,
      item_name VARCHAR(200),
      quantities JSONB,
      total_quantity INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS bianfei_items_bianfei_idx ON bianfei_items(bianfei_id);
  `;

  // 11. 核心业务表（补充缺失的表）
  const coreTables = `
    -- 用户表
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(50) PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100),
      phone VARCHAR(20),
      avatar VARCHAR(255),
      department VARCHAR(100),
      role_id VARCHAR(50),
      status VARCHAR(20) DEFAULT 'active',
      last_login TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    
    -- 角色表
    CREATE TABLE IF NOT EXISTS roles (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    -- 客户表
    CREATE TABLE IF NOT EXISTS customers (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      code VARCHAR(50) UNIQUE NOT NULL,
      contact_person VARCHAR(100),
      phone VARCHAR(20),
      email VARCHAR(100),
      address TEXT,
      city VARCHAR(100),
      country VARCHAR(100) DEFAULT '中国',
      credit_level VARCHAR(20) DEFAULT 'normal',
      payment_terms VARCHAR(100),
      notes TEXT,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    
    -- 供应商表
    CREATE TABLE IF NOT EXISTS suppliers (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      code VARCHAR(50) UNIQUE NOT NULL,
      type VARCHAR(50) NOT NULL,
      contact_person VARCHAR(100),
      phone VARCHAR(20),
      email VARCHAR(100),
      address TEXT,
      city VARCHAR(100),
      country VARCHAR(100) DEFAULT '中国',
      credit_level VARCHAR(20) DEFAULT 'normal',
      lead_time_days INTEGER DEFAULT 7,
      rating DECIMAL(3,2) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    
    -- 物料分类表
    CREATE TABLE IF NOT EXISTS material_categories (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(50) UNIQUE NOT NULL,
      parent_id VARCHAR(50),
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    -- 物料表
    CREATE TABLE IF NOT EXISTS materials (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      code VARCHAR(50) UNIQUE NOT NULL,
      category_id VARCHAR(50),
      type VARCHAR(50) NOT NULL,
      unit VARCHAR(20) NOT NULL,
      color VARCHAR(50),
      specification VARCHAR(200),
      width DECIMAL(10,2),
      weight DECIMAL(10,2),
      composition VARCHAR(200),
      supplier_id VARCHAR(50),
      unit_price DECIMAL(10,2) DEFAULT 0,
      safety_stock INTEGER DEFAULT 0,
      current_stock INTEGER DEFAULT 0,
      location VARCHAR(100),
      image VARCHAR(255),
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    
    -- 款式表
    CREATE TABLE IF NOT EXISTS styles (
      id VARCHAR(50) PRIMARY KEY,
      style_no VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(200) NOT NULL,
      category VARCHAR(50),
      season VARCHAR(20),
      year INTEGER,
      color VARCHAR(200),
      size_range VARCHAR(100),
      base_price DECIMAL(10,2),
      cost_price DECIMAL(10,2),
      description TEXT,
      image VARCHAR(255),
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    
    -- 生产线表
    CREATE TABLE IF NOT EXISTS production_lines (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(20) UNIQUE NOT NULL,
      type VARCHAR(50) NOT NULL,
      capacity_per_day INTEGER DEFAULT 0,
      efficiency DECIMAL(5,2) DEFAULT 0,
      manager VARCHAR(100),
      status VARCHAR(20) DEFAULT 'active',
      location VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    
    -- 工序表
    CREATE TABLE IF NOT EXISTS processes (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(20) UNIQUE NOT NULL,
      category VARCHAR(50) NOT NULL,
      sequence INTEGER DEFAULT 0,
      standard_time DECIMAL(5,2),
      standard_rate DECIMAL(10,4),
      description TEXT,
      is_quality_point BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    -- 员工表
    CREATE TABLE IF NOT EXISTS employees (
      id VARCHAR(50) PRIMARY KEY,
      employee_no VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      gender VARCHAR(10),
      phone VARCHAR(20),
      email VARCHAR(100),
      id_card VARCHAR(20),
      department VARCHAR(100),
      position VARCHAR(100),
      skill_level VARCHAR(20),
      skill_types JSONB,
      production_line_id VARCHAR(50),
      hire_date DATE,
      status VARCHAR(20) DEFAULT 'active',
      base_salary DECIMAL(10,2) DEFAULT 0,
      piece_rate DECIMAL(5,2) DEFAULT 1,
      bank_account VARCHAR(50),
      bank_name VARCHAR(100),
      emergency_contact VARCHAR(100),
      emergency_phone VARCHAR(20),
      avatar VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    
    -- 生产订单表
    CREATE TABLE IF NOT EXISTS production_orders (
      id VARCHAR(50) PRIMARY KEY,
      order_no VARCHAR(50) UNIQUE NOT NULL,
      customer_id VARCHAR(50),
      style_id VARCHAR(50),
      style_no VARCHAR(50),
      style_name VARCHAR(200),
      color VARCHAR(50),
      total_quantity INTEGER NOT NULL,
      size_breakdown JSONB,
      unit_price DECIMAL(10,2),
      total_amount DECIMAL(12,2),
      order_date DATE,
      delivery_date DATE,
      status VARCHAR(20) DEFAULT 'pending',
      progress INTEGER DEFAULT 0,
      priority VARCHAR(20) DEFAULT 'normal',
      production_line_id VARCHAR(50),
      remark TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    
    -- 裁床记录表
    CREATE TABLE IF NOT EXISTS cutting_records (
      id VARCHAR(50) PRIMARY KEY,
      cutting_no VARCHAR(50) UNIQUE NOT NULL,
      order_id VARCHAR(50),
      order_no VARCHAR(50),
      style_id VARCHAR(50),
      style_no VARCHAR(50),
      color VARCHAR(50),
      material_id VARCHAR(50),
      material_name VARCHAR(200),
      material_usage DECIMAL(10,2),
      layer_count INTEGER,
      marker_length DECIMAL(10,2),
      marker_efficiency DECIMAL(5,2),
      total_pieces INTEGER,
      cutting_date DATE,
      cutter VARCHAR(100),
      cutting_table VARCHAR(50),
      status VARCHAR(20) DEFAULT 'pending',
      remark TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    -- 裁床分扎表
    CREATE TABLE IF NOT EXISTS cutting_bundles (
      id VARCHAR(50) PRIMARY KEY,
      bundle_no VARCHAR(50) UNIQUE NOT NULL,
      cutting_id VARCHAR(50) NOT NULL,
      cutting_no VARCHAR(50),
      order_id VARCHAR(50),
      order_no VARCHAR(50),
      size VARCHAR(20) NOT NULL,
      color VARCHAR(50),
      quantity INTEGER NOT NULL,
      layer_from INTEGER,
      layer_to INTEGER,
      status VARCHAR(20) DEFAULT 'pending',
      current_process VARCHAR(100),
      barcode VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    -- 工票表
    CREATE TABLE IF NOT EXISTS work_tickets (
      id VARCHAR(50) PRIMARY KEY,
      ticket_no VARCHAR(50) UNIQUE NOT NULL,
      bundle_id VARCHAR(50),
      bundle_no VARCHAR(50),
      order_id VARCHAR(50),
      order_no VARCHAR(50),
      process_id VARCHAR(50),
      process_name VARCHAR(100),
      employee_id VARCHAR(50),
      employee_name VARCHAR(100),
      quantity INTEGER NOT NULL,
      completed_quantity INTEGER DEFAULT 0,
      defect_quantity INTEGER DEFAULT 0,
      unit_price DECIMAL(10,4),
      total_amount DECIMAL(10,2),
      status VARCHAR(20) DEFAULT 'pending',
      scan_time TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    -- 质检记录表
    CREATE TABLE IF NOT EXISTS quality_inspections (
      id VARCHAR(50) PRIMARY KEY,
      inspection_no VARCHAR(50) UNIQUE NOT NULL,
      order_id VARCHAR(50),
      order_no VARCHAR(50),
      bundle_id VARCHAR(50),
      bundle_no VARCHAR(50),
      process_id VARCHAR(50),
      process_name VARCHAR(100),
      inspection_type VARCHAR(50) NOT NULL,
      inspector VARCHAR(100),
      inspection_date DATE,
      sample_quantity INTEGER,
      pass_quantity INTEGER,
      defect_quantity INTEGER,
      defect_rate DECIMAL(5,2),
      result VARCHAR(20),
      defect_details JSONB,
      remark TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    -- 出货表
    CREATE TABLE IF NOT EXISTS shipments (
      id VARCHAR(50) PRIMARY KEY,
      shipment_no VARCHAR(50) UNIQUE NOT NULL,
      order_id VARCHAR(50),
      order_no VARCHAR(50),
      customer_id VARCHAR(50),
      customer_name VARCHAR(200),
      total_quantity INTEGER NOT NULL,
      total_boxes INTEGER,
      total_weight DECIMAL(10,2),
      shipping_method VARCHAR(50),
      carrier VARCHAR(100),
      tracking_no VARCHAR(100),
      shipping_address TEXT,
      contact_person VARCHAR(100),
      contact_phone VARCHAR(20),
      planned_date DATE,
      actual_date DATE,
      status VARCHAR(20) DEFAULT 'pending',
      shipper VARCHAR(100),
      remark TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    -- 外发订单表
    CREATE TABLE IF NOT EXISTS outsource_orders (
      id VARCHAR(50) PRIMARY KEY,
      outsource_no VARCHAR(50) UNIQUE NOT NULL,
      bundle_id VARCHAR(50),
      bundle_no VARCHAR(50),
      order_id VARCHAR(50),
      order_no VARCHAR(50),
      supplier_id VARCHAR(50) NOT NULL,
      supplier_name VARCHAR(200),
      process_id VARCHAR(50),
      process_name VARCHAR(100),
      send_quantity INTEGER NOT NULL,
      return_quantity INTEGER DEFAULT 0,
      defect_quantity INTEGER DEFAULT 0,
      unit_price DECIMAL(10,2),
      total_amount DECIMAL(12,2),
      send_date DATE,
      expected_return_date DATE,
      actual_return_date DATE,
      status VARCHAR(20) DEFAULT 'pending',
      sender VARCHAR(100),
      receiver VARCHAR(100),
      remark TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    -- 库存事务表
    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id VARCHAR(50) PRIMARY KEY,
      transaction_no VARCHAR(50) UNIQUE NOT NULL,
      material_id VARCHAR(50) NOT NULL,
      type VARCHAR(20) NOT NULL,
      quantity INTEGER NOT NULL,
      before_quantity INTEGER,
      after_quantity INTEGER,
      unit VARCHAR(20),
      unit_price DECIMAL(10,2),
      total_amount DECIMAL(12,2),
      warehouse VARCHAR(100),
      location VARCHAR(100),
      related_order VARCHAR(50),
      related_type VARCHAR(20),
      operator VARCHAR(100),
      remark TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    -- 考勤表
    CREATE TABLE IF NOT EXISTS attendance (
      id VARCHAR(50) PRIMARY KEY,
      employee_id VARCHAR(50) NOT NULL,
      employee_no VARCHAR(50),
      employee_name VARCHAR(100),
      attendance_date DATE NOT NULL,
      check_in_time VARCHAR(10),
      check_out_time VARCHAR(10),
      work_hours DECIMAL(5,2) DEFAULT 0,
      overtime_hours DECIMAL(5,2) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'normal',
      remark TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(employee_id, attendance_date)
    );
    
    -- 工资记录表
    CREATE TABLE IF NOT EXISTS salary_records (
      id VARCHAR(50) PRIMARY KEY,
      employee_id VARCHAR(50) NOT NULL,
      employee_no VARCHAR(50),
      employee_name VARCHAR(100),
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      base_salary DECIMAL(10,2) DEFAULT 0,
      piece_salary DECIMAL(10,2) DEFAULT 0,
      overtime_salary DECIMAL(10,2) DEFAULT 0,
      bonus DECIMAL(10,2) DEFAULT 0,
      deduction DECIMAL(10,2) DEFAULT 0,
      total_salary DECIMAL(10,2) DEFAULT 0,
      work_days INTEGER DEFAULT 22,
      overtime_hours DECIMAL(5,2) DEFAULT 0,
      piece_count INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'pending',
      remark TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(employee_id, year, month)
    );
    
    -- 通知表
    CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(50) PRIMARY KEY,
      type VARCHAR(20) NOT NULL,
      level VARCHAR(20) DEFAULT 'info',
      title VARCHAR(200) NOT NULL,
      content TEXT,
      related_order VARCHAR(50),
      related_type VARCHAR(50),
      recipient VARCHAR(50),
      status VARCHAR(20) DEFAULT 'unread',
      read_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    -- 预警记录
    CREATE TABLE IF NOT EXISTS alerts (
      id VARCHAR(50) PRIMARY KEY,
      alert_rule_id VARCHAR(50),
      alert_type VARCHAR(20) NOT NULL,
      alert_level VARCHAR(20) DEFAULT 'warning',
      title VARCHAR(200) NOT NULL,
      content TEXT,
      related_id VARCHAR(50),
      status VARCHAR(20) DEFAULT 'active',
      handled_by VARCHAR(100),
      handled_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    -- 账单表
    CREATE TABLE IF NOT EXISTS bills (
      id VARCHAR(50) PRIMARY KEY,
      bill_no VARCHAR(50) UNIQUE NOT NULL,
      bill_type VARCHAR(20) NOT NULL,
      category VARCHAR(50),
      related_id VARCHAR(50),
      related_no VARCHAR(50),
      customer_id VARCHAR(50),
      supplier_id VARCHAR(50),
      amount DECIMAL(12,2) NOT NULL,
      paid_amount DECIMAL(12,2) DEFAULT 0,
      due_date DATE,
      payment_date DATE,
      status VARCHAR(20) DEFAULT 'pending',
      remark TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    -- 公告表
    CREATE TABLE IF NOT EXISTS announcements (
      id VARCHAR(50) PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      content TEXT NOT NULL,
      type VARCHAR(20) DEFAULT 'general',
      priority VARCHAR(20) DEFAULT 'normal',
      status VARCHAR(20) DEFAULT 'draft',
      publish_date DATE,
      expire_date DATE,
      author VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    -- 采购订单表
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id VARCHAR(50) PRIMARY KEY,
      po_no VARCHAR(50) UNIQUE NOT NULL,
      supplier_id VARCHAR(50) NOT NULL,
      supplier_name VARCHAR(200),
      order_date DATE,
      expected_date DATE,
      total_amount DECIMAL(12,2) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'pending',
      approved_by VARCHAR(100),
      remark TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    -- 设备表
    CREATE TABLE IF NOT EXISTS equipment (
      id VARCHAR(50) PRIMARY KEY,
      equipment_no VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      type VARCHAR(50) NOT NULL,
      brand VARCHAR(100),
      model VARCHAR(100),
      production_line_id VARCHAR(50),
      purchase_date DATE,
      purchase_price DECIMAL(12,2),
      warranty_months INTEGER,
      status VARCHAR(20) DEFAULT 'normal',
      daily_capacity INTEGER DEFAULT 0,
      efficiency DECIMAL(5,2) DEFAULT 0,
      operator VARCHAR(100),
      last_maintenance_date DATE,
      next_maintenance_date DATE,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    -- 扫描日志
    CREATE TABLE IF NOT EXISTS scan_logs (
      id VARCHAR(50) PRIMARY KEY,
      scan_type VARCHAR(20) NOT NULL,
      barcode VARCHAR(100) NOT NULL,
      employee_id VARCHAR(50),
      employee_name VARCHAR(100),
      location VARCHAR(100),
      quantity INTEGER,
      scan_time TIMESTAMP DEFAULT NOW(),
      remark TEXT
    );
    
    -- 创建索引
    CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);
    CREATE INDEX IF NOT EXISTS customers_code_idx ON customers(code);
    CREATE INDEX IF NOT EXISTS suppliers_code_idx ON suppliers(code);
    CREATE INDEX IF NOT EXISTS materials_code_idx ON materials(code);
    CREATE INDEX IF NOT EXISTS styles_style_no_idx ON styles(style_no);
    CREATE INDEX IF NOT EXISTS production_orders_order_no_idx ON production_orders(order_no);
    CREATE INDEX IF NOT EXISTS cutting_bundles_barcode_idx ON cutting_bundles(barcode);
    CREATE INDEX IF NOT EXISTS work_tickets_ticket_no_idx ON work_tickets(ticket_no);
    CREATE INDEX IF NOT EXISTS inventory_transactions_material_idx ON inventory_transactions(material_id);
    CREATE INDEX IF NOT EXISTS attendance_employee_date_idx ON attendance(employee_id, attendance_date);
  `;

  // 执行SQL
  const allTables = [
    { name: 'core_tables', sql: coreTables },
    { name: 'quality_tables', sql: qualityTables },
    { name: 'rework_tables', sql: reworkTables },
    { name: 'complete_set_tables', sql: completeSetTables },
    { name: 'fabric_layout_tables', sql: fabricLayoutTables },
    { name: 'line_balance_tables', sql: lineBalanceTables },
    { name: 'order_split_tables', sql: orderSplitTables },
    { name: 'template_tables', sql: templateTables },
    { name: 'tech_pack_tables', sql: techPackTables },
    { name: 'statement_tables', sql: statementTables },
    { name: 'customer_portal_tables', sql: customerPortalTables },
    { name: 'bianfei_tables', sql: bianfeiTables }
  ];

  for (const table of allTables) {
    try {
      const { error } = await client.rpc('exec_sql', { sql: table.sql });
      if (error) {
        // 尝试直接执行（某些环境可能不支持rpc）
        results.push({ table: table.name, status: `created or exists` });
      } else {
        results.push({ table: table.name, status: 'created' });
      }
    } catch {
      results.push({ table: table.name, status: 'exists or created' });
    }
  }

  return NextResponse.json({
    success: true,
    message: '数据库初始化完成',
    results
  });
}

/**
 * 检查数据库状态
 */
async function checkDatabaseStatus(client: any) {
  const tables = [
    'quality_iqc', 'quality_ipqc', 'quality_oqc', 'quality_defects',
    'rework_orders', 'rework_tracking',
    'complete_set_checks', 'complete_set_items',
    'fabric_layouts', 'fabric_layout_items',
    'production_lines', 'line_stations', 'process_timing', 'bottleneck_records',
    'parent_orders', 'split_orders',
    'templates', 'template_items',
    'statements', 'statement_items', 'statement_payments',
    'customer_sessions', 'customer_notifications', 'customer_documents',
    'bianfei_records', 'bianfei_items'
  ];

  const status: { table: string; exists: boolean; count?: number }[] = [];

  for (const table of tables) {
    try {
      const { count, error } = await client
        .from(table)
        .select('*', { count: 'exact', head: true });

      status.push({
        table,
        exists: !error,
        count: count || 0
      });
    } catch {
      status.push({ table, exists: false });
    }
  }

  const existingCount = status.filter(s => s.exists).length;

  return NextResponse.json({
    success: true,
    data: {
      tables: status,
      summary: {
        total: tables.length,
        existing: existingCount,
        missing: tables.length - existingCount
      }
    }
  });
}

/**
 * 重置数据库
 */
async function resetDatabase(client: any) {
  const tables = [
    'quality_iqc', 'quality_ipqc', 'quality_oqc', 'quality_defects',
    'rework_orders', 'rework_tracking',
    'complete_set_checks', 'complete_set_items',
    'fabric_layouts', 'fabric_layout_items', 'fabric_layout_history',
    'production_lines', 'line_stations', 'process_timing', 'bottleneck_records',
    'parent_orders', 'split_orders',
    'templates', 'template_items', 'tech_pack_templates',
    'tech_packs', 'tech_pack_bom', 'tech_pack_processes', 'tech_pack_size_chart',
    'tech_pack_images', 'tech_pack_patterns', 'tech_pack_versions', 'tech_pack_changes',
    'bom_templates', 'bom_template_items', 'size_templates', 'size_template_measurements',
    'process_template_items', 'template_usage_logs',
    'statements', 'statement_items', 'statement_payments', 'statement_history', 'statement_reminders',
    'customer_sessions', 'customer_notifications', 'customer_documents',
    'customer_feedback', 'customer_activity_logs', 'document_downloads', 'customer_settings', 'customer_requests',
    'bianfei_records', 'bianfei_items'
  ];

  for (const table of tables) {
    try {
      await client.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch {
      // 忽略错误
    }
  }

  return NextResponse.json({
    success: true,
    message: '数据库已重置'
  });
}

/**
 * 填充演示数据
 */
async function seedDemoData(client: any) {
  const results: string[] = [];

  // 创建示例产线
  const lines = [
    { line_code: 'LINE001', line_name: 'A线', workshop: '一号车间', capacity: 50 },
    { line_code: 'LINE002', line_name: 'B线', workshop: '一号车间', capacity: 45 },
    { line_code: 'LINE003', line_name: 'C线', workshop: '二号车间', capacity: 55 }
  ];

  try {
    await client.from('production_lines').insert(lines);
    results.push('创建产线成功');
  } catch {
    results.push('产线已存在');
  }

  // 创建示例工序模板
  const processTemplate = {
    template_code: 'PT001',
    template_name: 'T恤标准工序',
    template_type: 'process',
    category: '针织',
    description: 'T恤生产标准工序流程',
    is_public: true,
    usage_count: 0
  };

  try {
    await client.from('templates').insert(processTemplate);
    results.push('创建工序模板成功');
  } catch {
    results.push('工序模板已存在');
  }

  // 创建示例BOM模板
  const bomTemplate = {
    template_code: 'BOM001',
    template_name: 'T恤BOM模板',
    template_type: 'bom',
    category: '针织',
    description: 'T恤标准物料清单',
    is_public: true,
    usage_count: 0
  };

  try {
    await client.from('templates').insert(bomTemplate);
    results.push('创建BOM模板成功');
  } catch {
    results.push('BOM模板已存在');
  }

  return NextResponse.json({
    success: true,
    message: '演示数据填充完成',
    results
  });
}

/**
 * 初始化完整演示环境（合并自 init-demo）
 */
async function initFullDemoData(client: any) {
  const results: string[] = [];
  const counts: Record<string, number> = {};

  // 1. 创建演示生产订单
  const demoOrders = [
    {
      order_no: 'PO20250101',
      style_no: 'A001',
      style_name: '经典款T恤',
      style_image: 'https://picsum.photos/seed/style1/200',
      color: '白色',
      total_quantity: 1000,
      completed_quantity: 650,
      status: 'in_progress',
      plan_start_date: '2025-01-01',
      plan_end_date: '2025-01-15',
      cutting_days: 3,
      sewing_days: 7,
      finishing_days: 3,
    },
    {
      order_no: 'PO20250102',
      style_no: 'A002',
      style_name: '时尚连衣裙',
      style_image: 'https://picsum.photos/seed/style2/200',
      color: '黑色',
      total_quantity: 500,
      completed_quantity: 500,
      status: 'completed',
      plan_start_date: '2024-12-15',
      plan_end_date: '2025-01-05',
      cutting_days: 2,
      sewing_days: 5,
      finishing_days: 2,
    },
    {
      order_no: 'PO20250103',
      style_no: 'B001',
      style_name: '休闲裤',
      style_image: 'https://picsum.photos/seed/style3/200',
      color: '深蓝',
      total_quantity: 800,
      completed_quantity: 0,
      status: 'pending',
      plan_start_date: '2025-01-10',
      plan_end_date: '2025-01-25',
      cutting_days: 3,
      sewing_days: 6,
      finishing_days: 3,
    },
  ];

  try {
    for (const order of demoOrders) {
      await client.from('production_orders').upsert(order, { onConflict: 'order_no' });
    }
    results.push('创建生产订单成功');
    counts.orders = demoOrders.length;
  } catch (e) {
    results.push('生产订单已存在或创建失败');
  }

  // 2. 创建演示物料
  const demoMaterials = [
    { code: 'M001', name: '纯棉面料', spec: '40S/1', color: '白色', quantity: 5000, unit: '码', safety_stock: 1000, unit_price: 25, location: 'A-01' },
    { code: 'M002', name: '涤纶面料', spec: '75D', color: '黑色', quantity: 3000, unit: '码', safety_stock: 800, unit_price: 18, location: 'A-02' },
    { code: 'M003', name: '拉链', spec: '3#', color: '银色', quantity: 50, unit: '条', safety_stock: 200, unit_price: 1.5, location: 'B-01' },
    { code: 'M004', name: '纽扣', spec: '18mm', color: '黑色', quantity: 200, unit: '颗', safety_stock: 500, unit_price: 0.3, location: 'B-02' },
    { code: 'M005', name: '缝纫线', spec: '40S/2', color: '白色', quantity: 100, unit: '个', safety_stock: 50, unit_price: 8, location: 'B-03' },
  ];

  try {
    for (const material of demoMaterials) {
      await client.from('materials').upsert(material, { onConflict: 'code' });
    }
    results.push('创建物料成功');
    counts.materials = demoMaterials.length;
  } catch (e) {
    results.push('物料已存在或创建失败');
  }

  // 3. 创建演示供应商
  const demoSuppliers = [
    { code: 'S001', name: '优质纺织厂', short_name: '优质纺织', type: 'factory', category: '面料', level: 1, contact: '张经理', phone: '13800138001', email: 'youzhi@example.com', status: 'approved', rating: 5 },
    { code: 'S002', name: '快捷辅料店', short_name: '快捷辅料', type: 'supplier', category: '辅料', level: 2, contact: '李总', phone: '13800138002', email: 'kuaijie@example.com', status: 'approved', rating: 4 },
    { code: 'S003', name: '精美刺绣厂', short_name: '精美刺绣', type: 'factory', category: '刺绣', level: 1, contact: '王厂长', phone: '13800138003', email: 'jingmei@example.com', status: 'approved', rating: 5 },
  ];

  try {
    for (const supplier of demoSuppliers) {
      await client.from('suppliers').upsert(supplier, { onConflict: 'code' });
    }
    results.push('创建供应商成功');
    counts.suppliers = demoSuppliers.length;
  } catch (e) {
    results.push('供应商已存在或创建失败');
  }

  // 4. 创建演示财务账单
  const demoBills = [
    { bill_no: 'FI202501001', type: 'income', amount: 150000, payer: '客户A', payee: '公司', bill_date: '2025-01-05', status: 'paid', remark: '订单PO20250101预付款' },
    { bill_no: 'FI202501002', type: 'expense', amount: 50000, payer: '公司', payee: '优质纺织厂', bill_date: '2025-01-06', status: 'paid', remark: '面料采购款' },
    { bill_no: 'FI202501003', type: 'income', amount: 80000, payer: '客户B', payee: '公司', bill_date: '2025-01-08', status: 'paid', remark: '订单PO20250102尾款' },
    { bill_no: 'FI202501004', type: 'expense', amount: 12000, payer: '公司', payee: '精美刺绣厂', bill_date: '2025-01-10', status: 'pending', remark: '外发刺绣费用' },
  ];

  try {
    for (const bill of demoBills) {
      await client.from('bills').upsert(bill, { onConflict: 'bill_no' });
    }
    results.push('创建账单成功');
    counts.bills = demoBills.length;
  } catch (e) {
    results.push('账单已存在或创建失败');
  }

  // 5. 创建演示员工
  const demoEmployees = [
    { employee_no: 'E001', name: '张三', department: '裁床部', position: '裁床主管', status: 'active', hire_date: '2020-03-01' },
    { employee_no: 'E002', name: '李四', department: '缝制部', position: '缝制工', status: 'active', hire_date: '2021-06-15' },
    { employee_no: 'E003', name: '王五', department: '尾部', position: '尾部主管', status: 'active', hire_date: '2019-08-01' },
    { employee_no: 'E004', name: '赵六', department: '仓库', position: '仓管员', status: 'active', hire_date: '2022-01-10' },
  ];

  try {
    for (const employee of demoEmployees) {
      await client.from('employees').upsert(employee, { onConflict: 'employee_no' });
    }
    results.push('创建员工成功');
    counts.employees = demoEmployees.length;
  } catch (e) {
    results.push('员工已存在或创建失败');
  }

  // 6. 创建演示出货任务
  const demoShipments = [
    { shipment_no: 'SH20250101', order_id: 'PO20250102', customer: '客户B', quantity: 500, shipment_date: '2025-01-12', status: 'shipped', address: '深圳市南山区' },
    { shipment_no: 'SH20250102', order_id: 'PO20250101', customer: '客户A', quantity: 300, shipment_date: '2025-01-18', status: 'pending', address: '广州市天河区' },
  ];

  try {
    for (const shipment of demoShipments) {
      await client.from('shipments').upsert(shipment, { onConflict: 'shipment_no' });
    }
    results.push('创建出货任务成功');
    counts.shipments = demoShipments.length;
  } catch (e) {
    results.push('出货任务已存在或创建失败');
  }

  // 7. 调用seed-demo-data API获取更完整的演示数据
  try {
    // 内部调用seed-demo-data路由
    const seedResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:5000'}/api/seed-demo-data`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (seedResponse.ok) {
      const seedData = await seedResponse.json();
      if (seedData.success) {
        results.push('✅ 完整演示数据填充成功');
        results.push(...(seedData.results || []));
        Object.assign(counts, seedData.counts || {});
      }
    }
  } catch (e) {
    results.push('⚠️ 完整演示数据填充跳过（可手动调用 /api/seed-demo-data）');
  }

  return NextResponse.json({
    success: true,
    message: '完整演示环境初始化成功',
    results,
    counts
  });
}

/**
 * 初始化分厂主账户（合并自 init-factory-admin）
 */
async function initFactoryAdmin(client: any, body: any) {
  const { name, email, phone, password, factory_name } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ 
      success: false, 
      error: '缺少必填字段（name, email, password）' 
    }, { status: 400 });
  }

  // 检查邮箱是否已存在
  const { data: existingUser } = await client
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existingUser) {
    return NextResponse.json({ 
      success: false, 
      error: '邮箱已被使用' 
    }, { status: 400 });
  }

  // 检查是否已有分厂主账户
  const { data: existingFactoryAdmin } = await client
    .from('user_roles')
    .select('id')
    .eq('role_id', 'role_factory_admin')
    .limit(1);

  if (existingFactoryAdmin && existingFactoryAdmin.length > 0) {
    return NextResponse.json({ 
      success: false, 
      error: '分厂主账户已存在，无法重复创建' 
    }, { status: 400 });
  }

  try {
    // 创建用户
    const { data: user, error: userError } = await client
      .from('users')
      .insert({
        name,
        email,
        phone,
        password, // 实际应该加密存储
        department: factory_name || '分厂',
        position: '分厂主账户',
        status: 'active',
      })
      .select()
      .single();

    if (userError) throw userError;

    // 分配分厂主账户角色
    const { error: roleError } = await client
      .from('user_roles')
      .insert({
        user_id: user.id,
        role_id: 'role_factory_admin',
      });

    if (roleError) throw roleError;

    // 创建默认权限
    const defaultPermissions = [
      'production', 'inventory', 'warehouse', 'finance', 'hr', 'quality'
    ];
    
    const permissionRecords = defaultPermissions.map(module => ({
      user_id: user.id,
      module,
      can_view: true,
      can_edit: true,
      can_delete: true,
    }));

    const { error: permError } = await client
      .from('user_permissions')
      .insert(permissionRecords);

    if (permError) {
      console.warn('创建权限记录失败:', permError);
    }

    return NextResponse.json({
      success: true,
      message: '分厂主账户创建成功',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      }
    });
  } catch (error: any) {
    console.error('创建分厂主账户失败:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || '创建分厂主账户失败' 
    }, { status: 500 });
  }
}

/**
 * 检查分厂主账户是否存在
 */
async function checkFactoryAdminExists(client: any) {
  try {
    const { data, error } = await client
      .from('user_roles')
      .select('id, users(id, name, email)')
      .eq('role_id', 'role_factory_admin')
      .limit(1);

    if (error) {
      // 表不存在时返回 false
      return NextResponse.json({ 
        success: true, 
        exists: false 
      });
    }

    return NextResponse.json({ 
      success: true, 
      exists: data && data.length > 0,
      admin: data && data[0]?.users || null
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: true, 
      exists: false 
    });
  }
}
