# GitHub Repository Setup Instructions

## Step 1: Create GitHub Repository
1. Go to [GitHub](https://github.com)
2. Click the "+" button in the top right corner
3. Select "New repository"
4. Enter repository name: `document-signature-app`
5. Add description: "Full-stack document signing application with drag & drop, witness fields, and modern UI"
6. Choose "Public" or "Private" as preferred
7. **Do not** initialize with README, .gitignore, or license (we already have these)
8. Click "Create repository"

## Step 2: Push to GitHub
After creating the repository, run these commands in your terminal:

```bash
cd "d:\web-documnent-signature"
git remote add origin https://github.com/Puneet04-tech/document-signature-app.git
git branch -M main
git push -u origin main
```

## Step 3: Repository Structure
Your repository will contain:

### Backend (`/backend`)
- Node.js/Express API server
- MongoDB database integration
- JWT authentication
- PDF processing with pdf-lib
- Email notifications
- Audit logging

### Frontend (`/frontend`)
- React with TypeScript
- Vite build system
- Tailwind CSS for styling
- React Query for API calls
- Zustand for state management
- PDF rendering with react-pdf

### Key Features
- ✅ User authentication & authorization
- ✅ Document upload & management
- ✅ PDF field placement with drag & drop
- ✅ Multiple field types (signature, initials, name, date, text, checkbox, witness)
- ✅ Signature drawing & typing
- ✅ Document finalization & PDF generation
- ✅ Audit trail & logging
- ✅ Modern responsive UI
- ✅ Real-time field updates
- ✅ Delete functionality with confirmation
- ✅ Keyboard shortcuts

## Step 4: Deployment Options

### Frontend (Vercel/Netlify)
```bash
cd frontend
npm run build
# Deploy the dist/ folder to Vercel or Netlify
```

### Backend (Heroku/Railway/Render)
```bash
cd backend
# Set environment variables:
# - MONGODB_URI
# - JWT_SECRET
# - EMAIL_USER, EMAIL_PASS
# - FRONTEND_URL

# Deploy to your preferred platform
```

## Environment Variables Required

### Backend
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: JWT secret key
- `EMAIL_USER`: Email service username
- `EMAIL_PASS`: Email service password
- `FRONTEND_URL`: Frontend application URL

### Frontend
- `VITE_API_URL`: Backend API URL (default: http://localhost:5000/api)

## Step 5: Running Locally After Clone

```bash
# Clone the repository
git clone https://github.com/Puneet04-tech/document-signature-app.git
cd document-signature-app

# Backend
cd backend
npm install
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000
