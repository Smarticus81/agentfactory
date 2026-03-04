import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Web search is not available for venue agents' },
    { status: 501 }
  );
}
