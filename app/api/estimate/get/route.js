import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // 🔐 Auth check – user must be logged in
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db("nitech_estimates");

    // ✅ Fetch only estimates belonging to the logged-in user
    //    Sort by creation date (newest first) – safe now that createdAt exists
    const estimates = await db
      .collection("estimates")
      .find({ userId: session.user.email })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(estimates);

  } catch (error) {
    console.error("🔥 FETCH ERROR:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}