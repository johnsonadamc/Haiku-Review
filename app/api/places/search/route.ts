import { NextRequest, NextResponse } from 'next/server';
import { PLACE_SUGGEST } from '@/lib/seed-data';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || '';
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.shortFormattedAddress',
        },
        body: JSON.stringify({ textQuery: q }),
      });
      const data = await res.json();
      if (data.places) {
        return NextResponse.json({
          results: data.places.slice(0, 8).map((place: {
            id: string;
            displayName?: { text?: string };
            formattedAddress?: string;
            shortFormattedAddress?: string;
          }) => ({
            place_id: place.id,
            n: place.displayName?.text || '',
            c: (() => {
              const short = (place.shortFormattedAddress || '').trim();
              if (short) return short;
              const full = place.formattedAddress || '';
              const comma = full.indexOf(',');
              return comma >= 0 ? full.slice(comma + 1).trim() : full.trim();
            })(),
          })),
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
