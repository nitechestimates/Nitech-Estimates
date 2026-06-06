import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import { handleError } from '@/lib/errorHandler';
import { z } from 'zod';

const syncSchema = z.object({
  estimateId: z.string().min(1),
  items: z.array(z.object({
    id: z.string().min(1),
    description: z.string().trim().min(1),
    totalQty: z.number(),
    unit: z.string().trim().min(1),
    isRE: z.boolean()
  }))
});

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = syncSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      );
    }

    const { estimateId, items } = validation.data;
    const client = await clientPromise;
    const db = client.db("nitech_estimates");

    for (const item of items) {
      if (item.isRE) {
        // Upsert
        const existing = await db.collection("mb_records").findOne({
          itemId: item.id,
          estimateId,
          userId: session.user.email
        });

        if (existing) {
          await db.collection("mb_records").updateOne(
            { _id: existing._id },
            { $set: { description: item.description, quantity: item.totalQty, unit: item.unit } }
          );
        } else {
          const counter = await db.collection('counters').findOneAndUpdate(
            { _id: "mbRecord" },
            { $inc: { seq: 1 } },
            { returnDocument: 'after', upsert: true }
          );
          const seqNum = counter.seq || counter.value?.seq || 1;

          await db.collection("mb_records").insertOne({
            userId: session.user.email,
            recordNumber: seqNum,
            date: new Date(),
            description: item.description,
            quantity: item.totalQty,
            unit: item.unit,
            estimateId,
            itemId: item.id,
            createdAt: new Date()
          });
        }
      } else {
        // Ensure deleted
        await db.collection("mb_records").deleteOne({
          itemId: item.id,
          estimateId,
          userId: session.user.email
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to sync MB records');
  }
}
