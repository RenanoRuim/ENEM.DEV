# ENEM.DEV

ENEM.DEV is a responsive study dashboard for ENEM preparation, built with Expo,
React Native, TypeScript, and Expo Router. The existing Expo project is kept
cross-platform, with a sidebar on wide web screens and bottom tabs on smaller
screens and native devices.

## Run the app

```bash
npm install
npm run web
```

For native development, use `npm run android` or `npm run ios`.

## Node backend and account sync

The Node.js API lives in the sibling `../../backend/` directory. Install its
dependencies with `npm install --prefix ../../backend`; copy
`../../backend/.env.example` to `../../backend/.env` and set `SUPABASE_URL`,
`SUPABASE_PUBLISHABLE_KEY`, and optionally `CLIENT_ORIGIN`. The backend
loads its `.env` relative to its configuration file, so commands work when
started from either project directory. Copy
`.env.example` to `.env` and set `EXPO_PUBLIC_API_URL`,
`EXPO_PUBLIC_SUPABASE_URL`, and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The example
files contain placeholders only; never put a Supabase secret/service-role key
in the app or this backend.

Start the API with `npm run backend:dev` and the Expo client separately with
`npm run web`. The app reads and writes its versioned per-user data document
directly through the Supabase client and `public.user_app_data`; document
operations do not pass through Express. The API continues to proxy ENEM
questions and handle writing-prompt image transfers. Authenticated local records are isolated by the Supabase user ID. A visitor's
study state is held in memory only and is never synchronized or attached to an
account. On startup, legacy unscoped `enemfordevs:` study records are moved to
that in-memory visitor scope and removed from persistent storage; they are not
merged into an account. Local account records, image files, synchronization
markers, and temporary native writing exports are removed after logout. If
changes are pending, logout offers to synchronize first or discard the local
copy; neither choice deletes remote Supabase data. Signing in again restores
that account's data from Supabase. Revision conflicts are retried instead of
silently overwriting changes.

### Password recovery

The login screen links to a Supabase Auth recovery flow. The app uses the
`enemfordevs` URL scheme and the `/reset-password` route; recovery codes are
exchanged with Supabase PKCE, and password updates use `auth.updateUser`.
After changing the password, the authenticated recovery session is kept and
the user can continue to the dashboard.

In Supabase Dashboard > Authentication > URL Configuration, add the redirect
URLs that apply to your deployment:

- Native development builds and published apps: `enemfordevs://reset-password`
- Expo Go during development: `exp://**/--/reset-password` (or add the exact
  URL emitted by Expo for the device and Metro session)
- Web development: `http://localhost:*/reset-password`
- Published web app: the exact URL
  `https://<your-app-domain>/reset-password`

Set the Supabase Site URL to the published web app origin. Expo Go uses a
temporary host URL; its redirect must be allow-listed and tested on the same
device/session. Changing the native scheme requires a new development or
production build. The app cannot verify dashboard allow-list settings or
complete an actual email delivery by itself.
Use `npm run backend:build`, `npm run backend:typecheck`, and
`npm run backend:test` for backend verification.

The app expects the `user_app_data` table and per-user SELECT, INSERT, and
UPDATE RLS policies to be configured manually; see
[../../backend/README.md](../../backend/README.md) for the contract. Updates
use a conditional revision filter, and initial inserts treat a duplicate key
as a conflict. No database schema, policy, migration, or Supabase credential
was created or changed. Writing-prompt images are stored locally in the active
account's namespace and use the existing private Storage flow through the
backend. Local persistence currently uses AsyncStorage (and IndexedDB/files
for image bytes), not SQLite.

Supabase Auth sessions persist in Expo SecureStore on Android/iOS and
`localStorage` on Web. Native storage keeps the Supabase-generated default
storage key and uses only SecureStore-compatible characters for its chunk keys.
The Android layout is configured to resize for the software keyboard; the
authentication form scrolls and advances between fields using the keyboard's
Next/Done actions.

## Features

- ENEM questions loaded from the community-maintained [ENEM.DEV API](https://api.enem.dev/), with year, subject, and language filters.
- Persistent answer history and question progress, including Debug Mode for reviewing missed questions.
- Performance indicators calculated from recorded answers.
- XP, levels, 25 categorized achievements with historical progress recognition, and Daily Commit progress.
- Redação Lab with official, authorial, and student-created topics, autosaved drafts, a writing timer, TXT/PDF export, and a competency guide referencing the INEP 2026 participant handbook.
- Locally stored personal topic import/export (versioned JSON), personal question explanations, favorites, and "Quero revisar" markers.
- Review Build sessions assembled from missed, favorited, or personally annotated questions. Session answers are not added to the main history and grant no XP.
- Responsive navigation and an About page, built for Web and native devices.

Questions and their associated content depend on the external API and may be
incomplete or temporarily unavailable. The app validates question data before
allowing an answer. The ENEM.DEV app is independent and is not affiliated with
INEP or MEC.

Redação Lab stores authenticated essays locally using AsyncStorage and
synchronizes their metadata and text with the Supabase account document.
Topics are maintained in `src/features/essays/services/writing-topic-catalog.ts`; official
topics should only be added with a verified year and source, and original
practice proposals should be labeled authorial.

Student-created writing topics are stored separately from the distributed
catalog. Their JSON import/export format is versioned and limited to 100 KB.
Custom topics can attach up to 10 supporting-text images (3 per text, 3 MB
each). Authenticated image files are kept outside AsyncStorage: in the app's
persistent document directory on Android and in IndexedDB on Web. Visitor
images remain in memory only. Topic JSON exports omit
image files; images remain local to the original device. Essays retain a
snapshot of their topic so deleting a personal topic does not remove its
identifying information or referenced images. TXT and PDF essay exports include
the topic and export date; Web PDF export uses the browser print dialog, while
Android shares a generated PDF file. Personal question notes and Review Build
state do not modify the manual explanation catalog, answer history, Debug Mode,
or XP.

Essay word counts are for personal reference and do not represent the ENEM
official answer-sheet line limit. The competency checklist is a personal
revision aid, not an official correction or score. Redações do not grant XP or
affect Daily Commit.

## Comentários das questões

As resoluções são conteúdo local, mantido em
`src/features/questions/services/question-explanation-catalog.ts`. Para adicionar uma, use como
chave o mesmo identificador do progresso: `ano:número` ou
`ano:número:idioma` quando o idioma fizer parte da questão. Preencha
`questionId` com a mesma chave e informe `reviewStatus` como `unreviewed`,
`reviewed` ou `validated`. `general`, os comentários por alternativa (`A` a
`E`) e `source` são opcionais. Cadastre somente explicações com conteúdo
verificável e fonte editorial apropriada; o catálogo começa vazio e a
indisponibilidade de uma explicação não impede responder nem avançar.

The API's source repository is available at
[github.com/yunger7/enem-api](https://github.com/yunger7/enem-api). This project
does not currently declare a public repository URL.
