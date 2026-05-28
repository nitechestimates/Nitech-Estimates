import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "lib", "leads.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch (error) {
    console.error("Error reading leads.json:", error);
    return NextResponse.json({ error: "Failed to load lead data" }, { status: 500 });
  }
}