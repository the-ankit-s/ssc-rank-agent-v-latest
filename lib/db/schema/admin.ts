import { pgTable, serial, text, integer, boolean, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { auditEntityEnum, auditActionEnum, notificationTypeEnum, notificationChannelEnum } from "./enums";

export const adminUsers = pgTable(
  "admin_users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    role: text("role").notNull().default("admin"), // admin, super_admin, viewer
    isActive: boolean("is_active").default(true),
    lastLoginAt: timestamp("last_login_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex("admin_email_idx").on(table.email),
  })
);

export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: serial("id").primaryKey(),
    adminUserId: integer("admin_user_id")
      .references(() => adminUsers.id, { onDelete: "cascade" })
      .notNull(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("session_token_idx").on(table.token),
    userIdIdx: index("session_user_idx").on(table.adminUserId),
  })
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    adminUserId: integer("admin_user_id").references(() => adminUsers.id),

    entity: auditEntityEnum("entity").notNull(),
    entityId: integer("entity_id"),
    action: auditActionEnum("action").notNull(),

    oldValues: jsonb("old_values").$type<Record<string, unknown>>(),
    newValues: jsonb("new_values").$type<Record<string, unknown>>(),

    ip: text("ip"),
    userAgent: text("user_agent"),

    timestamp: timestamp("timestamp").defaultNow(),
  },
  (table) => ({
    entityIdx: index("audit_entity_idx").on(table.entity, table.entityId),
    timestampIdx: index("audit_timestamp_idx").on(table.timestamp),
    userIdx: index("audit_user_idx").on(table.adminUserId),
  })
);

export const systemSettings = pgTable(
  "system_settings",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull().unique(),
    value: jsonb("value").$type<unknown>().notNull(),
    category: text("category").notNull(), // general, parsing, calculation, performance, security
    description: text("description"),
    updatedBy: integer("updated_by").references(() => adminUsers.id),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    keyIdx: uniqueIndex("setting_key_idx").on(table.key),
    categoryIdx: index("setting_category_idx").on(table.category),
  })
);

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    type: notificationTypeEnum("type").notNull(),
    channel: notificationChannelEnum("channel").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    isRead: boolean("is_read").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    typeIdx: index("notification_type_idx").on(table.type),
    createdAtIdx: index("notification_created_idx").on(table.createdAt),
  })
);

// Relations
export const adminUsersRelations = relations(adminUsers, ({ many }) => ({
  sessions: many(adminSessions),
  auditLogs: many(auditLogs),
}));

export const adminSessionsRelations = relations(adminSessions, ({ one }) => ({
  adminUser: one(adminUsers, {
    fields: [adminSessions.adminUserId],
    references: [adminUsers.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  adminUser: one(adminUsers, {
    fields: [auditLogs.adminUserId],
    references: [adminUsers.id],
  }),
}));
