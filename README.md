# Investment RAG System (Gemini + Firebase Firestore)

This project ingests a PDF investment textbook, chunks & embeds it with **Gemini text-embedding-004**, stores the chunks + embeddings in **Firebase Firestore**, and answers natural-language queries using **Gemini 2.0 Flash** with grounded, cited responses.

## Folder Layout

- `backend/` Node.js + Express REST API
- `frontend/` React + Vite + Tailwind single-page app

## Prerequisites

1. A **Google Gemini API key** (only used on the backend)
2. A **Firebase project** with Firestore enabled
3. A **Firebase service account JSON** (private key, project id, client email)

## Backend Setup

1. Install dependencies:
   - `cd backend`
   - `npm install`
2. Create `.env`:
   - Fill in `GEMINI_API_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `FRONTEND_URL` in `backend/.env`
3. Run the backend:
   - `npm run dev`
   - Health check: `http://localhost:5000/health`

## Frontend Setup

1. Install dependencies:
   - `cd frontend`
   - `npm install`
2. Run the frontend:
   - `npm run dev`
   - UI: `http://localhost:5173`

## API Endpoints

- `POST /api/ingest/upload`  
  Uploads a PDF (`multipart/form-data`, field name `pdf`). Returns NDJSON progress events.
- `POST /api/query/ask`  
  Body: `{ "question": "..." }`
- `GET /api/query/chunks`  
  Returns stored chunk content for the chunk viewer.

## Firestore Security Rules

This project ships with `firestore.rules` that denies browser/client read/write access to `rag_chunks`.

Your backend uses the Firebase Admin SDK, which bypasses Firestore rules, so ingestion/query still works without exposing the data directly to the browser.

## Security Notes (Important)

- **Do not** place `GEMINI_API_KEY` or Firebase private keys in the frontend.
- If you accidentally exposed keys (like in chat logs), revoke them immediately in Google/Firebase consoles.

## Testing

- Upload a text-based PDF in the UI `Upload` tab.
- Open `Query` and run the 5 mandatory preset questions.
- Open `Chunks` to inspect stored chunk content.

