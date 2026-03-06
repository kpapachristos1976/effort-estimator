# Effort Estimator

A web-based tool for estimating project effort for regulatory reporting and data model implementation.

## Requirements

- Node.js 18+ (https://nodejs.org/)

## Quick Start

### 1. Start the Backend

```powershell
cd backend
npm install
npm start
```

Backend runs on http://localhost:3001

### 2. Start the Frontend (new terminal)

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:3000

## Features

- Upload BRD/FSD documents (PDF, DOCX) for automated parsing
- Calculate effort by phase and implementation stream
- Configurable estimation parameters
- Task classification management
- Export results to CSV

## Project Structure

```
effort-estimator/
├── backend/           # Express + SQLite API
│   ├── server.js      # Main server
│   ├── database.js    # SQLite setup
│   ├── estimation-engine.js
│   └── document-parser.js
├── frontend/          # React + Vite
│   └── src/
│       ├── pages/     # React pages
│       └── services/  # API client
└── README.md
```

## Estimation Logic

Effort is calculated based on:
- Component counts (tables, fields, packages, data models, file extracts)
- Complexity multipliers (low: 0.6x, normal: 1.0x, complex: 1.8x)
- Phase distribution (Analysis, Implementation, UAT, Production)
- Stream weights (DWH, MTII, Moody's)
