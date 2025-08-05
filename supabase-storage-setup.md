# Supabase Storage Bucket Setup for Cashivo

To store any files or assets related to the Cashivo app (e.g., user profile images, receipts, documents), you need to create a storage bucket in Supabase.

## Steps to Create a Storage Bucket

1. Log in to your Supabase project dashboard.

2. Navigate to the "Storage" section in the sidebar.

3. Click on "Create a new bucket".

4. Enter a name for the bucket, for example: `cashivo-assets`.

5. Choose the privacy setting:
   - Public: Anyone can access the files.
   - Private: Only authenticated users can access the files.
   
   For user-related files, choose **Private**.

6. Click "Create bucket".

## Using the Storage Bucket in Cashivo

- Use Supabase Storage API to upload, download, and manage files in the bucket.
- Ensure your frontend code uses authenticated Supabase client to access private buckets.
- Example usage in JavaScript:

```js
// Upload a file
const { data, error } = await supabase.storage
  .from('cashivo-assets')
  .upload('public/receipt1.png', fileInput.files[0]);

// Get public URL (if bucket is public)
const { publicURL, error } = supabase.storage
  .from('cashivo-assets')
  .getPublicUrl('public/receipt1.png');
```

## Notes

- You can create multiple buckets if needed for different types of assets.
- Make sure to handle file permissions and security properly.
- For the current Cashivo app, storage bucket usage can be added later as an enhancement.

If you want, I can help you integrate storage bucket usage into the app as well.
