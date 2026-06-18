import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { supabase } from "./supabase";

const JWT_SECRET: string = process.env.JWT_SECRET ?? (() => { throw new Error("JWT_SECRET must be set in environment variables."); })();

export function generateToken(userId: number, username: string): string {
  return jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: "24h" });
}

export async function verifyCredentials(username: string, password: string) {
  const { data } = await supabase
    .from("admin_users")
    .select("id, username, password_hash")
    .eq("username", username)
    .single();
  if (!data) return null;
  const valid = await bcrypt.compare(password, data.password_hash);
  if (!valid) return null;
  return { id: data.id, username: data.username };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET) as any;
    if (decoded.role === "student") return res.status(403).json({ message: "Admin access required" });
    (req as any).admin = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}
