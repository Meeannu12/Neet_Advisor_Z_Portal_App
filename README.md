<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="90" alt="NestJS Logo" />
</p>

<h1 align="center">NEET Advisor Portal Backend API</h1>

<p align="center">
  Robust, scalable, and high-performance NestJS backend powering the NEET Advisor Portal mobile and web applications.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-12-E0234E?logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/TypeScript-ESM-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-TypeORM-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-ioredis-DC382D?logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/Cloudflare-R2%20Storage-F38020?logo=cloudflare&logoColor=white" alt="Cloudflare R2" />
  <img src="https://img.shields.io/badge/Vitest-Unit%20Tests-6E9F18?logo=vitest&logoColor=white" alt="Vitest" />
  <img src="https://img.shields.io/badge/Oxlint-Fast%20Linting-orange" alt="Oxlint" />
</p>

---

## 📋 Overview

The **NEET Advisor Portal API** provides identity verification, device session control, role-based access management, dynamic course assignment, automated lead generation, and high-performance video streaming for NEET examination counseling. Built on NestJS 12 and TypeORM with PostgreSQL, Redis, and Cloudflare R2, it handles high-concurrency requests with low-latency in-memory session caching and zero-egress video delivery.

---

## ✨ Key Features

- 🔐 **OTP-Based Mobile Authentication**
  - Phone number verification using 6-digit cryptographic OTPs with SHA-256 hashing.
  - Brute-force protection: 5-attempt lockout and 60-second resend cooldown via Redis.
  - Development convenience: OTP returned in API response only when `NODE_ENV !== 'production'`.

- 📱 **Multi-Device Session & Token Management**
  - Strict maximum of **3 active devices** per user with pessimistic locking to prevent concurrency race conditions.
  - Dual JWT architecture: Short-lived Access Token (15m) + Long-lived Refresh Token (30d).
  - Atomic refresh token rotation with cryptographic hash validation.
  - Device platform tracking (`android`, `ios`, `web`) with remote single and multi-device logout capabilities.

- ⚡ **High-Performance Redis Session Caching**
  - Sub-millisecond O(1) in-memory session verification in `JwtAuthGuard`.
  - Eliminates redundant PostgreSQL queries on every authenticated request, reducing database authorization load by ~95%.
  - Instant session invalidation on single or multi-device logout.

- 🎥 **Cloudflare R2 Video Streaming & Zero-Egress Storage**
  - **Zero Egress Fees**: Cloudflare R2 object storage eliminates expensive bandwidth and egress costs for video delivery.
  - **Buffer-Free Streaming**: HTTP Range Requests (`bytes=...`) allow HTML5, Android (ExoPlayer), and iOS (AVPlayer) to stream chunks on-the-fly without downloading entire files.
  - **Presigned Upload Architecture**: Clients upload large video files directly to Cloudflare R2 via AWS Signature V4 presigned PUT URLs, preserving backend server bandwidth and CPU.
  - **Clean Relational Catalog**: Each video is linked to normalized relational lookup entities (`course`, `language`, `session`, `category`) and formatted as clean, flat JSON in API responses.

- 🎓 **Dynamic Courses & Relational Data Model**
  - Normalized `courses` table storing dynamic counseling tracks (e.g., `UG`, `PG`, `MBBS`, `BDS`, `AYUSH`, `MD`, `MS`).
  - **Find-or-Create pattern**: Whenever a new course is specified during user registration, video publishing, or bulk import, it is automatically resolved and created in the `courses` table.

- 👥 **User Management & Role-Based Access Control (RBAC)**
  - Roles supported: `ADMIN`, `USER`, and custom counseling roles.
  - Paginated user list endpoints with safety bounds on limit and page offsets.

- 📥 **High-Performance Bulk Import Pipeline**
  - Ingestion of large user lists via **Excel (.xlsx)** and **CSV** files.
  - In-file duplicate mobile number detection and format validation.
  - **Batch Course Resolution**: Extracts distinct courses from uploaded files, batch-inserts any new courses in a single query, and maps them to user records using in-memory lookups.
  - Chunked database lookups (`In(numbers)`) and chunked batch saves (`chunk: 500`) to protect memory and database connection pools.

- 📩 **Automated Lead Capture & Manager Alerts**
  - Unregistered users attempting login are automatically captured as a `ContactRequest` (`pending`).
  - Automated HTML & plain-text email alerts dispatched to counseling managers via Nodemailer SMTP.

---

## 🛠️ Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **[NestJS 12](https://nestjs.com/)** | Progressive TypeScript backend framework (ESM) |
| **[PostgreSQL](https://www.postgresql.org/)** | Primary relational database |
| **[TypeORM](https://typeorm.io/)** | Object-Relational Mapper & migration management |
| **[Redis](https://redis.io/) (`ioredis`)** | In-memory session cache, OTP storage & attempt counters |
| **[Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/)** | S3-compatible object storage with zero egress fees for videos & thumbnails |
| **[@nestjs/jwt](https://docs.nestjs.com/security/authentication)** | JSON Web Token issuance and verification |
| **[ExcelJS](https://github.com/exceljs/exceljs) & [csv-parse](https://csv.js.org/)** | Spreadsheet and CSV parsing engine |
| **[Nodemailer](https://nodemailer.com/)** | SMTP email client for manager notifications |
| **[Vitest](https://vitest.dev/)** | High-speed unit and integration testing runner |
| **[Oxlint](https://oxc.rs/)** | High-performance linter |

---

## 📁 Project Structure

```text
src/
├── app.controller.ts            # Root healthcheck controller
├── app.module.ts                # Application root module
├── data-source.ts               # TypeORM CLI DataSource configuration
├── main.ts                      # Bootstrap entry point (CORS, Pipes, Port)
├── common/
│   ├── constants/               # Role constants (ADMIN, USER)
│   ├── decorators/              # Custom decorators (@Roles)
│   ├── enums/                   # Enums & constants (Course: UG, PG)
│   └── guards/                  # Route guards (RolesGuard)
├── database/
│   └── migrations/              # Database schema & performance index migrations
├── mail/
│   ├── mail.module.ts           # Nodemailer module configuration
│   └── mail.service.ts          # Email dispatch to managers
├── modules/
│   ├── auth/                    # Authentication (OTP, JWT, Refresh Token, Guard)
│   ├── categories/              # Video categories (Cutoff Analysis, College Review, etc.)
│   ├── contact-requests/        # Lead capture for unregistered login attempts
│   ├── courses/                 # Dynamic courses management (UG, PG, MBBS, etc.)
│   ├── languages/               # Video languages (Hindi, English, etc.)
│   ├── sessions/                # Counseling sessions (2024-25, 2025-26, etc.)
│   ├── storage/                 # Cloudflare R2 S3 storage client & AWS SigV4 presigner
│   ├── user-devices/            # Device tracking & multi-device limit enforcement
│   ├── users/                   # User profiles & bulk ingestion
│   └── videos/                  # Video catalog, streaming URLs & metadata management
│       ├── dto/                 # CreateVideoDto, QueryVideosDto, UploadUrlDto
│       ├── entities/            # Video entity (relational indexes)
│       ├── videos.controller.ts # Video endpoints
│       ├── videos.module.ts     # Videos module bundle
│       └── videos.service.ts    # Video business logic & R2 presigning
└── redis/
    ├── redis.module.ts          # Global Redis module
    └── redis.service.ts         # Redis client wrapper with retry strategy
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** `>= 20.x`
- **PostgreSQL** `>= 14.x`
- **Redis** `>= 6.x`
- **Cloudflare Account** (with R2 enabled)

### 1. Installation

```bash
# Clone the repository
git clone <repository-url>
cd Neet_Advisor_Protal_App

# Install dependencies
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

Configure your environment variables:

```ini
# Application
NODE_ENV=development
PORT=3000
CORS_ORIGIN=*

# PostgreSQL Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/neet_advisor_db

# Redis
REDIS_URL=redis://127.0.0.1:6379

# JWT Secrets & Expirations
JWT_ACCESS_SECRET=your_jwt_access_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Cloudflare R2 Storage (S3-Compatible)
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=neet-advisor-media
R2_PUBLIC_URL=https://pub-yourhash.r2.dev

# SMTP Configuration (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_specific_password
SMTP_FROM=no-reply@neetadvisor.com
MANAGER_EMAILS=manager@neetadvisor.com
```

### 3. Run Database Migrations

```bash
# Run all pending migrations
npm run migration:run

# Show migration status
npm run migration:show

# Revert the last applied migration
npm run migration:revert
```

### 4. Start the Application

```bash
# Development mode (with live reload)
npm run start:dev

# Debug mode
npm run start:debug

# Production build & start
npm run build
npm run start:prod
```

---

## 📡 API Reference

### 🔐 Authentication (`/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/send-otp` | Public | Generates & sends 6-digit OTP. Unregistered users trigger a contact request. |
| `POST` | `/auth/verify-otp` | Public | Verifies OTP, enforces 3-device limit, registers device, and issues token pair. |
| `POST` | `/auth/refresh` | Public | Rotates refresh token atomically and issues a new access token. |
| `GET` | `/auth/protected-test`| Bearer Token | Verifies current access token and session validity. |
| `POST` | `/auth/logout` | Bearer Token | Deactivates current device and invalidates its Redis session cache. |
| `POST` | `/auth/logout-all` | Bearer Token | Deactivates all devices for the user and revokes all active Redis sessions. |
| `GET` | `/auth/devices` | Bearer Token | Retrieves all active devices registered under the user account. |
| `DELETE` | `/auth/devices/:deviceId` | Bearer Token | Logs out and deactivates a specific device session. |

### 👥 Users (`/users`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/users` | Admin | Registers a single user. Dynamically creates course if not already present. |
| `GET` | `/users?page=1&limit=20` | Admin | Fetches paginated user records with course details and total metadata. |
| `POST` | `/users/import` | Admin | Multi-part file upload (`.xlsx` or `.csv`) for bulk user creation with batch course resolution. |
| `GET` | `/users/:number` | Authenticated | Retrieves user details with associated course by registered mobile number. |

### 🎥 Videos & Streaming (`/videos`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/videos/upload-url` | Admin | Generates Cloudflare R2 Presigned PUT upload URL for direct video/thumbnail upload. |
| `POST` | `/videos` | Admin | Registers newly uploaded video metadata with relational lookup resolution. |
| `GET` | `/videos` | Authenticated | Paginated & filtered catalog (`?course=UG&category=Cutoff&isPremium=false&search=...`). |
| `GET` | `/videos/:id` | Authenticated | Retrieves single video details with streaming and thumbnail URLs. |
| `DELETE`| `/videos/:id` | Admin | Deletes video record from database and purges files from Cloudflare R2 bucket. |

#### Sample Video Response:
```json
{
  "id": "e4f8b2d1-93c4-4a5e-b81f-723a10bc9831",
  "title": "NEET 2025 Round 1 Expected Cutoff",
  "description": "Comprehensive cutoff analysis across AIQ and State quotas",
  "isPremium": false,
  "thumbnailUrl": "https://pub-xxxx.r2.dev/thumbnails/1732612000-thumb.jpg",
  "videoUrl": "https://pub-xxxx.r2.dev/videos/1732612000-cutoff.mp4",
  "duration": 720,
  "course": "UG",
  "language": "Hindi",
  "session": "2025-26",
  "category": "Cutoff Analysis",
  "createdAt": "2026-11-26T10:00:00.000Z",
  "updatedAt": "2026-11-26T10:00:00.000Z"
}
```

---

## 📥 Bulk User Import Specification

When importing users via `POST /users/import`, the uploaded file (`.csv` or `.xlsx`) must contain the following columns:

| Column | Required | Rules / Format |
| :--- | :---: | :--- |
| `number` | **Yes** | Valid phone number with optional `+` prefix (10–15 digits) |
| `name` | **Yes** | Text (max 100 characters) |
| `state` | **Yes** | Text (max 100 characters) |
| `role` | **Yes** | Must be `user` for bulk import |
| `course` | **Yes** | Any course name string (e.g. `UG`, `PG`, `MBBS`, `BDS`). Dynamically resolved & created. |
| `email` | No | Valid email format (max 150 characters) |

---

## 🧪 Testing & Code Quality

```bash
# Run unit tests with Vitest (10 test suites, 11 tests)
npm test

# Run tests in watch mode
npm run test:watch

# Generate test coverage report
npm run test:cov

# Run Oxlint for fast static analysis
npm run lint

# Format code with Prettier
npm run format
```

---

## 🛡️ License

This project is private and proprietary. All rights reserved.
