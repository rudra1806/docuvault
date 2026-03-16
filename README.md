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
  <img src="https://img.shields.io/badge/Status-Production%20Ready-success?style=flat-square" />
</p>

---

## 🌟 Overview

**DocuVault** is a production-ready, full-stack web application that lets users securely upload, store, preview, and download documents in the cloud. Files are stored on **Cloudinary** with metadata in **MongoDB**, and the entire system is protected by **JWT-based authentication**.

Whether it's PDFs, images, spreadsheets, or text files — upload it once, access it anywhere.

**✨ Latest Updates:**
- ✅ Environment-based configuration for production deployment
- ✅ Enhanced CORS security with origin whitelist
- ✅ Database indexes for optimized query performance
- ✅ Fixed upload progress tracking
- ✅ Comprehensive error handling and user feedback

---

## ✨ Features

### 🔐 Authentication & Security
- **User registration & login** with secure JWT token-based authentication
- **Password encryption** using bcrypt (10 salt rounds)
- **Protected routes** — only authenticated users can access their documents
- **Per-user isolation** — users can only view, download, and delete their own files
- **CORS whitelist** — configurable allowed origins for production security
- **Environment variables** — sensitive credentials never hardcoded

### 📤 File Upload
- **Drag & drop** or click-to-browse file upload
- **Real-time upload progress** indicator with percentage
- **Client + server-side validation** for file type and size
- **15+ supported file types**: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, PNG, GIF, TXT, CSV, ZIP, RAR, JSON, XML, and more
- **10 MB max** file size per upload
- **Cloudinary integration** for reliable cloud storage

### 👁️ File Preview
- **In-app preview modal** — view files without downloading
- **Image preview** (JPG, PNG, GIF, WebP, SVG, BMP) — rendered inline
- **PDF preview** — displayed using the browser's built-in PDF viewer
- **Text & code preview** (TXT, CSV, JSON, XML, JS, CSS, HTML, MD) — rendered in a dark-themed code block
- **Unsupported types** show a clear fallback with a download button
- **Keyboard shortcut** — press `Esc` to close the preview

### 📥 File Download
- **Byte-perfect downloads** — files are proxied through the backend, preserving the exact original content
- **Correct MIME types** and `Content-Disposition` headers for every file format
- **No CORS issues** — the backend streams the file, so the browser never contacts Cloudinary directly
- **Automatic filename preservation** — downloads use the original filename

### 🗂️ Document Management
- **Dashboard** with welcome banner, document count stats, and recent files
- **Documents page** with full list of all uploaded files
- **Real-time search** by filename with debounced input (400ms)
- **One-click delete** with confirmation dialog — removes from both Cloudinary and MongoDB
- **Optimized queries** with database indexes for fast performance

### 🎨 UI/UX
- **Modern, responsive design** built with Tailwind CSS
- **Dark theme** with glassmorphism effects and gradient accents
- **Smooth animations** and transitions throughout
- **Custom scrollbar** styling
- **Mobile-friendly** — works perfectly on all screen sizes
- **Loading states** and error handling for all operations
- **Empty states** with helpful messages and call-to-actions

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
│   │   └── auth.js                # JWT verification middleware
│   ├── models/
│   │   ├── User.js                # User schema with bcrypt + indexes
│   │   └── Document.js            # Document metadata schema + indexes
│   ├── routes/
│   │   ├── authRoutes.js          # POST /api/auth/*
│   │   └── documentRoutes.js      # GET/POST/DELETE /api/documents/*
│   ├── server.js                  # Express entry point
│   ├── .env                       # Environment variables (create from .env.example)
│   ├── .env.example               # Environment variable template
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx            # Top navigation bar
│   │   │   ├── FileCard.jsx          # Document card with actions
│   │   │   ├── FilePreviewModal.jsx  # Full-screen file preview
│   │   │   ├── SearchBar.jsx         # Debounced search input
│   │   │   └── ProtectedRoute.jsx    # Auth guard for routes
│   │   ├── context/
│   │   │   └── AuthContext.jsx       # React context for auth state
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx         # Sign in page
│   │   │   ├── RegisterPage.jsx      # Create account page
│   │   │   ├── DashboardPage.jsx     # Welcome + stats + recent docs
│   │   │   ├── UploadPage.jsx        # Drag & drop file upload
│   │   │   └── DocumentsPage.jsx     # Searchable document list
│   │   ├── services/
│   │   │   └── api.js                # Axios instance + API functions
│   │   ├── App.jsx                   # React Router setup
│   │   ├── main.jsx                  # React entry point
│   │   └── index.css                 # Tailwind + global styles
│   ├── .env                       # Environment variables (create from .env.example)
│   ├── .env.example               # Environment variable template
│   ├── index.html
│   ├── tailwind.config.cjs
│   ├── vite.config.js
│   └── package.json
│
├── README.md                      # This file
└── FIXES_APPLIED.md               # Detailed changelog and fixes
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

| Field       | Type     | Constraints             | Index |
| ----------- | -------- | ----------------------- | ----- |
| `name`      | String   | Required                | -     |
| `email`     | String   | Required, unique        | ✅    |
| `password`  | String   | Required, bcrypt hashed | -     |
| `createdAt` | Date     | Auto-generated          | -     |

### `documents` Collection

| Field          | Type     | Description                            | Index |
| -------------- | -------- | -------------------------------------- | ----- |
| `fileName`     | String   | Original uploaded file name            | ✅    |
| `fileURL`      | String   | Cloudinary storage URL                 | -     |
| `fileType`     | String   | File extension (e.g., `pdf`, `jpg`)    | -     |
| `fileSize`     | Number   | Size in bytes                          | -     |
| `cloudinaryId` | String   | Cloudinary public_id (used for delete) | -     |
| `resourceType` | String   | `"image"` or `"raw"` (Cloudinary type) | -     |
| `userId`       | ObjectId | Reference to the uploading user        | ✅    |
| `uploadDate`   | Date     | Auto-generated timestamp               | ✅    |

**Indexes:**
- `{ userId: 1, uploadDate: -1 }` — Fast document listing sorted by date
- `{ userId: 1, fileName: 1 }` — Fast search by filename
- `{ email: 1 }` — Fast user authentication lookups

---

## 🚀 Getting Started

### Prerequisites

| Requirement     | Version | Notes                                                    |
| --------------- | ------- | -------------------------------------------------------- |
| **Node.js**     | v18+    | [Download](https://nodejs.org)                           |
| **npm**         | v9+     | Comes with Node.js                                       |
| **MongoDB Atlas** | -     | Free tier is sufficient ([signup](https://www.mongodb.com/atlas)) |
| **Cloudinary**  | -       | Free tier is sufficient ([signup](https://cloudinary.com)) |

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
# Server Configuration
PORT=5000

# MongoDB Connection String
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/cloud-dms?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your_super_secret_key_here_min_32_characters
JWT_EXPIRE=7d

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Frontend URL for CORS (change in production)
FRONTEND_URL=http://localhost:5173
```

<details>
<summary><strong>📋 How to get your credentials</strong></summary>

#### Cloudinary Setup
1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Go to **Dashboard** or **Settings** → **API Keys**
3. Copy your **Cloud Name**, **API Key**, and **API Secret**
4. Paste them into your `.env` file

#### MongoDB Atlas Setup
1. Sign up at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a **free M0 cluster** (512MB storage)
3. Click **Connect** → **Drivers** → copy the connection string
4. Replace `<username>` and `<password>` with your database user credentials
5. Under **Network Access**, add `0.0.0.0/0` to allow connections from anywhere (for development)
6. For production, whitelist only your server's IP address

#### JWT Secret
Generate a strong random string (32+ characters):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

</details>

Start the backend server:

```bash
npm run dev
```

> ✅ The API will be running at `http://localhost:5000`

### 3️⃣ Frontend Setup

Open a new terminal window:

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `frontend/.env`:

```env
# Backend API URL
VITE_API_URL=http://localhost:5000/api
```

Start the frontend development server:

```bash
npm run dev
```

> ✅ The app will open at `http://localhost:5173`

### 4️⃣ Test the Application

1. Open `http://localhost:5173` in your browser
2. Click **Create account** and register a new user
3. Upload a test document (PDF, image, or text file)
4. Try previewing, downloading, and deleting documents
5. Test the search functionality

---

## 🖼️ Application Pages

| Page           | Route        | Description                                           | Auth Required |
| -------------- | ------------ | ----------------------------------------------------- | ------------- |
| **Login**      | `/login`     | Sign in with email & password                         | ❌            |
| **Register**   | `/register`  | Create a new account with name, email & password      | ❌            |
| **Dashboard**  | `/dashboard` | Welcome banner, document stats, quick actions, recent files | ✅      |
| **Upload**     | `/upload`    | Drag & drop or file browser with progress bar         | ✅            |
| **Documents**  | `/documents` | Full document list with search, preview, download, delete | ✅        |

---

## 🛡️ Security Features

| Feature                    | Implementation                                              |
| -------------------------- | ----------------------------------------------------------- |
| Password hashing           | bcrypt with 10 salt rounds                                  |
| Route protection           | JWT middleware on all document routes                        |
| Token delivery             | `Authorization: Bearer <token>` header                      |
| CORS protection            | Configurable origin whitelist via `FRONTEND_URL`            |
| File type validation       | Client-side (MIME type) + server-side (Cloudinary config)   |
| File size limit            | 10 MB max per upload (configurable)                         |
| User isolation             | All queries filter by `userId` — users only see their own files |
| Download security          | Files proxied through backend — Cloudinary URLs never exposed |
| Environment variables      | Sensitive credentials stored in `.env` files (not in code)  |
| Database indexes           | Optimized queries prevent performance-based attacks         |

---

## 📂 Supported File Types

| Category     | Extensions                          | Preview Support |
| ------------ | ----------------------------------- | --------------- |
| Documents    | PDF, DOC, DOCX                      | ✅ PDF only     |
| Spreadsheets | XLS, XLSX, CSV                      | ✅ CSV only     |
| Presentations | PPT, PPTX                          | ❌              |
| Images       | JPG, JPEG, PNG, GIF, WebP, SVG, BMP | ✅              |
| Text & Code  | TXT, JSON, XML, HTML, CSS, JS, MD   | ✅              |
| Archives     | ZIP, RAR                            | ❌              |

---

## 🚢 Production Deployment

### Backend Deployment (Node.js)

**Recommended Platforms:** Railway, Render, Heroku, DigitalOcean, AWS

1. **Build the application:**
   ```bash
   cd backend
   npm install --production
   ```

2. **Set environment variables** on your hosting platform:
   - `PORT` (usually auto-set by platform)
   - `MONGODB_URI` (your production MongoDB connection string)
   - `JWT_SECRET` (strong random string)
   - `JWT_EXPIRE` (e.g., `7d`)
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `FRONTEND_URL` (your production frontend URL)

3. **Start command:** `npm start`

4. **Health check endpoint:** `GET /` returns `{ success: true, message: "Cloud DMS API is running 🚀" }`

### Frontend Deployment (Static Site)

**Recommended Platforms:** Vercel, Netlify, Cloudflare Pages

1. **Build the application:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Set environment variable:**
   - `VITE_API_URL` = your production backend URL (e.g., `https://api.yourdomain.com/api`)

3. **Deploy the `dist/` folder** to your hosting platform

4. **Configure redirects** for React Router (SPA):
   
   **Vercel** (`vercel.json`):
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```
   
   **Netlify** (`_redirects` in `public/`):
   ```
   /*    /index.html   200
   ```

### Post-Deployment Checklist

- [ ] Test user registration and login
- [ ] Test file upload, preview, download, delete
- [ ] Verify CORS is working (no console errors)
- [ ] Check MongoDB Atlas IP whitelist (add production server IP)
- [ ] Verify Cloudinary uploads are working
- [ ] Test on mobile devices
- [ ] Set up SSL/TLS certificates (HTTPS)
- [ ] Configure custom domain (optional)
- [ ] Set up monitoring and error logging
- [ ] Enable MongoDB Atlas backups

---

## 🔧 Configuration Reference

### Backend Environment Variables

| Variable                  | Required | Default | Description                                    |
| ------------------------- | -------- | ------- | ---------------------------------------------- |
| `PORT`                    | No       | `5000`  | Server port                                    |
| `MONGODB_URI`             | Yes      | -       | MongoDB connection string                      |
| `JWT_SECRET`              | Yes      | -       | Secret key for JWT signing (32+ chars)         |
| `JWT_EXPIRE`              | No       | `7d`    | JWT token expiration time                      |
| `CLOUDINARY_CLOUD_NAME`   | Yes      | -       | Cloudinary cloud name                          |
| `CLOUDINARY_API_KEY`      | Yes      | -       | Cloudinary API key                             |
| `CLOUDINARY_API_SECRET`   | Yes      | -       | Cloudinary API secret                          |
| `FRONTEND_URL`            | No       | `http://localhost:5173` | Frontend URL for CORS whitelist |

### Frontend Environment Variables

| Variable        | Required | Default                      | Description                    |
| --------------- | -------- | ---------------------------- | ------------------------------ |
| `VITE_API_URL`  | No       | `http://localhost:5000/api`  | Backend API base URL           |

---

## 🧪 Testing

### Manual Testing Checklist

**Authentication:**
- [ ] Register with valid credentials
- [ ] Register with existing email (should fail)
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (should fail)
- [ ] Access protected route without token (should redirect to login)
- [ ] Logout and verify redirect to login

**File Upload:**
- [ ] Upload PDF file
- [ ] Upload image file (JPG, PNG)
- [ ] Upload text file (TXT, JSON)
- [ ] Upload file > 10MB (should fail with error message)
- [ ] Upload unsupported file type (should fail)
- [ ] Verify upload progress bar works
- [ ] Verify file appears in document list after upload

**File Management:**
- [ ] Search for documents by filename
- [ ] Preview image file
- [ ] Preview PDF file
- [ ] Preview text file
- [ ] Download file and verify integrity
- [ ] Delete file and verify removal from list
- [ ] Verify deleted file is removed from Cloudinary

**UI/UX:**
- [ ] Test on mobile device (responsive design)
- [ ] Test on tablet device
- [ ] Verify all animations work smoothly
- [ ] Check loading states during async operations
- [ ] Verify error messages are clear and helpful
- [ ] Test keyboard shortcuts (Esc to close modal)

### Automated Testing (Future Enhancement)

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

---

## 🐛 Troubleshooting

### Common Issues

**Issue:** "Cannot connect to MongoDB"
```
Solution: 
1. Check MongoDB Atlas IP whitelist (add 0.0.0.0/0 for development)
2. Verify MONGODB_URI in .env file
3. Ensure database user has correct permissions
```

**Issue:** "Cloudinary upload failed"
```
Solution:
1. Verify Cloudinary credentials in .env file
2. Check file size (must be < 10MB)
3. Verify file type is supported
4. Check Cloudinary dashboard for quota limits
```

**Issue:** "CORS error in browser console"
```
Solution:
1. Ensure FRONTEND_URL in backend .env matches your frontend URL
2. Verify backend server is running
3. Check browser console for exact error message
```

**Issue:** "Token expired" or "Not authorized" errors"
```
Solution:
1. User needs to log in again (token expired after 7 days)
2. Clear localStorage and log in again
3. Verify JWT_SECRET is set correctly in backend .env
```

**Issue:** "Upload progress not showing"
```
Solution:
1. Ensure you're using axios version 1.6.0 or higher
2. Check browser console for errors
3. Verify uploadDocument function in api.js accepts config parameter
```

**Issue:** "Preview modal not working"
```
Solution:
1. Check browser console for errors
2. Verify VITE_API_URL is set correctly in frontend .env
3. Ensure backend preview endpoint is accessible
4. Check if file type is supported for preview
```

---

## 📊 Performance Optimization

### Database Indexes
- ✅ Compound index on `{ userId: 1, uploadDate: -1 }` for fast document listing
- ✅ Compound index on `{ userId: 1, fileName: 1 }` for fast search
- ✅ Index on `{ email: 1 }` for fast user lookups

### Frontend Optimizations
- ✅ Debounced search (400ms delay) to reduce API calls
- ✅ Lazy loading of components
- ✅ Optimized images via Cloudinary
- ✅ Code splitting by route (Vite automatic)
- ✅ Minified production build

### Backend Optimizations
- ✅ File streaming (no memory buffering)
- ✅ Efficient MongoDB queries with indexes
- ✅ JWT stateless authentication (no session storage)
- ✅ Cloudinary CDN for file delivery

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🙏 Acknowledgments

- **React** - UI library
- **Vite** - Build tool
- **Tailwind CSS** - Styling framework
- **Express.js** - Backend framework
- **MongoDB** - Database
- **Cloudinary** - Cloud storage
- **JWT** - Authentication

---

## 📞 Support

For issues, questions, or suggestions:
- 📧 Email: [your-email@example.com]
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/docuvault/issues)
- 📖 Documentation: See `FIXES_APPLIED.md` for detailed changelog

---

<div align="center">

**Built with ❤️ by [Rudra Sanandiya](https://github.com/rudra1806)**

⭐ Star this repo if you find it helpful!

</div>
