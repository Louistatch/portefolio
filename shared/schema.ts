import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull(),
  summary: text("summary"),
  tags: text("tags").array(),
  imageUrl: text("image_url"),
  viewsCount: integer("views_count").default(0),
  likesCount: integer("likes_count").default(0),
  publishedAt: timestamp("published_at").defaultNow(),
  modifiedAt: timestamp("modified_at").defaultNow(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id).notNull(),
  authorName: text("author_name").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const publications = pgTable("publications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  abstract: text("abstract").notNull(),
  pdfUrl: text("pdf_url").notNull(),
  citation: text("citation").notNull(),
  category: text("category").notNull(),
  year: integer("year").notNull(),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  date: timestamp("date").notNull(),
  topic: text("topic").notNull(),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPostSchema = createInsertSchema(posts).omit({ id: true, publishedAt: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true });
export const insertPublicationSchema = createInsertSchema(publications).omit({ id: true });
export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true, createdAt: true, status: true });

export type Post = typeof posts.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Publication = typeof publications.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;