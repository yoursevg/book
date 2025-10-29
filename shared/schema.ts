import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const documents = pgTable("documents", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    content: text("content").notNull(),
    type: text("type").notNull(),
    uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const comments = pgTable("comments", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    documentId: varchar("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
    lineNumber: integer("line_number").notNull(),
    author: text("author").notNull(),
    content: text("content").notNull(),
    parentCommentId: varchar("parent_comment_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const highlights = pgTable("highlights", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    documentId: varchar("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
    lineNumber: integer("line_number").notNull(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
    id: true,
    uploadedAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
    id: true,
    createdAt: true,
});

export const insertHighlightSchema = createInsertSchema(highlights).omit({
    id: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

export type InsertHighlight = z.infer<typeof insertHighlightSchema>;
export type Highlight = typeof highlights.$inferSelect;
