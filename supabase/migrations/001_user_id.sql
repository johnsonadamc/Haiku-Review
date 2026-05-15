-- Add optional user_id to haikus for magic-link identity
ALTER TABLE haikus ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users;
CREATE INDEX IF NOT EXISTS haikus_user_id_idx ON haikus(user_id);

-- Allow users to read their own haikus (RLS already allows public read, this is additive)
-- No additional policy needed — existing haikus_public_read covers it.
