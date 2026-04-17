import fs from "node:fs"
import path from "node:path"

const scriptsDir = path.join(process.cwd(), "scripts")
const files = fs.readdirSync(scriptsDir)
  .filter(file => /^\d+_.*\.sql$/.test(file))
  .sort((left, right) => left.localeCompare(right))
const sql = files
  .map(file => {
    const sqlPath = path.join(scriptsDir, file)
    return `-- ${file}\n${fs.readFileSync(sqlPath, "utf8").trim()}`
  })
  .join("\n\n")

console.log("Automatic DDL execution is not available with the current Supabase credentials.")
console.log("Copy the SQL below into the Supabase SQL editor and run it once:")
console.log("")
console.log(sql)
