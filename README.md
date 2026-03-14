# Tight

🇰🇷 채널, DM, 스레드, 검색이 지원되는 오픈소스 설치형 협업 채팅 도구
🇺🇸 Open-source self-hosted team chat with channels, DMs, threads, and search
🇪🇸 Chat colaborativo autoalojado de código abierto con canales, MD, hilos y búsqueda
🇫🇷 Outil de chat collaboratif open source auto-hébergé avec salons, MP, fils et recherche
🇯🇵 チャンネル・DM・スレッド・検索対応のオープンソース自己ホスト型チャットツール
🇨🇳 支持频道、私信、话题和搜索的开源自托管协作聊天工具
🇹🇼 支援頻道、私訊、討論串與搜尋的開源自架協作聊天工具
🇭🇰 支援頻道、私信、討論串同搜尋嘅開源自架協作聊天工具
🇻🇳 Công cụ chat cộng tác tự lưu trữ mã nguồn mở với kênh, DM, chuỗi hội thoại và tìm kiếm
🇮🇩 Alat obrolan kolaborasi open source yang dihosting sendiri dengan saluran, DM, utas, dan pencarian

**Supported languages:** 🇰🇷 한국어 · 🇺🇸 English · 🇪🇸 Español · 🇫🇷 Français · 🇯🇵 日本語 · 🇨🇳 中文（简体）· 🇹🇼 中文（繁體）· 🇭🇰 廣東話 · 🇻🇳 Tiếng Việt · 🇮🇩 Bahasa Indonesia

**Demo:** [tight.coroke.net](https://tight.coroke.net)

---

## Features

- **Channels** — Public and private channels with member management
- **Direct Messages** — One-on-one DMs between workspace members
- **Threads** — Reply to any message in a side panel thread view
- **Real-time** — WebSocket-powered live messaging and typing indicators
- **Message Search** — Full-text search with keyboard navigation and message flash-highlight
- **Rich Editor** — Bold (`**text**`), links, image upload, @mentions, #channel links
- **User Profiles** — Bio, role, phone, avatar upload (protected from Google OAuth overwrite)
- **Cloudflare R2** — Avatar images stored with SHA-256 hash filenames, no duplicates
- **Dark Mode** — System-aware with manual toggle, FOUC-free
- **10 Languages** — 🇰🇷 🇺🇸 🇪🇸 🇫🇷 🇯🇵 🇨🇳 🇹🇼 🇭🇰 🇻🇳 🇮🇩
- **Mobile Responsive** — Slide-in sidebar, bottom-sheet modals, touch-friendly layout

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [SvelteKit 2](https://kit.svelte.dev/) + [Svelte 5](https://svelte.dev/) (runes) |
| Database | SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| ORM | [Drizzle ORM](https://orm.drizzle.team/) |
| Auth | [Auth.js for SvelteKit](https://authjs.dev/) (Google OAuth) |
| Real-time | WebSocket ([ws](https://github.com/websockets/ws)) |
| File Storage | [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) (optional) |
| Deployment | Node.js (`@sveltejs/adapter-node`) |

---

## Quick Start

### Prerequisites

- Node.js 20+
- A Google Cloud project with OAuth 2.0 credentials
- (Optional) A Cloudflare R2 bucket for file uploads

### 1. Clone and install

```bash
git clone https://github.com/rainygirl/tight.git
cd tight
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in the values:

```env
# Auth.js — generate with: openssl rand -base64 32
AUTH_SECRET=your-secret-here
AUTH_TRUST_HOST=true

# Google OAuth — https://console.cloud.google.com/apis/credentials
# Authorized redirect URI: http://localhost:5173/auth/callback/google
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Cloudflare R2 (optional — required for image uploads)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=tight-uploads
R2_PUBLIC_URL=https://pub-xxxx.r2.dev

# WebSocket
VITE_WS_URL=ws://localhost:3001
WS_PORT=3001
PORT=3000
```

### 3. Set up the database

```bash
npm run db:generate
npm run db:migrate
```

Or start from the included sample database:

```bash
cp tight.db.sample tight.db
```

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), sign in with Google, and create your first workspace.

### 5. (Optional) Seed sample data

A pre-built sample database is included at `tight.db.sample`. Copy it to get started instantly:

```bash
cp tight.db.sample tight.db
```

To regenerate the sample data from scratch (also updates `tight.db.sample`):

```bash
npm run db:seed-sample
```

This **resets the entire database** and inserts:

- 1 workspace (`Acme Corp`)
- 7 fictional users (Alice, Bob, Carol, David, Emma, Frank, Grace)
- 5 channels: `#general`, `#engineering`, `#design`, `#product`, `#random`
- 2 DMs and 64 sample messages

No real user data is included. When you sign in with Google OAuth after seeding, your account is added as a new user alongside the sample data.

Alternatively, to only add sample users to an existing workspace (without resetting):

```bash
npx tsx scripts/seed.ts
```

---

## Google OAuth Setup

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create an **OAuth 2.0 Client ID** (Web application type)
3. Add authorized redirect URI:
   - Development: `http://localhost:5173/auth/callback/google`
   - Production: `https://your-domain.com/auth/callback/google`
4. Copy the Client ID and Secret into your `.env`

---

## Cloudflare R2 Setup (optional)

R2 is used for avatar and image uploads. Without it, the upload feature will error.

1. Create an R2 bucket in [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Enable **Public access** on the bucket (or use a custom domain)
3. Create an API token with **Object Read & Write** permissions
4. Fill in `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` in `.env`

---

## Production Deployment

```bash
npm run build
node build/index.js
```

Or using the included `server.ts` (which starts both the HTTP server and the WebSocket server on the same port):

```bash
# Build first
npm run build

# Then start
node server.js
```

The WebSocket server attaches to the HTTP server and serves `/ws` in production (no separate port needed).

---

## Database Commands

```bash
npm run db:generate     # Generate migration files from schema changes
npm run db:migrate      # Apply pending migrations
npm run db:studio       # Open Drizzle Studio (visual DB browser)
npm run db:seed-sample  # Reset DB and insert fictional sample data
```

---

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── ChatView.svelte       # Main chat area (header, message list, input)
│   │   ├── MessageList.svelte    # Virtualized message list with date dividers
│   │   ├── MessageItem.svelte    # Single message with reactions, thread reply
│   │   ├── MessageInput.svelte   # Rich text editor (bold, links, mentions, images)
│   │   ├── ThreadPanel.svelte    # Thread side panel
│   │   ├── Sidebar.svelte        # Left nav (channels, DMs, search, profile menu)
│   │   ├── SearchModal.svelte    # Full-text search modal with keyboard nav
│   │   └── ProfileCard.svelte    # User profile popup
│   ├── db/
│   │   ├── schema.ts             # Drizzle table definitions
│   │   └── index.ts              # DB instance + auto-migrations
│   ├── i18n/
│   │   └── translations.ts       # All UI strings for 10 languages
│   ├── stores/
│   │   ├── theme.svelte.ts       # Dark/light mode state
│   │   ├── locale.svelte.ts      # Language selection state
│   │   ├── socket.svelte.ts      # WebSocket connection + event bus
│   │   ├── sidebar.svelte.ts     # Mobile sidebar open/close state
│   │   └── flash.svelte.ts       # Message flash-highlight after search navigation
│   ├── ws/
│   │   ├── server.ts             # WebSocket server (attaches to HTTP)
│   │   ├── handlers.ts           # Message routing logic
│   │   ├── dev-server.ts         # Standalone WS server for development
│   │   └── types.ts              # WS message type definitions
│   ├── auth.ts                   # Auth.js config (Google provider, avatar sync)
│   ├── r2.ts                     # Cloudflare R2 upload helpers
│   └── utils/
│       └── hangulSearch.ts       # Korean fuzzy search (초성/중성/종성)
├── routes/
│   ├── +layout.svelte            # Root layout (CSS variables, dark mode, fonts)
│   ├── +layout.server.ts         # Env var check on startup
│   ├── login/                    # Login page
│   ├── setup/                    # Workspace creation
│   ├── [workspace]/
│   │   ├── +layout.svelte        # App shell (Sidebar + main)
│   │   ├── +layout.server.ts     # Auth guard, load channels/DMs/members
│   │   ├── [channel]/            # Channel view
│   │   └── dm/[userId]/          # DM view
│   └── api/
│       ├── channels/             # CRUD + member management
│       ├── threads/[messageId]/  # Thread replies
│       ├── profile/              # Update own profile
│       ├── users/[userId]/       # Public profile lookup
│       ├── upload/               # Server-side R2 file proxy (avoids CORS)
│       ├── upload-url/           # Presigned URL generation (legacy)
│       └── search/               # Full-text message search
└── app.html                      # HTML shell with dark mode FOUC fix
```

---

## Key Architectural Notes

### WebSocket Architecture
- **Dev**: WS runs as a separate process on `WS_PORT` (default 3001), `npm run dev` starts both concurrently
- **Prod**: WS server attaches to the same HTTP server (`server.ts`), served at `/ws`
- Client connects via `VITE_WS_URL` (dev) or `ws(s)://same-origin/ws` (prod)

### Message Format
Messages are stored as a custom markup format (not raw HTML):
- Mentions: `@[userId:displayName]`
- Channel links: `#[channelId:channelName]`
- Bold: `**text**` (auto-converted on input)
- Links: `[text](url)` (inserted via link modal)

`renderBody()` in `MessageItem.svelte` converts this to safe HTML at render time.

### Avatar Protection
When a user uploads a custom avatar, `avatarSource` is set to `'custom'` in the DB. The Google OAuth callback checks this flag before overwriting the avatar URL, so custom avatars are never replaced by the Google profile picture on subsequent logins.

### Dark Mode FOUC Prevention
`src/app.html` contains an inline blocking script in `<head>` that reads `localStorage` and applies `data-theme="dark"` to `<html>` before the page renders, preventing the white flash on dark mode reload.

### Korean Fuzzy Search
`src/lib/utils/hangulSearch.ts` implements Hangul decomposition search — typing `ㅈㅇ` matches `정원`, `죠원`, etc. Used in DM user search and channel member invite.

---

## Adding a Language

1. Add the language code and label to `LANGUAGES` in `src/lib/stores/locale.svelte.ts`
2. Add a translation object for the new language code in `src/lib/i18n/translations.ts` (copy from `en` and translate all values)
3. The language will automatically appear in the language selector

---

## Contributing

🇰🇷 기여를 환영합니다. 아이디어가 담긴 코드라면 새 기능, 개선, 버그 수정, 실험 무엇이든 자유롭게 Pull Request를 열어주세요. 별도의 가이드라인은 없습니다.
🇺🇸 Contributions are welcome. Feel free to open a pull request with any idea — new features, improvements, bug fixes, or experiments. There are no strict guidelines; if you have code that embodies an idea, propose it.
🇪🇸 Las contribuciones son bienvenidas. Abre un pull request con cualquier idea — nuevas funciones, mejoras, correcciones o experimentos. No hay pautas estrictas; si tienes código con una idea, proponla.
🇫🇷 Les contributions sont les bienvenues. Ouvrez librement une pull request avec n'importe quelle idée — nouvelles fonctionnalités, améliorations, corrections ou expériences. Aucune règle stricte ; si votre code porte une idée, proposez-la.
🇯🇵 コントリビューションを歓迎します。新機能・改善・バグ修正・実験など、アイデアを持つコードであれば自由にPull Requestを開いてください。厳格なガイドラインはありません。
🇨🇳 欢迎贡献。无论是新功能、改进、修复还是实验，只要代码中包含想法，均可自由提交 Pull Request。没有严格的规范。
🇹🇼 歡迎貢獻。無論是新功能、改進、修復或實驗，只要程式碼中包含想法，均可自由提交 Pull Request。沒有嚴格的規範。
🇭🇰 歡迎貢獻。無論係新功能、改進、修復定係實驗，只要代碼入面有想法，都可以自由提交 Pull Request。冇嚴格規範。
🇻🇳 Chào đón mọi đóng góp. Hãy thoải mái mở pull request với bất kỳ ý tưởng nào — tính năng mới, cải tiến, sửa lỗi hay thử nghiệm. Không có quy tắc nghiêm ngặt; nếu bạn có code mang ý tưởng, hãy đề xuất.
🇮🇩 Kontribusi sangat disambut. Silakan buka pull request dengan ide apa pun — fitur baru, peningkatan, perbaikan bug, atau eksperimen. Tidak ada panduan ketat; jika kode Anda mengandung ide, ajukan saja.

---

## License

MIT
