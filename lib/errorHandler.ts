import { NextResponse } from 'next/server';
import { logger } from './logger';

export function handleError(error: any, defaultMessage = 'Something went wrong') {
  logger.error("🔥 API Error", error);
  const message = process.env.NODE_ENV === 'development' ? error.message : defaultMessage;
  return NextResponse.json({ error: message }, { status: 500 });
}
