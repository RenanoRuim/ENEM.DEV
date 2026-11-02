# ENEM.DEV API

Node.js + TypeScript API used by the Expo client. It proxies the public ENEM.DEV
questions API and transfers writing-prompt images.

## Run locally

1. Copy `.env.example` to `.env` and provide `SUPABASE_URL`,
   `SUPABASE_PUBLISHABLE_KEY`, and the web client's `CLIENT_ORIGIN`. The
   publishable key is public; this API does not require or use a
   secret/service-role key.
2. Create the `user_app_data` table described below and configure its RLS
   policies manually in Supabase. This project intentionally does not create
   tables, policies, SQL functions, or migrations.
3. From this directory, install the API dependencies with `npm install`.
4. Run `npm run dev` here, or `npm run backend:dev` from
   `frontend/enemfordevs/`.

The API listens on port `3000` by default. Environment loading resolves
`backend/.env` from the configuration module, regardless of the shell's
working directory. `GET /health` and `/api/enem/*` do not make Supabase
requests, but this server currently requires both Supabase variables to start
because the authenticated account and image routes are registered at startup.
The Expo app reads and writes the `user_app_data` JSON document directly
through its authenticated Supabase client; those document operations do not
pass through this API. The existing account-data endpoints remain available
for compatibility with older clients and require a Supabase access token:

- `GET /api/me/data` returns `{ data, revision }`.
- `PUT /api/me/data` accepts `{ expectedRevision, data }`; stale writes return
  HTTP 409 instead of silently overwriting data changed on another device.
- `PUT /api/me/writing-images/:imageId` and
  `GET /api/me/writing-images/:imageId` sync private writing prompt images.
- `GET /api/enem/exams` and
  `GET /api/enem/exams/:year/questions?limit=10&offset=0&language=...` proxy
  the community ENEM API.

## Manual database contract

The API expects a `public.user_app_data` table with these columns:

| Column | Type | Constraints |
|---|---|---|
| `user_id` | `uuid` | primary key; references `auth.users(id)` |
| `data` | `jsonb` | — |
| `revision` | `bigint` | — |
| `updated_at` | `timestamptz` | — |

Enable RLS and configure policies so an authenticated user can select, insert,
and update only the row where `user_id = auth.uid()`. The backend uses the
public publishable key and forwards each user's access token; it does not use
a secret/service-role key and does not bypass RLS. The authentication
middleware validates bearer tokens by calling Supabase Auth
`auth.getUser(accessToken)`. `SUPABASE_JWKS_URL` is not used; the backend does
not perform local JWKS/JWT verification.

Create a private Supabase Storage bucket named `writing-prompt-images` and
configure Storage policies that restrict objects to the authenticated user's
`<user_id>/...` folder. This is also a manual step; no bucket or policy is
created by this project.

The JSON document format is `enem.dev-account-data` version `1`, containing
study history/progress, essays, personal writing topics, and personal question
notes. The app uses a revision-conditional UPDATE through PostgREST; only a
row matching both the current session user ID and expected revision is
updated. Initial INSERT conflicts are retried after refetching. The app keeps
local data in separate storage namespaces for the visitor
and each authenticated user ID. Signing out preserves the user's namespace;
logging in as another user neither reads nor uploads it. Previously stored
unscoped local data remains available to the visitor and is not automatically
assigned to an account. No local data is deleted during account changes.
Conflict detection prevents stale-device overwrites; the app retries merge and
save after a revision conflict. Writing prompt images are uploaded to the
private bucket and cached locally in the same visitor/account namespace.
The client rejects revisions outside JavaScript's safe integer range rather
than risk an imprecise comparison.

Local structured data currently uses AsyncStorage, not SQLite.

## Environment variables

Backend: `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are required to start
Express. `PORT` defaults to `3000`, and `CLIENT_ORIGIN` defaults to
`http://localhost:8081`; set either only to override the default.

Expo client: `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are required for Supabase account
features. `EXPO_PUBLIC_API_URL` is used for the API's question-proxy and
writing-image routes. The `EXPO_PUBLIC_` prefix makes client values available
to the bundled app; only public values belong there. `SUPABASE_SECRET_KEY`
and `SUPABASE_JWKS_URL` are not used by the current app or backend. Example
files contain placeholders only. Never put a secret key in Expo or this API.

The monorepo contains the Expo app in `frontend/enemfordevs/` and this API in
`backend/`. From the app directory, backend scripts use `../../backend`.
