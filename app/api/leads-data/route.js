import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import fs from "fs/promises";
import path from "path";

// Cache the parsed JSON to avoid re-reading the file on every request
let cachedLeads = null;

export async function GET() {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit check
    const rate = rateLimit(`leads-data:${session.user.email}`, 100, 60000);
    if (!rate.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": Math.ceil(rate.reset / 1000).toString() } }
      );
    }
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