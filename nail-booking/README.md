# 💅 Nail Studio – Booking App

Full-stack appointment booking system for nail studios.
**Stack**: Node.js · Express · MongoDB Atlas · Vanilla HTML/CSS/JS

---

## Quick Start

### 1. Configure environment

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

| Variable         | Description                                  |
|-----------------|----------------------------------------------|
| `MONGODB_URI`   | MongoDB Atlas connection string              |
| `JWT_SECRET`    | Any long random string (keep secret)         |
| `PORT`          | Server port (default `3000`)                 |
| `ADMIN_EMAIL`   | Admin login email (default `admin@nail.com`) |
| `ADMIN_PASSWORD`| Admin login password (default `admin1234`)   |

### 2. Install & run

```bash
cd backend
npm install
npm start
```

On first start the server auto-seeds the admin user from `.env`.

| URL                           | Description        |
|-------------------------------|--------------------|
| http://localhost:3000         | Public booking page|
| http://localhost:3000/admin   | Admin dashboard    |

---

## Default Credentials

- **Email**: `admin@nail.com`
- **Password**: `admin1234`

> ⚠️ Change these in `.env` before deploying.

---

## API Reference

| Method | Route | Auth | Description |
|--------|-------|:----:|-------------|
| `POST`   | `/api/auth/login` | — | Admin login → JWT |
| `POST`   | `/api/bookings` | — | Create booking |
| `GET`    | `/api/bookings/available?date=YYYY-MM-DD` | — | Available slots for date |
| `GET`    | `/api/bookings` | ✔ | All non-cancelled bookings |
| `PATCH`  | `/api/bookings/:id/done` | ✔ | Mark booking as done |
| `DELETE` | `/api/bookings/:id` | ✔ | Cancel booking |
| `POST`   | `/api/slots/block` | ✔ | Block a time slot |
| `GET`    | `/api/slots/blocked` | ✔ | List blocked slots |
| `DELETE` | `/api/slots/block/:id` | ✔ | Unblock a slot |

---

## Business Rules

- Available days: **Monday – Saturday**
- Time slots: **09:00 – 18:00**, every 60 minutes (10 slots/day)
- No two bookings can share the same date + time
- Blocked slots are also unavailable to clients
- Cancellations soft-delete (status = `cancelled`) so history is preserved

---

## Project Structure

```
nail-booking/
├── backend/
│   ├── server.js            # Entry point, MongoDB connect, seeds admin
│   ├── routes/
│   │   ├── auth.js          # POST /api/auth/login
│   │   ├── bookings.js      # Booking CRUD
│   │   └── slots.js         # Block/unblock slots
│   ├── models/
│   │   ├── Booking.js
│   │   ├── BlockedSlot.js
│   │   └── Admin.js
│   ├── middleware/
│   │   └── auth.js          # JWT verification middleware
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── index.html           # Public booking page
    ├── admin.html           # Admin dashboard
    ├── style.css            # Shared pastel styles
    └── js/
        ├── booking.js       # Calendar, slot picker, form
        └── admin.js         # Login, booking management, block slots
```
