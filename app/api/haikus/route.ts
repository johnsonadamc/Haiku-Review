import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SEED_POSTS } from '@/lib/seed-data';

export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get('place_id');
  try {
    const supabase = await createClient();
    let query = supabase
      .from('haikus')
      .select('*, places(id, name, city, lat, lng)')
      .order('created_at', { ascending: true });
    if (placeId) query = query.eq('place_id', placeId);
    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ haikus: SEED_POSTS, seed: true });
    }
    return NextResponse.json({ haikus: data, seed: false });
  } catch {
    return NextResponse.json({ haikus: SEED_POSTS, seed: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      line_1, line_2, line_3, author, author_email,
      place_name, place_city, place_lat, place_lng, google_place_id, photo_url,
    } = body;

    if (!line_1 || !line_2 || !line_3 || !place_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createClient();

    // find or create place
    let place;
    if (google_place_id) {
      const { data } = await supabase.from('places').select('*').eq('google_place_id', google_place_id).single();
      place = data;
    }
    if (!place) {
      const { data: existing } = await supabase.from('places').select('*').eq('name', place_name).maybeSingle();
      place = existing;
    }
    if (!place) {
      const { data: newPlace, error: placeError } = await supabase.from('places').insert({
        name: place_name, city: place_city, lat: place_lat, lng: place_lng, google_place_id,
      }).select().single();
      if (placeError) throw placeError;
      place = newPlace;
    }

    // resolve user_id from email if provided (silently — never blocks submission)
    let userId: string | null = null;
    if (author_email && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const admin = createAdminClient();
        const { data: listData } = await admin.auth.admin.listUsers();
        const existingUser = listData?.users?.find(u => u.email === author_email);
        if (existingUser) {
          userId = existingUser.id;
        } else {
          const { data: invited } = await admin.auth.admin.inviteUserByEmail(author_email);
          userId = invited?.user?.id ?? null;
        }
      } catch {
        // auth lookup failure never blocks submission
      }
    }

    const { data: haiku, error: haikuError } = await supabase.from('haikus').insert({
      place_id: place.id, line_1, line_2, line_3,
      author: author || null,
      photo_url: photo_url || null,
      user_id: userId,
    }).select().single();
    if (haikuError) throw haikuError;

    await supabase.rpc('increment_haiku_count', { p_place_id: place.id });

    // one previous haiku from same place for the post-submit moment
    const { data: prevHaikus } = await supabase.from('haikus')
      .select('*')
      .eq('place_id', place.id)
      .neq('id', haiku.id)
      .order('created_at', { ascending: false })
      .limit(1);

    return NextResponse.json({ haiku, place, previousHaiku: prevHaikus?.[0] || null });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
