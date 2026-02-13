# Smart Bookmark App

A simple, real-time bookmark manager built with Next.js, Supabase, and Tailwind CSS.

## Features

- **Google OAuth Login** — Sign in with your Google account (no email/password)
- **Add Bookmarks** — Save bookmarks with a title and URL
- **Private Bookmarks** — Each user can only see their own bookmarks
- **Real-Time Sync** — Bookmarks update across browser tabs instantly without page refresh
- **Delete Bookmarks** — Remove bookmarks you no longer need

## Tech Stack

- **Next.js 15** (App Router, Server Actions)
- **Supabase** (Auth, PostgreSQL Database, Realtime)
- **Tailwind CSS** (Styling)
- **Vercel** (Deployment)

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project
- Google OAuth credentials (Client ID & Secret)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd smart-bookmark-app
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Authentication → Providers → Google** and enter your Google Client ID and Client Secret
3. Copy the Supabase callback URL and add it to your Google Cloud Console's **Authorized Redirect URIs**
4. Run this SQL in the **SQL Editor** to create the bookmarks table:

```sql
CREATE TABLE bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookmarks"
  ON bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks"
  ON bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks"
  ON bookmarks FOR DELETE
  USING (auth.uid() = user_id);
```

5. Enable **Realtime** for the `bookmarks` table: Database → Replication → Enable for `bookmarks`

### 3. Configure Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment (Vercel)

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables
4. Deploy
5. **Important:** Update these settings with your Vercel domain:
   - Google Cloud Console → Authorized Redirect URIs: add `https://<your-app>.vercel.app/auth/callback`
   - Supabase → Authentication → URL Configuration → Site URL: set to your Vercel domain

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous/public key |

## Problems Encountered & Solutions

*Document any issues you face during setup and deployment here.*

## Live URL

*Add your Vercel deployment URL here after deploying.*
