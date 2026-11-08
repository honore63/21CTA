# Deployment Guide

## 1. Local Development

### Frontend
```bash
cd apps/lesson-planner/frontend
npm install
npm run dev -- --host 0.0.0.0
```

### Backend
```bash
cd apps/lesson-planner/backend
npm install
npm run dev
```

### Environment variables
- Copy the provided .env.example or use the existing .env file in the backend
- Set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
- Set JWT_SECRET and API keys for AI access
- Do not expose secrets in client code

## 2. Database Setup

- Use the existing MySQL 21cta database
- Import the schema scripts in a safe order
- Keep migration files under database/migrations/
- Test schema changes in staging before production

## 3. Production Checklist

- configure real env vars
- set CORS origins to production domain
- enable HTTPS and secure cookies
- enable database backups
- ensure Redis is available if queue services are enabled
- validate AI provider keys and fallback behavior
- run regression and smoke tests before launch

## 4. Deployment Options

- Existing static hosting for frontend
- backend on Node.js host or container
- MySQL database on a managed service
- optional Redis for background jobs

## 5. Rollback Strategy

- keep snapshots and backups
- keep migration scripts versioned
- test database undo steps on staging
- maintain health checks after deployment
