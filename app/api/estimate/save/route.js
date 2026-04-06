import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";
import { z } from "zod";
import { authOptions } from "../../auth/[...nextauth]/route";

// ✅ Define schema (validation rules)
const estimateSchema = z.object({
  nameOfWork: z.string().min(1, "Name is required"),
  rows: z.array(z.any()).min(1, "At least one row required"),
  createdAt: z.string().optional(),
});

export async function POST(request) {
  try {
    // ✅ Auth check (fast version)
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ✅ Parse request
    const body = await request.json();

    // ✅ Validate (this is the big upgrade)
    const data = estimateSchema.parse(body);

    // ✅ DB connection
    const client = await clientPromise;
    const db = client.db("nitech_estimates");

    // ✅ Create document
    const estimate = {
      userId: session.user.email,
      nameOfWork: data.nameOfWork.trim(),
      rows: data.rows,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: new Date(),
    };

    // ✅ Insert
    const result = await db.collection("estimates").insertOne(estimate);

    return NextResponse.json({
      success: true,
      id: result.insertedId,
    });

  } catch (error) {
    // ✅ Handle validation errors properly
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }

    // ✅ Prevent crash + hide internal errors
    console.error("SAVE ERROR:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}