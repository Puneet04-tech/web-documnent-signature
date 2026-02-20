# 🚀 Deployment Guide

## 📋 Prerequisites
- GitHub repository with your code
- Netlify account (for frontend)
- Render account (for backend)
- MongoDB database (for backend)
- Email service credentials (for notifications)

## 🔧 Environment Variables Setup

### Backend (Render)
```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
JWT_SECRET=your-super-secret-jwt-key-here
FRONTEND_URL=https://your-app-name.netlify.app
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
PORT=5000
```

### Frontend (Netlify)
```bash
VITE_API_URL=https://your-backend-name.onrender.com/api
```

## 🌐 Deployment Steps

### 1. Deploy Backend to Render
1. Go to [render.com](https://render.com)
2. Connect your GitHub repository
3. Create new Web Service
4. Use `render.yaml` configuration
5. Set environment variables
6. Deploy!

### 2. Deploy Frontend to Netlify
1. Go to [netlify.com](https://netlify.com)
2. Connect your GitHub repository
3. Use `netlify.toml` configuration
4. Set environment variables
5. Deploy!

## 🔗 Important URLs After Deployment

### Update These Files:
1. **Frontend API URL** in `frontend/src/services/api.ts`:
   ```typescript
   export const API_URL = 'https://your-backend-name.onrender.com';
   ```

2. **Backend CORS** in `backend/src/index.ts`:
   ```typescript
   app.use(cors({
     origin: ['https://your-app-name.netlify.app', 'http://localhost:5173']
   }));
   ```

3. **Frontend URL** in Render environment variables:
   ```
   FRONTEND_URL=https://your-app-name.netlify.app
   ```

## 📧 Email Configuration
For Gmail, use:
- Enable 2FA on your Google account
- Create App Password (not regular password)
- Use App Password in EMAIL_PASS

## 🔄 CI/CD Pipeline
Both platforms support automatic deployments:
- Push to `main` branch → Auto-deploy
- GitHub Actions can be added for custom workflows

## 🐛 Common Issues & Solutions

### CORS Errors
- Add frontend URL to backend CORS whitelist
- Check API_URL in frontend

### MongoDB Connection
- Verify IP whitelist in MongoDB Atlas
- Check connection string format

### Build Failures
- Ensure all dependencies are installed
- Check TypeScript compilation

## 📱 Testing After Deployment
1. Test user registration/login
2. Test document upload
3. Test signing request creation
4. Test email notifications
5. Test group signing feature

## 🎯 Production Checklist
- [ ] Environment variables configured
- [ ] CORS properly set up
- [ ] Database connected
- [ ] Email service working
- [ ] All API endpoints tested
- [ ] Frontend routes working
- [ ] HTTPS certificates valid
- [ ] Error monitoring set up
