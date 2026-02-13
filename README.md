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
│   ├── Dashboard.tsx               # Main orchestrator: state, sync modes, CRUD, add form
│   ├── SearchFilterBar.tsx         # Search input, hashtag filters, filter pills
│   ├── BookmarkCard.tsx            # Individual bookmark card (view + inline edit modes)
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

## Problems Faced & How I Solved Them

### 1. Tailwind CSS v4 Dark Mode Not Working with Class Toggle

**Problem:** After adding a dark/light mode toggle that adds/removes a `.dark` class on `<html>`, none of the `dark:` utility classes worked. The UI stayed in light mode regardless of the toggle state.

**Root Cause:** Tailwind CSS v4 changed the default behavior of the `dark:` variant. In v3 you could set `darkMode: 'class'` in `tailwind.config.js`, but v4 uses `@media (prefers-color-scheme: dark)` by default and there is no config file — it's all CSS-based.

**Solution:** Added a single line to `globals.css` to override the dark variant to use class-based detection:
```css
@custom-variant dark (&:where(.dark, .dark *));
```
This tells Tailwind v4 to apply `dark:` styles whenever an ancestor has the `.dark` class instead of relying on the OS preference.

### 2. Flash of Wrong Theme on Page Load (FOUC)

**Problem:** When a user had dark mode saved in `localStorage` and refreshed the page, there was a visible flash of the light theme before React hydrated and applied the dark class.

**Root Cause:** React's `useEffect` and `useState` run after the component mounts, so the theme class was being applied too late — the browser had already painted the light-themed HTML.

**Solution:** Added a blocking inline `<script>` in `layout.tsx` (inside `<head>`) that reads `localStorage` and applies the `.dark` class synchronously before the first paint:
```tsx
<script dangerouslySetInnerHTML={{ __html: `
  (function() {
    try {
      var theme = localStorage.getItem('bookmark_theme');
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      }
    } catch (e) {}
  })();
`}} />
```
This runs before React hydrates, eliminating the flash entirely.

### 3. Dashboard Component Growing Too Large (~900 Lines)

**Problem:** The `Dashboard.tsx` file kept growing as features were added — search, hashtag filtering, bookmark cards with inline editing, expandable descriptions, CRUD operations, sync modes, and a webhook debug console all lived in one component. It became hard to navigate and maintain.

**Solution:** Split the component into three focused files:
- **`SearchFilterBar.tsx`** — handles the search input, hashtag filter toggle, active filter chip, and collapsible hashtag pills. Receives all state via props.
- **`BookmarkCard.tsx`** — renders a single bookmark card with view mode (title, URL, description with truncation, hashtag pills, footer) and edit mode (inline form). Manages its own edit/expand state internally.
- **`Dashboard.tsx`** — now the orchestrator: owns the bookmarks array, CRUD API calls, sync mode effects, and composes the two sub-components.

This reduced Dashboard from ~900 lines to ~370 lines, and each component has a single responsibility.

### 4. Native `<select>` Options Cannot Be Fully Styled

**Problem:** The sync mode dropdown needed styled options with good padding and rounded corners to match the rest of the UI. But native `<option>` elements ignore most CSS properties (padding, border-radius, fonts) across browsers.

**Solution:** Applied a two-layer approach:
- Styled the **outer container** with Tailwind (`rounded-xl`, `border`, `shadow-sm`, `px-3 py-2`) and used `appearance-none` on the `<select>` with a custom SVG chevron as a background image.
- Added global CSS for `select option` in `globals.css` with `padding`, `background-color`, and `color` for both light and dark themes. While browser support for option styling is limited, it works in Chromium-based browsers which cover the majority of users.

### 5. Live Window State Sync Across Tabs

**Problem:** When the user clicks "Go Live" to open a popup window, the main tab needs to know the live window exists, and both tabs need to stay in sync. If the user closes the popup directly (via the OS close button), the main tab had no way to detect this.

**Solution:** Used a combination of three mechanisms:
- **`localStorage`** as the shared state store (`bookmark_live_active` flag)
- **`StorageEvent`** listener to detect cross-tab localStorage changes in real-time
- **`setInterval` polling** (every 500ms) as a fallback for same-tab detection
- **`beforeunload`** event on the live window to clean up the localStorage flag when closed

This ensures the main tab always knows the current live state, regardless of how the popup was closed.

### 6. Supabase Realtime Channel Cleanup on Mode Switch

**Problem:** When switching between sync modes rapidly, orphaned Supabase Realtime channels would accumulate, causing duplicate event handlers and memory leaks. Sometimes the app would receive the same bookmark update multiple times.

**Solution:** (Before removing webhook code) Implemented a careful cleanup pattern:
- Used `useRef` to track the current channel and a subscribing flag
- On mode switch away from webhook, immediately removed the channel
- On cleanup, used `setTimeout(..., 0)` to defer channel removal to avoid race conditions with in-flight subscriptions
- Checked for existing channels by topic name and removed duplicates before creating new ones

This problem informed the decision to defer the webhook feature to "Coming Soon" and focus on the simpler, more reliable Normal and Time-Based modes first.
