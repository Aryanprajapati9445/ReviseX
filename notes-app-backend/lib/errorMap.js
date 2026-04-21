/**
 * Maps internal error codes to human-readable UI messages.
 * Raw AWS SDK / MongoDB errors must NEVER be forwarded to the frontend.
 * Use toUserMessage() in every catch block before sending a 4xx/5xx response.
 */

export const ERROR_MESSAGES = {
    // Upload errors
    UNSUPPORTED_TYPE:    'This file type is not supported.',
    FILE_TOO_LARGE:      'File is too large. Please check the size limit.',
    PRESIGN_FAILED:      'Could not prepare upload. Please try again.',
    UPLOAD_FAILED:       'Upload failed. Check your connection and retry.',
    CONFIRM_FAILED:      'Upload could not be confirmed. Contact support if this persists.',
    MULTIPART_FAILED:    'Multipart upload failed. Please retry.',

    // Read errors
    FILE_NOT_FOUND:      'This file no longer exists.',
    ACCESS_DENIED:       "You don't have permission to view this file.",
    FILE_PROCESSING:     'File is still being processed. Refresh in a moment.',
    FILE_REJECTED:       'This file was rejected during security scanning.',

    // Auth errors
    UNAUTHORIZED:        'You must be logged in to do this.',
    FORBIDDEN:           'You do not have permission for this action.',
    TOKEN_EXPIRED:       'Your session has expired. Please log in again.',

    // Generic
    NOT_FOUND:           'The requested resource does not exist.',
    NETWORK_ERROR:       'Network issue detected. Check your connection.',
    VALIDATION_ERROR:    'Invalid data provided. Please check and retry.',
    SERVER_ERROR:        'Something went wrong on our end. Please try again.',
    UNKNOWN:             'Something went wrong on our end. Please try again.',
};

/**
 * Maps an internal error (Error object, AWS error, string code) to a safe UI string.
 * Never use this to expose raw error messages to the client.
 *
 * @param {unknown} err
 * @returns {string}
 */
export function toUserMessage(err) {
    if (typeof err === 'string') {
        const key = err.toUpperCase().replace(/\s+/g, '_');
        return ERROR_MESSAGES[key] ?? ERROR_MESSAGES.UNKNOWN;
    }
    if (err instanceof Error) {
        // Match against known error codes/keywords
        const upper = err.message.toUpperCase();
        const matchedKey = Object.keys(ERROR_MESSAGES).find(k => upper.includes(k));
        if (matchedKey) return ERROR_MESSAGES[matchedKey];

        // AWS SDK error codes
        if (err.Code === 'NoSuchKey' || err.code === 'NoSuchKey') return ERROR_MESSAGES.FILE_NOT_FOUND;
        if (err.Code === 'AccessDenied' || err.code === 'AccessDenied') return ERROR_MESSAGES.ACCESS_DENIED;
        if (err.$metadata?.httpStatusCode === 403) return ERROR_MESSAGES.ACCESS_DENIED;
        if (err.$metadata?.httpStatusCode === 404) return ERROR_MESSAGES.FILE_NOT_FOUND;
    }
    return ERROR_MESSAGES.UNKNOWN;
}
