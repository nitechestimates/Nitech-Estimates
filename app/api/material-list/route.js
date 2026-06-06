import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import materialNames from "@/lib/materialNames.json";

export async function GET() {
  // Auth check
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit check
  const rate = rateLimit(`material-list:${session.user.email}`, 100, 60000);
  if (!rate.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": Math.ceil(rate.reset / 1000).toString() } }
    );
  }

  return NextResponse.json(materialNames);
}