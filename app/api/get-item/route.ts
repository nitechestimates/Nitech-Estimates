import { NextResponse } from "next/server";
import data from '@/app/lib/data.json';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  const cleanCode = String(code).trim().toLowerCase();

  const item = data.find(
    (row: any) =>
      String(row["SSR    Item No."])
        .trim()
        .toLowerCase() === cleanCode
  );

  if (!item) {
    console.log("❌ NOT FOUND:", cleanCode);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(item);
}