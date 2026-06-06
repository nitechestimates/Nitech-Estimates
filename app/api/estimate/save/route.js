import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb"; // ← Add this import
import { rateLimit } from "@/lib/rateLimit";

// Validation schema
const estimateSchema = z.object({
  nameOfWork: z.string().min(1, "Name is required"),
  rows: z.array(z.any()).max(1000).optional().default([]),  // Allow empty rows and limit size
  measurementItems: z.array(z.any()).max(1000).optional().default([]),
  isTribal: z.boolean().optional(),
  estimateName: z.string().optional(),
  tribalPercent: z.string().optional(),
  yojana: z.string().optional(),
  estAmount: z.string().optional(),
  labourInsurance: z.string().optional(),
  year: z.string().optional(),
  dist: z.string().optional(),
  taluka: z.string().optional(),
  village: z.string().optional(),
  headDivision: z.string().optional(),
  subDivision: z.string().optional(),
  deputyEngineer: z.string().optional(),
  jrEngineer: z.string().optional(),
  adminApprovalNo: z.string().optional(),
  abstractCustomData: z.any().optional().default({}),
});

export async function POST(request) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit check
    const rate = rateLimit(`estimate-save:${session.user.email}`, 10, 60000);
    if (!rate.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": Math.ceil(rate.reset / 1000).toString() } }
      );
    }

    const body = await request.json();
    const data = estimateSchema.parse(body);

    const client = await clientPromise;
    const db = client.db("nitech_estimates");

    // ✅ Check if we're updating an existing estimate
    const estimateId = body.estimateId;

    if (estimateId) {
      // Attempt to update existing document
      let objectId;
      try {
        objectId = new ObjectId(estimateId);
      } catch {
        return NextResponse.json({ error: "Invalid estimate ID" }, { status: 400 });
      }

      // Verify ownership before update
      const existing = await db.collection("estimates").findOne({
        _id: objectId,
        userId: session.user.email,
      });

      if (!existing) {
        return NextResponse.json(
          { error: "Estimate not found or access denied" },
          { status: 404 }
        );
      }

      // Perform update — include userId in filter to prevent TOCTOU race condition
      const updateResult = await db.collection("estimates").updateOne(
        { _id: objectId, userId: session.user.email },
        {
          $set: {
            estimateName: body.estimateName || "",
            nameOfWork: data.nameOfWork.trim(),
            rows: data.rows,
            measurementItems: data.measurementItems,
            isTribal: body.isTribal || false,
            tribalPercent: body.tribalPercent || "",
            yojana: body.yojana || "",
            estAmount: body.estAmount || "",
            labourInsurance: body.labourInsurance || "",
            year: body.year || "",
            dist: body.dist || "",
            taluka: body.taluka || "",
            village: body.village || "",
            headDivision: body.headDivision || "",
            subDivision: body.subDivision || "",
            deputyEngineer: body.deputyEngineer || "",
            jrEngineer: body.jrEngineer || "",
            adminApprovalNo: body.adminApprovalNo || "",
            abstractCustomData: data.abstractCustomData,
            updatedAt: new Date(),
          },
        }
      );

      return NextResponse.json({ success: true, updated: updateResult.modifiedCount > 0 });
    }

    // No estimateId → Insert new document
    const estimate = {
      userId: session.user.email,
      estimateName: body.estimateName || "",
      nameOfWork: data.nameOfWork.trim(),
      rows: data.rows,
      measurementItems: data.measurementItems,
      isTribal: body.isTribal || false,
      tribalPercent: body.tribalPercent || "",
      yojana: body.yojana || "",
      estAmount: body.estAmount || "",
      labourInsurance: body.labourInsurance || "",
      year: body.year || "",
      dist: body.dist || "",
      taluka: body.taluka || "",
      village: body.village || "",
      headDivision: body.headDivision || "",
      subDivision: body.subDivision || "",
      deputyEngineer: body.deputyEngineer || "",
      jrEngineer: body.jrEngineer || "",
      adminApprovalNo: body.adminApprovalNo || "",
      abstractCustomData: data.abstractCustomData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("estimates").insertOne(estimate);

    return NextResponse.json({
      success: true,
      id: result.insertedId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }
    console.error("SAVE ERROR:", error);
    const errorMsg = error.name === "MongoServerSelectionError" || error.name === "MongoNetworkError" || error.message?.includes("ENOTFOUND")
      ? "Database connection failed. Please check your internet connection."
      : "Internal Server Error";
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}