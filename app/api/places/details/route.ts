import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get('place_id');
  if (!placeId) return NextResponse.json({ error: 'place_id required' }, { status: 400 });

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return NextResponse.json({ lat: null, lng: null });

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=geometry&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    const loc = data.result?.geometry?.location;
    if (!loc) return NextResponse.json({ lat: null, lng: null });
    return NextResponse.json({ lat: loc.lat, lng: loc.lng });
  } catch {
    return NextResponse.json({ lat: null, lng: null });
  }
}
