-- M1 foundation: Supabase Storage bucket policies
-- Apply after the `agents` table exists in M12.

CREATE POLICY "Users upload own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users update own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Agent owner uploads agent avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'agents'
    AND EXISTS (
      SELECT 1 FROM agents
      WHERE id::text = (storage.foldername(name))[2]
        AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Public read feedback"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'feedback');

CREATE POLICY "Authenticated users upload feedback screenshots"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'feedback');
