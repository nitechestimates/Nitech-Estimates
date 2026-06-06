import { NextResponse } from 'next/server';

export function handleError(error, defaultMessage = 'Something went wrong') {
  console.error("🔥 API Error:", error);
  const message = process.env.NODE_ENV === 'development' ? error.message : defaultMessage;
  return NextResponse.json({ error: message }, { status: 500 });
}
