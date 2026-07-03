import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const origin = req.nextUrl.origin;

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    // Claim any haikus submitted with this email before the user existed
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const admin = createAdminClient();
        await admin.from('haikus').update({ user_id: user.id }).eq('author_email', user.email).is('user_id', null);
      }
    } catch {
      // claim failure never blocks the redirect
    }
  }

  // Redirect to home with a flag so the app knows to show "your haikus"
  return NextResponse.redirect(`${origin}/?haikus=mine`);
}
