import { NextRequest, NextResponse } from 'next/server';
import { PLACE_SUGGEST } from '@/lib/seed-data';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || '';
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (apiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(q)}&key=${apiKey}&types=establishment|geocode`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.predictions) {
        return NextResponse.json({
          results: data.predictions.slice(0, 6).map((p: { description: string; place_id: string; structured_formatting?: { main_text?: string; secondary_text?: string } }) => ({
            n: p.structured_formatting?.main_text || p.description,
            c: p.structured_formatting?.secondary_text || '',
            place_id: p.place_id,
          }))
        });
      }
    } catch {}
  }

  const ql = q.toLowerCase();
  const results = PLACE_SUGGEST
    .filter(p => p.n.toLowerCase().includes(ql) || p.c.toLowerCase().includes(ql))
    .slice(0, 6);
  return NextResponse.json({ results });
}
