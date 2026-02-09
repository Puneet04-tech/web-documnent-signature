# Document Signature App

A secure, full-stack web application for digital document signing with enterprise-grade features.

## Features

- **JWT Authentication** - Secure user auth with access & refresh tokens
- **PDF Upload & Management** - Drag-and-drop document upload
- **Digital Signature Placement** - Interactive drag-and-drop signature positioning
- **Group Signing** - Multiple signers with sequential or parallel workflows
- **Tokenized Public Links** - Secure external signing without registration
- **Audit Trail** - Complete signing history with timestamps & IP tracking
- **PDF Finalization** - Server-side PDF embedding with signatures
- **Email Notifications** - Automated signing request emails
- **Document Templates** - Reusable document templates
- **Signature Templates** - Save and reuse signature styles

## Tech Stack

### Backend
- Node.js + Express + TypeScript
- MongoDB + Mongoose
- JWT Authentication
- Multer (file uploads)
- PDF-Lib (PDF manipulation)
- Nodemailer (email notifications)
- Express Validator
- CORS, Helmet, Rate Limiting

### Frontend
- React 18 + Vite + TypeScript
- Tailwind CSS + shadcn/ui components
- react-pdf (PDF rendering)
- @dnd-kit (drag & drop)
- Axios + React Query
- React Hook Form + Zod
- React Router DOM
- Lucide React (icons)

## Project Structure

```
document-signature-app/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── index.ts
│   ├── uploads/
│   ├── .env
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   ├── types/
│   │   └── main.tsx
│   └── package.json
└── README.md
```

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env

# Start development server
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install

# Start development server
npm run dev
```

## API Endpoints

### Auth
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user

### Documents
- `POST /api/docs/upload` - Upload PDF document
- `GET /api/docs` - List user documents
- `GET /api/docs/:id` - Get document details
- `DELETE /api/docs/:id` - Delete document
- `GET /api/docs/:id/download` - Download document

### Signatures
- `POST /api/signatures` - Place signature
- `GET /api/signatures/:docId` - Get document signatures
- `POST /api/signatures/finalize` - Finalize signed PDF
- `POST /api/signatures/drawn` - Save drawn signature template

### Signing Requests (Group Signing)
- `POST /api/signing-requests` - Create signing request
- `GET /api/signing-requests` - List signing requests
- `GET /api/signing-requests/:token` - Get by token (public)
- `POST /api/signing-requests/:token/sign` - Sign via token (public)
- `POST /api/signing-requests/:id/resend` - Resend email

### Audit
- `GET /api/audit/:docId` - Get document audit trail

## Environment Variables

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/document-signature
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
```

## License

MIT
