# Baccarat Game - Build Instructions

## Project Overview
This is a real baccarat simulation application built with React frontend and Electron backend, featuring authentic 8-deck gameplay with proper baccarat rules.

## Prerequisites
- Node.js (v14 or higher)
- Yarn package manager
- Git

## Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd baccarat-game
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Install client dependencies**
   ```bash
   cd client
   yarn install
   cd ..
   ```

4. **Install server dependencies**
   ```bash
   cd server
   yarn install
   cd ..
   ```

## Development Scripts

### Frontend Development
```bash
cd client
yarn start
```
This starts the React development server on `http://localhost:3000`

### Backend Server (Standalone)
```bash
cd server
yarn start
# or for large simulations
yarn start:large
```
This starts the backend API server on `http://localhost:3001`

### Electron Development
```bash
# Standard mode
yarn electron-dev

# Large dataset mode (8GB memory)
yarn electron-dev-large
```

## Building for Production

### Prerequisites for Building
```bash
yarn prebuild
```

### Build React Client
```bash
cd client
yarn build
cd ..
```

### Build Windows Executable
```bash
yarn build-win
```

This creates:
- `dist/Baccarat Game 1.0.0.exe` (Portable)
- `dist/Baccarat Game Setup 1.0.0.exe` (Installer)

### Build for Other Platforms
```bash
yarn build-mac    # macOS
yarn build-linux  # Linux
yarn build-all    # All platforms
```

## Large Dataset Optimization

The application includes built-in protection for handling very large datasets (millions of games):

### Size Limit Protection
- **Limit**: 500 games per API response
- **Behavior**: When exceeded, API returns empty `games` and `tableData` arrays
- **Benefits**: Prevents JSON overload and system crashes

### API Response for Large Datasets
```json
{
  "playNumber": 1,
  "tableData": [],  // Empty when size > 500
  "consecutiveWinsData": [...], // Always included
  "pagination": {
    "page": 1,
    "pageSize": 0,
    "total": 1000000,  // Actual total
    "totalPages": 0,
    "hasMore": false
  },
  "summary": {
    "totalGames": 1000000,
    "dataLimitExceeded": true,
    "limit": 500,
    "message": "Dataset contains 1,000,000 games. Data arrays empty to prevent system overload. Use summary statistics instead."
  },
  "games": []  // Empty when size > 500
}
```

### Frontend Handling
- Shows informative message when data limit exceeded
- Displays total game count with proper formatting
- Still shows consecutive wins analysis (always computed)
- Provides suggestions for handling large datasets

## Architecture

### Frontend (React)
- **Location**: `client/`
- **Main Components**:
  - `src/playground/` - Main simulation interface
  - `src/services/api.js` - Backend communication
  - `src/components/` - Reusable UI components

### Backend (Express)
- **Location**: `server/`
- **Features**:
  - Real baccarat simulation engine
  - SQLite database for large datasets
  - Multi-threaded processing with worker threads
  - Memory optimization for large simulations

### Electron App
- **Location**: `electron/`
- **Features**:
  - Embedded backend server
  - Real baccarat game logic
  - Large dataset optimization
  - Cross-platform desktop app

## Real Baccarat Features

### Authentic Game Logic
- **8-deck shoe** with proper shuffling
- **Real card values** (A=1, 10/J/Q/K=0, others face value)
- **Modulo 10 scoring** for authentic baccarat totals
- **Third card rules** exactly as in real casinos
- **Natural wins** (8 or 9 points with first two cards)
- **Pair detection** for side bets

### Simulation Capabilities
- **Multiple optimization levels**:
  - Ultra-fast: Pure in-memory (no database)
  - Mega: Large datasets with pre-computed analysis
  - Standard: Full database storage
- **Parallel processing** using all CPU cores
- **Memory management** for datasets up to millions of games
- **Real-time progress tracking**

## Troubleshooting

### Common Issues

1. **Memory errors with large simulations**
   - Use `yarn electron-dev-large` for development
   - Built Windows exe includes 8GB memory allocation

2. **API timeouts**
   - Large datasets are automatically optimized
   - Table data limited to prevent system overload

3. **Build failures**
   - Ensure all dependencies are installed: `yarn install`
   - Clear cache: `yarn cache clean`
   - Rebuild: `yarn prebuild && yarn build-win`

### Performance Tips
- Use in-memory mode for datasets < 10,000 games
- For million+ games, expect table data to be limited
- Consecutive analysis always works regardless of size
- Monitor memory usage during large simulations

## File Structure
```
baccarat-game/
├── client/           # React frontend
│   ├── src/
│   ├── public/
│   └── build/        # Built frontend
├── server/           # Express backend
│   ├── index.js      # Main server
│   └── simulationWorker.js
├── electron/         # Electron main process
│   └── main.js       # Embedded server + window
├── dist/             # Built executables
├── assets/           # App icons/images
└── package.json      # Main package configuration
```

## License
This project contains real baccarat simulation logic and is intended for educational and simulation purposes.