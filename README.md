# Nitech Estimates

Professional construction estimate builder for civil engineering projects. Create detailed estimates, rate analysis, measurement sheets, billing, and generate professional PDF reports.

## Features

- **Estimate Builder** — Create new estimates with item-level detail, quantities, and pricing
- **Rate Analysis** — Build rate analysis sheets with SSR item integration
- **Measurement Sheets** — Record field measurements with automatic quantity calculation
- **Lead Charges** — Configure material lead/lift charges with distance-based calculation
- **Abstract of Estimate** — Auto-generated summary with GST, insurance, and overhead calculations
- **Billing** — Create running bills with measurement book (MB) tracking
- **PDF Export** — Generate professional PDF reports for estimates and billing
- **Data Persistence** — Cloud sync with MongoDB Atlas

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS v4, Zustand
- **Backend:** Next.js API Routes, MongoDB
- **Auth:** NextAuth.js with Google OAuth
- **PDF Generation:** Puppeteer
- **Desktop:** Electron (Windows)

## Prerequisites

- Node.js 20+
- MongoDB Atlas account (or local MongoDB instance)
- Google OAuth credentials (for authentication)

## Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nitechestimates/Nitech-Estimates.git
   cd Nitech-Estimates
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env.local`** with the following variables:
   ```env
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<database>
   NEXTAUTH_SECRET=<generate-with: openssl rand -base64 32>
   NEXTAUTH_URL=http://localhost:3000
   GOOGLE_CLIENT_ID=<your-google-client-id>
   GOOGLE_CLIENT_SECRET=<your-google-client-secret>
   ```

4. **Run in development:**
   ```bash
   npm run dev
   ```

## Building

### Web (Production)
```bash
npm run build
npm start
```

### Desktop (Windows)
```bash
npm run desktop:build
```
Output will be in `dist-desktop/`.

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── api/                # API routes (auth, estimates, billing, PDF)
│   ├── estimate-builder/   # Main application pages
│   ├── contact/            # Contact page
│   └── tutorial/           # Tutorial page
├── components/             # Shared React components
├── lib/                    # Utilities, store, auth, DB connection
├── public/                 # Static assets
├── scripts/                # Data conversion utilities
└── main.js                 # Electron main process
```

## License

Private — All rights reserved.
