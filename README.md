# song bracket

Vote an artist's top 64 songs (from Last.fm playcount) down to a single winner, one matchup at a time.

Stateless: no database, no localStorage, no cookies. Refresh = reset.

## Setup

1. Get a Last.fm API key: https://www.last.fm/api/account/create
2. Create `.env.local`:
   ```
   LASTFM_API_KEY=your_key_here
   ```
3. Install + run:
   ```
   npm install
   npm run dev
   ```
4. Open http://localhost:3000

## Deploy

Push to a Git remote, import into Vercel, and set `LASTFM_API_KEY` as an environment variable in the Vercel project settings. That's it.

## How it works

- Server route `app/api/toptracks/route.ts` proxies Last.fm's `artist.getTopTracks` (key stays server-side).
- Tracks are deduped (collapses live/remastered/feat. variants) and trimmed to a power of two (64 → 32 → 16).
- Standard bracket seeding is generated programmatically so top seeds can't meet early.
- One matchup is shown at a time. Click to advance.
