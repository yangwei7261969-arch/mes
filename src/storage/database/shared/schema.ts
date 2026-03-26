import { pgTable, index, varchar, text, integer, timestamp, serial, jsonb, boolean, unique, numeric, date, uniqueIndex } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// Helper for UUID generation
const genRandomUUID = () => sql`genRandomUUID()`



export const aiLogs = pgTable("ai_logs", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	userId: varchar("user_id", { length: 36 }),
	module: varchar({ length: 50 }),
	action: varchar({ length: 100 }),
	input: text(),
	output: text(),
	tokens: integer(),
	model: varchar({ length: 100 }),
	duration: integer(),
	status: varchar({ length: 20 }).default('success'),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("ai_logs_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const announcements = pgTable("announcements", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	title: varchar({ length: 200 }).notNull(),
	content: text().notNull(),
	type: varchar({ length: 20 }).default('general'),
	targetRoles: jsonb("target_roles"),
	isPublished: boolean("is_published").default(false).notNull(),
	publishAt: timestamp("publish_at", { withTimezone: true, mode: 'string' }),
	expireAt: timestamp("expire_at", { withTimezone: true, mode: 'string' }),
	authorId: varchar("author_id", { length: 36 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("announcements_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
]);

export const bills = pgTable("bills", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	billNo: varchar("bill_no", { length: 50 }).notNull(),
	type: varchar({ length: 20 }).notNull(),
	category: varchar({ length: 50 }),
	relatedType: varchar("related_type", { length: 50 }),
	relatedId: varchar("related_id", { length: 36 }),
	customerId: varchar("customer_id", { length: 36 }),
	supplierId: varchar("supplier_id", { length: 36 }),
	amount: numeric({ precision: 15, scale:  2 }).notNull(),
	taxRate: numeric("tax_rate", { precision: 5, scale:  2 }).default('0'),
	taxAmount: numeric("tax_amount", { precision: 15, scale:  2 }).default('0'),
	totalAmount: numeric("total_amount", { precision: 15, scale:  2 }).notNull(),
	paidAmount: numeric("paid_amount", { precision: 15, scale:  2 }).default('0'),
	status: varchar({ length: 20 }).default('pending').notNull(),
	billDate: date("bill_date").notNull(),
	dueDate: date("due_date"),
	paidDate: date("paid_date"),
	notes: text(),
	attachments: jsonb(),
	createdBy: varchar("created_by", { length: 36 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("bills_bill_no_idx").using("btree", table.billNo.asc().nullsLast().op("text_ops")),
	index("bills_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("bills_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
	unique("bills_bill_no_unique").on(table.billNo),
]);

export const craftProcesses = pgTable("craft_processes", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	productionOrderId: varchar("production_order_id", { length: 36 }).notNull(),
	processName: varchar("process_name", { length: 100 }).notNull(),
	processType: varchar("process_type", { length: 50 }),
	quantity: integer().notNull(),
	completedQty: integer("completed_qty").default(0),
	unitPrice: numeric("unit_price", { precision: 10, scale:  2 }),
	totalCost: numeric("total_cost", { precision: 15, scale:  2 }),
	supplierId: varchar("supplier_id", { length: 36 }),
	status: varchar({ length: 20 }).default('pending').notNull(),
	startDate: date("start_date"),
	endDate: date("end_date"),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("craft_processes_production_idx").using("btree", table.productionOrderId.asc().nullsLast().op("text_ops")),
	index("craft_processes_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
]);

export const customers = pgTable("customers", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 200 }).notNull(),
	shortName: varchar("short_name", { length: 100 }),
	type: varchar({ length: 20 }).default('domestic'),
	level: varchar({ length: 20 }).default('normal'),
	contact: varchar({ length: 100 }),
	phone: varchar({ length: 20 }),
	email: varchar({ length: 255 }),
	address: text(),
	taxNo: varchar("tax_no", { length: 100 }),
	bankName: varchar("bank_name", { length: 100 }),
	bankAccount: varchar("bank_account", { length: 100 }),
	creditLimit: numeric("credit_limit", { precision: 15, scale:  2 }),
	balance: numeric({ precision: 15, scale:  2 }).default('0'),
	notes: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("customers_code_idx").using("btree", table.code.asc().nullsLast().op("text_ops")),
	index("customers_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
	unique("customers_code_unique").on(table.code),
]);

export const cuttingOrders = pgTable("cutting_orders", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	orderNo: varchar("order_no", { length: 50 }).notNull(),
	productionOrderId: varchar("production_order_id", { length: 36 }),
	styleNo: varchar("style_no", { length: 100 }),
	color: varchar({ length: 50 }),
	fabricCode: varchar("fabric_code", { length: 50 }),
	fabricQty: numeric("fabric_qty", { precision: 15, scale:  2 }),
	cuttingQty: integer("cutting_qty").notNull(),
	completedQty: integer("completed_qty").default(0),
	defectiveQty: integer("defective_qty").default(0),
	status: varchar({ length: 20 }).default('pending').notNull(),
	cuttingDate: date("cutting_date"),
	workshop: varchar({ length: 100 }),
	cuttingTeam: varchar("cutting_team", { length: 100 }),
	operatorId: varchar("operator_id", { length: 36 }),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("cutting_orders_order_no_idx").using("btree", table.orderNo.asc().nullsLast().op("text_ops")),
	index("cutting_orders_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	unique("cutting_orders_order_no_unique").on(table.orderNo),
]);

export const employees = pgTable("employees", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	employeeNo: varchar("employee_no", { length: 50 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	gender: varchar({ length: 10 }),
	birthDate: date("birth_date"),
	idCard: varchar("id_card", { length: 20 }),
	phone: varchar({ length: 20 }),
	email: varchar({ length: 255 }),
	department: varchar({ length: 100 }),
	position: varchar({ length: 100 }),
	workshop: varchar({ length: 100 }),
	skillLevel: varchar("skill_level", { length: 20 }),
	joinDate: date("join_date"),
	leaveDate: date("leave_date"),
	status: varchar({ length: 20 }).default('active').notNull(),
	baseSalary: numeric("base_salary", { precision: 10, scale:  2 }),
	bankName: varchar("bank_name", { length: 100 }),
	bankAccount: varchar("bank_account", { length: 100 }),
	emergencyContact: varchar("emergency_contact", { length: 100 }),
	emergencyPhone: varchar("emergency_phone", { length: 20 }),
	address: text(),
	photo: text(),
	notes: text(),
	userId: varchar("user_id", { length: 36 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("employees_employee_no_idx").using("btree", table.employeeNo.asc().nullsLast().op("text_ops")),
	index("employees_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("employees_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	unique("employees_employee_no_unique").on(table.employeeNo),
]);

export const finishedGoods = pgTable("finished_goods", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	sku: varchar({ length: 100 }).notNull(),
	styleNo: varchar("style_no", { length: 100 }),
	styleName: varchar("style_name", { length: 200 }),
	color: varchar({ length: 50 }),
	size: varchar({ length: 50 }),
	unit: varchar({ length: 20 }).default('件'),
	brand: varchar({ length: 100 }),
	season: varchar({ length: 50 }),
	year: integer(),
	costPrice: numeric("cost_price", { precision: 10, scale:  2 }),
	salePrice: numeric("sale_price", { precision: 10, scale:  2 }),
	notes: text(),
	images: jsonb(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("finished_goods_sku_idx").using("btree", table.sku.asc().nullsLast().op("text_ops")),
	unique("finished_goods_sku_unique").on(table.sku),
]);

export const finishedInventory = pgTable("finished_inventory", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	goodsId: varchar("goods_id", { length: 36 }).notNull(),
	warehouse: varchar({ length: 100 }).notNull(),
	location: varchar({ length: 100 }),
	quantity: integer().default(0).notNull(),
	lockedQty: integer("locked_qty").default(0),
	availableQty: integer("available_qty"),
	batchNo: varchar("batch_no", { length: 50 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("finished_inventory_goods_idx").using("btree", table.goodsId.asc().nullsLast().op("text_ops")),
]);

export const inventory = pgTable("inventory", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	materialId: varchar("material_id", { length: 36 }).notNull(),
	warehouse: varchar({ length: 100 }).notNull(),
	location: varchar({ length: 100 }),
	quantity: numeric({ precision: 15, scale:  2 }).default('0').notNull(),
	lockedQty: numeric("locked_qty", { precision: 15, scale:  2 }).default('0'),
	availableQty: numeric("available_qty", { precision: 15, scale:  2 }),
	batchNo: varchar("batch_no", { length: 50 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("inventory_material_idx").using("btree", table.materialId.asc().nullsLast().op("text_ops")),
	index("inventory_warehouse_idx").using("btree", table.warehouse.asc().nullsLast().op("text_ops")),
]);

export const inventoryLogs = pgTable("inventory_logs", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	materialId: varchar("material_id", { length: 36 }).notNull(),
	type: varchar({ length: 20 }).notNull(),
	quantity: numeric({ precision: 15, scale:  2 }).notNull(),
	beforeQty: numeric("before_qty", { precision: 15, scale:  2 }),
	afterQty: numeric("after_qty", { precision: 15, scale:  2 }),
	warehouse: varchar({ length: 100 }),
	location: varchar({ length: 100 }),
	relatedType: varchar("related_type", { length: 50 }),
	relatedId: varchar("related_id", { length: 36 }),
	batchNo: varchar("batch_no", { length: 50 }),
	notes: text(),
	operatorId: varchar("operator_id", { length: 36 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("inventory_logs_created_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("inventory_logs_material_idx").using("btree", table.materialId.asc().nullsLast().op("text_ops")),
	index("inventory_logs_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
]);

export const invoices = pgTable("invoices", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	invoiceNo: varchar("invoice_no", { length: 50 }).notNull(),
	billId: varchar("bill_id", { length: 36 }),
	type: varchar({ length: 20 }).notNull(),
	invoiceType: varchar("invoice_type", { length: 50 }),
	customerId: varchar("customer_id", { length: 36 }),
	supplierId: varchar("supplier_id", { length: 36 }),
	amount: numeric({ precision: 15, scale:  2 }).notNull(),
	taxRate: numeric("tax_rate", { precision: 5, scale:  2 }),
	taxAmount: numeric("tax_amount", { precision: 15, scale:  2 }),
	totalAmount: numeric("total_amount", { precision: 15, scale:  2 }).notNull(),
	invoiceDate: date("invoice_date").notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	notes: text(),
	attachments: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("invoices_invoice_no_idx").using("btree", table.invoiceNo.asc().nullsLast().op("text_ops")),
	index("invoices_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
	unique("invoices_invoice_no_unique").on(table.invoiceNo),
]);

export const materials = pgTable("materials", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 200 }).notNull(),
	category: varchar({ length: 50 }).notNull(),
	type: varchar({ length: 100 }),
	unit: varchar({ length: 20 }).default('米'),
	color: varchar({ length: 50 }),
	spec: varchar({ length: 200 }),
	supplierId: varchar("supplier_id", { length: 36 }),
	safetyStock: numeric("safety_stock", { precision: 10, scale:  2 }),
	minOrderQty: numeric("min_order_qty", { precision: 10, scale:  2 }),
	unitPrice: numeric("unit_price", { precision: 10, scale:  2 }),
	warehouse: varchar({ length: 100 }),
	location: varchar({ length: 100 }),
	notes: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("materials_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("materials_code_idx").using("btree", table.code.asc().nullsLast().op("text_ops")),
	index("materials_supplier_idx").using("btree", table.supplierId.asc().nullsLast().op("text_ops")),
	unique("materials_code_unique").on(table.code),
]);

export const payments = pgTable("payments", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	paymentNo: varchar("payment_no", { length: 50 }).notNull(),
	billId: varchar("bill_id", { length: 36 }),
	type: varchar({ length: 20 }).notNull(),
	amount: numeric({ precision: 15, scale:  2 }).notNull(),
	method: varchar({ length: 50 }),
	bankAccount: varchar("bank_account", { length: 100 }),
	paymentDate: date("payment_date").notNull(),
	voucherNo: varchar("voucher_no", { length: 50 }),
	notes: text(),
	attachments: jsonb(),
	operatorId: varchar("operator_id", { length: 36 }),
	auditStatus: varchar("audit_status", { length: 20 }).default('pending'),
	auditBy: varchar("audit_by", { length: 36 }),
	auditAt: timestamp("audit_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("payments_bill_idx").using("btree", table.billId.asc().nullsLast().op("text_ops")),
	index("payments_payment_no_idx").using("btree", table.paymentNo.asc().nullsLast().op("text_ops")),
	unique("payments_payment_no_unique").on(table.paymentNo),
]);

export const permissions = pgTable("permissions", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	module: varchar({ length: 50 }).notNull(),
	action: varchar({ length: 50 }).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("permissions_module_action_idx").using("btree", table.module.asc().nullsLast().op("text_ops"), table.action.asc().nullsLast().op("text_ops")),
]);

export const processes = pgTable("processes", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	code: varchar({ length: 50 }).notNull(),
	category: varchar({ length: 50 }),
	description: text(),
	standardTime: numeric("standard_time", { precision: 10, scale:  2 }),
	unitPrice: numeric("unit_price", { precision: 10, scale:  2 }),
	sequence: integer().default(0),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("processes_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("processes_code_idx").using("btree", table.code.asc().nullsLast().op("text_ops")),
	unique("processes_code_unique").on(table.code),
]);

export const productionOrders = pgTable("production_orders", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	orderNo: varchar("order_no", { length: 50 }).notNull(),
	customerOrderNo: varchar("customer_order_no", { length: 50 }),
	customerId: varchar("customer_id", { length: 36 }),
	styleNo: varchar("style_no", { length: 100 }),
	styleName: varchar("style_name", { length: 200 }),
	sku: varchar({ length: 100 }),
	color: varchar({ length: 50 }),
	size: varchar({ length: 50 }),
	quantity: integer().notNull(),
	completedQuantity: integer("completed_quantity").default(0),
	defectiveQuantity: integer("defective_quantity").default(0),
	unit: varchar({ length: 20 }).default('件'),
	status: varchar({ length: 20 }).default('pending').notNull(),
	priority: integer().default(5),
	planStartDate: date("plan_start_date"),
	planEndDate: date("plan_end_date"),
	actualStartDate: date("actual_start_date"),
	actualEndDate: date("actual_end_date"),
	factoryId: varchar("factory_id", { length: 36 }),
	workshop: varchar({ length: 100 }),
	productionLine: varchar("production_line", { length: 100 }),
	notes: text(),
	createdBy: varchar("created_by", { length: 36 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("production_orders_customer_idx").using("btree", table.customerId.asc().nullsLast().op("text_ops")),
	index("production_orders_order_no_idx").using("btree", table.orderNo.asc().nullsLast().op("text_ops")),
	index("production_orders_plan_date_idx").using("btree", table.planStartDate.asc().nullsLast().op("date_ops"), table.planEndDate.asc().nullsLast().op("date_ops")),
	index("production_orders_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	unique("production_orders_order_no_unique").on(table.orderNo),
]);

export const productionProgress = pgTable("production_progress", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	orderId: varchar("order_id", { length: 36 }).notNull(),
	processId: varchar("process_id", { length: 36 }).notNull(),
	workerId: varchar("worker_id", { length: 36 }),
	quantity: integer().notNull(),
	defectiveQty: integer("defective_qty").default(0),
	status: varchar({ length: 20 }).default('pending').notNull(),
	startTime: timestamp("start_time", { withTimezone: true, mode: 'string' }),
	endTime: timestamp("end_time", { withTimezone: true, mode: 'string' }),
	notes: text(),
	createdBy: varchar("created_by", { length: 36 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("production_progress_order_idx").using("btree", table.orderId.asc().nullsLast().op("text_ops")),
	index("production_progress_process_idx").using("btree", table.processId.asc().nullsLast().op("text_ops")),
	index("production_progress_worker_idx").using("btree", table.workerId.asc().nullsLast().op("text_ops")),
]);

export const purchaseItems = pgTable("purchase_items", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	orderId: varchar("order_id", { length: 36 }).notNull(),
	materialId: varchar("material_id", { length: 36 }).notNull(),
	quantity: numeric({ precision: 15, scale:  2 }).notNull(),
	unitPrice: numeric("unit_price", { precision: 10, scale:  2 }).notNull(),
	amount: numeric({ precision: 15, scale:  2 }).notNull(),
	receivedQty: numeric("received_qty", { precision: 15, scale:  2 }).default('0'),
	returnedQty: numeric("returned_qty", { precision: 15, scale:  2 }).default('0'),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("purchase_items_material_idx").using("btree", table.materialId.asc().nullsLast().op("text_ops")),
	index("purchase_items_order_idx").using("btree", table.orderId.asc().nullsLast().op("text_ops")),
]);

export const purchaseOrders = pgTable("purchase_orders", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	orderNo: varchar("order_no", { length: 50 }).notNull(),
	supplierId: varchar("supplier_id", { length: 36 }).notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	totalAmount: numeric("total_amount", { precision: 15, scale:  2 }).default('0'),
	paidAmount: numeric("paid_amount", { precision: 15, scale:  2 }).default('0'),
	currency: varchar({ length: 10 }).default('CNY'),
	orderDate: date("order_date").notNull(),
	expectedDate: date("expected_date"),
	receivedDate: date("received_date"),
	paymentTerms: varchar("payment_terms", { length: 200 }),
	notes: text(),
	createdBy: varchar("created_by", { length: 36 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("purchase_orders_order_no_idx").using("btree", table.orderNo.asc().nullsLast().op("text_ops")),
	index("purchase_orders_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("purchase_orders_supplier_idx").using("btree", table.supplierId.asc().nullsLast().op("text_ops")),
	unique("purchase_orders_order_no_unique").on(table.orderNo),
]);

export const returns = pgTable("returns", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	returnNo: varchar("return_no", { length: 50 }).notNull(),
	shipmentId: varchar("shipment_id", { length: 36 }),
	customerId: varchar("customer_id", { length: 36 }),
	returnDate: date("return_date").notNull(),
	totalQty: integer("total_qty").notNull(),
	reason: text(),
	type: varchar({ length: 20 }).notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	defectiveReport: text("defective_report"),
	refundAmount: numeric("refund_amount", { precision: 15, scale:  2 }),
	notes: text(),
	operatorId: varchar("operator_id", { length: 36 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("returns_return_no_idx").using("btree", table.returnNo.asc().nullsLast().op("text_ops")),
	index("returns_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	unique("returns_return_no_unique").on(table.returnNo),
]);

export const rolePermissions = pgTable("role_permissions", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	roleId: varchar("role_id", { length: 36 }).notNull(),
	permissionId: varchar("permission_id", { length: 36 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("role_permissions_permission_idx").using("btree", table.permissionId.asc().nullsLast().op("text_ops")),
	index("role_permissions_role_idx").using("btree", table.roleId.asc().nullsLast().op("text_ops")),
]);

export const roles = pgTable("roles", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	name: varchar({ length: 50 }).notNull(),
	displayName: varchar("display_name", { length: 100 }).notNull(),
	description: text(),
	level: integer().default(1),
	isSystem: boolean("is_system").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("roles_name_unique").on(table.name),
]);

export const salaries = pgTable("salaries", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	employeeId: varchar("employee_id", { length: 36 }).notNull(),
	year: integer().notNull(),
	month: integer().notNull(),
	baseSalary: numeric("base_salary", { precision: 10, scale:  2 }).notNull(),
	overtimePay: numeric("overtime_pay", { precision: 10, scale:  2 }).default('0'),
	bonus: numeric({ precision: 10, scale:  2 }).default('0'),
	allowance: numeric({ precision: 10, scale:  2 }).default('0'),
	deduction: numeric({ precision: 10, scale:  2 }).default('0'),
	utilityFee: numeric("utility_fee", { precision: 10, scale:  2 }).default('0'),
	rentFee: numeric("rent_fee", { precision: 10, scale:  2 }).default('0'),
	otherDeduction: numeric("other_deduction", { precision: 10, scale:  2 }).default('0'),
	totalAmount: numeric("total_amount", { precision: 10, scale:  2 }).notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	confirmedAt: timestamp("confirmed_at", { withTimezone: true, mode: 'string' }),
	confirmedBy: varchar("confirmed_by", { length: 36 }),
	paidAt: timestamp("paid_at", { withTimezone: true, mode: 'string' }),
	employeeSigned: boolean("employee_signed").default(false),
	signedAt: timestamp("signed_at", { withTimezone: true, mode: 'string' }),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("salaries_employee_idx").using("btree", table.employeeId.asc().nullsLast().op("text_ops")),
	index("salaries_year_month_idx").using("btree", table.year.asc().nullsLast().op("int4_ops"), table.month.asc().nullsLast().op("int4_ops")),
]);

export const shipmentItems = pgTable("shipment_items", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	shipmentId: varchar("shipment_id", { length: 36 }).notNull(),
	goodsId: varchar("goods_id", { length: 36 }).notNull(),
	quantity: integer().notNull(),
	unitPrice: numeric("unit_price", { precision: 10, scale:  2 }),
	amount: numeric({ precision: 15, scale:  2 }),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("shipment_items_shipment_idx").using("btree", table.shipmentId.asc().nullsLast().op("text_ops")),
]);

export const shipments = pgTable("shipments", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	shipmentNo: varchar("shipment_no", { length: 50 }).notNull(),
	orderId: varchar("order_id", { length: 36 }),
	customerId: varchar("customer_id", { length: 36 }).notNull(),
	shipmentDate: date("shipment_date").notNull(),
	totalQty: integer("total_qty").notNull(),
	totalAmount: numeric("total_amount", { precision: 15, scale:  2 }),
	status: varchar({ length: 20 }).default('pending').notNull(),
	courier: varchar({ length: 100 }),
	trackingNo: varchar("tracking_no", { length: 100 }),
	shippingAddress: text("shipping_address"),
	receiver: varchar({ length: 100 }),
	receiverPhone: varchar("receiver_phone", { length: 20 }),
	notes: text(),
	operatorId: varchar("operator_id", { length: 36 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("shipments_customer_idx").using("btree", table.customerId.asc().nullsLast().op("text_ops")),
	index("shipments_shipment_no_idx").using("btree", table.shipmentNo.asc().nullsLast().op("text_ops")),
	unique("shipments_shipment_no_unique").on(table.shipmentNo),
]);

export const suppliers = pgTable("suppliers", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 200 }).notNull(),
	shortName: varchar("short_name", { length: 100 }),
	type: varchar({ length: 50 }),
	category: varchar({ length: 100 }),
	contact: varchar({ length: 100 }),
	phone: varchar({ length: 20 }),
	email: varchar({ length: 255 }),
	address: text(),
	taxNo: varchar("tax_no", { length: 100 }),
	bankName: varchar("bank_name", { length: 100 }),
	bankAccount: varchar("bank_account", { length: 100 }),
	paymentTerms: varchar("payment_terms", { length: 200 }),
	creditLimit: numeric("credit_limit", { precision: 15, scale:  2 }),
	balance: numeric({ precision: 15, scale:  2 }).default('0'),
	rating: integer().default(3),
	notes: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("suppliers_code_idx").using("btree", table.code.asc().nullsLast().op("text_ops")),
	index("suppliers_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
	unique("suppliers_code_unique").on(table.code),
]);

export const systemLogs = pgTable("system_logs", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	module: varchar({ length: 50 }).notNull(),
	action: varchar({ length: 50 }).notNull(),
	description: text(),
	userId: varchar("user_id", { length: 36 }),
	userName: varchar("user_name", { length: 100 }),
	ipAddress: varchar("ip_address", { length: 50 }),
	userAgent: text("user_agent"),
	requestData: jsonb("request_data"),
	responseData: jsonb("response_data"),
	status: varchar({ length: 20 }).default('success'),
	errorMessage: text("error_message"),
	duration: integer(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("system_logs_module_idx").using("btree", table.module.asc().nullsLast().op("text_ops")),
	index("system_logs_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);

export const systemSettings = pgTable("system_settings", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	key: varchar({ length: 100 }).notNull(),
	value: text(),
	description: text(),
	category: varchar({ length: 50 }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	updatedBy: varchar("updated_by", { length: 36 }),
}, (table) => [
	unique("system_settings_key_unique").on(table.key),
]);

export const userRoles = pgTable("user_roles", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	userId: varchar("user_id", { length: 36 }).notNull(),
	roleId: varchar("role_id", { length: 36 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("user_roles_role_idx").using("btree", table.roleId.asc().nullsLast().op("text_ops")),
	index("user_roles_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);

export const users = pgTable("users", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	name: varchar({ length: 128 }).notNull(),
	phone: varchar({ length: 20 }),
	password: text(),
	avatar: text(),
	department: varchar({ length: 100 }),
	position: varchar({ length: 100 }),
	status: varchar({ length: 20 }).default('active').notNull(),
	lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("users_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("users_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	unique("users_email_unique").on(table.email),
]);

// 裁床分扎表
export const cuttingBundles = pgTable("cutting_bundles", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	cuttingOrderId: varchar("cutting_order_id", { length: 36 }),
	bundleNo: varchar("bundle_no", { length: 50 }).notNull(),
	size: varchar({ length: 50 }).notNull(),
	color: varchar({ length: 50 }).notNull(),
	quantity: integer().notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	qrCode: varchar("qr_code", { length: 100 }),
	currentProcessId: varchar("current_process_id", { length: 36 }),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("cutting_bundles_order_idx").using("btree", table.cuttingOrderId.asc().nullsLast().op("text_ops")),
	index("cutting_bundles_bundle_no_idx").using("btree", table.bundleNo.asc().nullsLast().op("text_ops")),
	unique("cutting_bundles_bundle_no_unique").on(table.bundleNo),
]);

// 工序追溯表
export const processTracking = pgTable("process_tracking", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	bundleId: varchar("bundle_id", { length: 36 }).notNull(),
	processId: varchar("process_id", { length: 36 }).notNull(),
	workerId: varchar("worker_id", { length: 36 }).notNull(),
	quantity: integer().notNull(),
	wage: numeric({ precision: 10, scale: 2 }).notNull(),
	status: varchar({ length: 20 }).default('completed').notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("process_tracking_bundle_idx").using("btree", table.bundleId.asc().nullsLast().op("text_ops")),
	index("process_tracking_process_idx").using("btree", table.processId.asc().nullsLast().op("text_ops")),
	index("process_tracking_worker_idx").using("btree", table.workerId.asc().nullsLast().op("text_ops")),
	index("process_tracking_created_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
]);

// 款式工序配置表
export const styleProcesses = pgTable("style_processes", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	styleNo: varchar("style_no", { length: 100 }).notNull(),
	processId: varchar("process_id", { length: 36 }).notNull(),
	sequence: integer().default(1).notNull(),
	unitPrice: numeric("unit_price", { precision: 10, scale: 2 }),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("style_processes_style_no_idx").using("btree", table.styleNo.asc().nullsLast().op("text_ops")),
	index("style_processes_process_id_idx").using("btree", table.processId.asc().nullsLast().op("text_ops")),
]);

// 工序模板表
export const processTemplates = pgTable("process_templates", {
	id: varchar({ length: 36 }).default(genRandomUUID()).primaryKey().notNull(),
	name: varchar({ length: 200 }).notNull(),
	description: text(),
	processes: jsonb().notNull(),
	isDefault: boolean("is_default").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("process_templates_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
]);
