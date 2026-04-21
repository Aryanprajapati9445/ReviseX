// API Configuration
// In production, set VITE_API_BASE_URL in your .env file
const API_BASE_URL = "https://d2x494c4tgywmr.cloudfront.net/api";

// Admin token stored in sessionStorage — expires when tab closes (more secure than localStorage)
const tokenStore = {
    _token: sessionStorage.getItem('admin_token') || null,

    get() { return this._token; },

    set(token) {
        this._token = token;
        if (token) sessionStorage.setItem('admin_token', token);
        else sessionStorage.removeItem('admin_token');
    },

    clear() {
        this.set(null);
    },

    /** Returns the Authorization header object, or an empty object if not logged in. */
    authHeader() {
        return this._token ? { Authorization: `Bearer ${this._token}` } : {};
    },

    isLoggedIn() {
        return !!this._token;
    },
};

export { tokenStore };

// ============ STUDENT JWT TOKEN STORE ============
// Separate store for the student session token.
const studentTokenStore = {
    _token: localStorage.getItem('student_token') || null,

    get() {
        return this._token;
    },

    set(token) {
        this._token = token;
        if (token) {
            localStorage.setItem('student_token', token);
        } else {
            localStorage.removeItem('student_token');
        }
    },

    clear() {
        this.set(null);
    },

    authHeader() {
        return this._token ? { Authorization: `Bearer ${this._token}` } : {};
    },

    isLoggedIn() {
        return !!this._token;
    },
};

export { studentTokenStore };

// ============ NOTES API ============
export const notesAPI = {
    // Get all notes
    getAll: async () => {
        const response = await fetch(`${API_BASE_URL}/notes`);
        if (!response.ok) throw new Error('Failed to fetch notes');
        return response.json();
    },

    // Get note by ID
    getById: async (id) => {
        const response = await fetch(`${API_BASE_URL}/notes/${id}`);
        if (!response.ok) throw new Error('Note not found');
        return response.json();
    },

    // Get notes by subject
    getBySubject: async (subject) => {
        const response = await fetch(`${API_BASE_URL}/notes/subject/${subject}`);
        if (!response.ok) throw new Error('Failed to fetch notes');
        return response.json();
    },

    // Get notes by exam type
    getByExamType: async (examType) => {
        const response = await fetch(`${API_BASE_URL}/notes/exam/${examType}`);
        if (!response.ok) throw new Error('Failed to fetch notes');
        return response.json();
    },

    // Create new note (Admin only — requires JWT)
    create: async (noteData) => {
        const response = await fetch(`${API_BASE_URL}/notes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...tokenStore.authHeader(),
            },
            body: JSON.stringify(noteData),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to create note');
        }
        return response.json();
    },

    // Update note (Admin only — requires JWT)
    update: async (id, noteData) => {
        const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...tokenStore.authHeader(),
            },
            body: JSON.stringify(noteData),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to update note');
        }
        return response.json();
    },

    // Delete note — also deletes S3 file (Admin only — requires JWT)
    delete: async (id) => {
        const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
            method: 'DELETE',
            headers: { ...tokenStore.authHeader() },
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to delete note');
        }
        return response.json();
    },

    // Like note (requires student JWT — email comes from the token server-side)
    like: async (id) => {
        const response = await fetch(`${API_BASE_URL}/notes/${id}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...studentTokenStore.authHeader(),
            },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to like note');
        return data;
    },

    // Get presigned URL for viewing (inline)
    getViewUrl: async (id) => {
        const response = await fetch(`${API_BASE_URL}/notes/${id}/download-url`);
        if (!response.ok) throw new Error('Failed to get view URL');
        return response.json(); // { url, fileName, mimeType }
    },

    // Get presigned URL for downloading (attachment)
    getDownloadUrl: async (id) => {
        const response = await fetch(`${API_BASE_URL}/notes/${id}/download-url?dl=1`);
        if (!response.ok) throw new Error('Failed to get download URL');
        return response.json(); // { url, fileName, mimeType }
    },
};

// ============ ADMIN AUTH API ============
export const adminAPI = {
    /**
     * Login with the admin password.
     * On success, stores the returned JWT in tokenStore.
     * @param {string} password
     * @returns {{ token: string, expiresIn: string }}
     */
    login: async (password) => {
        const response = await fetch(`${API_BASE_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Login failed');
        // Persist token for subsequent requests
        tokenStore.set(data.token);
        return data;
    },

    /** Remove the stored token (logout). */
    logout: () => {
        tokenStore.clear();
    },

    /** Whether an admin token is currently stored. */
    isLoggedIn: () => tokenStore.isLoggedIn(),
};

// ============ FILE UPLOAD API ============

const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100 MB
const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB per chunk

/**
 * Phase 3 — presigned PUT upload flow.
 *
 * Flow:
 *   1. POST /api/upload/presign      — backend validates type/size, issues PUT URL
 *   2. XHR PUT directly to S3       — browser never hits the backend with file bytes
 *   3. POST /api/upload/confirm     — backend records the completion
 *
 * @param {File}     file
 * @param {function} onProgress  (0-100)
 * @returns {{ fileKey, fileUrl, fileName, fileType, mimeType, size }}
 */
async function presignedUpload(file, onProgress) {
    // Step 1 — get presigned URL from backend
    const presignRes = await fetch(`${API_BASE_URL}/upload/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...tokenStore.authHeader() },
        body: JSON.stringify({ filename: file.name, contentType: file.type, sizeBytes: file.size }),
    });
    if (!presignRes.ok) {
        const { error } = await presignRes.json().catch(() => ({}));
        throw new Error(error || 'Could not prepare upload.');
    }
    const { uploadUrl, fileKey } = await presignRes.json();

    // Step 2 — PUT directly to S3 with progress tracking
    await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => (xhr.status === 200 || xhr.status === 204 ? resolve() : reject(new Error('Upload to storage failed.')));
        xhr.onerror = () => reject(new Error('Network error during upload.'));
        xhr.ontimeout = () => reject(new Error('Upload timed out.'));
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.timeout = 10 * 60 * 1000; // 10 min max
        xhr.send(file);
    });

    // Step 3 — confirm with backend
    const confirmRes = await fetch(`${API_BASE_URL}/upload/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...tokenStore.authHeader() },
        body: JSON.stringify({ fileKey, fileName: file.name, mimeType: file.type, sizeBytes: file.size }),
    });
    if (!confirmRes.ok) {
        const { error } = await confirmRes.json().catch(() => ({}));
        throw new Error(error || 'Upload could not be confirmed.');
    }
    return confirmRes.json(); // { fileKey, fileUrl, fileName, fileType, mimeType, size }
}

/**
 * Phase 3 — multipart upload for files > 100 MB.
 * Uploads 3 chunks in parallel. Provides accurate aggregate progress.
 *
 * @param {File}     file
 * @param {function} onProgress  (0-100)
 * @returns {{ fileKey, fileUrl, fileName, fileType, mimeType, size }}
 */
async function multipartUpload(file, onProgress) {
    // Start multipart session
    const startRes = await fetch(`${API_BASE_URL}/upload/multipart/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...tokenStore.authHeader() },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
    });
    if (!startRes.ok) {
        const { error } = await startRes.json().catch(() => ({}));
        throw new Error(error || 'Could not initiate multipart upload.');
    }
    const { uploadId, fileKey } = await startRes.json();

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploaded = new Array(totalChunks).fill(0);
    const parts = [];

    const uploadChunk = async (partNumber) => {
        const start = (partNumber - 1) * CHUNK_SIZE;
        const chunk = file.slice(start, start + CHUNK_SIZE);

        // Get presigned URL for this chunk
        const partRes = await fetch(`${API_BASE_URL}/upload/multipart/presign-part`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...tokenStore.authHeader() },
            body: JSON.stringify({ fileKey, uploadId, partNumber }),
        });
        const { url } = await partRes.json();

        const etag = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.upload.onprogress = (e) => {
                uploaded[partNumber - 1] = e.loaded;
                if (onProgress) {
                    const total = uploaded.reduce((a, b) => a + b, 0);
                    onProgress(Math.round((total / file.size) * 100));
                }
            };
            xhr.onload = () => resolve(xhr.getResponseHeader('ETag') ?? '');
            xhr.onerror = () => reject(new Error(`Chunk ${partNumber} upload failed.`));
            xhr.open('PUT', url);
            xhr.send(chunk);
        });

        parts.push({ PartNumber: partNumber, ETag: etag });
    };

    // Upload 3 chunks concurrently
    const queue = Array.from({ length: totalChunks }, (_, i) => i + 1);
    while (queue.length > 0) {
        await Promise.all(queue.splice(0, 3).map(uploadChunk));
    }

    // Complete multipart upload
    const completeRes = await fetch(`${API_BASE_URL}/upload/multipart/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...tokenStore.authHeader() },
        body: JSON.stringify({
            fileKey, uploadId, parts,
            fileName: file.name, mimeType: file.type, sizeBytes: file.size,
        }),
    });
    if (!completeRes.ok) {
        const { error } = await completeRes.json().catch(() => ({}));
        throw new Error(error || 'Could not complete upload.');
    }
    return completeRes.json();
}

export const uploadAPI = {
    /**
     * Uploads a file using the optimal strategy based on file size.
     * - Files ≤ 100 MB: presigned PUT (single request directly to S3)
     * - Files > 100 MB: multipart upload (10 MB chunks, 3 in parallel)
     *
     * @param {File}     file
     * @param {function} onProgress  callback(0–100)
     * @returns {{ fileKey, fileUrl, fileName, fileType, mimeType, size }}
     */
    uploadFile: async (file, onProgress) => {
        if (file.size > MULTIPART_THRESHOLD) {
            return multipartUpload(file, onProgress);
        }
        return presignedUpload(file, onProgress);
    },

    /** Abort an in-progress multipart upload session. */
    abortMultipart: async (fileKey, uploadId) => {
        await fetch(`${API_BASE_URL}/upload/multipart/abort`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...tokenStore.authHeader() },
            body: JSON.stringify({ fileKey, uploadId }),
        });
    },
};

// ============ SUBJECTS API ============
export const subjectsAPI = {
    // Get all subjects
    getAll: async () => {
        const response = await fetch(`${API_BASE_URL}/subjects`);
        if (!response.ok) throw new Error('Failed to fetch subjects');
        return response.json();
    },

    // Get subject by ID
    getById: async (id) => {
        const response = await fetch(`${API_BASE_URL}/subjects/${id}`);
        if (!response.ok) throw new Error('Subject not found');
        return response.json();
    },

    // Get subjects by branch
    getByBranch: async (branch) => {
        const response = await fetch(`${API_BASE_URL}/subjects/branch/${branch}`);
        if (!response.ok) throw new Error('Failed to fetch subjects');
        return response.json();
    },

    // Create new subject (Admin only — requires JWT)
    create: async (subjectData) => {
        const response = await fetch(`${API_BASE_URL}/subjects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...tokenStore.authHeader() },
            body: JSON.stringify(subjectData),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to create subject');
        return data;
    },

    // Update subject (Admin only — requires JWT)
    update: async (id, subjectData) => {
        const response = await fetch(`${API_BASE_URL}/subjects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...tokenStore.authHeader() },
            body: JSON.stringify(subjectData),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to update subject');
        return data;
    },

    // Delete subject (Admin only — requires JWT)
    delete: async (id) => {
        const response = await fetch(`${API_BASE_URL}/subjects/${id}`, {
            method: 'DELETE',
            headers: { ...tokenStore.authHeader() },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to delete subject');
        return data;
    },
};

// ============ STUDENTS API ============
export const studentsAPI = {
    // Send OTP for registration
    sendOtp: async (email) => {
        const response = await fetch(`${API_BASE_URL}/students/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to send OTP');
        return data;
    },

    // Get all students (Admin only — requires JWT)
    getAll: async () => {
        const response = await fetch(`${API_BASE_URL}/students`, {
            headers: { ...tokenStore.authHeader() },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch students');
        return data;
    },

    // Get student by ID (Admin only — requires JWT)
    getById: async (id) => {
        const response = await fetch(`${API_BASE_URL}/students/${id}`, {
            headers: { ...tokenStore.authHeader() },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Student not found');
        return data;
    },

    // Get student by email (Admin only — requires JWT)
    getByEmail: async (email) => {
        const response = await fetch(`${API_BASE_URL}/students/email/${email}`, {
            headers: { ...tokenStore.authHeader() },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Student not found');
        return data;
    },

    /**
     * Login — stores the student JWT automatically.
     * Returns { token, expiresIn, student }
     */
    login: async (credentials) => {
        const response = await fetch(`${API_BASE_URL}/students/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to login');
        // Persist student token for authenticated actions
        studentTokenStore.set(data.token);
        return data;
    },

    /** Remove the stored student token (logout). */
    logout: () => {
        studentTokenStore.clear();
    },

    /** Whether a student session token is currently stored. */
    isLoggedIn: () => studentTokenStore.isLoggedIn(),

    // Register student — returns { message, student }
    register: async (studentData) => {
        const response = await fetch(`${API_BASE_URL}/students/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(studentData),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to register student');
        return data;
    },

    // Verify email with the token from the verification link
    verifyEmail: async (token) => {
        const response = await fetch(`${API_BASE_URL}/students/verify/${token}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Verification failed');
        return data;
    },

    // Request a password-reset link
    forgotPassword: async (email) => {
        const response = await fetch(`${API_BASE_URL}/students/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Request failed');
        return data;
    },

    // Consume the reset token and set a new password
    resetPassword: async (token, newPassword) => {
        const response = await fetch(`${API_BASE_URL}/students/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, newPassword }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Reset failed');
        return data;
    },

    // Save note to student's list (requires student JWT)
    addNote: async (email, noteId) => {
        const response = await fetch(`${API_BASE_URL}/students/${email}/notes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...studentTokenStore.authHeader(),
            },
            body: JSON.stringify({ noteId }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to add note');
        return data;
    },

    // Toggle like on student record (requires student JWT)
    likeNote: async (email, noteId) => {
        const response = await fetch(`${API_BASE_URL}/students/${email}/like/${noteId}`, {
            method: 'POST',
            headers: { ...studentTokenStore.authHeader() },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to like note');
        return data;
    },

    // Delete student (Admin only — requires admin JWT)
    delete: async (id) => {
        const response = await fetch(`${API_BASE_URL}/students/${id}`, {
            method: 'DELETE',
            headers: { ...tokenStore.authHeader() },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to delete student');
        return data;
    },
};

// Health check
export const healthCheck = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (!response.ok) return { ok: false };
        return { ok: true, ...(await response.json()) };
    } catch (error) {
        console.error('Backend not accessible:', error);
        return { ok: false };
    }
};
