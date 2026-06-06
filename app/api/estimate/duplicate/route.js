import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { handleError } from "@/lib/errorHandler";
import { z } from "zod";

const duplicateSchema = z.object({
  id: z.string().refine((val) => ObjectId.isValid(val), {
    message: "Invalid Estimate ID format",
  }),
});

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = duplicateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      );
    }

    const { id } = validation.data;
    const client = await clientPromise;
    const db = client.db("nitech_estimates");
    const estimatesCollection = db.collection("estimates");

    const originalEstimate = await estimatesCollection.findOne({
      _id: new ObjectId(id),
      userId: session.user.email,
    });

    if (!originalEstimate) {
      return NextResponse.json({ error: "Estimate not found or access denied" }, { status: 404 });
    }

    const duplicateEstimate = { ...originalEstimate };
    delete duplicateEstimate._id;
    
    if (duplicateEstimate.estimateName) {
      duplicateEstimate.estimateName += " (Copy)";
    }
    if (duplicateEstimate.nameOfWork) {
      duplicateEstimate.nameOfWork += " (Copy)";
    }
    
    duplicateEstimate.createdAt = new Date();
    duplicateEstimate.updatedAt = new Date();

    const result = await estimatesCollection.insertOne(duplicateEstimate);

    return NextResponse.json({
      success: true,
      id: result.insertedId,
      message: "Estimate duplicated successfully"
    });
  } catch (error) {
    return handleError(error, "Failed to duplicate estimate");
  }
}
