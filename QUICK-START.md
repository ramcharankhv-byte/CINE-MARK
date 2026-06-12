# CineMark Quick Start Guide

## What's Been Set Up

Your CineMark frontend and backend are now configured to communicate with each other! Here's what has been done:

### ✅ Configuration Files Created

1. **Frontend Environment** - `.env.local`
   - Tells frontend where to find backend API
   - API URL: `http://localhost:8080/api/v1`

2. **Backend Environment** - Already configured in `.env`
   - Database connected (PostgreSQL)
   - CORS enabled for `http://localhost:3000`
   - All secrets configured

3. **Example Configs** - `.env.example` files
   - Reference templates for both services
   - Use if you need to reconfigure

---

## 🎯 Getting Started (5 Minutes)

### Step 1: Validate Configuration

```bash
cd CINE-MARK
node validate-config.js
```

### Step 2: Start Backend Service

```bash
cd CINE-MARK/BACKEND
npm install  # If needed
npm run dev
```

### Step 3: Start Frontend Service (New Terminal)

```bash
cd CINE-MARK/FRONTEND
npm install  # If needed
npm run dev
```

### Step 4: Verify Connection (New Terminal)

```bash
cd CINE-MARK
node verify-connection.js
```

---

## 📱 What to Test

Once everything is running:

1. Open http://localhost:3000 in your browser
2. Try to authenticate with Google
3. Search for movies
4. Create and manage watchlists

---

## 🔗 Important URLs

| Service  | URL                            | Purpose               |
| -------- | ------------------------------ | --------------------- |
| Frontend | http://localhost:3000          | Main application      |
| Backend  | http://localhost:8080          | API server            |
| API Base | http://localhost:8080/api/v1   | REST API endpoints    |
| API Docs | http://localhost:8080/api-docs | Swagger documentation |

---

## 🚨 If Something Goes Wrong

### "Cannot connect to backend"

```bash
# Check if backend is running
curl http://localhost:8080/
```

### "CORS error in browser"

1. Ensure frontend is running on port 3000
2. Ensure backend .env has `CORS_ORIGIN=http://localhost:3000`
3. Restart both services

### Port Already in Use

```bash
# Change backend port in BACKEND/.env
PORT=8081

# Then update frontend NEXT_PUBLIC_API_URL in .env.local
NEXT_PUBLIC_API_URL=http://localhost:8081/api/v1
```

---

## ✨ Summary

Your CineMark application is ready to run with proper frontend-backend connection configured!

**Status**: ✅ **READY TO RUN**

_Happy coding! 🎬_
