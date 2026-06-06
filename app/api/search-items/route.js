import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import data from "@/app/lib/data.json";

export async function GET(req) {
  // Auth check
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit check
  const rate = rateLimit(`search-items:${session.user.email}`, 100, 60000);
  if (!rate.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": Math.ceil(rate.reset / 1000).toString() } }
    );
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json(
      { error: "No query provided", data: [] },
      { status: 400 }
    );
  }

  const lowerQuery = query.toLowerCase();
  const terms = lowerQuery.split(" ").filter((t) => t.length > 0);

  // Filter items where ALL search terms appear in the description
  // AND SSR code is not empty
  const results = data
    .filter((row) => {
      const desc = String(row["Description of the item"] || "").toLowerCase();
      const code = String(row["SSR    Item No."] || "").trim();
      return code !== "" && terms.every((term) => desc.includes(term));
    })
    .slice(0, 20);

  // Remove duplicates by SSR code (just in case)
  const seenCodes = new Set();
  const uniqueResults = results.filter((row) => {
    const code = String(row["SSR    Item No."] || "").trim();
    if (seenCodes.has(code)) return false;
    seenCodes.add(code);
    return true;
  });

  const formattedResults = uniqueResults.map((row) => ({
    code: row["SSR    Item No."].trim(),
    description: row["Description of the item"],
  }));

  return NextResponse.json({ data: formattedResults });
}