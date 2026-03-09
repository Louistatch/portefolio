import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

async function seedDatabase() {
  const existingPosts = await storage.getPosts();
  if (existingPosts.length === 0) {
    await storage.createPost({
      title: "AI in Modern Agriculture",
      slug: "ai-in-modern-agriculture",
      summary: "Exploring how artificial intelligence is transforming crop yield predictions.",
      content: "# AI in Agriculture\nArtificial intelligence allows for unprecedented precision in agriculture. From drone imagery to soil sensors...",
      tags: ["AI", "Agriculture", "Climate"],
    });
    
    await storage.createPost({
      title: "Climate Resilient Farming",
      slug: "climate-resilient-farming",
      summary: "Adapting farming techniques to extreme weather patterns.",
      content: "# Climate Resilient Farming\nAs climate change brings unpredictable weather patterns, agriculture must adapt. Strategies include drought-resistant crops and advanced irrigation...",
      tags: ["Climate", "Agriculture"],
    });
  }

  const existingPubs = await storage.getPublications();
  if (existingPubs.length === 0) {
    await storage.createPublication({
      title: "Predictive Models for Crop Yield via Neural Networks",
      abstract: "This paper introduces a novel neural network architecture for predicting crop yields based on multi-modal climate and soil data.",
      pdfUrl: "https://example.com/paper1.pdf",
      citation: "Tatchida, L., et al. (2024). Predictive Models for Crop Yield. Journal of Agricultural AI, 12(3), 45-60.",
      category: "Research",
      year: 2024
    });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed initial data
  seedDatabase().catch(console.error);

  // Posts
  app.get(api.posts.list.path, async (req, res) => {
    const postsList = await storage.getPosts();
    res.json(postsList);
  });

  app.get(api.posts.get.path, async (req, res) => {
    const post = await storage.getPostBySlug(req.params.slug);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.json(post);
  });

  app.post(api.posts.create.path, async (req, res) => {
    try {
      const input = api.posts.create.input.parse(req.body);
      const post = await storage.createPost(input);
      res.status(201).json(post);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  // Comments
  app.get(api.comments.list.path, async (req, res) => {
    const comments = await storage.getCommentsByPostId(Number(req.params.postId));
    res.json(comments);
  });

  app.post(api.comments.create.path, async (req, res) => {
    try {
      const input = api.comments.create.input.parse(req.body);
      // Ensure the postId from URL matches the body or inject it
      const commentInput = { ...input, postId: Number(req.params.postId) };
      const comment = await storage.createComment(commentInput);
      res.status(201).json(comment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  // Publications
  app.get(api.publications.list.path, async (req, res) => {
    const pubs = await storage.getPublications();
    res.json(pubs);
  });

  app.post(api.publications.create.path, async (req, res) => {
    try {
      const input = api.publications.create.input.parse(req.body);
      const pub = await storage.createPublication(input);
      res.status(201).json(pub);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  // Appointments
  app.post(api.appointments.create.path, async (req, res) => {
    try {
      // Extend schema with coercion for date since it comes as string/JSON
      const schemaWithCoercion = api.appointments.create.input.extend({
        date: z.coerce.date()
      });
      const input = schemaWithCoercion.parse(req.body);
      const appt = await storage.createAppointment(input);
      res.status(201).json(appt);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  return httpServer;
}