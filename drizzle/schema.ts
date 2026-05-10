import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  tier: text("tier").default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: integer("created_at"),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: text("owner_id").references(() => users.id),
  isPublic: integer("is_public").default(0),
  domain: text("domain"),
  createdAt: integer("created_at"),
});

export const files = sqliteTable("files", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id),
  path: text("path").notNull(),
  content: text("content"),
  language: text("language"),
  version: integer("version").default(1),
  updatedAt: integer("updated_at"),
});
