import { z } from 'zod';
import {
  insertPostSchema, insertCommentSchema, insertPublicationSchema,
  insertAppointmentSchema, insertSubscriberSchema, insertContactMessageSchema,
  posts, comments, publications, appointments, subscribers, contactMessages,
} from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  posts: {
    list: {
      method: 'GET' as const,
      path: '/api/posts' as const,
      responses: { 200: z.array(z.custom<typeof posts.$inferSelect>()) },
    },
    get: {
      method: 'GET' as const,
      path: '/api/posts/:slug' as const,
      responses: { 200: z.custom<typeof posts.$inferSelect>(), 404: errorSchemas.notFound },
    },
    create: {
      method: 'POST' as const,
      path: '/api/admin/posts' as const,
      input: insertPostSchema,
      responses: { 201: z.custom<typeof posts.$inferSelect>(), 400: errorSchemas.validation },
    },
  },
  comments: {
    list: {
      method: 'GET' as const,
      path: '/api/posts/:postId/comments' as const,
      responses: { 200: z.array(z.custom<typeof comments.$inferSelect>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/posts/:postId/comments' as const,
      input: insertCommentSchema,
      responses: { 201: z.custom<typeof comments.$inferSelect>(), 400: errorSchemas.validation },
    },
  },
  publications: {
    list: {
      method: 'GET' as const,
      path: '/api/publications' as const,
      responses: { 200: z.array(z.custom<typeof publications.$inferSelect>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/admin/publications' as const,
      input: insertPublicationSchema,
      responses: { 201: z.custom<typeof publications.$inferSelect>(), 400: errorSchemas.validation },
    },
  },
  appointments: {
    create: {
      method: 'POST' as const,
      path: '/api/appointments' as const,
      input: insertAppointmentSchema,
      responses: { 201: z.custom<typeof appointments.$inferSelect>(), 400: errorSchemas.validation },
    },
  },
  subscribe: {
    create: {
      method: 'POST' as const,
      path: '/api/subscribe' as const,
      input: insertSubscriberSchema,
      responses: { 201: z.custom<typeof subscribers.$inferSelect>(), 400: errorSchemas.validation },
    },
  },
  contact: {
    create: {
      method: 'POST' as const,
      path: '/api/contact' as const,
      input: insertContactMessageSchema,
      responses: { 201: z.custom<typeof contactMessages.$inferSelect>(), 400: errorSchemas.validation },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
