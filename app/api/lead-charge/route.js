import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { z } from 'zod';
import leadsData from '@/lib/leads.json';
import { interpolateRate } from '@/lib/leadUtils';
import { handleError } from '@/lib/errorHandler';

const querySchema = z.object({
  material: z.string().trim().min(1, 'Material parameter is required'),
  distance: z.preprocess(
    (val) => (val === null || val === undefined ? NaN : parseFloat(val)),
    z.number().min(0, 'Distance must be a non-negative number')
  ),
});

export async function GET(request) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit check
    const rate = rateLimit(`lead-charge:${session.user.email}`, 100, 60000);
    if (!rate.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": Math.ceil(rate.reset / 1000).toString() } }
      );
    }
    const { searchParams } = new URL(request.url);
    const validation = querySchema.safeParse({
      material: searchParams.get('material'),
      distance: searchParams.get('distance'),
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      );
    }

    const { material, distance } = validation.data;
    const lead = interpolateRate(leadsData, material, distance);

    if (lead === null) {
      return NextResponse.json({ lead: null, message: 'Material not found or unable to calculate lead' });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    return handleError(error, 'Failed to calculate lead charge');
  }
}