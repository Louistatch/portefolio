import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── Posts ──
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

// ── Comments ──
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id).notNull(),
  authorName: text("author_name").notNull(),
  content: text("content").notNull(),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Publications ──
export const publications = pgTable("publications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  abstract: text("abstract").notNull(),
  pdfUrl: text("pdf_url").notNull(),
  citation: text("citation").notNull(),
  category: text("category").notNull(),
  year: integer("year").notNull(),
  imageUrl: text("image_url"),
  viewsCount: integer("views_count").default(0),
  likesCount: integer("likes_count").default(0),
});

// ── Appointments ──
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  date: timestamp("date").notNull(),
  topic: text("topic").notNull(),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Subscribers ──
export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  source: text("source").default("website"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Contact Messages ──
export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  isArchived: boolean("is_archived").default(false),
  repliedAt: timestamp("replied_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Admin Users ──
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Profile ──
export const profile = pgTable("profile", {
  id: serial("id").primaryKey(),
  fullName: text("full_name"),
  title: text("title"),
  bio: text("bio"),
  photoUrl: text("photo_url"),
  cvPdfUrl: text("cv_pdf_url"),
  email: text("email"),
  phone: text("phone"),
  location: text("location"),
  linkedin: text("linkedin"),
  researchgate: text("researchgate"),
  orcid: text("orcid"),
  education: jsonb("education"),
  experience: jsonb("experience"),
  skills: jsonb("skills"),
  awards: jsonb("awards"),
  languages: jsonb("languages"),
  certifications: jsonb("certifications"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ── Testimonials ──
export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title"),
  organization: text("organization"),
  content: text("content").notNull(),
  photoUrl: text("photo_url"),
  rating: integer("rating").default(5),
  isVisible: boolean("is_visible").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Newsletter Campaigns ──
export const newsletterCampaigns = pgTable("newsletter_campaigns", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  status: text("status").default("draft"),
  recipientsCount: integer("recipients_count").default(0),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Insert Schemas ──
export const insertPostSchema = createInsertSchema(posts).omit({ id: true, publishedAt: true, viewsCount: true, likesCount: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true, status: true });
export const insertPublicationSchema = createInsertSchema(publications).omit({ id: true, viewsCount: true, likesCount: true });
export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true, createdAt: true, status: true });
export const insertSubscriberSchema = createInsertSchema(subscribers).omit({ id: true, createdAt: true, status: true });
export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({ id: true, createdAt: true, isRead: true, isArchived: true, repliedAt: true });
export const insertTestimonialSchema = createInsertSchema(testimonials).omit({ id: true, createdAt: true });
export const insertCampaignSchema = createInsertSchema(newsletterCampaigns).omit({ id: true, createdAt: true, status: true, recipientsCount: true, sentAt: true });

// ── Types ──
export type Post = typeof posts.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Publication = typeof publications.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type Subscriber = typeof subscribers.$inferSelect;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type Profile = typeof profile.$inferSelect;
export type Testimonial = typeof testimonials.$inferSelect;
export type NewsletterCampaign = typeof newsletterCampaigns.$inferSelect;
