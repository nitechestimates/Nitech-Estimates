import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";

export async function POST(request) {
  // 1. Check authentication
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 2. Parse request body
  const { nameOfWork, rows, createdAt } = await request.json();
  if (!nameOfWork || !rows) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // 3. Connect to MongoDB
  const client = await clientPromise;
  const db = client.db("nitech_estimates");
  const estimates = db.collection("estimates");

  // 4. Prepare document
  const estimate = {
    userId: session.user.email,
    nameOfWork,
    rows,
    createdAt: createdAt || new Date(),
    updatedAt: new Date(),
  };

  // 5. Insert
  const result = await estimates.insertOne(estimate);

  // 6. Return success
  return NextResponse.json({ success: true, id: result.insertedId });
}