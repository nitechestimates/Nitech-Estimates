import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "lib", "leads.json");
    const fileContents = fs.readFileSync(filePath, "utf8");
    const leadsData = JSON.parse(fileContents);
    return NextResponse.json(leadsData);
  } catch (error) {
    console.error("Error reading leads.json:", error);
    // Return an empty object so the frontend doesn't break
    return NextResponse.json({}, { status: 200 });
  }
}