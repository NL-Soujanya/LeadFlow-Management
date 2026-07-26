import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { query } from "../db.js";

const router = Router();

router.post("/signup", async (req, res) => {
  const { email, password, full_name } = req.body;

  if (!email || !password) {
    return res.status(422).json({ error: "Email and password are required" });
  }
  if (password.length < 6) {
    return res.status(422).json({ error: "Password must be at least 6 characters" });
  }

  const existing = await query("SELECT id FROM users WHERE email = ?", [email]);
  if (existing.length > 0) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const id = uuidv4();
  const hash = await bcrypt.hash(password, 10);

  await query(
    "INSERT INTO users (id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, 'member')",
    [id, email, hash, full_name || null]
  );

  const signOpts: SignOptions = { expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as any };
  const token = jwt.sign({ id }, process.env.JWT_SECRET!, signOpts);

  res.status(201).json({
    token,
    user: { id, email, full_name: full_name || null, role: "member" },
  });
});

router.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(422).json({ error: "Email and password are required" });
  }

  const rows = await query<
    { id: string; email: string; password_hash: string; full_name: string | null; role: string }[]
  >("SELECT id, email, password_hash, full_name, role FROM users WHERE email = ?", [email]);

  if (rows.length === 0) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const user = rows[0];
  console.log("Stored hash:", user.password_hash);

const valid = await bcrypt.compare(password, user.password_hash);

console.log("Password entered:", password);
console.log("Password valid:", valid);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const signOpts: SignOptions = { expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as any };
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, signOpts);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    },
  });
});

router.get("/me", async (req, res) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(header.replace("Bearer ", ""), process.env.JWT_SECRET!) as {
      id: string;
    };
    const rows = await query("SELECT id, email, full_name, role FROM users WHERE id = ?", [
      decoded.id,
    ]);
    if (rows.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }
    res.json({ user: rows[0] });
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

export default router;
