// Storage functions for Cashivo using Supabase Storage
import { supabase } from './supabaseClient.js';

// Validate file type and size
function validateFile(file, type = 'receipt') {
    const maxSizes = {
        receipt: 5 * 1024 * 1024, // 5MB
        avatar: 2 * 1024 * 1024   // 2MB
    };

    const allowedTypes = {
        receipt: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'],
        avatar: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    };

    // Check file size
    if (file.size > maxSizes[type]) {
        throw new Error(`File size must be less than ${maxSizes[type] / (1024 * 1024)}MB`);
    }

    // Check file type
    if (!allowedTypes[type].includes(file.type)) {
        throw new Error(`Invalid file type. Allowed types: ${allowedTypes[type].join(', ')}`);
    }

    return true;
}

// Upload a file to storage with validation
async function uploadFile(bucketName, filePath, file, validateType = null) {
    // Validate file if type is specified
    if (validateType) {
        validateFile(file, validateType);
    }

    const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true // This allows overwriting existing files
        });

    if (error) {
        console.error('Error uploading file:', error);
        throw error;
    }

    return data;
}

// Download a file from storage
async function downloadFile(bucketName, filePath) {
    const { data, error } = await supabase.storage
        .from(bucketName)
        .download(filePath);

    if (error) {
        console.error('Error downloading file:', error);
        throw error;
    }

    return data;
}

// Get public URL for a file
function getPublicUrl(bucketName, filePath) {
    const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

    return data.publicUrl;
}

// Delete a file from storage
async function deleteFile(bucketName, filePath) {
    const { data, error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

    if (error) {
        console.error('Error deleting file:', error);
        throw error;
    }

    return data;
}

// List files in a bucket
async function listFiles(bucketName, path = '') {
    const { data, error } = await supabase.storage
        .from(bucketName)
        .list(path);

    if (error) {
        console.error('Error listing files:', error);
        throw error;
    }

    return data;
}

// Upload user avatar with validation and metadata update
async function uploadUserAvatar(userId, file) {
    try {
        validateFile(file, 'avatar');
        const fileExt = file.name.split('.').pop().toLowerCase();
        const filePath = `${userId}/avatar.${fileExt}`;
        
        const uploadResult = await uploadFile('user-avatars', filePath, file, 'avatar');
        
        // Get public URL and update user metadata
        const publicUrl = getPublicUrl('user-avatars', filePath);
        await updateUserAvatarMetadata(publicUrl);
        
        return { ...uploadResult, publicUrl };
    } catch (error) {
        console.error('Error uploading avatar:', error);
        throw error;
    }
}

// Upload transaction receipt with validation and database update
async function uploadTransactionReceipt(userId, transactionId, file) {
    try {
        validateFile(file, 'receipt');
        const fileExt = file.name.split('.').pop().toLowerCase();
        const filePath = `${userId}/receipts/${transactionId}/receipt.${fileExt}`;
        
        const uploadResult = await uploadFile('user-receipts', filePath, file, 'receipt');
        
        // Get public URL and update transaction record
        const publicUrl = getPublicUrl('user-receipts', filePath);
        await updateTransactionReceiptUrl(transactionId, publicUrl);
        
        return { ...uploadResult, publicUrl };
    } catch (error) {
        console.error('Error uploading receipt:', error);
        throw error;
    }
}

// Get user avatar URL
function getUserAvatarUrl(userId) {
    return getPublicUrl('user-avatars', `${userId}/avatar.jpg`);
}

// Get transaction receipt URL
function getTransactionReceiptUrl(userId, transactionId) {
    return getPublicUrl('user-receipts', `${userId}/receipts/${transactionId}/receipt.jpg`);
}

// Delete user avatar
async function deleteUserAvatar(userId) {
    return await deleteFile('user-avatars', `${userId}/avatar.jpg`);
}

// Delete transaction receipt
async function deleteTransactionReceipt(userId, transactionId) {
    return await deleteFile('user-receipts', `${userId}/receipts/${transactionId}/receipt.jpg`);
}

// Update user avatar metadata
async function updateUserAvatarMetadata(avatarUrl) {
    try {
        const { error } = await supabase.auth.updateUser({
            data: { avatar_url: avatarUrl }
        });
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error updating user avatar metadata:', error);
        throw error;
    }
}

// Update transaction with receipt URL
async function updateTransactionReceiptUrl(transactionId, receiptUrl) {
    try {
        const { error } = await supabase
            .from('transactions')
            .update({ receipt_url: receiptUrl })
            .eq('id', transactionId);
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error updating transaction receipt URL:', error);
        throw error;
    }
}

// Get receipt URL from transaction record
async function getReceiptUrlFromTransaction(transactionId) {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select('receipt_url')
            .eq('id', transactionId)
            .single();
        
        if (error) throw error;
        return data?.receipt_url || null;
    } catch (error) {
        console.error('Error getting receipt URL:', error);
        return null;
    }
}

// Check if file exists in bucket
async function fileExists(bucketName, filePath) {
    try {
        const { data, error } = await supabase.storage
            .from(bucketName)
            .list(filePath.split('/').slice(0, -1).join('/'));
        
        if (error) return false;
        
        const fileName = filePath.split('/').pop();
        return data.some(file => file.name === fileName);
    } catch (error) {
        return false;
    }
}

export {
    validateFile,
    uploadFile,
    downloadFile,
    getPublicUrl,
    deleteFile,
    listFiles,
    uploadUserAvatar,
    uploadTransactionReceipt,
    getUserAvatarUrl,
    getTransactionReceiptUrl,
    deleteUserAvatar,
    deleteTransactionReceipt,
    updateUserAvatarMetadata,
    updateTransactionReceiptUrl,
    getReceiptUrlFromTransaction,
    fileExists
};
