import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import { handleError } from '@/lib/errorHandler';
import { z } from 'zod';

const postSchema = z.object({
  description: z.string().trim().min(1),
  quantity: z.number(),
  unit: z.string().trim().min(1),
  estimateId: z.string().optional(),
  itemId: z.string().optional()
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("nitech_estimates");

    const records = await db.collection("mb_records")
      .find({ userId: session.user.email })
      .sort({ recordNumber: 1 })
      .toArray();

    return NextResponse.json(records);
  } catch (error) {
    return handleError(error, 'Failed to fetch MB records');
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = postSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      );
    }

    const { description, quantity, unit, estimateId, itemId } = validation.data;
    const client = await clientPromise;
    const db = client.db("nitech_estimates");

    // Atomically increment counter
    const counter = await db.collection('counters').findOneAndUpdate(
      { _id: "mbRecord" },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    
    const seqNum = counter.seq || counter.value?.seq || 1;

    const newRecord = {
      userId: session.user.email,
      recordNumber: seqNum,
      date: new Date(),
      description,
      quantity,
      unit,
      estimateId,
      itemId,
      createdAt: new Date()
    };

    await db.collection("mb_records").insertOne(newRecord);

    return NextResponse.json({ success: true, record: newRecord });
  } catch (error) {
    return handleError(error, 'Failed to create MB record');
  }
}
