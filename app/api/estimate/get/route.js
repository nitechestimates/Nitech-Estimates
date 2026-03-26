import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("nitech_estimates");

    const estimates = await db
      .collection("estimates")
      .find({ userId: session.user.email })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ success: true, data: estimates });

  } catch (error) {
    console.error("GET estimates error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}