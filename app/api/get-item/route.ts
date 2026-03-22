import { NextResponse } from "next/server";
import data from "@/lib/data.json";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  const item = data.find(
    (row: any) => String(row["SSR    Item No."]) === String(code)
  );

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(item);
}
