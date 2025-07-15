# Build Instructions for Baccarat Game

## Prerequisites

Before building the application, ensure you have the following installed:

1. **Node.js** (v16 or higher)
2. **Yarn** package manager
3. **Electron** and **electron-builder** (included in devDependencies)

## Project Structure

This project consists of three main components:
- **Frontend**: React application in the `client/` directory
- **Backend**: Node.js server in the `server/` directory  
- **Electron**: Desktop wrapper in the `electron/` directory

## Building the Complete Application

### 1. Install Dependencies

Install all dependencies for all components:

```bash
# Install root dependencies
yarn install

# Install client dependencies
cd client && yarn install && cd ..

# Install server dependencies
cd server && yarn install && cd ..
```

### 2. Build for Production

To create a complete DMG package for macOS:

```bash
# Build everything and create DMG
yarn pack
```

This command will:
1. Build the React frontend (`yarn build-react`)
2. Install production server dependencies (`yarn install-server-deps`)
3. Package everything into a DMG file (`yarn build-mac`)

### 3. Platform-Specific Builds

#### macOS DMG (Recommended)
```bash
yarn build-mac
```

#### Windows EXE
```bash
yarn build-win
```

#### Linux AppImage
```bash
yarn build-linux
```

## Output

The built application will be located in the `dist/` directory:
- **macOS**: `dist/Baccarat Game-1.0.0.dmg`
- **Windows**: `dist/Baccarat Game Setup 1.0.0.exe`
- **Linux**: `dist/Baccarat Game-1.0.0.AppImage`

## Installation and Usage

### macOS DMG Installation

1. Open the generated DMG file
2. Drag "Baccarat Game" to the Applications folder
3. Launch the application from Applications
4. The app will automatically start both the frontend and backend services

### How It Works

The packaged application includes:
- **React Frontend**: Pre-built static files
- **Node.js Backend**: Complete server with dependencies
- **Electron Wrapper**: Desktop application framework
- **Auto-Startup**: Backend server starts automatically when the app launches

When you launch the application:
1. Electron starts the desktop window
2. The Node.js backend server starts on port 3001
3. The React frontend loads and connects to the backend
4. Everything runs locally on your machine

## Development Mode

For development with hot-reload:

```bash
# Start development mode with frontend, backend, and electron
yarn electron-dev

# For large simulations (increased memory)
yarn electron-dev-large
```

## Build Options

- **Regular Build**: `yarn pack` - Standard memory allocation
- **Large Build**: `yarn pack-large` - For large simulations with increased memory

## Troubleshooting

### Build Issues

1. **Missing Dependencies**: Run `yarn install` in all directories
2. **Port Conflicts**: Ensure ports 3000 and 3001 are available
3. **Icon Issues**: Icons are automatically generated from the React logo

### Runtime Issues

1. **Server Not Starting**: Check that the backend server dependencies are installed
2. **Frontend Not Loading**: Verify that the React build completed successfully
3. **Database Issues**: SQLite database will be created automatically
4. **White Screen/CSS Not Found**: The app uses relative paths (`homepage: "./"`) to work in Electron. If you see file loading errors, the React build should automatically handle this.

### Common Fixes

- **ERR_FILE_NOT_FOUND for CSS/JS**: This was fixed by adding `"homepage": "./"` to `client/package.json`
- **JavaScript Required Error**: Make sure the React build completed and uses relative paths
- **macOS Security Warning**: Right-click the app and select "Open" to bypass unsigned app warnings

### Server Not Starting in Packaged App

If you see "Failed to fetch" errors when running simulations:

1. **Open Developer Console**: Right-click in the app → "Inspect Element" → Console tab
2. **Check Server Logs**: The app will show detailed logging about server startup attempts
3. **Common Server Issues**:
   - **Database initialization failed**: Close and restart the app
   - **Port 3001 in use**: Close other applications using this port
   - **File permissions**: Ensure the app has proper write permissions
   - **Worker threads failed**: Check if Node.js worker_threads are supported

### Debug Mode

The latest build includes debugging features:
- **Detailed logging**: Server startup attempts are logged to console
- **Auto-DevTools**: If server doesn't start within 10 seconds, DevTools open automatically
- **Health checks**: App tests server connectivity before loading frontend

### Testing Server Manually

To verify the server works outside the packaged app:

```bash
# Start server manually in development
cd server && node index.js

# Test health check (in another terminal)
curl http://localhost:3001/api/health

# Test simulation endpoint
curl -X POST http://localhost:3001/api/simulations \
  -H "Content-Type: application/json" \
  -d '{"plays":1,"gamesPerPlay":10,"handsPerGame":5,"useInMemory":true}'
```

### Expected Behavior

When the app starts correctly:
1. **Server startup logs** appear in DevTools console
2. **"Server is ready"** message indicates backend is running
3. **Frontend loads** and shows the baccarat game interface
4. **Simulations work** without "Failed to fetch" errors

## Architecture

- **Frontend**: React app serves the user interface
- **Backend**: Express.js server with SQLite database
- **Electron**: Provides native desktop app functionality
- **Auto-packaging**: All components bundled together for one-click deployment

## Configuration

The build configuration is in `package.json` under the `build` section:
- Icons are in the `assets/` directory
- Server files are unpacked for execution
- DMG includes drag-to-Applications setup

## Security

- Node integration is disabled in the renderer process
- Context isolation is enabled for security
- Server runs locally only (no external network access required)