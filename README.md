# LeadFlow — Lead Management Platform

A lead management application for small sales teams built using **React, TypeScript, Express.js, and MySQL**.

**Built for Digital Heroes Training Task** — https://digitalheroesco.com
## Repository

GitHub Repository:
https://github.com/NL-Soujanya/LeadFlow-Management
---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@leadflow.demo | admin12345 |
| Member | member@leadflow.demo | member12345 |

### Role Permissions

**Admin**
- Create, view, update and delete leads
- Assign leads
- Add notes
- View dashboard statistics

**Member**
- View leads
- Update lead status and assignment
- Add notes
- Cannot delete leads or modify restricted fields

---
## Features

- User Authentication (JWT)
- Role-Based Access Control (Admin & Member)
- Lead Management (Create, Read, Update, Delete)
- Lead Assignment
- Lead Notes
- Dashboard Statistics
- Responsive UI
- RESTful API

## Tech Stack

| Layer | Technology |
|--------|------------|
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS |
| Icons | lucide-react |
| Backend | Express.js + Node.js |
| Database | MySQL |
| Authentication | JWT |
| API | REST API |
| Testing | Vitest + Testing Library |

---

## Architecture

+----------------------+
| React + Vite Frontend|
+----------+-----------+
           |
           v
+----------------------+
| Express.js REST API  |
+----------+-----------+
           |
           v
+----------------------+
|    MySQL Database    |
+----------------------+

---

## Local Setup

```bash
npm install
npm run dev
```

Backend:

```bash
cd server
npm install
npm start
```

Configure a `.env` file inside the `server` folder:

```env
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=
JWT_SECRET=
JWT_EXPIRES_IN=7d
```

---

## API Documentation

Base URL (Local)

```
http://localhost:4000
```

### Authentication

POST `/auth/login`

### Leads

- GET `/leads`
- GET `/leads/:id`
- POST `/leads`
- PUT `/leads/:id`
- DELETE `/leads/:id`

### Notes

POST `/leads/:id/notes`

### Team

GET `/team`

### Dashboard

GET `/stats`

All protected endpoints require:

```
Authorization: Bearer <JWT_TOKEN>
```

---

## Project Structure

```
src/
├── components/
│   └── ui.tsx              # Shared UI components (Button, Card, Input, etc.)
├── lib/
│   ├── api.ts             # API client (fetch wrapper for edge function)
│   ├── auth.tsx           # Auth context + provider
│   ├── permissions.ts     # Pure permission logic (unit-tested)
│   └── types.ts           # Shared TypeScript types
├── pages/
│   ├── AuthPage.tsx       # Sign in / sign up
│   ├── DashboardPage.tsx  # Lead list with filters, pagination, stats
│   ├── LandingPage.tsx    # Public page with lead capture form
│   └── LeadDetailPage.tsx # Lead detail: lifecycle, notes, activity trail
├── test/
│   ├── api.test.ts        # API client tests
│   ├── auth.test.tsx      # Auth context tests
│   ├── capture-flow.test.tsx # Public capture form tests
│   ├── permissions.test.ts   # Permission rules tests
│   └── setup.ts           # Test setup
└── App.tsx                # Router + auth gate
```

---

## Security

- JWT Authentication
- Password hashing
- Server-side authorization
- Input validation

---

## Footer Credit

Built for Digital Heroes Training Task — https://digitalheroesco.com
