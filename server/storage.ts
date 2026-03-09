import { db } from "./db";
import { eq } from "drizzle-orm";
import {
  posts, comments, publications, appointments,
  type Post, type Comment, type Publication, type Appointment,
} from "@shared/schema";
import type { z } from "zod";
import type { api } from "@shared/routes";

type InsertPost = z.infer<typeof api.posts.create.input>;
type InsertComment = z.infer<typeof api.comments.create.input>;
type InsertPublication = z.infer<typeof api.publications.create.input>;
type InsertAppointment = z.infer<typeof api.appointments.create.input>;

export interface IStorage {
  // Posts
  getPosts(): Promise<Post[]>;
  getPostBySlug(slug: string): Promise<Post | undefined>;
  createPost(post: InsertPost): Promise<Post>;

  // Comments
  getCommentsByPostId(postId: number): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;

  // Publications
  getPublications(): Promise<Publication[]>;
  createPublication(pub: InsertPublication): Promise<Publication>;

  // Appointments
  createAppointment(appt: InsertAppointment): Promise<Appointment>;
}

export class DatabaseStorage implements IStorage {
  // Posts
  async getPosts(): Promise<Post[]> {
    return await db.select().from(posts).orderBy(posts.publishedAt);
  }
  async getPostBySlug(slug: string): Promise<Post | undefined> {
    const result = await db.select().from(posts).where(eq(posts.slug, slug));
    return result[0];
  }
  async createPost(post: InsertPost): Promise<Post> {
    const [result] = await db.insert(posts).values(post).returning();
    return result;
  }

  // Comments
  async getCommentsByPostId(postId: number): Promise<Comment[]> {
    return await db.select().from(comments).where(eq(comments.postId, postId)).orderBy(comments.createdAt);
  }
  async createComment(comment: InsertComment): Promise<Comment> {
    const [result] = await db.insert(comments).values(comment).returning();
    return result;
  }

  // Publications
  async getPublications(): Promise<Publication[]> {
    return await db.select().from(publications).orderBy(publications.year);
  }
  async createPublication(pub: InsertPublication): Promise<Publication> {
    const [result] = await db.insert(publications).values(pub).returning();
    return result;
  }

  // Appointments
  async createAppointment(appt: InsertAppointment): Promise<Appointment> {
    const [result] = await db.insert(appointments).values(appt).returning();
    return result;
  }
}

export const storage = new DatabaseStorage();