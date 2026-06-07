import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import { handleError } from '@/lib/errorHandler';
import { rateLimit } from '@/lib/rateLimit';
import { z } from 'zod';

const postSchema = z.object({
  id: z.string().min(1),
  category: z.enum(['buildings', 'roads', 'bridges']),
  name: z.string().trim().min(1),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rate = await rateLimit(`lead-profiles-get:${session.user.email}`, 60, 60000);
    if (!rate.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': Math.ceil(rate.reset / 1000).toString() } }
      );
    }

    const client = await clientPromise;
    const db = client.db("nitech_estimates");

    const profiles = await db.collection("lead_profiles")
      .find({ userId: session.user.email })
      .toArray();

    // Group profiles by category
    const result = {
      buildings: [],
      roads: [],
      bridges: []
    };

    profiles.forEach(p => {
      if (result[p.category]) {
        result[p.category].push({
          id: p.id,
          name: p.name,
          materials: p.materials || [],
          customLeads: p.customLeads || [],
        });
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleError(error, 'Failed to fetch lead profiles');
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rate = await rateLimit(`lead-profiles-post:${session.user.email}`, 30, 60000);
    if (!rate.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': Math.ceil(rate.reset / 1000).toString() } }
      );
    }

    const body = await request.json();
    const validation = postSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      );
    }

    const { id, category, name } = validation.data;
    const client = await clientPromise;
    const db = client.db("nitech_estimates");

    // Check count limit
    const count = await db.collection("lead_profiles").countDocuments({
      userId: session.user.email,
      category
    });
    if (count >= 30) {
      return NextResponse.json({ error: 'Maximum 30 profiles allowed per category' }, { status: 400 });
    }

    const newProfile = {
      userId: session.user.email,
      id,
      category,
      name,
      materials: [],
      customLeads: [],
      createdAt: new Date()
    };

    await db.collection("lead_profiles").insertOne(newProfile);

    return NextResponse.json({ success: true, profile: { id, name, materials: [], customLeads: [] } });
  } catch (error) {
    return handleError(error, 'Failed to create lead profile');
  }
}
