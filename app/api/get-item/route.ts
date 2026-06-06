import { NextResponse } from "next/server";
import data from '@/app/lib/data.json';

type DataRow = Record<string, unknown> & {
  "SSR    Item No."?: unknown;
};

const ssrItemNo = (row: DataRow): string =>
  String(row["SSR    Item No."] ?? "").trim().toLowerCase();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  const cleanCode = String(code).trim().toLowerCase();

  const item = (data as DataRow[]).find((row) => ssrItemNo(row) === cleanCode);

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(item);
}

export async function POST(req: Request) {
  try {
    const { codes } = await req.json();
    if (!Array.isArray(codes)) {
      return NextResponse.json({ error: "codes must be an array" }, { status: 400 });
    }

    const cleanCodes = codes.map(c => String(c).trim().toLowerCase());
    const codeSet = new Set(cleanCodes);

    const matches: Record<string, DataRow> = {};
    for (const row of (data as DataRow[])) {
      const code = ssrItemNo(row);
      if (codeSet.has(code)) {
        // Find matching original casing/spacing from request codes
        const originalCode = codes.find(c => String(c).trim().toLowerCase() === code);
        if (originalCode) {
          matches[originalCode] = row;
        }
      }
    }

    return NextResponse.json({ success: true, data: matches });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}