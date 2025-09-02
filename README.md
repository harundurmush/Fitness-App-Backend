# 🏋️ Fitness App Backend

A backend API for a personalized fitness application.  
It provides **plan generation**, **nutrition guidance**, **exercise library**, **daily today view**, **logs & progression tracking**, and **favorites management** — all documented and testable with Swagger UI.

---

## 🚀 Features

- **Authentication (JWT)**: `/auth/signup`, `/auth/login`, `/auth/refresh`, `/auth/me`
- **Workout Plan Builder**: personalized multi-week plans based on user profile (goal, injuries, location, frequency…)
- **Today View**: timezone-aware daily plan resolution (rest/training/motivation/nutrition)
- **Workout Logs**: log sessions, upsert performed sets, track progress
- **Progression**: get recommendations and apply them to plans
- **Exercise Library**: searchable, seeded with common exercises
- **Favorites**: mark/unmark exercises for quick access
- **Swagger UI Docs**: interactive OpenAPI docs at `/api/docs`
- **Validation & Error Handling**: consistent error schema, input validation
- **Rate Limiting**: brute-force protection for auth endpoints

---

## 📦 Installation

```bash
git clone https://github.com/harundurmush/fitness-app-backend.git
cd fitness-app-backend
npm install
```

---

## ⚙️ Environment Variables

```bash
MONGODB_URI=...
PORT=5000

# Auth
JWT_SECRET=change_me_access
JWT_REFRESH_SECRET=change_me_refresh
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d
BCRYPT_SALT_ROUNDS=10

# Swagger (optional override)
SWAGGER_SERVER_URL=http://localhost:5000
```

---

## ▶️ Running Locally

Start the server:

```bash
node server.js
```

API base URL: http://localhost:5000

Swagger docs: http://localhost:5000/api/docs

---

## 🌱 Seed Data

Populate the exercise collection:

```bash
node scripts/seedExercises.js
```

---

## 📚 API Overview

Main endpoint groups:
- **Auth:** /auth/...
- **Plans:** /api/plan/...
- **Logs:** /api/logs/...
- **Exercises:** /api/exercises/...
- **Favorites:** /api/favorites/...

Swagger docs (/api/docs) describe all request/response formats in detail.

---

## 📂 Project Structure

```csharp
fitness-app-backend/
├── config/                # Database connection
├── controllers/           # Route handlers (auth, plan, logs, etc.)
├── data/                  # Static exercise pools, injury adaptations
├── docs/                  # Swagger/OpenAPI config
├── middlewares/           # Auth, validation, error handler
├── models/                # Mongoose schemas
├── routes/                # Express routes
├── scripts/               # Seed scripts
├── services/              # Core business logic
├── app.js                 # App initialization
├── server.js              # Entry point
└── package.json
```

---

## 🛠️ Tech Stack

- **Node.js + Express**
- **MongoDB + Mongoose**
- **JWT Authentication**
- **Swagger UI + OpenAPI**
- **Celebrate/Joi for validation**
- **Rate limiting with express-rate-limit**

---

## ✅ Frontend Integration Notes

- Authentication: use JWT access/refresh tokens (Authorization: Bearer <token>)
- Pagination: all list endpoints return { page, limit, total, items }
- Dates: always ISO YYYY-MM-DD, timezone default Europe/Istanbul
- Favorites & Logs are linked to the authenticated user
- Swagger provides try-it-out testing for all endpoints

---

## 📌 Roadmap

- Role-based access (admin)
- Redis caching (exercises/today view)
- Notifications & reminders (cron jobs + email/push)
- Streaks & achievements
- Extended nutrition module
