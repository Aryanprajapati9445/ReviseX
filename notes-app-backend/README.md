# ExamNotes Hub - Backend API

Backend server for the ExamNotes Hub application built with Node.js, Express, and MongoDB.

## Installation

```bash
npm install
```

## Environment Setup

Create a `.env` file in the root directory:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/examnotes
NODE_ENV=development
```

## Running the Server

### Development (with auto-reload):
```bash
npm run dev
```

### Production:
```bash
npm start
```

The server will run on `http://localhost:5000`

## API Endpoints

### Health Check
- `GET /api/health` - Check server status

### Notes
- `GET /api/notes` - Get all notes
- `GET /api/notes/:id` - Get single note
- `GET /api/notes/subject/:subject` - Get notes by subject
- `GET /api/notes/exam/:examType` - Get notes by exam type
- `POST /api/notes` - Create new note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note
- `POST /api/notes/:id/like` - Like/Unlike note
- `POST /api/notes/:id/download` - Increment download count

### Subjects
- `GET /api/subjects` - Get all subjects
- `GET /api/subjects/:id` - Get single subject
- `GET /api/subjects/branch/:branch` - Get subjects by branch
- `POST /api/subjects` - Create new subject
- `PUT /api/subjects/:id` - Update subject
- `DELETE /api/subjects/:id` - Delete subject

### Students
- `GET /api/students` - Get all students
- `GET /api/students/:id` - Get single student
- `GET /api/students/email/:email` - Get student by email
- `POST /api/students/register` - Register/Update student
- `POST /api/students/:email/notes` - Add note to student
- `POST /api/students/:email/like/:noteId` - Like note
- `DELETE /api/students/:id` - Delete student

## MongoDB Setup

Make sure MongoDB is running locally or update `MONGODB_URI` in `.env` to point to your MongoDB instance.
