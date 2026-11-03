# J.A.R.V.I.S. ULTRA v2

Personal AI assistant — **only Google Gemini**, deployable on **Render.com**.

## Features

- SSE streaming chat with function calling
- Semantic memory (Gemini embeddings + cosine)
- Gemini Vision (image/PDF upload)
- Gemini Live voice (WS proxy + ephemeral token endpoint)
- Holographic 3D avatar (GLB + procedural fallback, FFT visemes, bloom, particles)
- Auth (JWT cookie), rate limiting, graceful shutdown

## Local setup

```bash
cp .env.example .env.local        # add GEMINI_API_KEY + DATABASE_URL
npm install
npx prisma generate
npx prisma db push
npm run dev                        # http://localhost:3000







