import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "Your_username",
  password: process.env.DB_PASSWORD || "Your_password",
  database: process.env.DB_NAME || "leadflow",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function query<T = any>(
  sql: string,
  params: any[] = []
): Promise<T> {
  const [rows] = await pool.query(sql, params);
  return rows as T;
}
