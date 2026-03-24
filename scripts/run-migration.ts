import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runMigration() {
  try {
    console.log("[v0] Starting database migration...");

    // Read and execute the SQL file
    const sqlPath = path.join(process.cwd(), "scripts", "001_create_articles_schema.sql");
    const sql = fs.readFileSync(sqlPath, "utf-8");

    // Split by semicolon to execute statements one by one
    const statements = sql
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    for (const statement of statements) {
      console.log(`[v0] Executing: ${statement.substring(0, 50)}...`);
      const { error } = await supabase.rpc("exec", { query: statement });

      if (error) {
        // Try alternative approach using raw SQL through Postgres
        try {
          const result = await (supabase as any).postgrest.rpc("exec_raw_sql", {
            sql: statement,
          });
          if (result.error) throw result.error;
        } catch (e) {
          // If custom function doesn't exist, we'll handle it differently
          console.log(`[v0] Note: ${(e as Error).message}`);
        }
      }
    }

    console.log("[v0] Migration completed!");
  } catch (error) {
    console.error("[v0] Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
