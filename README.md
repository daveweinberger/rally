# 🌲 Rally: AI-Powered Outdoor Adventure Planner

Rally is a modern, high-performance **Progressive Web App (PWA)** designed to plan optimal outdoor adventures. By integrating the **Gemini API (with Google Maps Grounding)**, **Google Routes API**, and **Open-Meteo Weather API**, Rally dynamically recommends hiking, climbing, mountain biking, skiing, kayaking, and trail running adventures.

It computes real-time driving routes, checks trail-specific live weather forecasts, filters out off-season activities, and allows you to refine your itinerary via an interactive chat interface.

---

## ✨ Features

*   **Smart Activity Search**: Plan adventures tailored to your start location, duration preference (half-day, full-day, multi-day), maximum driving radius, experience level, and custom requests (e.g., "dog-friendly", "shaded trails").
*   **Dynamic Seasonal Activity Filtering**:
    *   Uses month and hemisphere detection (Northern vs. Southern) to dynamically hide off-season activities (e.g., skiing in July in Seattle, kayaking in January).
    *   Highlights **shoulder seasons** with warning tags (e.g., alerting when mountain access or snow conditions might be highly variable).
*   **Real-Time Route Calculation**: Directly queries the Google Routes API to compute the exact travel time and distance from your starting location to the trails.
*   **Trailhead Weather Forecasts**: Prioritizes destinations with dry weather, provides a live weather outlook, and appends warnings if rain probability exceeds 30%.
*   **Interactive Chat Refinement**: Adjust options, add side stops, or ask follow-up questions about recommended routes using a streamed conversational AI drawer.
*   **Glassmorphic Design & Micro-Animations**: A modern, premium dark-mode interface utilizing ambient mesh background blobs, smooth transitions, custom select inputs, and clean iconography.
*   **PWA Ready**: Completely mobile-friendly, installable on iOS/Android/Desktop, with offline caching support via Workbox.

---

## 🏗️ Architecture & Project Structure

The project is structured as a mono-repo split into a static React frontend and a serverless Firebase backend:

```text
├── .env                     # Local environment keys (Frontend & backend references)
├── .gitignore               # Configured to exclude sensitive keys and modules
├── firebase.json            # Firebase configuration for Hosting & Functions
├── package.json             # Root dependencies (React 19, Vite, Vite PWA plugin)
├── public/                  # PWA icons, assets, and web manifest
├── src/                     # React Application Core
│   ├── components/          # Reusable UI elements (Header, InputPanel, ChatInterface, etc.)
│   ├── hooks/               # Custom hooks for search state and refinement stream
│   ├── utils/               # Geolocation helper functions & seasonal constraint checks
│   ├── App.jsx              # Main application shell and layout
│   └── index.css            # Global CSS variables, design tokens, and glassmorphic UI system
└── functions/               # Firebase Cloud Functions (v2) Backend
    ├── .env                 # Server-only environment variables (Gemini & Maps Keys)
    ├── index.js             # Main serverless endpoints (searchAdventures, refineAdventure)
    └── src/                 # Services for Gemini AI, routing, and weather
```

---

## 🔑 Environment Configuration

Rally relies on key APIs to function. You must configure environment variables before running the application.

Create a `.env` file in the **root directory**:

```env
# Gemini API Key (Required for server/functions execution)
GEMINI_API_KEY="your-gemini-api-key"

# Google Maps API Key / Google Routes API Key
GOOGLE_MAPS_API_KEY="your-google-maps-api-key"

# Firebase Client Configuration (Used for client SDK initialization)
VITE_FIREBASE_API_KEY="your-client-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-app.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-app.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
VITE_FIREBASE_MEASUREMENT_ID="your-measurement-id"
```

Create a `.env` file inside the `functions` directory:

```env
GEMINI_API_KEY="your-gemini-api-key"
GOOGLE_MAPS_API_KEY="your-google-maps-api-key"
```

---

## 🛠️ Local Development Setup

To run Rally locally, ensure you have **Node.js** and the **Firebase CLI** installed.

### 1. Install Dependencies
Install packages for both the React frontend and the serverless functions:

```bash
# Install root (Frontend) dependencies
npm install

# Install Functions backend dependencies
cd functions
npm install
cd ..
```

### 2. Run the Development Servers

To run the application locally with full functionality, you need to start the Vite development server and the Firebase local emulators:

```bash
# Terminal 1: Run Vite Frontend
npm run dev

# Terminal 2: Run Firebase Cloud Functions Emulator
firebase emulators:start
```

Open `http://localhost:5173` in your browser to view the application.

---

## 🚀 Build & Deployment

### Production Build
Build the optimized production assets for the frontend:

```bash
npm run build
```

### Deploy to Firebase
Deploy both the frontend hosting assets and the Firebase Cloud Functions to your project:

```bash
# Log in to your Firebase account (if not already logged in)
firebase login

# Deploy all services (Hosting, Functions, Firestore rules)
firebase deploy
```
