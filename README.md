# Rapid Jobs Server

A simple Node.js server using Express, MongoDB, and TypeScript.

## Getting Started

### Prerequisites

- Node.js
- MongoDB

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Start (Production)

```bash
npm start
```

## Project Structure

- `src/`
  - `routes/` - Express route definitions
  - `controllers/` - Route handler logic
  - `models/` - Mongoose models
  - `config/` - Configuration files
  - `index.ts` - Entry point

## Environment Variables

- `MONGO_URI` - MongoDB connection string
- `PORT` - Server port

## Example API

- `GET /api/jobs` - List all jobs
