import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { query } from "./db.js";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "member";
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authRequired(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = header.replace("Bearer ", "");
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    (async () => {
      const rows = await query<AuthUser[]>(
        "SELECT id, email, full_name, role FROM users WHERE id = ?",
        [decoded.id]
      );
      if (rows.length === 0) {
        return res.status(401).json({ error: "User not found" });
      }
      req.user = rows[0];
      next();
    })().catch(() => res.status(401).json({ error: "Invalid token" }));
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function adminOnly(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}
