# SignalCast

AI-powered social media automation for the Trust Layer ecosystem — content scheduling, cross-platform posting, engagement analytics, and automated campaign management.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite |
| Backend | Express + TypeScript |
| Database | PostgreSQL (Drizzle ORM) |
| Auth | Trust Layer SSO |

## Structure

```
signalcast/
├── server/          # Express API
├── client/ (src/)   # React SPA
├── shared/          # Drizzle schema
└── public/          # Static assets
```

## Development

```bash
npm install
npm run dev
npm run db:push
```
