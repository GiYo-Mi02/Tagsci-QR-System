# TSHS Student ID QR-Verification System (Production)

An automated, QR-based student entry verification portal for **Taguig Science High School**. Integrated with **Supabase PostgreSQL** and **Supabase Storage** for secure gate verification and bulk student roster ingestion.

---

## ⚡ Quick Start (Local Development)

### 1. Configure Environment Variables
Create a `.env` file in the project root directory (ensure it is added to `.gitignore`):

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 2. Run Database Migrations
Go to your **Supabase Dashboard → SQL Editor** and execute the setup queries:

```sql
-- 1. Create students table
CREATE TABLE students (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lrn text UNIQUE NOT NULL,
  full_name text NOT NULL,
  section text NOT NULL,
  grade_level text NOT NULL,
  id_image_url text DEFAULT '',
  imported_at timestamp WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Fast LRN lookup index
CREATE UNIQUE INDEX idx_students_lrn ON students(lrn);

-- 3. Row Level Security policies
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access for verification"
  ON students FOR SELECT TO public USING (true);

CREATE POLICY "Allow admin full credentials management"
  ON students FOR ALL TO public USING (true);

-- 4. Storage Bucket Policies (Create 'student-ids' public bucket first)
CREATE POLICY "public_read_student_ids"
  ON storage.objects FOR SELECT TO public USING (bucket_id = 'student-ids');

CREATE POLICY "allow_anon_inserts_for_ids"
  ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'student-ids');

CREATE POLICY "allow_anon_updates_for_ids"
  ON storage.objects FOR UPDATE TO public USING (bucket_id = 'student-ids') WITH CHECK (bucket_id = 'student-ids');
```

### 3. Run the Development Server
Install dependencies and run the hot-reloading dev environment:

```bash
# Install dependencies
npm install

# Start the Vite HMR server & Express middleware
npm run dev
```
Open **http://localhost:3000** in your browser.

---

## 📦 Production Deployment

### Option A — Build and Host Static Assets (Static/JAMstack)
If hosting on static services like Vercel, Netlify, or Github Pages:
```bash
# Build the production bundle
npm run build
```
Upload the `/dist` directory. Set the environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the hosting dashboard.

### Option B — Self-hosted Server (Node.js)
To serve from a Raspberry Pi, gateway server, or school computer:
```bash
# Build static client assets and bundle server.ts
npm run build

# Start the Node.js production server
npm run start
```

---

## 🖼️ Student ID Image Filename Contract

When performing bulk imports under the **Import Student data** tab:
1. Select your `.csv` or `.json` student list.
2. Under **Link Student ID Images**, upload a folder of images.
3. Every image file **MUST** be named exactly as the student's 12-digit LRN (e.g. `123456789012.jpg`, `123456789012.png`, `123456789012.webp`).
4. The system automatically matches images, uploads them, and connects the links before database inserts.
