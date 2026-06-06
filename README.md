# Nitech Estimates

Professional construction estimate builder and rate analysis platform for civil engineering projects. Built with Next.js, React, Electron, and MongoDB.

---

## 🚀 Features

- **Estimate Builder** — Item-level detailing, quantities, and automatic cost calculations.
- **Rate Analysis** — Build custom rate analysis sheets with District Schedule of Rates (DSR / SSR) items.
- **Measurement Book (MB) Tracking** — Multi-item measurement recording with automated percentage-completed scaling.
- **Lead Charges Calculator** — Custom distance-based lead and lift charges interpolation.
- **Abstract Generator** — Auto-generated summary sheets with GST, overhead, insurance, and tribal cost calculations.
- **Secure PDF Export** — Spawns Puppeteer to render and export audit-compliant PDF reports for estimates and billing.
- **Offline Sync & Cloud Sync** — Robust local operations inside Electron with cloud sync backed by MongoDB Atlas.

---

## 🔒 Security Specs (Production Hardening)

The application has been hardened for production deployment with the following security features:
1. **API Protection**: All write endpoints require active sessions authenticated via NextAuth.
2. **Context Isolation & Preload**: Electron's renderer process is isolated (`contextIsolation: true`) and communicates safely with the main process using exposed contextBridge APIs in `preload.js`.
3. **HTML Sanitization**: All user-provided fields are escaped using a dedicated HTML-escape utility (`lib/escapeHtml.js`) prior to PDF rendering, protecting against PDF HTML/XSS injection.
4. **Rate Limiting**: Critical endpoints (like PDF rendering and saving estimates) are rate-limited to prevent abuse or denial-of-service (DoS) on Puppeteer.
5. **Secure Cookies**: Session cookies automatically use `secure: true` in production environments, while allowing non-secure cookies on `localhost` (essential for Electron).
6. **Soft Deletes**: Deleting estimates or billings marks them with a `deletedAt` field, preventing data loss and allowing recovery options.

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env.local` and configure:

| Variable | Description | Example / Recommended |
| :--- | :--- | :--- |
| `MONGODB_URI` | MongoDB Atlas Connection String | `mongodb+srv://<user>:<pwd>@cluster.mongodb.net/db` |
| `NEXTAUTH_SECRET` | Secret key used to encrypt NextAuth JWTs | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Base canonical URL of the web app | `http://localhost:3000` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Obtain from Google Developer Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Obtain from Google Developer Console |

---

## 🛠️ Installation & Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Initialize Database Indexes & Verify**:
   To programmatically build the necessary compound indexes on MongoDB collections, run:
   ```bash
   npm run db:migrate
   ```

3. **Run Web App in Development**:
   ```bash
   npm run dev
   ```

4. **Run Desktop App (Electron) in Development**:
   ```bash
   npm run desktop:dev
   ```

---

## 🧪 Running Tests

The test suite runs both Unit tests (Vitest) and End-to-End tests (Playwright):

- **Run Unit Tests (Vitest)**:
  ```bash
  npm run test:unit
  ```

- **Run E2E Tests (Playwright)**:
  ```bash
  npm run test:e2e
  ```

- **Run All Tests**:
  ```bash
  npm run test
  ```

---

## 📦 Production Builds

### Web Server (Next.js Standalone)
```bash
npm run build
npm run start
```

### Desktop App (Windows Installer)
To package the Electron application into a secure Windows executable installer (`.exe`), run:
```bash
npm run desktop:build
```
*Note: The builder config has been secured (`asar: true`) to prevent extraction of the source code, and environment configuration files (`.env*`) are excluded from packaging to prevent credential leakage. Config must be injected via OS environments or run parameters.*

---

## 🗄️ Database Administration (Disaster Recovery & Backups)

### Automated Backups
It is highly recommended to host the production database on **MongoDB Atlas** with **Cloud Backup** enabled (M10+ instances support continuous cloud backups with point-in-time recovery).

### Manual Backups (CLI)
To manually export all active data from your shell:
```bash
# Export all active estimates
mongoexport --uri="<MONGODB_URI>" --collection="estimates" --query='{"deletedAt": {"$exists": false}}' --out="estimates_backup.json"

# Export all active billings
mongoexport --uri="<MONGODB_URI>" --collection="billings" --query='{"deletedAt": {"$exists": false}}' --out="billings_backup.json"
```

### Restore (Disaster Recovery)
To restore backup files to a new database instance:
```bash
mongoimport --uri="<MONGODB_URI>" --collection="estimates" --file="estimates_backup.json" --merge
mongoimport --uri="<MONGODB_URI>" --collection="billings" --file="billings_backup.json" --merge
```

### Soft-Delete Data Recovery
Because deleted estimates are never hard-deleted from the database, you can restore any deleted estimate by running this MongoDB command:
```javascript
db.estimates.updateOne(
  { _id: ObjectId("<ESTIMATE_ID>") },
  { $unset: { deletedAt: "" } }
)
```
