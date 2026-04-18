import { NextResponse } from "next/server";
import data from "@/app/lib/data.json";

export async function GET(req) {
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