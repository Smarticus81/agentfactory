import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const customsearch = google.customsearch('v1');

export async function POST(request: NextRequest) {
  try {
    const { query, type } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_SEARCH_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !cx) {
      console.error('Missing Google Search configuration');
      return NextResponse.json(
        { error: 'Search configuration missing. Please set GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID.' },
        { status: 500 }
      );
    }

    const res = await customsearch.cse.list({
      cx,
      q: query,
      auth: apiKey,
      num: 5, // Retrieve top 5 results
    });

    const results = res.data.items?.map((item) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
    })) || [];

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
    });
  } catch (error: any) {
    console.error('Web search error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to perform search' },
      { status: 500 }
    );
  }
}

