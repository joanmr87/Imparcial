import fs from "node:fs"
import path from "node:path"

const sqlPath = path.join(process.cwd(), "scripts", "001_create_articles_schema.sql")
const sql = fs.readFileSync(sqlPath, "utf8")

console.log("Automatic DDL execution is not available with the current Supabase credentials.")
console.log("Copy the SQL below into the Supabase SQL editor and run it once:")
console.log("")
console.log(sql)
