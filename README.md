# RedAction Web

**Éditeur arabe institutionnel propulsé par l'IA**
Plateforme SaaS de traduction et réécriture FR→AR pour professionnels marocains.

Ported from the Swift macOS app. Platform owns all API keys — users pay for access.

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 App Router (Turbopack) |
| Auth | Supabase Auth |
| Database | Supabase PostgreSQL + RLS |
| AI | Claude Haiku 4.5 (Anthropic) |
| Translation | DeepL API v2 (header auth) |
| Payments | YouCanPay (MAD, one-time charges) |
| Styling | Tailwind CSS v4 |
| Deploy | Vercel |

---

## Features

### Core editor
- **Mode auto-detection** — detects French or Arabic from input, switches mode automatically
- **FR → AR translation** — DeepL draft → Claude Haiku stylistic polish
- **Arabic rewrite** — rewrite existing Arabic for natural institutional tone
- **5000 char limit** per request
- **File import** — .txt files
- **Copy to clipboard**

### Style engine
7 JSON style files injected per translation request:

| File | Content |
|------|---------|
| `style.json` | FR→AR expression pairs, glossary, micro-rules |
| `style_memory.json` | Curated examples with context-aware picking |
| `ocp_glossary.json` | 40+ OCP institutional terms |
| `ocp_tone.json` | Institutional tone profile |
| `ocp_rewrite_rules.json` | Verb patterns, translation risks, guidelines |
| `ocp_rhetoric.json` | Rhetorical patterns with translation guidance |
| `redaction_editorial_profile.json` | Full editorial identity profile |

Static parts cached in memory. Dynamic examples picked per source text using keyword scoring.

### History, Favorites, Folders
- **Historique** — all past translations, filter by All/Favorites/Folder, search
- **Favoris** — starred translations
- **Dossiers** — create/rename/delete folders, assign translations to folders
- Translation cache — same source text returns stored result (zero API cost)

### Subscription & Payments
- **YouCanPay** — Moroccan payment gateway, one-time charges, 30-day manual renewal
- Plans enforced at API level before every request
- Subscription expiry check on each API call

---

## Plans

| Plan | Price | Words/mo | Requests/mo |
|------|-------|----------|-------------|
| Gratuit | 0 MAD | 3 000 | 30 |
| Starter | 99 MAD | 20 000 | 400 |
| Pro | 249 MAD | 100 000 | 2 000 |
| Enterprise | Sur mesure | 1 000 000 | 20 000 |

Enterprise → contact: `redaction@sainteligence.com`

---

## File Structure

```
redaction/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── auth/callback/route.ts
│   ├── (dashboard)/
│   │   ├── layout.tsx              ← auth guard + sidebar
│   │   ├── page.tsx                ← main editor (split panel)
│   │   ├── history/page.tsx        ← history with filter/search
│   │   ├── favorites/page.tsx      ← starred translations
│   │   ├── folders/page.tsx        ← folder management
│   │   └── settings/page.tsx       ← account + subscription
│   ├── api/
│   │   ├── translate/route.ts      ← FR→AR: DeepL + Claude
│   │   ├── rewrite/route.ts        ← AR rewrite: Claude only
│   │   ├── usage/route.ts          ← get monthly usage + plan
│   │   ├── folders/
│   │   │   ├── route.ts            ← GET list / POST create
│   │   │   └── [id]/route.ts       ← PATCH rename / DELETE
│   │   ├── translations/[id]/
│   │   │   ├── favorite/route.ts   ← toggle is_favorite
│   │   │   └── folder/route.ts     ← assign folder_id
│   │   └── youcan-pay/
│   │       ├── checkout/route.ts   ← tokenize → return transactionId
│   │       ├── process/route.ts    ← pay + activate subscription
│   │       └── webhooks/route.ts   ← payment confirmation webhook
│   └── payment/page.tsx            ← card input form
├── components/
│   ├── editor/
│   │   ├── EditorPanel.tsx
│   │   ├── ModePicker.tsx
│   │   └── StatusBar.tsx
│   └── layout/
│       └── Sidebar.tsx             ← logo + nav
├── lib/
│   ├── openai.ts                   ← Claude Haiku prompts + API
│   ├── styleResources.ts           ← JSON loader + prompt builder (cached)
│   ├── deepl.ts                    ← DeepL translation (header auth)
│   ├── detectLanguage.ts           ← FR/AR auto-detection
│   ├── youcan-pay.ts               ← YouCanPay tokenize + pay
│   ├── subscriptions.ts            ← plan definitions + limits
│   ├── usage.ts                    ← word count helpers
│   └── supabase/
│       ├── server.ts               ← SSR client + service role client
│       └── client.ts               ← browser client
├── data/                           ← style JSON files (7 files)
├── public/
│   └── redaction_logo.png
└── supabase/migrations/
    ├── 001_init.sql                ← usage + translations tables
    ├── 002_increment_usage_fn.sql  ← increment_usage() function
    ├── 003_subscriptions.sql       ← user_subscriptions table
    ├── 004_youcan_pay_subscriptions.sql ← YouCanPay columns
    └── 005_favorites_folders.sql   ← is_favorite + folders table
```

---

## Database Schema

```sql
-- Usage tracking
usage (id, user_id, period YYYY-MM, word_count, request_count)

-- Translation history
translations (id, user_id, mode, source_text, result_text,
              word_count, is_favorite, folder_id, created_at)

-- Subscription
user_subscriptions (id, user_id, plan, status,
                    youcan_pay_transaction_id, youcan_pay_customer_email,
                    renewal_status, current_period_start, current_period_end)

-- Folders
folders (id, user_id, name, color, created_at)
```

All tables have RLS. Write operations in API routes use `createServiceClient()`.

---

## API Routes

### `POST /api/translate`
```
Input:  { frenchText }
Flow:   auth → limit check → expiry check → cache check → DeepL → Claude → save
Output: { result, wordCount, cached? }
```

### `POST /api/rewrite`
```
Input:  { arabicText }
Flow:   auth → limit check → expiry check → cache check → Claude → save
Output: { result, wordCount, cached? }
```

### `GET /api/usage`
```
Output: { wordCount, requestCount, period, plan, monthlyWords, monthlyRequests }
```

### `POST /api/youcan-pay/checkout`
```
Input:  { plan: 'starter' | 'pro' }
Flow:   tokenize with YouCanPay → return transactionId
Output: { transactionId, amount, plan, plan_name }
```

### `POST /api/youcan-pay/process`
```
Input:  { transactionId, amount, plan, cardNumber, expireDate, cvv, cardholderName }
Flow:   pay with YouCanPay → upsert user_subscriptions (service role)
Output: { success, transactionId, plan }
```

---

## Payment Flow

```
Settings → click "Passer à Starter/Pro"
  → POST /api/youcan-pay/checkout   (tokenize — get transactionId)
  → store { transactionId, amount, plan } in sessionStorage
  → redirect to /payment

/payment → user fills card form (number, expiry MM/YY, CVV, name)
  → POST /api/youcan-pay/process
  → YouCanPay charges card
  → subscription activated in DB (30 days)
  → redirect to /settings?payment=success

YouCanPay sandbox test card:
  4242 4242 4242 4242 | CVV: 112 | Expiry: 12/28 (future date)
```

---

## Env Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # sensitive

# AI & Translation
ANTHROPIC_API_KEY=                  # sensitive
DEEPL_API_KEY=                      # sensitive

# YouCanPay
NEXT_PUBLIC_YOUCAN_PAY_PUBLIC_KEY=
YOUCAN_PAY_PRIVATE_KEY=             # sensitive
YOUCAN_PAY_SANDBOX_MODE=true        # set to false in production
```

---

## Cost Analysis

| Plan | Revenue | API Cost | Margin |
|------|---------|----------|--------|
| Starter (99 MAD) | 99 MAD | ~8 MAD | **~91%** |
| Pro (249 MAD) | 249 MAD | ~35 MAD | **~86%** |
| Enterprise (999 MAD) | 999 MAD | ~300 MAD | **~70%** |

**Cost optimizations applied:**
- Style JSON files cached in memory (read once per server lifetime)
- Static prompt appendix built once and reused across requests
- Translation result cache — duplicate source text returns DB result (zero API cost)
- `max_tokens` capped at 4096 (~50% cost reduction vs 8000)
- Free tier limited to 3k words/mo to reduce subsidized API usage

---

## Development

```bash
npm install
cp .env.local.example .env.local
# fill in env vars

npm run dev       # http://localhost:3000
npm run build     # verify production build
```

### Run Supabase migrations
Supabase dashboard → SQL Editor — run in order:
```
001_init.sql
002_increment_usage_fn.sql
003_subscriptions.sql
004_youcan_pay_subscriptions.sql
005_favorites_folders.sql
```

---

## Going Live Checklist

- [ ] Set `YOUCAN_PAY_SANDBOX_MODE=false` in Vercel env vars
- [ ] Swap YouCanPay sandbox keys → live keys
- [ ] Verify DeepL API key quota (free tier: 500k chars/mo)
- [ ] Run all 5 Supabase migrations on production DB
- [ ] Set custom domain on Vercel
- [ ] Test full payment flow with real card
- [ ] Configure YouCanPay webhook URL: `https://yourdomain.com/api/youcan-pay/webhooks`
- [ ] Remove `raw: token` debug field from checkout route

---

## Contact

**Enterprise / sales:** redaction@sainteligence.com
