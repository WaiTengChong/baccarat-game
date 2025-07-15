const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');
const cors = require('cors');

let mainWindow;
let server;

// Real Baccarat Game Logic (from original server)
function createDeck(deckCount) {
  const suits = ["♠", "♥", "♣", "♦"];
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck = [];
  for (let i = 0; i < deckCount; i++) {
    for (let suit of suits) {
      for (let value of values) {
        deck.push({ suit, value });
      }
    }
  }
  return deck;
}

function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getCardValue(card) {
  if (card.value === 'A') return 1;
  if (['10', 'J', 'Q', 'K'].includes(card.value)) return 0;
  return parseInt(card.value);
}

function getHandTotal(hand) {
  let total = hand.reduce((sum, card) => sum + getCardValue(card), 0);
  return total % 10;
}

function needsBankerThirdCard(bankerTotal, playerThirdCard) {
  if (playerThirdCard === null) {
    return bankerTotal <= 5;
  } else {
    const pThirdValue = getCardValue(playerThirdCard);
    if (bankerTotal <= 2) return true;
    if (bankerTotal === 3 && pThirdValue !== 8) return true;
    if (bankerTotal === 4 && [2,3,4,5,6,7].includes(pThirdValue)) return true;
    if (bankerTotal === 5 && [4,5,6,7].includes(pThirdValue)) return true;
    if (bankerTotal === 6 && [6,7].includes(pThirdValue)) return true;
    return false;
  }
}

function playBaccaratHand(deck) {
  let deckCopy = [...deck];
  let playerCards = [];
  let bankerCards = [];
  
  // Initial deal
  playerCards.push(deckCopy.pop());
  bankerCards.push(deckCopy.pop());
  playerCards.push(deckCopy.pop());
  bankerCards.push(deckCopy.pop());
  
  let playerTotal = getHandTotal(playerCards);
  let bankerTotal = getHandTotal(bankerCards);
  
  // Natural win check
  if (playerTotal >= 8 || bankerTotal >= 8) {
    return {
      playerCards,
      bankerCards,
      playerTotal,
      bankerTotal,
      result: playerTotal > bankerTotal ? 'Player' : bankerTotal > playerTotal ? 'Banker' : 'Tie',
      remainingDeck: deckCopy
    };
  }
  
  // Player third card rule
  let playerThirdCard = null;
  if (playerTotal <= 5) {
    playerThirdCard = deckCopy.pop();
    playerCards.push(playerThirdCard);
    playerTotal = getHandTotal(playerCards);
  }
  
  // Banker third card rule
  if (needsBankerThirdCard(bankerTotal, playerThirdCard)) {
    bankerCards.push(deckCopy.pop());
    bankerTotal = getHandTotal(bankerCards);
  }
  
  // Determine winner
  let result;
  if (playerTotal > bankerTotal) {
    result = 'Player';
  } else if (bankerTotal > playerTotal) {
    result = 'Banker';
  } else {
    result = 'Tie';
  }
  
  return {
    playerCards,
    bankerCards,
    playerTotal,
    bankerTotal,
    result,
    remainingDeck: deckCopy
  };
}

// Helper function to detect pairs
function hasPair(cards) {
  return cards.length >= 2 && cards[0].value === cards[1].value;
}

// Real Baccarat Simulation Function
function runRealSimulation(plays, gamesPerPlay, handsPerGame, deckCount = 8) {
  console.log(`🎰 Running REAL baccarat simulation: ${plays} plays × ${gamesPerPlay} games × ${handsPerGame} hands`);
  const startTime = Date.now();
  const results = [];
  
  for (let play = 1; play <= plays; play++) {
    const playData = {
      playNumber: play,
      games: []
    };
    
    for (let game = 1; game <= gamesPerPlay; game++) {
      // Create and shuffle deck for this game
      let deck = createDeck(deckCount);
      deck = shuffleDeck(deck);
      
      let bankerWins = 0, playerWins = 0, tieWins = 0;
      let bankerPairs = 0, playerPairs = 0;
      const hands = [];
      
      // Play the specified number of hands
      for (let hand = 1; hand <= handsPerGame; hand++) {
        // Check if we need to reshuffle (when deck gets low)
        if (deck.length < 20) {
          deck = createDeck(deckCount);
          deck = shuffleDeck(deck);
          console.log('🔄 Reshuffling deck');
        }
        
        const handResult = playBaccaratHand(deck);
        deck = handResult.remainingDeck;
        
        // Count wins
        if (handResult.result === 'Banker') bankerWins++;
        else if (handResult.result === 'Player') playerWins++;
        else tieWins++;
        
        // Check for pairs
        const playerPair = hasPair(handResult.playerCards);
        const bankerPair = hasPair(handResult.bankerCards);
        if (playerPair) playerPairs++;
        if (bankerPair) bankerPairs++;
        
        // Store hand details (keep card objects for frontend compatibility)
        hands.push({
          handNumber: hand,
          result: handResult.result,
          playerTotal: handResult.playerTotal,
          bankerTotal: handResult.bankerTotal,
          playerCards: handResult.playerCards, // Keep as objects
          bankerCards: handResult.bankerCards, // Keep as objects
          bankerPair: bankerPair,
          playerPair: playerPair
        });
      }
      
      playData.games.push({
        gameNumber: game,
        gameId: `${play}-${game}`,
        totalHands: handsPerGame,
        bankerWins: bankerWins,
        playerWins: playerWins,
        tieWins: tieWins,
        bankerPairs: bankerPairs,
        playerPairs: playerPairs,
        hands: hands
      });
    }
    
    results.push(playData);
  }
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  const totalHands = plays * gamesPerPlay * handsPerGame;
  const handsPerSecond = Math.round(totalHands / duration);
  
  console.log(`✅ Real simulation completed: ${totalHands} hands in ${duration.toFixed(2)}s (${handsPerSecond} hands/sec)`);
  
  return results;
}

// Embedded backend server (with real baccarat logic)
function createEmbeddedServer() {
  console.log('🚀 Starting embedded backend server with REAL baccarat simulation...');
  
  const serverApp = express();
  serverApp.use(express.json());
  serverApp.use(cors());

  // In-memory storage for simulations
  const simulations = new Map();
  let simulationCounter = 0;

  // Health check endpoint
  serverApp.get('/api/health', (req, res) => {
    console.log('✅ Health check requested');
    res.json({ 
      status: 'ok', 
      mode: 'embedded-real',
      message: 'Running embedded server with REAL baccarat simulation'
    });
  });

  // Real simulation endpoint
  serverApp.post('/api/simulations', (req, res) => {
    console.log('🎰 Real baccarat simulation requested:', req.body);
    
    const { plays = 1, gamesPerPlay = 1, handsPerGame = 10, deckCount = 8 } = req.body;
    
    const simulationId = 'real-' + (++simulationCounter);
    
    try {
      // Run REAL baccarat simulation
      const results = runRealSimulation(plays, gamesPerPlay, handsPerGame, deckCount);
      
      const simulation = {
        id: simulationId,
        status: 'completed',
        progress: 100,
        plays: plays,
        gamesPerPlay: gamesPerPlay,
        handsPerGame: handsPerGame,
        deckCount: deckCount,
        created: new Date(),
        results: results
      };
      
      simulations.set(simulationId, simulation);
      
      // Calculate total games for frontend
      const totalGames = results.reduce((sum, play) => sum + play.games.length, 0);
      
      res.json({ 
        simulationId: simulationId,
        id: simulationId,
        status: 'completed',
        optimizationLevel: 'embedded-real',
        totalGames: totalGames,
        results: results,  // Frontend expects 'results' not 'plays'
        plays: results,    // Keep 'plays' for backward compatibility
        message: 'REAL baccarat simulation completed successfully'
      });
      
    } catch (error) {
      console.error('❌ Simulation error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get simulation status
  serverApp.get('/api/simulations/:id/status', (req, res) => {
    const simulation = simulations.get(req.params.id);
    if (!simulation) {
      return res.status(404).json({ error: 'Simulation not found' });
    }
    
    res.json({ 
      status: simulation.status, 
      progress: simulation.progress 
    });
  });

  // Get simulation results
  serverApp.get('/api/simulations/:id/results', (req, res) => {
    const simulation = simulations.get(req.params.id);
    if (!simulation) {
      return res.status(404).json({ error: 'Simulation not found' });
    }
    
    // Return just the plays data, no message field
    res.json({ 
      plays: simulation.results
    });
  });

  // Get games for a specific play
  serverApp.get('/api/simulations/:id/plays/:playNumber/games', (req, res) => {
    const simulation = simulations.get(req.params.id);
    if (!simulation) {
      return res.status(404).json({ error: 'Simulation not found' });
    }
    
    const playNumber = parseInt(req.params.playNumber);
    const play = simulation.results.find(p => p.playNumber === playNumber);
    
    if (!play) {
      return res.status(404).json({ error: 'Play not found' });
    }
    
    // Pre-compute table data on backend for instant frontend display
    const tableData = play.games.map((game, index) => {
      const totalHands = game.totalHands;
      const bankerWins = game.bankerWins;
      const playerWins = game.playerWins;
      const tieWins = game.tieWins;
      const bankerPairs = game.bankerPairs;
      const playerPairs = game.playerPairs;
      
      return {
        key: index + 1,
        gameNumber: game.gameNumber,
        gameId: game.gameId,
        totalHands: totalHands,
        bankerWins: `${bankerWins} (${
          totalHands > 0 ? ((bankerWins / totalHands) * 100).toFixed(1) : 0
        }%)`,
        playerWins: `${playerWins} (${
          totalHands > 0 ? ((playerWins / totalHands) * 100).toFixed(1) : 0
        }%)`,
        tieWins: `${tieWins} (${
          totalHands > 0 ? ((tieWins / totalHands) * 100).toFixed(1) : 0
        }%)`,
        bankerPair: `${bankerPairs} (${
          totalHands > 0 ? ((bankerPairs / totalHands) * 100).toFixed(1) : 0
        }%)`,
        playerPair: `${playerPairs} (${
          totalHands > 0 ? ((playerPairs / totalHands) * 100).toFixed(1) : 0
        }%)`,
        rawData: {
          totalHands,
          bankerWins,
          playerWins,
          tieWins,
          bankerPairs,
          playerPairs
        }
      };
    });
    
    // Calculate consecutive wins data for this play
    const consecutiveAnalysis = {
      consecutiveBanker: [],
      consecutivePlayer: [],
      consecutiveTie: []
    };
    
    // Analyze each game for consecutive patterns
    for (const game of play.games) {
      let currentStreak = 1;
      let currentWinner = null;
      
      for (let i = 0; i < game.hands.length; i++) {
        const hand = game.hands[i];
        
        if (hand.result === currentWinner) {
          currentStreak++;
        } else {
          // End of streak, record it
          if (currentWinner && currentStreak > 0) {
            const analysis = currentWinner === 'Banker' ? consecutiveAnalysis.consecutiveBanker :
                           currentWinner === 'Player' ? consecutiveAnalysis.consecutivePlayer :
                           consecutiveAnalysis.consecutiveTie;
            
            const existingEntry = analysis.find(entry => entry.length === currentStreak);
            if (existingEntry) {
              existingEntry.count++;
            } else {
              analysis.push({ length: currentStreak, count: 1 });
            }
          }
          
          currentWinner = hand.result;
          currentStreak = 1;
        }
      }
      
      // Record final streak
      if (currentWinner && currentStreak > 0) {
        const analysis = currentWinner === 'Banker' ? consecutiveAnalysis.consecutiveBanker :
                       currentWinner === 'Player' ? consecutiveAnalysis.consecutivePlayer :
                       consecutiveAnalysis.consecutiveTie;
        
        const existingEntry = analysis.find(entry => entry.length === currentStreak);
        if (existingEntry) {
          existingEntry.count++;
      } else {
          analysis.push({ length: currentStreak, count: 1 });
        }
      }
    }
    
    // Convert consecutive wins data to chart format
    const consecutiveWinsData = [];
    const maxStreak = Math.max(
      Math.max(...consecutiveAnalysis.consecutiveBanker.map(item => item.length), 0),
      Math.max(...consecutiveAnalysis.consecutivePlayer.map(item => item.length), 0)
    );
    
    for (let i = 1; i <= Math.max(maxStreak, 5); i++) {
      const bankerEntry = consecutiveAnalysis.consecutiveBanker.find(entry => entry.length === i);
      const playerEntry = consecutiveAnalysis.consecutivePlayer.find(entry => entry.length === i);
      
      consecutiveWinsData.push({
        x: i,
        y: bankerEntry ? bankerEntry.count : 0,
        type: "莊",
      });
      consecutiveWinsData.push({
        x: i,
        y: playerEntry ? playerEntry.count : 0,
        type: "閑",
      });
    }
    
    console.log(`📊 Pre-computed table data for play ${playNumber}: ${play.games.length} games`);
    console.log(`📊 Pre-computed consecutive wins data for play ${playNumber}: ${consecutiveWinsData.length} data points`);
    
    // Check if dataset is too large (> 500 games) to prevent JSON overload
    const totalGames = play.games.length;
    const SIZE_LIMIT = 500;
    const isDatasetTooLarge = totalGames > SIZE_LIMIT;
    
    if (isDatasetTooLarge) {
      console.log(`⚠️ Dataset too large (${totalGames} games > ${SIZE_LIMIT}). Returning summary data only to prevent system overload.`);
    }
    
    res.json({ 
      playNumber: parseInt(playNumber),
      tableData: isDatasetTooLarge ? [] : tableData, // Empty if too large
      consecutiveWinsData: consecutiveWinsData, // Always include analysis
      pagination: {
        page: 1,
        pageSize: isDatasetTooLarge ? 0 : play.games.length,
        total: play.games.length,
        totalPages: isDatasetTooLarge ? 0 : 1,
        hasMore: false
      },
      // Include summary info for large datasets
      summary: {
        totalGames: totalGames,
        dataLimitExceeded: isDatasetTooLarge,
        limit: SIZE_LIMIT,
        message: isDatasetTooLarge 
          ? `Dataset contains ${totalGames} games. Data arrays empty to prevent system overload. Use summary statistics instead.`
          : `Dataset size: ${totalGames} games (within limit)`
      },
      // Raw games data - empty if too large
      games: isDatasetTooLarge ? [] : play.games.map(game => ({
        gameNumber: game.gameNumber,
        gameId: game.gameId,
        totalHands: game.totalHands,
        bankerWins: game.bankerWins,
        playerWins: game.playerWins,
        tieWins: game.tieWins,
        bankerPairs: game.bankerPairs,
        playerPairs: game.playerPairs,
        hands: game.hands
      }))
    });
  });

  // Get hands for a specific game
  serverApp.get('/api/games/:gameId/hands', (req, res) => {
    // Simple implementation - find game across all simulations
    for (const simulation of simulations.values()) {
      for (const play of simulation.results) {
        const game = play.games.find(g => g.gameId === req.params.gameId);
        if (game) {
          return res.json({ hands: game.hands });
        }
      }
    }
    
    res.status(404).json({ error: 'Game not found' });
  });

  // Get all plays for a simulation
  serverApp.get('/api/simulations/:id/plays', (req, res) => {
    const simulation = simulations.get(req.params.id);
    if (!simulation) {
      return res.status(404).json({ error: 'Simulation not found' });
    }
    
    const plays = simulation.results.map(play => ({
      playNumber: play.playNumber,
      totalGames: play.games.length,
      totalHands: play.games.reduce((sum, game) => sum + game.totalHands, 0)
    }));
    
    res.json({ plays });
  });

  // Get consecutive analysis (calculate from real data)
  serverApp.get('/api/simulations/:id/plays/:playNumber/consecutive-analysis', (req, res) => {
    const simulation = simulations.get(req.params.id);
    if (!simulation) {
      return res.status(404).json({ error: 'Simulation not found' });
    }
    
    const playNumber = parseInt(req.params.playNumber);
    const play = simulation.results.find(p => p.playNumber === playNumber);
    
    if (!play) {
      return res.status(404).json({ error: 'Play not found' });
    }
    
    // Calculate real consecutive analysis from actual game data
    const consecutiveAnalysis = {
      consecutiveBanker: [],
      consecutivePlayer: [],
      consecutiveTie: []
    };
    
    // Analyze each game for consecutive patterns
    for (const game of play.games) {
      let currentStreak = 1;
      let currentWinner = null;
      
      for (let i = 0; i < game.hands.length; i++) {
        const hand = game.hands[i];
        
        if (hand.result === currentWinner) {
          currentStreak++;
        } else {
          // End of streak, record it
          if (currentWinner && currentStreak > 0) {
            const analysis = currentWinner === 'Banker' ? consecutiveAnalysis.consecutiveBanker :
                           currentWinner === 'Player' ? consecutiveAnalysis.consecutivePlayer :
                           consecutiveAnalysis.consecutiveTie;
            
            const existingEntry = analysis.find(entry => entry.length === currentStreak);
            if (existingEntry) {
              existingEntry.count++;
            } else {
              analysis.push({ length: currentStreak, count: 1 });
            }
          }
          
          currentWinner = hand.result;
          currentStreak = 1;
        }
      }
      
      // Record final streak
      if (currentWinner && currentStreak > 0) {
        const analysis = currentWinner === 'Banker' ? consecutiveAnalysis.consecutiveBanker :
                       currentWinner === 'Player' ? consecutiveAnalysis.consecutivePlayer :
                       consecutiveAnalysis.consecutiveTie;
        
        const existingEntry = analysis.find(entry => entry.length === currentStreak);
        if (existingEntry) {
          existingEntry.count++;
        } else {
          analysis.push({ length: currentStreak, count: 1 });
        }
      }
    }
    
    // Sort by length
    consecutiveAnalysis.consecutiveBanker.sort((a, b) => a.length - b.length);
    consecutiveAnalysis.consecutivePlayer.sort((a, b) => a.length - b.length);
    consecutiveAnalysis.consecutiveTie.sort((a, b) => a.length - b.length);
    
    res.json(consecutiveAnalysis);
  });

  // Start the embedded server
  const PORT = 3001;
  server = serverApp.listen(PORT, () => {
    console.log(`✅ Embedded Baccarat Server running on http://localhost:${PORT}`);
    console.log('✅ All features available in embedded mode');
    
    // Now load the frontend
    loadFrontend();
  });
  
  return server;
}

function loadFrontend() {
  console.log('🎮 Loading frontend...');
  const startURL = `file://${path.join(__dirname, '..', 'client', 'build', 'index.html')}`;
  console.log('📁 Frontend path:', startURL);
  
  mainWindow.loadURL(startURL);
  mainWindow.show();
  
  // Open DevTools in development
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
}

function createWindow() {
  console.log('🖥️ Creating Electron window...');
  
  // Set Node.js memory limit for better performance (same as dev:large)
  if (process.env.NODE_OPTIONS) {
    process.env.NODE_OPTIONS += ' --max-old-space-size=8192';
  } else {
    process.env.NODE_OPTIONS = '--max-old-space-size=8192';
  }
  console.log('🧠 Node.js memory limit set to 8GB for large simulations');
  
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 800,
    show: false, // Don't show until server is ready
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.png') // Add icon if available
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  console.log('📁 App is packaged:', app.isPackaged);
  console.log('📁 __dirname:', __dirname);

  if (!process.env.ELECTRON_START_URL) {
    // Production mode - start embedded server
    console.log('🏭 Production mode - starting embedded server...');
    createEmbeddedServer();
  } else {
    // Development mode
    console.log('🔧 Development mode detected');
    const startURL = process.env.ELECTRON_START_URL;
    console.log('🔗 Loading development URL:', startURL);
    mainWindow.loadURL(startURL);
    mainWindow.show();
    mainWindow.webContents.openDevTools();
  }

  return mainWindow;
}

// App event handlers
app.whenReady().then(() => {
  console.log('⚡ Electron app ready');
  createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  console.log('🛑 All windows closed');
  
  // Close the embedded server
  if (server) {
    console.log('🛑 Closing embedded server...');
    server.close();
  }
  
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  console.log('🛑 App quitting...');
  
  // Close the embedded server
  if (server) {
    console.log('🛑 Shutting down embedded server...');
    server.close();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
}); 