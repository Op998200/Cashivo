-- Supabase Storage Bucket Setup for Cashivo
-- Run these commands in your Supabase SQL Editor or via CLI

-- Create user-avatars bucket for profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-avatars', 'user-avatars', true);

-- Create user-receipts bucket for transaction receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-receipts', 'user-receipts', true);

-- Set up RLS policies for user-avatars bucket
-- Allow users to view all avatars (public bucket)
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-avatars');

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to update their own avatar
CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'user-avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own avatar
CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user-avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Set up RLS policies for user-receipts bucket
-- Allow authenticated users to view their own receipts
CREATE POLICY "Users can view their own receipts" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'user-receipts'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to upload receipts to their folder
CREATE POLICY "Users can upload receipts to their folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-receipts'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to update their own receipts
CREATE POLICY "Users can update their own receipts" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'user-receipts'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own receipts
CREATE POLICY "Users can delete their own receipts" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user-receipts'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Note: CORS configuration should be set up through the Supabase Dashboard
-- Go to Storage → [bucket-name] → Settings → CORS to configure allowed origins
