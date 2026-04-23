# 📖 MangaVerse — Original Manga Publishing Platform

A full-stack manga platform where artists can publish their original work and readers can discover, save, and enjoy manga — similar to YouTube but for manga.

---

## ✨ Features

- 🔐 **Firebase Authentication** — Email/password + Google OAuth
- 📤 **Manga Upload** — Cover image + chapters with individual pages (via Cloudinary)
- 📖 **Manga Reader** — Page-by-page or continuous scroll mode, keyboard navigation
- 🔍 **Browse & Discover** — Filter by genre, status, sort by trending/newest/likes
- ❤️ **Like & Save** — Personal library with saved and liked manga
- 💬 **Comments** — Comment on manga
- 👤 **Artist Profiles** — Follow artists, view their portfolio
- 📊 **Creator Dashboard** — Track views, likes, and chapters across all your manga
- 🎨 **Dark Aesthetic UI** — Anime-inspired design with smooth animations (Framer Motion)

---

## 🏗 Tech Stack

| Layer       | Technology                              |
|-------------|------------------------------------------|
| Frontend    | React 18, Vite, Framer Motion, React Router 6 |
| Auth        | Firebase Authentication (Email + Google) |
| Backend     | Node.js, Express                         |
| Database    | MongoDB + Mongoose                       |
| File Storage| Cloudinary (covers, pages, avatars)      |
| Auth Verify | Firebase Admin SDK (server-side)         |

---

## 📁 Project Structure

```
mangaverse/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # Layout, MangaCard
│   │   ├── pages/             # Home, Browse, MangaDetail, Reader, Upload, Library, Dashboard, Profile, AuthPage
│   │   ├── context/           # AuthContext
│   │   ├── config/            # Firebase, Axios API
│   │   └── styles/            # globals.css
│   ├── index.html
│   ├── vite.config.js
│   └── .env.example
│
├── server/                    # Express backend
│   ├── config/
│   │   ├── firebase.js        # Firebase Admin SDK
│   │   └── cloudinary.js      # Cloudinary + Multer storage
│   ├── models/
│   │   ├── User.js
│   │   ├── Manga.js
│   │   ├── Chapter.js
│   │   └── Comment.js
│   ├── middleware/
│   │   └── auth.js            # Firebase token verification
│   ├── routes/
│   │   ├── auth.js
│   │   ├── manga.js
│   │   ├── chapter.js
│   │   └── user.js
│   ├── index.js
│   └── .env.example
│
└── package.json               # Root — runs both with concurrently
```

---

## 🚀 Setup Guide

### 1. Prerequisites

- Node.js 18+
- MongoDB Atlas account (free tier works)
- Firebase project
- Cloudinary account (free tier works)

---

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication** → Sign-in methods:
   - ✅ Email/Password
   - ✅ Google
4. In **Project Settings → General**, scroll down to "Your apps" → Add Web App → copy config keys
5. In **Project Settings → Service Accounts**, click "Generate new private key" → download JSON

---

### 3. MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a free cluster
3. Create a database user (Settings → Database Access)
4. Whitelist your IP (Network Access → Add IP → 0.0.0.0/0 for dev)
5. Get your connection string (Connect → Drivers) — looks like:
   `mongodb+srv://username:password@cluster.mongodb.net/mangaverse`

---

### 4. Cloudinary Setup

1. Go to [Cloudinary](https://cloudinary.com) and sign up
2. From the dashboard, copy your **Cloud name**, **API Key**, and **API Secret**

---

### 5. Environment Variables

#### Server (`server/.env`)
```env
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASS@cluster.mongodb.net/mangaverse
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
PORT=5000
```

> ⚠️ The `FIREBASE_PRIVATE_KEY` must keep the `\n` characters as-is in the `.env` file (don't replace them with real newlines).

#### Client (`client/.env`)
```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_API_URL=http://localhost:5000/api
```

---

### 6. Install & Run

```bash
# Install all dependencies
npm run install:all

# Run both frontend and backend simultaneously
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5000

---

## 📋 API Reference

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register user after Firebase signup |
| POST | `/api/auth/login` | Sync user on login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/auth/check-username/:username` | Check username availability |

### Manga
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/manga` | List with filters (genre, status, sort, search) |
| GET | `/api/manga/trending` | Top by views |
| GET | `/api/manga/featured` | Featured manga |
| GET | `/api/manga/:id` | Single manga with chapters |
| POST | `/api/manga` | Create manga (auth, multipart/form-data) |
| PUT | `/api/manga/:id` | Update manga (auth) |
| DELETE | `/api/manga/:id` | Delete manga (auth) |
| POST | `/api/manga/:id/like` | Toggle like |
| POST | `/api/manga/:id/save` | Toggle save |
| GET | `/api/manga/:id/comments` | Get comments |
| POST | `/api/manga/:id/comments` | Post comment |

### Chapters
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/chapters/:id` | Get chapter with pages |
| POST | `/api/chapters` | Upload chapter pages (auth, multipart/form-data) |
| DELETE | `/api/chapters/:id` | Delete chapter (auth) |

### Users
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/users/:username` | Public profile + manga |
| PUT | `/api/users/me/profile` | Update profile |
| GET | `/api/users/me/library` | Saved + liked manga |
| GET | `/api/users/me/uploads` | User's uploaded manga |
| POST | `/api/users/:id/follow` | Follow/unfollow |

---

## 🎨 Design System

The UI uses a dark ink/manga aesthetic with:
- **Color palette**: Near-black backgrounds, crimson accent, gold highlights
- **Typography**: Bebas Neue (display), Noto Serif JP (body accents), Inter (UI)
- **Animations**: Framer Motion page transitions, list staggering, sidebar spring animations
- **CSS variables**: Fully themeable via `:root` vars in `globals.css`

---

## 📦 Deployment Tips

- **Frontend**: Deploy to Vercel or Netlify — point `VITE_API_URL` to your server
- **Backend**: Deploy to Railway, Render, or a VPS
- **MongoDB**: Already hosted on Atlas
- **Cloudinary**: Already hosted
- **Firebase**: Update "Authorized domains" in Firebase Auth settings to include your production domain

---

## 📝 Notes

- Page ordering during upload: name files `001.jpg`, `002.jpg` etc. for correct order
- Max 100 pages per chapter upload
- Max 5 genres per manga
- Cover images are auto-resized to 800×1200 by Cloudinary
- Firebase email verification is sent on registration — users can still browse without verifying
