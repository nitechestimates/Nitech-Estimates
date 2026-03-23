import { NextResponse } from 'next/server';
import leadsData from '@/app/lib/leads.json';

export async function GET() {
  const materials = Object.keys(leadsData);
  return NextResponse.json(materials);
}