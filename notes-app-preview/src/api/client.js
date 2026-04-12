// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

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

    // Create new note
    create: async (noteData) => {
        const response = await fetch(`${API_BASE_URL}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(noteData),
        });
        if (!response.ok) throw new Error('Failed to create note');
        return response.json();
    },

    // Update note
    update: async (id, noteData) => {
        const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(noteData),
        });
        if (!response.ok) throw new Error('Failed to update note');
        return response.json();
    },

    // Delete note
    delete: async (id) => {
        const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete note');
        return response.json();
    },

    // Like note
    like: async (id, email) => {
        const response = await fetch(`${API_BASE_URL}/notes/${id}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        if (!response.ok) throw new Error('Failed to like note');
        return response.json();
    },

    // Increment download count
    recordDownload: async (id) => {
        const response = await fetch(`${API_BASE_URL}/notes/${id}/download`, {
            method: 'POST',
        });
        if (!response.ok) throw new Error('Failed to record download');
        return response.json();
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

    // Create new subject
    create: async (subjectData) => {
        const response = await fetch(`${API_BASE_URL}/subjects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subjectData),
        });
        if (!response.ok) throw new Error('Failed to create subject');
        return response.json();
    },

    // Update subject
    update: async (id, subjectData) => {
        const response = await fetch(`${API_BASE_URL}/subjects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subjectData),
        });
        if (!response.ok) throw new Error('Failed to update subject');
        return response.json();
    },

    // Delete subject
    delete: async (id) => {
        const response = await fetch(`${API_BASE_URL}/subjects/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete subject');
        return response.json();
    },
};

// ============ STUDENTS API ============
export const studentsAPI = {
    // Get all students
    getAll: async () => {
        const response = await fetch(`${API_BASE_URL}/students`);
        if (!response.ok) throw new Error('Failed to fetch students');
        return response.json();
    },

    // Get student by ID
    getById: async (id) => {
        const response = await fetch(`${API_BASE_URL}/students/${id}`);
        if (!response.ok) throw new Error('Student not found');
        return response.json();
    },

    // Get student by email
    getByEmail: async (email) => {
        const response = await fetch(`${API_BASE_URL}/students/email/${email}`);
        if (!response.ok) throw new Error('Student not found');
        return response.json();
    },

    // Login student
    login: async (credentials) => {
        const response = await fetch(`${API_BASE_URL}/students/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to login');
        return data;
    },

    // Register or update student
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

    // Add note to student
    addNote: async (email, noteId) => {
        const response = await fetch(`${API_BASE_URL}/students/${email}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ noteId }),
        });
        if (!response.ok) throw new Error('Failed to add note');
        return response.json();
    },

    // Like note
    likeNote: async (email, noteId) => {
        const response = await fetch(`${API_BASE_URL}/students/${email}/like/${noteId}`, {
            method: 'POST',
        });
        if (!response.ok) throw new Error('Failed to like note');
        return response.json();
    },

    // Delete student
    delete: async (id) => {
        const response = await fetch(`${API_BASE_URL}/students/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete student');
        return response.json();
    },
};

// Health check
export const healthCheck = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        return response.ok;
    } catch (error) {
        console.error('Backend not accessible:', error);
        return false;
    }
};
