/**
 * Central registry of allowed MIME types for file uploads.
 * Controls S3 prefix, per-type size limits, and category grouping.
 * Add new types here — never in upload route handlers.
 */

/** @type {Record<string, { prefix: string; maxMB: number; ext: string }>} */
export const ALLOWED_TYPES = {
    // Documents
    'application/pdf':    { prefix: 'docs',   maxMB: 50,  ext: '.pdf'  },
    'application/msword': { prefix: 'docs',   maxMB: 30,  ext: '.doc'  },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                          { prefix: 'docs',   maxMB: 30,  ext: '.docx' },
    'text/plain':         { prefix: 'docs',   maxMB: 5,   ext: '.txt'  },
    'text/markdown':      { prefix: 'docs',   maxMB: 5,   ext: '.md'   },

    // Images
    'image/jpeg': { prefix: 'images', maxMB: 20, ext: '.jpg'  },
    'image/png':  { prefix: 'images', maxMB: 20, ext: '.png'  },
    'image/gif':  { prefix: 'images', maxMB: 10, ext: '.gif'  },
    'image/webp': { prefix: 'images', maxMB: 20, ext: '.webp' },

    // Video
    'video/mp4':  { prefix: 'videos', maxMB: 100, ext: '.mp4'  },
    'video/webm': { prefix: 'videos', maxMB: 100, ext: '.webm' },

    // Audio
    'audio/mpeg': { prefix: 'audio', maxMB: 50, ext: '.mp3' },
    'audio/wav':  { prefix: 'audio', maxMB: 50, ext: '.wav' },
};

/**
 * Returns true if the given MIME type is allowed for upload.
 * @param {string} mimeType
 */
export const isAllowed = (mimeType) => mimeType in ALLOWED_TYPES;

/**
 * Returns the config object for the given MIME type.
 * @param {string} mimeType
 * @returns {{ prefix: string; maxMB: number; ext: string } | undefined}
 */
export const getMeta = (mimeType) => ALLOWED_TYPES[mimeType];

/** Human-readable list of allowed extensions for error messages. */
export const ALLOWED_EXTENSIONS = [...new Set(Object.values(ALLOWED_TYPES).map(v => v.ext))];
