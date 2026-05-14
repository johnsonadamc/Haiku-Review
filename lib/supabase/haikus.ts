import { SupabaseClient } from '@supabase/supabase-js';

export type Haiku = {
  id: string;
  place_id: string;
  author: string | null;
  line_1: string;
  line_2: string;
  line_3: string;
  photo_url: string | null;
  held_count: number;
  created_at: string;
  places?: { name: string; city: string | null; lat: number | null; lng: number | null };
};

export async function getHaikus(supabase: SupabaseClient, placeId?: string): Promise<Haiku[]> {
  let query = supabase
    .from('haikus')
    .select('*, places(name, city, lat, lng)')
    .order('created_at', { ascending: true });
  if (placeId) query = query.eq('place_id', placeId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createHaiku(supabase: SupabaseClient, haiku: Omit<Haiku, 'id' | 'held_count' | 'created_at' | 'places'>): Promise<Haiku> {
  const { data, error } = await supabase.from('haikus').insert(haiku).select().single();
  if (error) throw error;
  return data;
}
