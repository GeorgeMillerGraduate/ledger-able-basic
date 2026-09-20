import { mediumtext, int, index, boolean, decimal, mysqlTable, text, varchar, mysqlEnum, uniqueIndex } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  pictureUrl: text("picture_url"),
  createdAt: varchar("created_at", { length: 24 }).notNull(),
  updatedAt: varchar("updated_at", { length: 24 }).notNull(),
});

export const authIdentities = mysqlTable("auth_identities", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  provider: varchar("provider", { length: 32 }).notNull(),
  providerSubject: varchar("provider_subject", { length: 255 }).notNull(),
  createdAt: varchar("created_at", { length: 24 }).notNull(),
}, (table) => [
  uniqueIndex("idx_auth_identity_provider_subject").on(table.provider, table.providerSubject),
  index("idx_auth_identity_user").on(table.userId),
]);

export const sessions = mysqlTable("sessions", {
  tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  expiresAt: varchar("expires_at", { length: 24 }).notNull(),
  createdAt: varchar("created_at", { length: 24 }).notNull(),
}, (table) => [
  index("idx_sessions_user").on(table.userId),
  index("idx_sessions_expiry").on(table.expiresAt),
]);

export const businesses = mysqlTable("businesses", {
  id: varchar("id", { length: 36 }).primaryKey(),
  ownerUserId: varchar("owner_user_id", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  businessType: varchar("business_type", { length: 255 }).notNull().default("sole_trader"),
  accountingYearStart: varchar("accounting_year_start", { length: 10 }).notNull(),
  taxEstimateRate: decimal("tax_estimate_rate", { precision: 6, scale: 5, mode: "number" }).notNull().default(0.2),
  createdAt: varchar("created_at", { length: 24 }).notNull(),
  updatedAt: varchar("updated_at", { length: 24 }).notNull(),
}, (table) => [uniqueIndex("idx_businesses_owner").on(table.ownerUserId)]);

export const profiles = mysqlTable("profiles", {
  userId: varchar("user_id", { length: 36 }).primaryKey(),
  businessName: varchar("business_name", { length: 255 }).notNull().default("My business"),
  email: varchar("email", { length: 255 }).notNull(),
  vatRegistered: boolean("vat_registered").notNull().default(false),
  createdAt: varchar("created_at", { length: 24 }).notNull(),
});

export const entries = mysqlTable("entries", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  businessId: varchar("business_id", { length: 36 }),
  kind: mysqlEnum("kind", ["sale", "expense"]).notNull(),
  party: varchar("party", { length: 255 }).notNull(),
  category: varchar("category", { length: 255 }).notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2, mode: "number" }).notNull(),
  vatAmount: decimal("vat_amount", { precision: 15, scale: 2, mode: "number" }).notNull().default(0),
  entryDate: varchar("entry_date", { length: 10 }).notNull(),
  status: varchar("status", { length: 255 }).notNull().default("paid"),
  createdAt: varchar("created_at", { length: 24 }).notNull(),
}, (table) => [
  index("idx_entries_user_date").on(table.userId, table.entryDate),
  index("idx_entries_user_kind").on(table.userId, table.kind),
  index("idx_entries_business_date").on(table.businessId, table.entryDate),
  index("idx_entries_business_kind").on(table.businessId, table.kind),
]);

export const contacts = mysqlTable("contacts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  businessId: varchar("business_id", { length: 36 }).references(() => businesses.id),
  company: varchar("company", { length: 255 }).notNull().default(""),
  telephone: varchar("telephone", { length: 80 }).notNull().default(""),
  address: text("address"),
  notes: text("notes"),
  archived: boolean("archived").notNull().default(false),
  updatedAt: varchar("updated_at", { length: 24 }),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().default(""),
  type: varchar("type", { length: 255 }).notNull().default("customer"),
  createdAt: varchar("created_at", { length: 24 }).notNull(),
}, (table) => [index("idx_contacts_user_name").on(table.userId, table.name)]);

export const invoices = mysqlTable("invoices", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  businessId: varchar("business_id", { length: 36 }).references(() => businesses.id),
  contactId: varchar("contact_id", { length: 36 }).references(() => contacts.id),
  customerSnapshot: text("customer_snapshot"),
  issueDate: varchar("issue_date", { length: 10 }),
  reference: varchar("reference", { length: 255 }).notNull().default(""),
  notes: text("notes"),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull().default("0"),
  taxTotal: decimal("tax_total", { precision: 15, scale: 2 }).notNull().default("0"),
  updatedAt: varchar("updated_at", { length: 24 }),
  invoiceNumber: varchar("invoice_number", { length: 255 }).notNull(),
  customer: varchar("customer", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2, mode: "number" }).notNull(),
  dueDate: varchar("due_date", { length: 10 }).notNull(),
  status: varchar("status", { length: 255 }).notNull().default("draft"),
  createdAt: varchar("created_at", { length: 24 }).notNull(),
}, (table) => [index("idx_invoices_user_status").on(table.userId, table.status), uniqueIndex("invoice_business_number").on(table.businessId,table.invoiceNumber)]);

export const invoiceItems = mysqlTable("invoice_items", {
  id: varchar("id", {length:36}).primaryKey(),
  invoiceId: varchar("invoice_id", {length:36}).notNull().references(() => invoices.id),
  position: int("position").notNull(),
  description: text("description").notNull(),
  quantity: decimal("quantity", {precision:12,scale:3}).notNull(),
  unitPrice: decimal("unit_price", {precision:15,scale:2}).notNull(),
  taxRate: decimal("tax_rate", {precision:5,scale:2}).notNull(),
  net: decimal("net", {precision:15,scale:2}).notNull(),
  tax: decimal("tax", {precision:15,scale:2}).notNull(),
});
export const invoicePayments = mysqlTable("invoice_payments", {
  id: varchar("id", {length:36}).primaryKey(),
  invoiceId: varchar("invoice_id", {length:36}).notNull().references(() => invoices.id),
  entryId: varchar("entry_id", {length:36}).notNull().references(() => entries.id),
  paymentDate: varchar("payment_date", {length:10}).notNull(),
  amount: decimal("amount", {precision:15,scale:2}).notNull(),
  createdAt: varchar("created_at", {length:24}).notNull(),
}, t => [uniqueIndex("invoice_payment_once").on(t.invoiceId), uniqueIndex("invoice_sale_once").on(t.entryId)]);
export const bankAccounts = mysqlTable("bank_accounts", {
  id: varchar("id", {length:36}).primaryKey(),
  userId: varchar("user_id", {length:36}).notNull(),
  businessId: varchar("business_id", {length:36}).notNull().references(() => businesses.id),
  name: varchar("name", {length:255}).notNull(),
  bankName: varchar("bank_name", {length:255}).notNull(),
  reference: varchar("reference", {length:80}).notNull(),
  accountType: varchar("account_type", {length:40}).notNull(),
  currency: varchar("currency", {length:3}).notNull().default("GBP"),
  openingBalance: decimal("opening_balance", {precision:15,scale:2}).notNull(),
  openingDate: varchar("opening_date", {length:10}).notNull(),
  archived: boolean("archived").notNull().default(false),
  createdAt: varchar("created_at", {length:24}).notNull(),
  updatedAt: varchar("updated_at", {length:24}).notNull(),
},t=>[index("bank_account_owner").on(t.businessId,t.userId)]);
export const bankTransactions = mysqlTable("bank_transactions", {
  id: varchar("id", {length:36}).primaryKey(),
  accountId: varchar("account_id", {length:36}).notNull().references(() => bankAccounts.id),
  transactionDate: varchar("transaction_date", {length:10}).notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", {precision:15,scale:2}).notNull(),
  fingerprint: varchar("fingerprint", {length:64}).notNull(),
  status: varchar("status", {length:40}).notNull().default("UNREVIEWED"),
  classification: varchar("classification", {length:40}),
  category: varchar("category", {length:255}),
  entryId: varchar("entry_id", {length:36}).references(() => entries.id),
  createdAt: varchar("created_at", {length:24}).notNull(),
  updatedAt: varchar("updated_at", {length:24}).notNull(),
},t=>[index("bank_fingerprint").on(t.accountId,t.fingerprint),uniqueIndex("bank_match_once").on(t.entryId)]);
export const accountingAudit = mysqlTable("accounting_audit", {
  id: varchar("id", {length:36}).primaryKey(),
  businessId: varchar("business_id", {length:36}).notNull().references(() => businesses.id),
  userId: varchar("user_id", {length:36}).notNull(),
  recordId: varchar("record_id", {length:36}).notNull(),
  action: varchar("action", {length:80}).notNull(),
  detail: mediumtext("detail").notNull(),
  createdAt: varchar("created_at", {length:24}).notNull(),
});
