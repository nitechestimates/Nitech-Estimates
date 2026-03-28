import { NextResponse } from "next/server";
import materialNames from "@/lib/materialNames.json";

export async function GET() {
  return NextResponse.json(materialNames);
}