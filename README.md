# TaskFlow — Real-time Collaborative Task Manager

A Trello-style task manager built with Next.js, TypeScript, Socket.io, PostgreSQL and Prisma. Multiple users can collaborate on boards in real time.

## Tech stack

- **Frontend** — Next.js 14, TypeScript, Tailwind CSS
- **Real-time** — Socket.io
- **Backend** — Node.js (custom server), Next.js API routes
- **Database** — PostgreSQL (Neon)
- **ORM** — Prisma
- **Auth** — JWT (bcryptjs)

## Getting started

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
Create a `.env` file in the root:
```
DATABASE_URL="your_neon_postgresql_connection_string"
JWT_SECRET="a_long_random_secret_string"
```

### 3. Push the database schema
```bash
npx prisma db push
npx prisma generate
```

### 4. Start the dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- User registration and login with JWT auth
- Create and manage multiple boards
- Add columns and cards in real time
- Changes broadcast instantly to all connected users via Socket.io
- Delete cards with hover actions
- Responsive Kanban board layout

## Project structure

```
app/
├── api/
│   ├── auth/
│   │   ├── login/route.ts
│   │   └── register/route.ts
│   ├── boards/
│   │   ├── route.ts          # GET all boards, POST new board
│   │   └── [id]/route.ts     # GET, PATCH, DELETE board by ID
│   ├── cards/route.ts        # POST, PATCH, DELETE cards
│   └── columns/route.ts      # POST, PATCH, DELETE columns
├── auth/
│   ├── login/page.tsx
│   └── register/page.tsx
├── boards/
│   ├── page.tsx              # Boards dashboard
│   └── [id]/page.tsx         # Board detail with real-time
├── layout.tsx
└── page.tsx                  # Redirects to /boards or /auth/login
lib/
├── auth.ts                   # JWT utilities
├── auth-context.tsx          # React auth context
└── prisma.ts                 # Prisma client singleton
prisma/
└── schema.prisma             # Database schema
server.js                     # Custom Node server with Socket.io
types/
└── index.ts                  # TypeScript interfaces
```
