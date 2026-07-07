import { pgTable, text, integer, bigint, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  tier: text("tier").default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: bigint("created_at", { mode: "number" }),
});

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: text("owner_id").references(() => users.id),
  isPublic: boolean("is_public").default(false),
  domain: text("domain"),
  createdAt: bigint("created_at", { mode: "number" }),
});

export const files = pgTable("files", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id),
  path: text("path").notNull(),
  content: text("content"),
  language: text("language"),
  version: integer("version").default(1),
  updatedAt: bigint("updated_at", { mode: "number" }),
});
