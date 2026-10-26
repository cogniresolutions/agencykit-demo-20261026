import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/* ------------------------------------------------------------------ */
/* Agency level (global, not tenant scoped)                            */
/* ------------------------------------------------------------------ */

export const agencies = pgTable("agencies", {
  id: id(),
  name: text("name").notNull(),
  createdAt: createdAt(),
});

export const users = pgTable(
  "users",
  {
    id: id(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ["owner", "admin", "member"] }).notNull().default("member"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email), index("users_agency_idx").on(t.agencyId)],
);

/* ------------------------------------------------------------------ */
/* Tenant tables: every row carries sub_account_id and is protected by */
/* row-level security (see drizzle/0001_row_level_security.sql).       */
/* ------------------------------------------------------------------ */

export const subAccounts = pgTable(
  "sub_accounts",
  {
    id: id(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    industry: text("industry").notNull(),
    brandColor: text("brand_color").notNull().default("#ff6b2c"),
    widgetKeyHash: text("widget_key_hash"),
    widgetKeyPrefix: text("widget_key_prefix"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("sub_accounts_agency_slug_idx").on(t.agencyId, t.slug)],
);

export const memberships = pgTable(
  "memberships",
  {
    id: id(),
    subAccountId: uuid("sub_account_id")
      .notNull()
      .references(() => subAccounts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["admin", "member"] }).notNull().default("member"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("memberships_sub_user_idx").on(t.subAccountId, t.userId)],
);

export const contacts = pgTable(
  "contacts",
  {
    id: id(),
    subAccountId: uuid("sub_account_id")
      .notNull()
      .references(() => subAccounts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    source: text("source").notNull().default("manual"),
    tags: text("tags").array().notNull().default([]),
    stage: text("stage", { enum: ["new", "contacted", "qualified", "customer", "lost"] })
      .notNull()
      .default("new"),
    createdAt: createdAt(),
  },
  (t) => [
    index("contacts_sub_created_idx").on(t.subAccountId, t.createdAt),
    index("contacts_sub_email_idx").on(t.subAccountId, t.email),
  ],
);

export const pipelineStages = pgTable(
  "pipeline_stages",
  {
    id: id(),
    subAccountId: uuid("sub_account_id")
      .notNull()
      .references(() => subAccounts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull(),
    isWon: boolean("is_won").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("pipeline_stages_sub_idx").on(t.subAccountId, t.position)],
);

export const deals = pgTable(
  "deals",
  {
    id: id(),
    subAccountId: uuid("sub_account_id")
      .notNull()
      .references(() => subAccounts.id, { onDelete: "cascade" }),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => pipelineStages.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    valueCents: integer("value_cents").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("deals_sub_stage_idx").on(t.subAccountId, t.stageId)],
);

export const conversations = pgTable(
  "conversations",
  {
    id: id(),
    subAccountId: uuid("sub_account_id")
      .notNull()
      .references(() => subAccounts.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    channel: text("channel", { enum: ["web_chat", "form", "email", "sms"] }).notNull(),
    subject: text("subject").notNull().default(""),
    status: text("status", { enum: ["open", "closed"] }).notNull().default("open"),
    unread: boolean("unread").notNull().default(true),
    firstResponseSeconds: integer("first_response_seconds"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [index("conversations_sub_last_idx").on(t.subAccountId, t.lastMessageAt)],
);

export const messages = pgTable(
  "messages",
  {
    id: id(),
    subAccountId: uuid("sub_account_id")
      .notNull()
      .references(() => subAccounts.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    direction: text("direction", { enum: ["inbound", "outbound"] }).notNull(),
    author: text("author", { enum: ["contact", "team", "ai", "system"] }).notNull(),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("messages_conversation_idx").on(t.subAccountId, t.conversationId, t.createdAt)],
);

export const websites = pgTable(
  "websites",
  {
    id: id(),
    subAccountId: uuid("sub_account_id")
      .notNull()
      .references(() => subAccounts.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    template: text("template").notNull(),
    theme: jsonb("theme").notNull(),
    business: jsonb("business").notNull(),
    sections: jsonb("sections").notNull(),
    features: jsonb("features").notNull(),
    generatedBy: text("generated_by", { enum: ["claude", "template"] }).notNull(),
    published: boolean("published").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("websites_slug_idx").on(t.slug), index("websites_sub_idx").on(t.subAccountId)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    subAccountId: uuid("sub_account_id").references(() => subAccounts.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id"),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    ip: text("ip"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("audit_log_sub_created_idx").on(t.subAccountId, t.createdAt)],
);

export const TENANT_TABLES = [
  "sub_accounts",
  "memberships",
  "contacts",
  "pipeline_stages",
  "deals",
  "conversations",
  "messages",
  "websites",
  "audit_log",
] as const;
