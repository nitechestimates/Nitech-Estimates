import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Cache the parsed JSON to avoid re-reading the file on every request
let cachedLeads = null;

export async function GET() {
  try {
    if (!cachedLeads) {
      const filePath = path.join(process.cwd(), "lib", "leads.json");
      const raw = await fs.readFile(filePath, "utf-8");
      cachedLeads = JSON.parse(raw);
    }
    return NextResponse.json(cachedLeads);
  } catch (error) {
    console.error("Error reading leads.json:", error);
    return NextResponse.json({ error: "Failed to load lead data" }, { status: 500 });
  }
}