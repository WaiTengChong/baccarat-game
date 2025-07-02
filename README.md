# Baccarat Game Simulator

A high-performance simulator for the casino card game **Baccarat**. The project moves all game logic to a backend service so the browser can remain responsive while running large numbers of games.

## Features
- Backend-driven simulations for optimal performance
- Handles tens of thousands of games per run
- Real‑time progress tracking
- Temporary in-memory database (SQLite) that cleans itself on restart
- Accurate implementation of Baccarat rules, including third‑card logic
- React frontend using Ant Design components
- Desktop support through Electron
- Parallel processing via Node.js worker threads
- Lightweight SQLite database created on startup and cleaned on exit

## Repository Structure
- `client/` – React application for configuring and visualising simulations
- `server/` – Express API with simulation logic and SQLite database
- `electron/` – Wrapper for packaging the app as a desktop application

## Architecture
```
Frontend (React) ──► API ──► Node.js backend ──► SQLite (temporary)
```
This structure avoids memory crashes and keeps the UI responsive even with heavy workloads.

## Prerequisites
- Node.js 16+
- npm or yarn
- SQLite3

## Installation
```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

## Usage
### Start the backend
```bash
cd server
npm run dev
# Available at http://localhost:3001
```
### Start the frontend
```bash
cd client
npm start
# Available at http://localhost:3000
```

### Run as a desktop app
The project ships with an Electron wrapper. During development you can launch
the backend, React dev server and Electron shell in one command:

```bash
yarn electron-dev
```

To build a production desktop package run:

```bash
yarn pack
```

### Basic simulation
1. Choose the number of card decks (6–8)
2. Select how many runs, games and hands to simulate
3. Click **Run** and watch progress in real time
4. Open completed simulations to view detailed results

## API
- `POST /api/simulations` – start a new simulation
- `GET /api/simulations/{id}/status` – check progress
- `GET /api/simulations/{id}/results` – summary of results
- `GET /api/games/{id}/hands` – individual hands for a game

## Troubleshooting
- Ensure the backend is running on port `3001`
- Restart the backend if the temporary database becomes locked
- Reduce simulation size if your system runs out of memory

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes with tests
4. Open a pull request

## License
MIT
