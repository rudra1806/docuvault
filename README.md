# DocuVault (DocuVault)

A full-stack web application that allows users to **upload, store, manage, organize, and access documents securely** using Cloudinary cloud storage. Built with React, Node.js, Express, and MongoDB.

---

## 🏗️ System Architecture

```
User → Frontend (React/Vite) → Backend (Node/Express) → MongoDB + Cloudinary
```

Three-tier architecture: **Presentation → Application → Data**

---

## 📁 Project Structure

```
root/
├── backend/
│   ├── config/
│   │   ├── db.js              # MongoDB connection
│   │   └── cloudinary.js      # Cloudinary + Multer config
│   ├── controllers/
│   │   ├── authController.js  # Register & Login logic
│   │   └── documentController.js  # CRUD document logic
│   ├── middleware/
│   │   └── auth.js            # JWT verification middleware
│   ├── models/
│   │   ├── User.js            # User schema (bcrypt hashing)
│   │   └── Document.js        # Document metadata schema
│   ├── routes/
│   │   ├── authRoutes.js      # /api/auth/*
│   │   └── documentRoutes.js  # /api/documents/*
│   ├── server.js              # Express entry point
│   ├── .env.example           # Environment variable template
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── FileCard.jsx
│   │   │   ├── SearchBar.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # React auth context
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── UploadPage.jsx
│   │   │   └── DocumentsPage.jsx
│   │   ├── services/
│   │   │   └── api.js           # Axios instance + API functions
│   │   ├── App.jsx              # Routing setup
│   │   ├── main.jsx             # React entry point
│   │   └── index.css            # Tailwind + global styles
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

---

## ⚙️ Tech Stack

| Layer         | Technology                         |
| ------------- | ---------------------------------- |
| Frontend      | React 19, Vite, Tailwind CSS 3     |
| Backend       | Node.js, Express.js                |
| Database      | MongoDB (Mongoose ODM)             |
| Cloud Storage | Cloudinary                         |
| Auth          | JWT + bcrypt                       |
| HTTP Client   | Axios                              |

---

## 🔌 API Endpoints

### Authentication

| Method | Endpoint             | Description         |
| ------ | -------------------- | ------------------- |
| POST   | `/api/auth/register` | Create new account  |
| POST   | `/api/auth/login`    | Login & receive JWT |

### Documents (Protected — requires `Authorization: Bearer <token>`)

| Method | Endpoint                       | Description                    |
| ------ | ------------------------------ | ------------------------------ |
| POST   | `/api/documents/upload`        | Upload a document              |
| GET    | `/api/documents?search=`       | List documents (with search)   |
| GET    | `/api/documents/download/:id`  | Get download URL               |
| DELETE | `/api/documents/:id`           | Delete a document              |

---

## 🗃️ Database Design

### User Collection
| Field     | Type   | Notes          |
| --------- | ------ | -------------- |
| name      | String | Required       |
| email     | String | Unique, indexed|
| password  | String | Bcrypt hashed  |
| createdAt | Date   | Auto-generated |

### Document Collection
| Field        | Type     | Notes                    |
| ------------ | -------- | ------------------------ |
| fileName     | String   | Original file name       |
| fileURL      | String   | Cloudinary URL           |
| fileType     | String   | Extension (pdf, jpg, etc)|
| fileSize     | Number   | Bytes                    |
| cloudinaryId | String   | For deletion             |
| userId       | ObjectId | Reference to User        |
| uploadDate   | Date     | Auto-generated           |

---

## 🚀 Setup & Installation

### Prerequisites
- **Node.js** v18+ and **npm**
- **MongoDB Atlas** account (free tier works)
- **Cloudinary** account (free tier works)

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd innovative
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Edit `backend/.env` with your credentials:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/cloud-dms
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRE=7d
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Getting Cloudinary credentials:**
1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Go to **Dashboard** → copy Cloud Name, API Key, API Secret

**Getting MongoDB URI:**
1. Sign up at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a free cluster → click **Connect** → **Connect your application**
3. Copy the connection string and replace `<password>` with your DB password

Start the backend:
```bash
npm run dev
```
The server will start on `http://localhost:5000`.

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
The frontend will start on `http://localhost:5173`.

---

## 📋 Features

- ✅ **User Registration & Login** with JWT authentication
- ✅ **Password Encryption** using bcrypt
- ✅ **Document Upload** (PDF, DOC, DOCX, JPG, PNG, TXT)
- ✅ **Cloud Storage** via Cloudinary
- ✅ **View Documents** in a clean, organized list
- ✅ **Download Documents** directly from the cloud
- ✅ **Delete Documents** from cloud storage + database
- ✅ **Search Documents** by filename
- ✅ **Drag & Drop Upload** with progress indicator
- ✅ **Protected Routes** — only authenticated users can access documents
- ✅ **Responsive Design** — works on desktop and mobile

---

## 🖼️ Pages

| Page       | URL          | Description                      |
| ---------- | ------------ | -------------------------------- |
| Login      | `/login`     | Sign in with email & password    |
| Register   | `/register`  | Create a new account             |
| Dashboard  | `/dashboard` | Welcome banner, stats, recents   |
| Upload     | `/upload`    | Drag & drop file upload          |
| Documents  | `/documents` | Search and manage all documents  |

---

## 🛡️ Security

- Passwords are hashed with **bcrypt** (10 salt rounds)
- Routes are protected with **JWT** middleware
- File type validation on both client and server
- File size limit: **10 MB**
- Users can only access/delete their own documents

---

## 📜 License

This project is for educational purposes.
