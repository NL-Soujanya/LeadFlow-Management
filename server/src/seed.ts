import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import { query, pool } from "./db.js";

dotenv.config();

async function seed() {
  console.log("Seeding demo users...\n");

  // Admin user
  const adminId = uuidv4();
  const adminHash = await bcrypt.hash("admin12345", 10);
  await query(
    "INSERT INTO users (id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, 'admin') ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role)",
    [adminId, "admin@leadflow.demo", adminHash, "Alex Admin"]
  );

  // Member user
  const memberId = uuidv4();
  const memberHash = await bcrypt.hash("member12345", 10);
  await query(
    "INSERT INTO users (id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, 'member') ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)",
    [memberId, "member@leadflow.demo", memberHash, "Sam Member"]
  );

  // Seed demo leads
  const leads = [
    { name: "Jordan Lee", email: "jordan@acme.io", phone: "+1 555 0100", company: "Acme", message: "Interested in your enterprise plan", source: "website", status: "new" },
    { name: "Priya Patel", email: "priya@brightlabs.com", phone: "+1 555 0101", company: "Bright Labs", message: "Need a demo for our team of 20", source: "website", status: "contacted" },
    { name: "Marcus Chen", email: "marcus@nimbus.app", phone: "+1 555 0102", company: "Nimbus", message: "Pricing question", source: "referral", status: "qualified" },
    { name: "Elena Rossi", email: "elena@vortex.co", phone: "+1 555 0103", company: "Vortex", message: "Ready for a proposal", source: "website", status: "proposal" },
    { name: "Tom Becker", email: "tom@summit.dev", phone: null, company: "Summit", message: "Just browsing", source: "website", status: "lost" },
  ];

  for (const lead of leads) {
    const leadId = uuidv4();
    await query(
      "INSERT INTO leads (id, name, email, phone, company, message, source, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [leadId, lead.name, lead.email, lead.phone, lead.company, lead.message, lead.source, lead.status]
    );
    await query(
      "INSERT INTO lead_activities (id, lead_id, type, description, metadata) VALUES (?, ?, 'created', ?, ?)",
      [uuidv4(), leadId, `Lead submitted via ${lead.source} capture form`, JSON.stringify({ source: lead.source })]
    );
  }

  console.log("Seed complete!");
  console.log("  Admin:  admin@leadflow.demo  / admin12345");
  console.log("  Member: member@leadflow.demo / member12345");
  console.log(`  ${leads.length} demo leads created`);

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
