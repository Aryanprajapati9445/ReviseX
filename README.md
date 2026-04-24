<p align="center">
  <img src="https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-8-646cff?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-ES_Modules-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-4-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/AWS-S3%20%7C%20CloudFront%20%7C%20EC2-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white" />
</p>

# 📚 ReviseX

> **A full-stack exam notes platform for KIET Group of Institutions** — browse, preview, and download curated study materials through a premium dark-themed UI with animated Three.js backgrounds.

<p align="center">
  <strong>🔗 Live:</strong> <a href="https://d2kk5mn89uh79i.cloudfront.net"></a> &nbsp;|&nbsp;
  
</p>

---

## ✨ Features

### For Students
- 🎓 **Institutional sign-up** — register with your `@kiet.edu` email (OTP-verified)
- 📖 **Browse notes** by subject, exam type, or search by title
- 👁️ **Preview files** inline — PDFs, images, videos, audio, and Office docs
- ⬇️ **Download** via secure CloudFront-signed URLs
- ❤️ **Like** your favorite notes
- 🌙 **Premium dark theme** with animated Three.js particle background

### For Admins
- 📤 **Drag-and-drop uploads** — files go directly to S3 (server never touches file bytes)
- 📦 **Multipart upload** for files > 100 MB (10 MB chunks, 3 in parallel)
- 📝 **Manage notes** — create, edit, delete (S3 object auto-deleted)
- 📂 **Manage subjects** — color-coded, branch-specific academic subjects
- 👥 **Student management** — view and manage registered accounts

### Infrastructure
- 🚀 **CI/CD** — GitHub Actions auto-deploys backend to EC2 and frontend to S3/CloudFront
- 🔒 **CloudFront + OAC** — S3 bucket fully private, files served via signed URLs only
- ⚡ **Edge-cached delivery** — CloudFront CDN for low-latency global access
- 🛡️ **Rate limiting** — auth endpoints: 20/15min, general API: 120/min

---

## 🏗️ Architecture

```
                    ┌─────────────────────────────────┐
                    │     React SPA (CloudFront CDN)  │
                    │  Vite 8 · React 19 · Three.js   │
                    └────────────┬────────────────────┘
                                 │ fetch() + JWT
                    ┌────────────▼────────────────────┐
                    │   Express API (AWS EC2 + PM2)    │
                    │  CORS · Rate Limit · Auth · Gzip │
                    └──┬───────────────┬──────────────┘
                       │               │
              ┌────────▼──────┐  ┌─────▼──────────┐
              │ MongoDB Atlas │  │  AWS S3 Bucket  │
              │  (4 models)   │  │  (OAC-locked)   │
              └───────────────┘  └────────┬────────┘
                                          │ OAC
                                 ┌────────▼────────┐
                                 │   CloudFront    │
                                 │  (Signed URLs)  │
                                 └─────────────────┘
```

---

## 📁 Project Structure

```
ReviseX/
├── .github/workflows/
│   ├── backend-deploy.yml       # Auto-deploy backend to EC2 on push
│   └── aws-deploy.yml           # Build frontend → S3 → CloudFront invalidation
│
├── notes-app-backend/           # Express.js REST API
│   ├── server.js                # Entry point — middleware, routes, startup guards
│   ├── config/                  # MongoDB & S3 client configuration
│   ├── models/                  # Mongoose schemas: Note, Student, Subject, OTP
│   ├── middleware/              # JWT auth middleware (admin, student, any-auth)
│   ├── routes/                  # REST endpoints: notes, subjects, students, upload, admin
│   ├── lib/                     # CloudFront signer, file type registry, error mapper
│   └── utils/                   # Email (Nodemailer): OTP, verification, password reset
│
├── notes-app-preview/           # React SPA (Vite)
│   ├── vite.config.js           # Build config: manual chunks, chunk size limits
│   └── src/
│       ├── app/                 # Router, layout, protected routes
│       ├── api/                 # Centralized API client + in-memory cache
│       ├── context/             # Global state (notes, subjects, student session)
│       ├── features/            # Feature modules: auth, home, notes, subjects, admin
│       ├── components/          # Shared UI: Navbar, Footer, Skeleton, Three.js background
│       ├── hooks/               # useDebounce, useOffline
│       └── utils/               # Email parser, file helpers, retry, error messages
│
├── DOCUMENTATION.md             # Full technical documentation
└── README.md                    # ← You are here
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **MongoDB** — [Atlas free tier](https://www.mongodb.com/cloud/atlas) or local instance
- **AWS Account** — S3 bucket + (optional) CloudFront distribution

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/ReviseX.git
cd ReviseX
```

### 2. Backend setup

```bash
cd notes-app-backend
cp .env.example .env    # Fill in your values (see below)
npm install
npm run dev             # Starts on http://localhost:5000
```

### 3. Frontend setup

```bash
cd notes-app-preview
npm install
npm run dev             # Starts on http://localhost:5173
```

---

## ⚙️ Environment Variables

### Backend (`notes-app-backend/.env`)

| Variable | Required | Description |
|---|:---:|---|
| `PORT` | | Server port (default: `5000`) |
| `NODE_ENV` | | `development` or `production` |
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Secret key for signing JWTs |
| `ADMIN_PASSWORD` | ✅ | Password for the admin dashboard |
| `FRONTEND_URL` | ✅ | Frontend origin for CORS (e.g. `http://localhost:5173`) |
| `AWS_REGION` | ✅ | AWS region (e.g. `ap-south-1`) |
| `AWS_ACCESS_KEY_ID` | | AWS credentials (optional on EC2 with IAM role) |
| `AWS_SECRET_ACCESS_KEY` | | AWS credentials (optional on EC2 with IAM role) |
| `AWS_S3_BUCKET` | ✅ | S3 bucket name for file storage |
| `CLOUDFRONT_DOMAIN` | | CloudFront distribution domain |
| `CLOUDFRONT_KEY_PAIR_ID` | | CloudFront key pair ID for signed URLs |
| `CLOUDFRONT_PRIVATE_KEY` | | Base64-encoded RSA private key |
| `SMTP_HOST` | | SMTP server (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | | SMTP port (e.g. `587`) |
| `SMTP_USER` | | Email address for sending OTPs |
| `SMTP_PASS` | | Email app password |

> **Note:** Without SMTP configured, OTPs are logged to the console — ideal for local development.  
> Without CloudFront configured, the system falls back to S3 presigned URLs automatically.

### Frontend (`notes-app-preview/.env.production`)

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend API URL (e.g. `https://your-api.cloudfront.net/api`) |

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Auth | Description |
|:---:|---|:---:|---|
| `POST` | `/api/admin/login` | — | Admin login → JWT (8h) |
| `POST` | `/api/students/send-otp` | — | Send 6-digit OTP to email |
| `POST` | `/api/students/register` | — | Register with OTP verification |
| `POST` | `/api/students/login` | — | Student login → JWT (7d) |
| `POST` | `/api/students/forgot-password` | — | Request password reset email |
| `POST` | `/api/students/reset-password` | — | Reset password with token |

### Notes
| Method | Endpoint | Auth | Description |
|:---:|---|:---:|---|
| `GET` | `/api/notes` | — | List all notes |
| `GET` | `/api/notes/:id` | — | Get single note |
| `GET` | `/api/notes/subject/:subject` | — | Filter by subject |
| `GET` | `/api/notes/exam/:examType` | — | Filter by exam type |
| `GET` | `/api/notes/:id/download-url` | — | Get signed view/download URL |
| `POST` | `/api/notes` | Admin | Create note |
| `PUT` | `/api/notes/:id` | Admin | Update note metadata |
| `DELETE` | `/api/notes/:id` | Admin | Delete note + S3 object |
| `POST` | `/api/notes/:id/like` | Student | Toggle like |

### Uploads
| Method | Endpoint | Auth | Description |
|:---:|---|:---:|---|
| `POST` | `/api/upload/presign` | Admin | Get presigned PUT URL |
| `POST` | `/api/upload/confirm` | Admin | Confirm upload completion |
| `POST` | `/api/upload/multipart/start` | Admin | Start multipart session |
| `POST` | `/api/upload/multipart/presign-part` | Admin | Presign one chunk |
| `POST` | `/api/upload/multipart/complete` | Admin | Assemble all chunks |
| `POST` | `/api/upload/multipart/abort` | Admin | Cancel multipart upload |

### Subjects
| Method | Endpoint | Auth | Description |
|:---:|---|:---:|---|
| `GET` | `/api/subjects` | — | List all subjects |
| `GET` | `/api/subjects/:id` | — | Get single subject |
| `POST` | `/api/subjects` | Admin | Create subject |
| `PUT` | `/api/subjects/:id` | Admin | Update subject |
| `DELETE` | `/api/subjects/:id` | Admin | Delete subject |

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 8, React Router v7, Three.js, vanilla CSS |
| **Backend** | Node.js (ESM), Express 4, Mongoose 7, JWT, bcrypt, Nodemailer |
| **Storage** | AWS S3 (presigned URLs), CloudFront CDN (signed URLs + OAC) |
| **Database** | MongoDB Atlas |
| **Infrastructure** | AWS EC2, PM2, GitHub Actions CI/CD |
| **Security** | JWT (role-based), bcrypt (12 rounds), OTP verification, rate limiting, CORS, security headers |

---

## 🔐 Security

- **Passwords** — hashed with bcrypt (12 salt rounds), never stored in plain text
- **Authentication** — JWT with role-based access (admin: 8h, student: 7d expiry)
- **Email verification** — OTP with 10-minute TTL, auto-deleted from DB
- **File access** — CloudFront signed URLs (15 min TTL), S3 locked via OAC
- **Rate limiting** — auth endpoints: 20 req/15 min, general: 120 req/min
- **Security headers** — HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy
- **Token separation** — admin tokens in `sessionStorage`, student tokens in `localStorage`

---

## 📦 Deployment

### Backend (EC2)

Automated via GitHub Actions on push to `main` (when `notes-app-backend/` files change):

1. SSH into EC2
2. Pull latest code
3. `npm ci --production`
4. `pm2 restart all`

### Frontend (S3 + CloudFront)

Triggered manually via GitHub Actions `workflow_dispatch`:

1. `npm install && npm run build`
2. `aws s3 sync dist/ s3://revisex-frontend --delete`
3. CloudFront cache invalidation (`/*`)

---


---

## 📝 License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  Built with ☕ for KIET students · 2026
</p>
