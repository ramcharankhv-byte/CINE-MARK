# ML service — dormant

This service is **intentionally not running and not deployed**. The source is
kept here, unchanged, so it can be revived later. Nothing in the backend or the
frontend calls it, and no deployment configuration starts it.

## What it was

A FastAPI application providing two features that are currently switched off:

- **Recommendations** — item-to-item collaborative filtering over the
  `Watchlist`, `Movie` and `_MovieToWatchlist` tables, with a trending-movies
  fallback for users who have no history.
- **Chatbot** — a Groq-backed conversational movie assistant with DuckDuckGo
  web search, persisting turns to the `ChatSession` and `ChatMessage` tables.

## Why it is dormant

The product was reduced to its core: authentication, movie search and
watchlists. The AI features were removed from the running system, but the code
was kept rather than deleted so the work is not lost.

## What was deliberately preserved for it

Nothing was dropped from the database on its behalf, and the schema still
declares everything it reads and writes:

- The `ChatSession` and `ChatMessage` tables, created by the
  `20260912000000_supabase_auth_reconcile` migration.
- The `User.googleId` column, which `app/db_stuff.py` queries. That column was
  relaxed to nullable, because Supabase Auth does not supply a Google id, so
  rows created by the live application leave it empty.

## What it would take to revive

1. **Credentials.** It needs `GROQ_API_KEYS`, `UPSTASH_VECTOR_REST_URL` and
   `UPSTASH_VECTOR_REST_TOKEN` in `Backend/.env`, which `app/main.py` loads by
   relative path. None of these are currently set, which is part of why the
   service cannot start.
2. **Auth rework.** `app/db_stuff.py` still resolves users by `googleId`, which
   no longer gets populated. It would need to verify Supabase tokens and key on
   the Supabase user id instead, matching `Backend/src/modules/auth/auth.middleware.js`.
3. **Wiring.** Restore a service definition in `render.yaml`, set
   `NEXT_PUBLIC_ML_URL` in the frontend, and rebuild the UI that called it. The
   previous chat interface lived at
   `frontend/src/app/(main)/[[...slug]]/page.tsx` and is recoverable from git
   history.

## Running it locally, if you ever need to

```bash
cd ML
python -m venv venv
venv\Scripts\activate        # PowerShell: venv\Scripts\Activate.ps1
pip install -r requirements.txt
python run.py
```

Expect it to fail at startup until the credentials above are present.
