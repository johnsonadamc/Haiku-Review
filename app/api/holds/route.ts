import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { haiku_id } = await req.json();
    if (!haiku_id) return NextResponse.json({ error: 'Missing haiku_id' }, { status: 400 });
    const cookieStore = await cookies();
    let sessionId = cookieStore.get('hr_session')?.value;
    if (!sessionId) {
      sessionId = 'hr_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
    const supabase = await createClient();
    const { error: insertError } = await supabase.from('holds').insert({ haiku_id, session_id: sessionId });
    if (!insertError) {
      await supabase.from('haikus')
        .select('held_count')
        .eq('id', haiku_id)
        .single()
        .then(async ({ data }) => {
          if (data) {
            await supabase.from('haikus').update({ held_count: (data.held_count || 0) + 1 }).eq('id', haiku_id);
          }
        });
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set('hr_session', sessionId, { maxAge: 60 * 60 * 24 * 365, httpOnly: true, sameSite: 'lax' });
    return response;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
