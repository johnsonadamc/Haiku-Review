import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get('place_id');
  if (!placeId) return NextResponse.json({ error: 'place_id required' }, { status: 400 });

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return NextResponse.json({ lat: null, lng: null });

  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,shortFormattedAddress',
      },
    });
    const result = await res.json();
    if (!result.location) return NextResponse.json({ lat: null, lng: null });
    return NextResponse.json({
      lat: result.location.latitude,
      lng: result.location.longitude,
      name: result.displayName?.text || '',
      formatted_address: result.formattedAddress || '',
    });
  } catch {
    return NextResponse.json({ lat: null, lng: null });
  }
}
