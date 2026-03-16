<p align="center">
  <img src="https://img.shields.io/badge/DocuVault-Cloud%20DMS-6366f1?style=for-the-badge&logo=files&logoColor=white" alt="DocuVault" />
</p>

<h1 align="center">📄 DocuVault</h1>

<p align="center">
  <strong>A secure, cloud-based Document Management System</strong><br/>
  Upload · Preview · Download · Manage — all from your browser.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Cloudinary-Storage-3448C5?style=flat-square&logo=cloudinary&logoColor=white" />
  <img src="https://img.shields.io/badge/JWT-Auth-000000?style=flat-square&logo=jsonwebtokens&logoColor=white" />
</p>

---

## 🌟 Overview

**DocuVault** is a full-stack web application that lets users securely upload, store, preview, and download documents in the cloud. Files are stored on **Cloudinary** with metadata in **MongoDB**, and the entire system is protected by **JWT-based authentication**.

Whether it's PDFs, images, spreadsheets, or text files — upload it once, access it anywhere.

---

## ✨ Features

### 🔐 Authentication & Security
- **User registration & login** with secure JWT token-based authentication
- **Password encryption** using bcrypt (10 salt rounds)
- **Protected routes** — only authenticated users can access their documents
- **Per-user isolation** — users can only view, download, and delete their own files

### 📤 File Upload
- **Drag & drop** or click-to-browse file upload
- **Real-time upload progress** indicator
- **Client + server-side validation** for file type and size
- **15+ supported file types**: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, PNG, GIF, TXT, CSV, ZIP, RAR, JSON, XML, and more
- **10 MB max** file size per upload

### 👁️ File Preview
- **In-app preview modal** — view files without downloading
- **Image preview** (JPG, PNG, GIF, WebP) — rendered inline
- **PDF preview** — displayed using the browser's built-in PDF viewer
- **Text & code preview** (TXT, CSV, JSON, XML, JS, CSS, HTML) — rendered in a dark-themed code block
- **Unsupported types** show a clear fallback with a download button
- **Keyboard shortcut** — press `Esc` to close the preview

### 📥 File Download
- **Byte-perfect downloads** — files are proxied through the backend, preserving the exact original content
- **Correct MIME types** and `Content-Disposition` headers for every file format
- **No CORS issues** — the backend streams the file, so the browser never contacts Cloudinary directly

### 🗂️ Document Management
- **Dashboard** with welcome banner, document count stats, and recent files
- **Documents page** with full list of all uploaded files
- **Real-time search** by filename with debounced input
- **One-click delete** with confirmation dialog — removes from both Cloudinary and MongoDB

### 🎨 UI/UX
- **Modern, responsive design** built with Tailwind CSS
- **Inter font** from Google Fonts for clean typography
- **Glassmorphism cards**, gradient banners, and smooth animations
- **Custom scrollbar** styling
- **Mobile-friendly** — works on all screen sizes

---

## 🏗️ Architecture

```
┌─────────────────┐     HTTP/REST      ┌─────────────────────┐     Cloud Storage     ┌──────────────┐
│                 │  ←──────────────→   │                     │  ←────────────────→   │              │
│   React (Vite)  │                    │  Node.js / Express  │                      │  Cloudinary  │
│   Frontend      │                    │  Backend API        │                      │  (Files)     │
│                 │                    │                     │                      │              │
└─────────────────┘                    └─────────┬───────────┘                      └──────────────┘
                                                 │
                                                 │  Mongoose ODM
                                                 ▼
                                       ┌─────────────────────┐
                                       │                     │
                                       │   MongoDB Atlas     │
                                       │   (Metadata)        │
                                       │                     │
                                       └─────────────────────┘
```

**Three-tier architecture**: Presentation → Application → Data

---

## ⚙️ Tech Stack

| Layer           | Technology                                  |
| --------------- | ------------------------------------------- |
| **Frontend**    | React 19, Vite 8, Tailwind CSS 3            |
| **Backend**     | Node.js, Express.js                         |
| **Database**    | MongoDB Atlas (Mongoose ODM)                |
| **Cloud Storage** | Cloudinary (image + raw resource types)   |
| **Authentication** | JWT (JSON Web Tokens) + bcrypt           |
| **HTTP Client** | Axios (with interceptors)                   |
| **File Upload** | Multer + multer-storage-cloudinary          |

---

## 📁 Project Structure

```
DocuVault/
├── backend/
│   ├── config/
│   │   ├── db.js                  # MongoDB connection setup
│   │   └── cloudinary.js          # Cloudinary SDK + Multer storage config
│   ├── controllers/
│   │   ├── authController.js      # Register & Login handlers
│   │   └── documentController.js  # Upload, List, Download, Preview, Delete
│   ├── middleware/
│   │   └── auth.js                # JWT verification (header + query param)
│   ├── models/
│   │   ├── User.js                # User schema with bcrypt pre-save hook
│   │   └── Document.js            # Document metadata schema
│   ├── routes/
│   │   ├── authRoutes.js          # POST /api/auth/*
│   │   └── documentRoutes.js      # GET/POST/DELETE /api/documents/*
│   ├── server.js                  # Express entry point
│   ├── .env.example               # Environment variable template
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx            # Top navigation bar
│   │   │   ├── FileCard.jsx          # Document card with preview/download/delete
│   │   │   ├── FilePreviewModal.jsx  # Full-screen file preview overlay
│   │   │   ├── SearchBar.jsx         # Debounced search input
│   │   │   └── ProtectedRoute.jsx    # Auth guard for routes
│   │   ├── context/
│   │   │   └── AuthContext.jsx       # React context for auth state
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx         # Sign in page
│   │   │   ├── RegisterPage.jsx      # Create account page
│   │   │   ├── DashboardPage.jsx     # Welcome banner + stats + recent docs
│   │   │   ├── UploadPage.jsx        # Drag & drop file upload
│   │   │   └── DocumentsPage.jsx     # Searchable document list
│   │   ├── services/
│   │   │   └── api.js                # Axios instance + all API functions
│   │   ├── App.jsx                   # React Router setup
│   │   ├── main.jsx                  # React entry point
│   │   └── index.css                 # Tailwind directives + global styles
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

---

## 🔌 API Reference

### Authentication

| Method | Endpoint             | Body                              | Description              |
| ------ | -------------------- | --------------------------------- | ------------------------ |
| POST   | `/api/auth/register` | `{ name, email, password }`       | Create a new account     |
| POST   | `/api/auth/login`    | `{ email, password }`             | Login & receive JWT      |

### Documents <sub>(all routes require `Authorization: Bearer <token>`)</sub>

| Method | Endpoint                       | Description                                  |
| ------ | ------------------------------ | -------------------------------------------- |
| POST   | `/api/documents/upload`        | Upload a file (multipart/form-data)          |
| GET    | `/api/documents?search=`       | List all documents (optional search filter)  |
| GET    | `/api/documents/download/:id`  | Download a file (streams bytes as attachment) |
| GET    | `/api/documents/preview/:id`   | Preview a file (streams bytes inline)        |
| DELETE | `/api/documents/:id`           | Delete from Cloudinary + MongoDB             |

---

## 🗃️ Database Schema

### `users` Collection

| Field       | Type     | Constraints             |
| ----------- | -------- | ----------------------- |
| `name`      | String   | Required                |
| `email`     | String   | Required, unique        |
| `password`  | String   | Required, bcrypt hashed |
| `createdAt` | Date     | Auto-generated          |

### `documents` Collection

| Field          | Type     | Description                            |
| -------------- | -------- | -------------------------------------- |
| `fileName`     | String   | Original uploaded file name            |
| `fileURL`      | String   | Cloudinary storage URL                 |
| `fileType`     | String   | File extension (e.g., `pdf`, `jpg`)    |
| `fileSize`     | Number   | Size in bytes                          |
| `cloudinaryId` | String   | Cloudinary public_id (used for delete) |
| `resourceType` | String   | `"image"` or `"raw"` (Cloudinary type) |
| `userId`       | ObjectId | Reference to the uploading user        |
| `uploadDate`   | Date     | Auto-generated timestamp               |

---

## 🚀 Getting Started

### Prerequisites

| Requirement     | Notes                                                    |
| --------------- | -------------------------------------------------------- |
| **Node.js**     | v18 or higher ([download](https://nodejs.org))           |
| **npm**         | Comes with Node.js                                       |
| **MongoDB Atlas** | Free tier is sufficient ([signup](https://www.mongodb.com/atlas)) |
| **Cloudinary**  | Free tier is sufficient ([signup](https://cloudinary.com)) |

### 1️⃣ Clone the Repository

```bash
git clone <your-repo-url>
cd DocuVault
```

### 2️⃣ Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` with your credentials:

```env
PORT=5000

# MongoDB — get from Atlas dashboard → Connect → Drivers
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/docuvault?retryWrites=true&w=majority

# JWT — use any strong random string
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRE=7d

# Cloudinary — get from Cloudinary dashboard
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

<details>
<summary><strong>📋 How to get your credentials</strong></summary>

#### Cloudinary
1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Go to **Settings** → **API Keys**
3. Copy your **Cloud Name**, **API Key**, and **API Secret**

#### MongoDB Atlas
1. Sign up at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a **free M0 cluster**
3. Click **Connect** → **Drivers** → copy the connection string
4. Replace `<password>` with your database user's password
5. Under **Network Access**, add `0.0.0.0/0` to allow connections from anywhere (for development)

</details>

Start the backend server:

```bash
npm run dev
```

> The API will be running at `http://localhost:5000`

### 3️⃣ Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

> The app will open at `http://localhost:5173`

---

## 🖼️ Pages

| Page           | Route        | Description                                           |
| -------------- | ------------ | ----------------------------------------------------- |
| **Login**      | `/login`     | Sign in with email & password                         |
| **Register**   | `/register`  | Create a new account with name, email & password      |
| **Dashboard**  | `/dashboard` | Welcome banner, document stats, quick actions, recent files |
| **Upload**     | `/upload`    | Drag & drop or file browser with progress bar         |
| **Documents**  | `/documents` | Full document list with search, preview, download, delete |

---

## 🛡️ Security

| Feature                    | Implementation                                              |
| -------------------------- | ----------------------------------------------------------- |
| Password hashing           | bcrypt with 10 salt rounds                                  |
| Route protection           | JWT middleware on all document routes                        |
| Token delivery             | `Authorization: Bearer <token>` header + query param fallback |
| File type validation       | Client-side (MIME type) + server-side (Cloudinary config)   |
| File size limit            | 10 MB max per upload                                        |
| User isolation             | All queries filter by `userId` — users only see their own files |
| Download security          | Files proxied through backend — Cloudinary URLs never exposed to client |

---

## 📂 Supported File Types

| Category     | Extensions                          |
| ------------ | ----------------------------------- |
| Documents    | PDF, DOC, DOCX                      |
| Spreadsheets | XLS, XLSX, CSV                      |
| Presentations | PPT, PPTX                          |
| Images       | JPG, JPEG, PNG, GIF, WebP           |
| Text & Code  | TXT, JSON, XML, HTML, CSS, JS       |
| Archives     | ZIP, RAR                            |

---

## 🧪 Running in Production

```bash
# Build the frontend
cd frontend
npm run build

# The optimized output is in frontend/dist/
# Serve it with any static file server or deploy to Vercel/Netlify

# Start the backend
cd backend
npm start
```

---

<div align="center">

**Built by [Rudra Sanandiya](https://github.com/rudra1806)**

</div>
