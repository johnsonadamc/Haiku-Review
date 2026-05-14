import { SupabaseClient } from '@supabase/supabase-js';

export async function recordHold(supabase: SupabaseClient, haikuId: string, sessionId: string): Promise<boolean> {
  const { error } = await supabase.from('holds').insert({ haiku_id: haikuId, session_id: sessionId });
  if (error) return false;
  await supabase.rpc('increment_held', { haiku_id: haikuId });
  return true;
}
