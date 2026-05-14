import { SupabaseClient } from '@supabase/supabase-js';

export type Place = {
  id: string;
  name: string;
  city: string | null;
  google_place_id: string | null;
  lat: number | null;
  lng: number | null;
  haiku_count: number;
  created_at: string;
};

export async function getPlaces(supabase: SupabaseClient): Promise<Place[]> {
  const { data, error } = await supabase.from('places').select('*');
  if (error) throw error;
  return data || [];
}

export async function findOrCreatePlace(supabase: SupabaseClient, place: Pick<Place, 'name' | 'city' | 'lat' | 'lng' | 'google_place_id'>): Promise<Place> {
  if (place.google_place_id) {
    const { data } = await supabase.from('places').select('*').eq('google_place_id', place.google_place_id).single();
    if (data) return data;
  }
  const { data: existing } = await supabase.from('places').select('*').eq('name', place.name).maybeSingle();
  if (existing) return existing;
  const { data, error } = await supabase.from('places').insert(place).select().single();
  if (error) throw error;
  return data;
}
