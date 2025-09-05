# Cashivo Storage Setup Guide

## Prerequisites
- Supabase project created and configured
- Database tables already set up (from `supabase-setup.sql`)

## Step 1: Execute Storage SQL Commands

1. Go to your Supabase project dashboard
2. Navigate to the **SQL Editor** section
3. Copy and paste the contents of `execute-storage-setup.sql` into the editor
4. Click **Run** to execute the SQL commands

## Step 2: Verify Storage Buckets

After running the SQL commands, verify that the storage buckets were created:

1. Go to **Storage** section in your Supabase dashboard
2. You should see two buckets:
   - `user-receipts` (private)
   - `user-avatars` (public)

## Step 3: Test the Application

1. Open `index.html` in your browser
2. Register a new user or login with existing credentials
3. Test the avatar upload functionality in the Profile page
4. Test the receipt upload functionality when adding transactions

## Storage Bucket Details

### user-receipts (Private Bucket)
- **Purpose**: Store transaction receipts and documents
- **File size limit**: 5MB
- **Allowed types**: JPG, PNG, WebP, PDF
- **Access**: Private (only authenticated users can access their own files)

### user-avatars (Public Bucket)
- **Purpose**: Store user profile pictures
- **File size limit**: 2MB
- **Allowed types**: JPG, PNG, WebP
- **Access**: Public (anyone can view avatars)

## Folder Structure

Files are stored with this structure:
```
user-receipts/
├── {user_id}/
│   └── receipts/
│       └── {transaction_id}/
│           └── receipt.{extension}

user-avatars/
├── {user_id}/
│   └── avatar.{extension}
```

## Troubleshooting

If you encounter issues:

1. **Storage policies not working**: Make sure RLS (Row Level Security) is enabled on storage objects
2. **File upload errors**: Check file size and type restrictions
3. **Permission errors**: Verify the SQL policies were executed correctly

## Security Notes

- All storage operations use Supabase's built-in security policies
- Users can only access their own files
- File paths include user IDs to prevent unauthorized access
- Receipts are private, avatars are public for display purposes
