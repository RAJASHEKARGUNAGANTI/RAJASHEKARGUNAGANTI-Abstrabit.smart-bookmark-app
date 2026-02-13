# Smart Bookmark

A real-time bookmark manager built with Next.js 16, Supabase, and Tailwind CSS v4. Save, organize, search, and sync your bookmarks across multiple browser tabs with multiple sync strategies.

## Features

### Authentication
- **Google OAuth** sign-in via Supabase Auth
- Protected routes with automatic redirect to login
- Secure session management with Supabase SSR

### Bookmark Management
- **Add bookmarks** with title, URL, and description
- **Edit bookmarks** inline with a card-based editing UI
- **Delete bookmarks** with confirmation dialog
- Collapsible add-bookmark form to keep the UI clean

### Search & Filtering
- **Full-text search** across bookmark titles, URLs, and descriptions
- **Hashtag system** — use `#hashtags` in descriptions for categorization
- Clickable hashtag pills on each bookmark card to filter instantly
- Collapsible hashtag filter panel with all available tags
- Active filter indicator with one-click clear

### Live Mode
- **Go Live** opens a dedicated live window (popup) for side-by-side viewing
- Live window state syncs across tabs via `localStorage` and `StorageEvent`
- Live status indicator with animated pulse
- Close live window from either the main tab or the live window itself
- Automatic cleanup when the live window is closed

### Sync Modes
Three selectable sync strategies accessible from the header dropdown:

| Mode | How It Works | Trade-offs |
|------|-------------|------------|
| **Normal (Tab Shift)** | Fetches bookmarks when the tab gains focus or becomes visible | Low battery usage, minimal API calls |
| **Time-Based (3s)** | Polls the API every 3 seconds for updates | Consistent updates, higher battery usage |
| **Webhook Live** *(Coming Soon)* | Real-time updates via Supabase Realtime channels and broadcast | Instant sync, currently under development |

- Sync mode persists across sessions via `localStorage`
- Connection status indicator (connected / connecting / disconnected) with color-coded icons
- Info popup explaining each mode with details

### Dark Mode / Light Mode
- Toggle between dark and light themes via a header button (Moon/Sun icons)
- Theme persists across sessions via `localStorage`
- Flash-free loading with an inline script that applies the theme before hydration
- Smooth CSS transitions between themes
- Full dark mode support across all components — header, cards, forms, filters, popups

### Webhook Debug Console
- Built-in debug panel when Webhook mode is active
- Timestamped log entries for all sync events (INSERT, UPDATE, DELETE)
- Broadcast event tracking
- Connection status changes logged in real-time
- Clearable log history

### UI / UX
- Responsive grid layout (1 / 2 / 3 columns based on screen size)
- Expandable bookmark descriptions with "Show more / Show less"
- Card-based design with hover shadows and smooth transitions
- Styled select dropdowns with custom chevron icon
- Toast notifications for all CRUD operations and filter actions
- Sticky header with all controls accessible at a glance

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Language | TypeScript |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| Auth & Database | [Supabase](https://supabase.com/) (Auth, PostgreSQL, Realtime) |
| Icons | [Lucide React](https://lucide.dev/) |
| Notifications | [React Hot Toast](https://react-hot-toast.com/) |
| Runtime | React 19 |

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/signout/route.ts   # Sign-out API endpoint
│   │   └── bookmarks/route.ts      # Bookmarks CRUD API (GET, POST, PATCH, DELETE)
│   ├── auth/callback/route.ts      # OAuth callback handler
│   ├── login/page.tsx              # Google OAuth login page
│   ├── page.tsx                    # Main app page (auth check, state management)
│   ├── layout.tsx                  # Root layout with dark mode script
│   └── globals.css                 # Tailwind config, dark mode variables, select styles
├── components/
│   ├── Header.tsx                  # App header (sync mode, live mode, theme toggle, sign out)
│   ├── Dashboard.tsx               # Bookmark grid, search, filters, CRUD operations
│   └── BookmarkForm.tsx            # Bookmark form component
└── lib/
    └── supabase/
        ├── client.ts               # Supabase browser client
        └── server.ts               # Supabase server client
```

## Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com/) project with:
  - Google OAuth provider configured
  - A `bookmarks` table with columns: `id`, `url`, `title`, `description`, `created_at`, `user_id`
  - Realtime enabled on the `bookmarks` table (for Webhook mode)

### Installation

```bash
git clone [<repository-url>](https://github.com/RAJASHEKARGUNAGANTI/RAJASHEKARGUNAGANTI-Abstrabit.smart-bookmark-app.git)
cd smart-bookmark-app
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```
