import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ haikus: [] });

    const { data, error } = await supabase
      .from('haikus')
      .select('*, places(name, city)')
      .or(`user_id.eq.${user.id},author_email.eq.${user.email}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ haikus: data || [] });
  } catch {
    return NextResponse.json({ haikus: [] });
  }
}
