const express = require('express');
const cors = require('cors');
const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const os = require('os');

const app = express();
app.use(express.json());
app.use(cors());

// Get number of CPU cores for parallel processing
const NUM_CORES = os.cpus().length;
console.log(`Available CPU cores: ${NUM_CORES}`);

// Temporary database setup
let db;
const dbPath = path.join(__dirname, 'temp_baccarat.sqlite');

// Initialize temporary database with robust cleanup
function initTempDatabase() {
  return new Promise((resolve, reject) => {
    // First, close any existing database connection
    if (db) {
      db.close((err) => {
        if (err) console.log('Error closing existing database:', err);
      });
      db = null;
    }
    
    // Create unique database name to avoid conflicts
    const timestamp = Date.now();
    const uniqueDbPath = path.join(__dirname, `temp_baccarat_${timestamp}.sqlite`);
    
    // Remove any existing database files
    try {
      const serverDir = __dirname;
      const files = fs.readdirSync(serverDir);
      files.forEach(file => {
        if (file.startsWith('temp_baccarat') && file.endsWith('.sqlite')) {
          const filePath = path.join(serverDir, file);
          try {
            fs.unlinkSync(filePath);
            console.log('Removed existing database file:', file);
          } catch (err) {
            console.log('Could not remove file:', file, '(may be in use)');
          }
        }
      });
    } catch (error) {
      console.log('Warning: Could not clean existing database files:', error.message);
    }
    
    // Create new database with unique name
    db = new sqlite3.Database(uniqueDbPath, (err) => {
      if (err) {
        console.error('Database creation error:', err);
        reject(err);
        return;
      }
      
      console.log('Database created successfully at:', uniqueDbPath);
      
      // Create tables with proper synchronization
      db.serialize(() => {
        let tablesCreated = 0;
        const totalTables = 4;
        
        const checkComplete = (err) => {
          if (err) {
            console.error('Table creation error:', err);
            reject(err);
            return;
          }
          tablesCreated++;
          console.log(`Table ${tablesCreated}/${totalTables} created`);
          if (tablesCreated === totalTables) {
            console.log('All database tables created successfully');
            resolve();
          }
        };
        
        // Create games table
        db.run(`CREATE TABLE games (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          simulation_id TEXT,
          play_number INTEGER,
          game_number INTEGER,
          total_hands INTEGER,
          banker_wins INTEGER,
          player_wins INTEGER,
          tie_wins INTEGER,
          banker_pairs INTEGER,
          player_pairs INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, checkComplete);
        
        // Create hands table
        db.run(`CREATE TABLE hands (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          game_id INTEGER,
          hand_number INTEGER,
          result TEXT,
          player_total INTEGER,
          banker_total INTEGER,
          player_cards TEXT,
          banker_cards TEXT,
          banker_pair BOOLEAN,
          player_pair BOOLEAN,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (game_id) REFERENCES games (id)
        )`, checkComplete);
        
        // Create simulations table
        db.run(`CREATE TABLE simulations (
          id TEXT PRIMARY KEY,
          plays INTEGER,
          games_per_play INTEGER,
          hands_per_game INTEGER,
          deck_count INTEGER,
          status TEXT,
          progress INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME
        )`, (err) => {
          if (err) {
            checkComplete(err);
            return;
          }
          
          // Create consecutive_wins table for storing pre-computed analysis
          db.run(`CREATE TABLE consecutive_wins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            simulation_id TEXT,
            play_number INTEGER,
            consecutive_length INTEGER,
            winner_type TEXT,
            count INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (simulation_id) REFERENCES simulations (id)
        )`, checkComplete);
          
          // Add indexes for better query performance
          db.run(`CREATE INDEX IF NOT EXISTS idx_games_simulation_play ON games (simulation_id, play_number)`, (indexErr) => {
            if (indexErr) console.log('Index creation warning:', indexErr.message);
          });
          
          db.run(`CREATE INDEX IF NOT EXISTS idx_hands_game_id ON hands (game_id)`, (indexErr) => {
            if (indexErr) console.log('Index creation warning:', indexErr.message);
          });
          
          db.run(`CREATE INDEX IF NOT EXISTS idx_hands_game_hand ON hands (game_id, hand_number)`, (indexErr) => {
            if (indexErr) console.log('Index creation warning:', indexErr.message);
          });
          
          db.run(`CREATE INDEX IF NOT EXISTS idx_consecutive_wins ON consecutive_wins (simulation_id, play_number)`, (indexErr) => {
            if (indexErr) console.log('Index creation warning:', indexErr.message);
          });
          
          checkComplete();
        });
      });
    });
  });
}

// Cleanup function
function cleanupDatabase() {
  if (db) {
    db.close((err) => {
      if (err) console.log('Error closing database:', err);
      else console.log('Database closed successfully');
    });
    db = null;
  }
  
  // Clean up any database files
  try {
    const serverDir = __dirname;
    const files = fs.readdirSync(serverDir);
    files.forEach(file => {
      if (file.startsWith('temp_baccarat') && file.endsWith('.sqlite')) {
        const filePath = path.join(serverDir, file);
        try {
          fs.unlinkSync(filePath);
          console.log('Cleaned up database file:', file);
        } catch (err) {
          console.log('Could not remove file:', file, err.message);
        }
      }
    });
  } catch (error) {
    console.log('Error during cleanup:', error.message);
  }
}

// Game logic functions (moved from frontend)
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

// API Routes

// Add a health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    database: db ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Start a new simulation (ultra-optimized for large datasets)
app.post('/api/simulations', async (req, res) => {
  try {
    const { plays, gamesPerPlay, handsPerGame, deckCount = 8, skipCard = 0, useInMemory = true } = req.body;
    
    if (!plays || !gamesPerPlay || !handsPerGame) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const totalGames = plays * gamesPerPlay;
    const simulationId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Choose optimization level based on simulation size and user preference
    let summaryData;
    let optimizationLevel;
    
    if (useInMemory) {
      // ULTRA-FAST: Pure in-memory computation with no database operations
      console.log(`⚡ Using ULTRA-FAST in-memory mode for ${totalGames} games (no database)`);
      optimizationLevel = 'ultra-fast';
      summaryData = await runSimulationInMemory(simulationId, plays, gamesPerPlay, handsPerGame, deckCount, skipCard);
    } else {
      // Check if database is ready for database-backed modes
      if (!db) {
        return res.status(503).json({ error: 'Database not ready. Please try again in a moment.' });
      }
      
      // Insert simulation record for database-backed modes
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO simulations (id, plays, games_per_play, hands_per_game, deck_count, status, progress) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [simulationId, plays, gamesPerPlay, handsPerGame, deckCount, 'running', 0],
          function(err) {
            if (err) return reject(err);
            resolve();
          }
        );
      });

      if (totalGames >= 1000) { // Lowered threshold for testing
        console.log(`🚀 Using MEGA optimization for ${totalGames} games (testing mode with database)`);
        optimizationLevel = 'mega';
        summaryData = await runSimulationMegaOptimized(simulationId, plays, gamesPerPlay, handsPerGame, deckCount, skipCard);
      } else {
        console.log(`🔧 Using standard optimization for ${totalGames} games (with database)`);
        optimizationLevel = 'standard';
        summaryData = await runSimulationOptimized(simulationId, plays, gamesPerPlay, handsPerGame, deckCount, skipCard);
      }
    }
    
    res.json({ 
      simulationId,
      status: 'completed',
      message: 'Simulation completed successfully',
      results: summaryData,
      totalGames,
      optimizationLevel: optimizationLevel,
      timing: summaryData.timing // Include timing information if available
    });
  } catch (error) {
    console.error('Simulation start error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get simulation status
app.get('/api/simulations/:id/status', (req, res) => {
  const { id } = req.params;
  
  db.get(
    'SELECT * FROM simulations WHERE id = ?',
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: 'Simulation not found' });
      }
      res.json(row);
    }
  );
});

// Get simulation results
app.get('/api/simulations/:id/results', (req, res) => {
  const { id } = req.params;
  
  // Get games with their hands
  db.all(
    `SELECT g.*, COUNT(h.id) as actual_hands
     FROM games g 
     LEFT JOIN hands h ON g.id = h.game_id 
     WHERE g.simulation_id = ? 
     GROUP BY g.id 
     ORDER BY g.play_number, g.game_number`,
    [id],
    (err, games) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({ games });
    }
  );
});

// Get detailed game results including hands
app.get('/api/games/:gameId/hands', (req, res) => {
  const { gameId } = req.params;
  
  db.all(
    'SELECT * FROM hands WHERE game_id = ? ORDER BY hand_number',
    [gameId],
    (err, hands) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Parse JSON fields
      const parsedHands = hands.map(hand => ({
        ...hand,
        player_cards: JSON.parse(hand.player_cards),
        banker_cards: JSON.parse(hand.banker_cards)
      }));
      
      res.json({ hands: parsedHands });
    }
  );
});

// NEW: Get play summary data only (no hands)
app.get('/api/simulations/:id/plays', (req, res) => {
  const { id } = req.params;
  
  db.all(
    `SELECT 
       play_number,
       COUNT(*) as game_count,
       SUM(total_hands) as total_hands,
       SUM(banker_wins) as total_banker_wins,
       SUM(player_wins) as total_player_wins,
       SUM(tie_wins) as total_tie_wins,
       SUM(banker_pairs) as total_banker_pairs,
       SUM(player_pairs) as total_player_pairs
     FROM games 
     WHERE simulation_id = ? 
     GROUP BY play_number 
     ORDER BY play_number`,
    [id],
    (err, plays) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ plays });
    }
  );
});

// NEW: Get games for a specific play with pre-computed table data (optimized for large datasets)
app.get('/api/simulations/:id/plays/:playNumber/games', (req, res) => {
  const { id, playNumber } = req.params;
  const { page = 1, pageSize = 1000 } = req.query; // Add pagination support
  
  const offset = (page - 1) * pageSize;
  
  db.all(
    `SELECT id as game_id, game_number, total_hands, banker_wins, player_wins, tie_wins, banker_pairs, player_pairs
     FROM games 
     WHERE simulation_id = ? AND play_number = ?
     ORDER BY game_number
     LIMIT ? OFFSET ?`,
    [id, parseInt(playNumber), parseInt(pageSize), offset],
    (err, games) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Get total count for pagination
      db.get(
        'SELECT COUNT(*) as total FROM games WHERE simulation_id = ? AND play_number = ?',
        [id, playNumber],
        (countErr, countResult) => {
          if (countErr) {
            return res.status(500).json({ error: countErr.message });
          }
          
          const totalGames = countResult.total;
          const totalPages = Math.ceil(totalGames / pageSize);
          
          // Pre-compute table data on backend for instant frontend display
          const tableData = games.map((game, index) => {
            const totalHands = game.total_hands;
            const bankerWins = game.banker_wins;
            const playerWins = game.player_wins;
            const tieWins = game.tie_wins;
            const bankerPairs = game.banker_pairs;
            const playerPairs = game.player_pairs;
            
            return {
              key: offset + index + 1,
              gameNumber: game.game_number,
              gameId: game.game_id,
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
              // Raw data for potential game detail viewing
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
          
          console.log(`📊 Pre-computed table data for play ${playNumber}: ${games.length} games (page ${page}/${totalPages})`);
          
          // Fetch consecutive wins data for this play
          db.all(
            'SELECT consecutive_length, winner_type, count FROM consecutive_wins WHERE simulation_id = ? AND play_number = ?',
            [id, parseInt(playNumber)],
            (consecutiveErr, consecutiveRows) => {
              let consecutiveWinsData = null;
              
              if (!consecutiveErr && consecutiveRows && consecutiveRows.length > 0) {
                // Convert database format to chart format
                const chartData = [];
                const maxStreak = Math.max(...consecutiveRows.map(row => row.consecutive_length), 5);
                
                for (let i = 1; i <= maxStreak; i++) {
                  const bankerRow = consecutiveRows.find(row => row.consecutive_length === i && row.winner_type === '莊');
                  const playerRow = consecutiveRows.find(row => row.consecutive_length === i && row.winner_type === '閑');
                  
                  chartData.push({
                    x: i,
                    y: bankerRow ? bankerRow.count : 0,
                    type: "莊",
                  });
                  chartData.push({
                    x: i,
                    y: playerRow ? playerRow.count : 0,
                    type: "閑",
                  });
                }
                consecutiveWinsData = chartData;
                console.log(`📊 Loaded pre-computed consecutive wins data for play ${playNumber}`);
              }
              
              res.json({ 
                playNumber: parseInt(playNumber),
                tableData: tableData, // Pre-computed table data!
                consecutiveWinsData: consecutiveWinsData, // Pre-computed consecutive wins data!
                pagination: {
                  page: parseInt(page),
                  pageSize: parseInt(pageSize),
                  total: totalGames,
                  totalPages: totalPages,
                  hasMore: page < totalPages
                },
                // Also include raw games data for backward compatibility
                games: games.map(game => ({
                  gameNumber: game.game_number,
                  gameId: game.game_id,
                  totalHands: game.total_hands,
                  bankerWins: game.banker_wins,
                  playerWins: game.player_wins,
                  tieWins: game.tie_wins,
                  bankerPairs: game.banker_pairs,
                  playerPairs: game.player_pairs
                }))
              });
            }
          );
        }
      );
    }
  );
});

// NEW: Get hands for consecutive wins analysis for a specific play
app.get('/api/simulations/:id/plays/:playNumber/consecutive-analysis', (req, res) => {
  const { id, playNumber } = req.params;
  
  db.all(
    `SELECT h.game_id, h.hand_number, h.result, g.game_number
     FROM hands h
     JOIN games g ON h.game_id = g.id
     WHERE g.simulation_id = ? AND g.play_number = ?
     ORDER BY g.game_number, h.hand_number`,
    [id, parseInt(playNumber)],
    (err, hands) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Group hands by game for analysis
      const gameGroups = {};
      hands.forEach(hand => {
        if (!gameGroups[hand.game_number]) {
          gameGroups[hand.game_number] = [];
        }
        gameGroups[hand.game_number].push({
          handNumber: hand.hand_number,
          result: hand.result
        });
      });
      
      res.json({ 
        playNumber: parseInt(playNumber),
        games: Object.entries(gameGroups).map(([gameNumber, gameHands]) => ({
          gameNumber: parseInt(gameNumber),
          hands: gameHands
        }))
      });
    }
  );
});

// Helper function to distribute work across CPU cores
function distributeWorkload(plays, gamesPerPlay) {
  const totalGames = plays * gamesPerPlay;
  const workloads = [];
  
  // Use optimal number of workers based on workload size
  let numWorkers;
  if (totalGames < 10) {
    numWorkers = Math.min(NUM_CORES, totalGames);
  } else if (totalGames < 100) {
    numWorkers = Math.min(NUM_CORES, Math.ceil(totalGames / 5));
  } else {
    numWorkers = NUM_CORES;
  }
  
  const gamesPerWorker = Math.ceil(totalGames / numWorkers);
  
  let gameIndex = 0;
  for (let worker = 0; worker < numWorkers; worker++) {
    const workerGames = [];
    
    for (let i = 0; i < gamesPerWorker && gameIndex < totalGames; i++) {
      const playNumber = Math.floor(gameIndex / gamesPerPlay) + 1;
      const gameNumber = (gameIndex % gamesPerPlay) + 1;
      
      workerGames.push({
        playNumber,
        gameNumber,
        gameIndex
      });
      
      gameIndex++;
    }
    
    if (workerGames.length > 0) {
      workloads.push(workerGames);
    }
  }
  
  return workloads;
}

// MEGA-optimized simulation for very large datasets (10,000+ games)
async function runSimulationMegaOptimized(simulationId, plays, gamesPerPlay, handsPerGame, deckCount, skipCard = 0) {
  const totalGames = plays * gamesPerPlay;
  const totalHands = totalGames * handsPerGame;
  const startTime = Date.now();
  
  console.log(`🚀 MEGA OPTIMIZATION: ${plays} plays × ${gamesPerPlay} games × ${handsPerGame} hands = ${totalGames} total games (${totalHands} hands)`);
  console.log(`⚡ Skipping individual hand storage for maximum performance`);
  
  // Distribute workload across CPU cores
  const workloads = distributeWorkload(plays, gamesPerPlay);
  console.log(`Using ${workloads.length} worker threads for MEGA-optimized processing`);
  
  try {
    // Create workers that compute everything locally and return only final statistics
    const workerPromises = workloads.map((workload, workerIndex) => {
      return new Promise((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, 'simulationWorker.js'), {
          workerData: {
            workload: workload.map(({playNumber, gameNumber}) => ({ playNumber, gameNumber })),
            handsPerGame,
            deckCount,
            skipCard,
            megaOptimizedMode: true // Flag for mega optimization
          }
        });
        
        worker.on('message', (result) => {
          if (result.success) {
            // Worker returns pre-computed analysis data
            resolve(result.megaData);
          } else if (result.type === 'skippedCards') {
          } else {
            reject(new Error(result.error));
          }
        });
        
        worker.on('error', reject);
        worker.on('exit', (code) => {
          if (code !== 0) {
            reject(new Error(`Worker stopped with exit code ${code}`));
          }
        });
      });
    });
    
    // Wait for all workers to complete and get pre-computed data
    console.log('Waiting for all MEGA-optimized workers to complete...');
    const allWorkerResults = await Promise.all(workerPromises);
    
    // Flatten worker results - these contain pre-computed consecutive wins analysis
    const flatResults = allWorkerResults.flat();
    console.log(`Received ${flatResults.length} MEGA-optimized game results with pre-computed analysis`);
    
    // Store only game summaries to database (no individual hands)
    console.log(`Storing ${flatResults.length} game summaries to database (no individual hands)...`);
    let processedGames = 0;
    
    // Group results by play for efficient processing
    const resultsByPlay = {};
    flatResults.forEach(gameResult => {
      if (!resultsByPlay[gameResult.playNumber]) {
        resultsByPlay[gameResult.playNumber] = [];
      }
      resultsByPlay[gameResult.playNumber].push(gameResult);
    });
    
    // Store to database and prepare response data
    const summaryResults = [];
    
    for (let play = 1; play <= plays; play++) {
      const playGames = resultsByPlay[play] || [];
      playGames.sort((a, b) => a.gameNumber - b.gameNumber);
      
      // Aggregate consecutive wins data for this play
      const playConsecutiveWins = { 莊: {}, 閑: {} };
      
      for (const gameResult of playGames) {
        // Store game summary to database
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO games (simulation_id, play_number, game_number, total_hands, banker_wins, player_wins, tie_wins, banker_pairs, player_pairs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [simulationId, gameResult.playNumber, gameResult.gameNumber, gameResult.totalHands, gameResult.bankerWins, gameResult.playerWins, gameResult.tieWins, gameResult.bankerPairs, gameResult.playerPairs],
            function(err) {
              if (err) return reject(err);
              resolve();
            }
          );
        });
        
        // Aggregate consecutive wins data (pre-computed by worker)
        if (gameResult.consecutiveWins) {
          for (const [type, counts] of Object.entries(gameResult.consecutiveWins)) {
            for (const [length, count] of Object.entries(counts)) {
              if (!playConsecutiveWins[type][length]) {
                playConsecutiveWins[type][length] = 0;
              }
              playConsecutiveWins[type][length] += count;
            }
          }
        }
        
        processedGames++;
        if (processedGames % 5000 === 0) {
          console.log(`Stored ${processedGames}/${flatResults.length} games to database...`);
        }
      }
      
      // Store consecutive wins data to database
      for (const [type, counts] of Object.entries(playConsecutiveWins)) {
        for (const [length, count] of Object.entries(counts)) {
          if (count > 0) {
            await new Promise((resolve, reject) => {
              db.run(
                'INSERT INTO consecutive_wins (simulation_id, play_number, consecutive_length, winner_type, count) VALUES (?, ?, ?, ?, ?)',
                [simulationId, play, parseInt(length), type, count],
                function(err) {
                  if (err) return reject(err);
                  resolve();
                }
              );
            });
          }
        }
      }
      
      // Convert consecutive wins data to chart format
      const consecutiveWinsData = [];
      const maxStreak = Math.max(
        Math.max(...Object.keys(playConsecutiveWins["莊"]).map(Number), 0),
        Math.max(...Object.keys(playConsecutiveWins["閑"]).map(Number), 0)
      );
      
      for (let i = 1; i <= Math.max(maxStreak, 5); i++) {
        consecutiveWinsData.push({
          x: i,
          y: playConsecutiveWins["莊"][i] || 0,
          type: "莊",
        });
        consecutiveWinsData.push({
          x: i,
          y: playConsecutiveWins["閑"][i] || 0,
          type: "閑",
        });
      }
      
      summaryResults.push({
        playNumber: play,
        games: playGames.map(game => ({
          gameNumber: game.gameNumber,
          totalHands: game.totalHands,
          bankerWins: game.bankerWins,
          playerWins: game.playerWins,
          tieWins: game.tieWins,
          bankerPairs: game.bankerPairs,
          playerPairs: game.playerPairs,
        })),
        consecutiveWinsData: consecutiveWinsData // Pre-computed!
      });
      
      // Update progress
      const progress = Math.round((play / plays) * 100);
      db.run(
        'UPDATE simulations SET progress = ? WHERE id = ?',
        [progress, simulationId]
      );
    }
    
    console.log(`✅ All ${flatResults.length} games stored to database successfully (MEGA mode)`);
    
    // Mark simulation as completed
    db.run(
      'UPDATE simulations SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['completed', simulationId]
    );
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    const handsPerSecond = Math.round(totalHands / duration);
    
    console.log(`🎉 MEGA-optimized simulation completed: ${summaryResults.length} plays processed in ${duration.toFixed(2)}s`);
    console.log(`🚀 Performance: ${handsPerSecond} hands/second with ZERO individual hand storage`);
    console.log(`💾 Database storage: Only ${flatResults.length} game summaries (no individual hands)`);
    
    // Add timing information to the results
    const resultsWithTiming = summaryResults;
    resultsWithTiming.timing = {
      duration: duration.toFixed(2),
      handsPerSecond: handsPerSecond,
      totalHands: totalHands
    };
    
    return resultsWithTiming;
    
  } catch (error) {
    console.error('MEGA-optimized simulation error:', error);
    db.run(
      'UPDATE simulations SET status = ? WHERE id = ?',
      ['error', simulationId]
    );
    throw error;
  }
}

// ULTRA-FAST in-memory simulation (no database storage)
async function runSimulationInMemory(simulationId, plays, gamesPerPlay, handsPerGame, deckCount, skipCard = 0) {
  const totalGames = plays * gamesPerPlay;
  const totalHands = totalGames * handsPerGame;
  const startTime = Date.now();
  
  console.log(`⚡ ULTRA-FAST IN-MEMORY: ${plays} plays × ${gamesPerPlay} games × ${handsPerGame} hands = ${totalGames} total games (${totalHands} hands)`);
  console.log(`🚀 NO DATABASE OPERATIONS - Pure in-memory computation for maximum speed`);
  
  // Distribute workload across CPU cores
  const workloads = distributeWorkload(plays, gamesPerPlay);
  console.log(`Using ${workloads.length} worker threads for ultra-fast in-memory processing`);
  
  try {
    // Create workers that compute everything locally and return only final statistics
    const workerPromises = workloads.map((workload, workerIndex) => {
      return new Promise((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, 'simulationWorker.js'), {
          workerData: {
            workload: workload.map(({playNumber, gameNumber}) => ({ playNumber, gameNumber })),
            handsPerGame,
            deckCount,
            skipCard,
            megaOptimizedMode: true, // Use mega mode for speed
            inMemoryMode: true // Flag for pure in-memory processing
          }
        });
        
        worker.on('message', (result) => {
          if (result.success) {
            // Worker returns pre-computed analysis data
            resolve(result.megaData);
          } else if (result.type === 'skippedCards') {
          } else {
            reject(new Error(result.error));
          }
        });
        
        worker.on('error', reject);
        worker.on('exit', (code) => {
          if (code !== 0) {
            reject(new Error(`Worker stopped with exit code ${code}`));
          }
        });
      });
    });
    
    // Wait for all workers to complete and get pre-computed data
    console.log('Waiting for all ultra-fast in-memory workers to complete...');
    const allWorkerResults = await Promise.all(workerPromises);
    
    // Flatten worker results - these contain pre-computed consecutive wins analysis
    const flatResults = allWorkerResults.flat();
    console.log(`⚡ Received ${flatResults.length} ultra-fast game results with pre-computed analysis (NO DATABASE WRITES)`);
    
    // Group results by play for efficient processing (all in memory)
    const resultsByPlay = {};
    flatResults.forEach(gameResult => {
      if (!resultsByPlay[gameResult.playNumber]) {
        resultsByPlay[gameResult.playNumber] = [];
      }
      resultsByPlay[gameResult.playNumber].push(gameResult);
    });
    
    // Process results in memory and prepare response data
    const summaryResults = [];
    
    for (let play = 1; play <= plays; play++) {
      const playGames = resultsByPlay[play] || [];
      playGames.sort((a, b) => a.gameNumber - b.gameNumber);
      
      // Aggregate consecutive wins data for this play (in memory)
      const playConsecutiveWins = { 莊: {}, 閑: {} };
      
      for (const gameResult of playGames) {
        // Aggregate consecutive wins data (pre-computed by worker)
        if (gameResult.consecutiveWins) {
          for (const [type, counts] of Object.entries(gameResult.consecutiveWins)) {
            for (const [length, count] of Object.entries(counts)) {
              if (!playConsecutiveWins[type][length]) {
                playConsecutiveWins[type][length] = 0;
              }
              playConsecutiveWins[type][length] += count;
            }
          }
        }
      }
      
      // Convert consecutive wins data to chart format (in memory)
      const consecutiveWinsData = [];
      const maxStreak = Math.max(
        Math.max(...Object.keys(playConsecutiveWins["莊"]).map(Number), 0),
        Math.max(...Object.keys(playConsecutiveWins["閑"]).map(Number), 0)
      );
      
      for (let i = 1; i <= Math.max(maxStreak, 5); i++) {
        consecutiveWinsData.push({
          x: i,
          y: playConsecutiveWins["莊"][i] || 0,
          type: "莊",
        });
        consecutiveWinsData.push({
          x: i,
          y: playConsecutiveWins["閑"][i] || 0,
          type: "閑",
        });
      }
      
      summaryResults.push({
        playNumber: play,
        games: playGames.map(game => ({
          gameNumber: game.gameNumber,
          totalHands: game.totalHands,
          bankerWins: game.bankerWins,
          playerWins: game.playerWins,
          tieWins: game.tieWins,
          bankerPairs: game.bankerPairs,
          playerPairs: game.playerPairs,
        })),
        consecutiveWinsData: consecutiveWinsData // Pre-computed!
      });
    }
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    const handsPerSecond = Math.round(totalHands / duration);
    
    console.log(`🎉 ULTRA-FAST in-memory simulation completed: ${summaryResults.length} plays processed in ${duration.toFixed(2)}s`);
    console.log(`⚡ Performance: ${handsPerSecond} hands/second with ZERO database operations`);
    console.log(`🚀 Pure in-memory processing - maximum possible speed achieved!`);
    
    // Add timing information to the results
    const resultsWithTiming = summaryResults;
    resultsWithTiming.timing = {
      duration: duration.toFixed(2),
      handsPerSecond: handsPerSecond,
      totalHands: totalHands
    };
    
    return resultsWithTiming;
    
  } catch (error) {
    console.error('Ultra-fast in-memory simulation error:', error);
    throw error;
  }
}

// Truly optimized simulation function that stores directly to DB without loading all hands into memory
async function runSimulationOptimized(simulationId, plays, gamesPerPlay, handsPerGame, deckCount, skipCard = 0) {
  const totalGames = plays * gamesPerPlay;
  const totalHands = totalGames * handsPerGame;
  const startTime = Date.now();
  
  console.log(`Starting memory-optimized simulation: ${plays} plays × ${gamesPerPlay} games × ${handsPerGame} hands = ${totalGames} total games (${totalHands} hands), skip ${skipCard} cards`);
  
  // Distribute workload across CPU cores
  const workloads = distributeWorkload(plays, gamesPerPlay);
  console.log(`Using ${workloads.length} worker threads for memory-optimized processing`);
  
  try {
    // Create workers and run simulation in parallel with minimal memory usage
    const workerPromises = workloads.map((workload, workerIndex) => {
      return new Promise((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, 'simulationWorker.js'), {
          workerData: {
            workload: workload.map(({playNumber, gameNumber}) => ({ playNumber, gameNumber })),
            handsPerGame,
            deckCount,
            skipCard,
            optimizedMode: true // Flag for optimized mode
          }
        });
        
        worker.on('message', (result) => {
          if (result.success) {
            // Worker sends back only summary data - we'll store it to DB
            resolve(result.summaryData);
          } else if (result.type === 'skippedCards') {
          } else {
            reject(new Error(result.error));
          }
        });
        
        worker.on('error', reject);
        worker.on('exit', (code) => {
          if (code !== 0) {
            reject(new Error(`Worker stopped with exit code ${code}`));
          }
        });
      });
    });
    
    // Wait for all workers to complete and get minimal summary data
    console.log('Waiting for all memory-optimized workers to complete...');
    const allWorkerResults = await Promise.all(workerPromises);
    
    // Flatten worker results and store to database efficiently
    const flatResults = allWorkerResults.flat();
    console.log(`Received ${flatResults.length} optimized game results from workers`);
    
    // Store data to database in batches to avoid memory issues
    console.log(`Storing ${flatResults.length} games to database...`);
    let processedGames = 0;
    
    for (const gameResult of flatResults) {
      // Insert game record first
      const gameId = await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO games (simulation_id, play_number, game_number, total_hands, banker_wins, player_wins, tie_wins, banker_pairs, player_pairs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [simulationId, gameResult.playNumber, gameResult.gameNumber, gameResult.totalHands, gameResult.bankerWins, gameResult.playerWins, gameResult.tieWins, gameResult.bankerPairs, gameResult.playerPairs],
          function(err) {
            if (err) return reject(err);
            resolve(this.lastID);
          }
        );
      });
      
      // Insert hands data - check for full hand details or analysis data
      const handsToInsert = gameResult.hands || gameResult.handsForAnalysis;
      if (handsToInsert && handsToInsert.length > 0) {
        // Use a prepared statement for better performance with large datasets
        const stmt = db.prepare('INSERT INTO hands (game_id, hand_number, result, player_total, banker_total, player_cards, banker_cards, banker_pair, player_pair) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        
        try {
          for (const hand of handsToInsert) {
            // Check if this hand has full card data or just analysis data
            const hasFullData = hand.playerCards && hand.bankerCards;
            
            stmt.run([
              gameId,
              hand.handNumber,
              hand.result,
              hasFullData ? (hand.playerTotal || 0) : 0,
              hasFullData ? (hand.bankerTotal || 0) : 0,
              hasFullData ? JSON.stringify(hand.playerCards) : '[]',
              hasFullData ? JSON.stringify(hand.bankerCards) : '[]',
              hasFullData ? (hand.bankerPair || false) : false,
              hasFullData ? (hand.playerPair || false) : false
            ]);
          }
        } finally {
          stmt.finalize();
        }
      }
      
      processedGames++;
      if (processedGames % 1000 === 0) {
        console.log(`Stored ${processedGames}/${flatResults.length} games to database...`);
      }
    }
    
    console.log(`✅ All ${flatResults.length} games stored to database successfully`);
    
    // Query database for summary data instead of loading from memory
    const summaryResults = [];
    for (let play = 1; play <= plays; play++) {
      const games = await new Promise((resolve, reject) => {
        db.all(
          'SELECT game_number, total_hands, banker_wins, player_wins, tie_wins, banker_pairs, player_pairs FROM games WHERE simulation_id = ? AND play_number = ? ORDER BY game_number',
          [simulationId, play],
          (err, games) => {
            if (err) return reject(err);
            resolve(games.map(game => ({
              gameNumber: game.game_number,
              totalHands: game.total_hands,
              bankerWins: game.banker_wins,
              playerWins: game.player_wins,
              tieWins: game.tie_wins,
              bankerPairs: game.banker_pairs,
              playerPairs: game.player_pairs,
            })));
          }
        );
      });
      
      summaryResults.push({
        playNumber: play,
        games: games
      });
    }
    
    // Mark simulation as completed
    db.run(
      'UPDATE simulations SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['completed', simulationId]
    );
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    const handsPerSecond = Math.round(totalHands / duration);
    
    console.log(`Memory-optimized simulation completed: ${summaryResults.length} plays processed in ${duration.toFixed(2)}s`);
    console.log(`Performance: ${handsPerSecond} hands/second with minimal memory usage`);
    
    // Add timing information to the results
    const resultsWithTiming = summaryResults;
    resultsWithTiming.timing = {
      duration: duration.toFixed(2),
      handsPerSecond: handsPerSecond,
      totalHands: totalHands
    };
    
    return resultsWithTiming;
    
  } catch (error) {
    console.error('Memory-optimized simulation error:', error);
    db.run(
      'UPDATE simulations SET status = ? WHERE id = ?',
      ['error', simulationId]
    );
    throw error;
  }
}

// Full simulation function using worker threads (for database population)
async function runSimulation(simulationId, plays, gamesPerPlay, handsPerGame, deckCount, skipCard = 0) {
  const totalGames = plays * gamesPerPlay;
  const totalHands = totalGames * handsPerGame;
  const startTime = Date.now();
  
  console.log(`Starting parallel simulation: ${plays} plays × ${gamesPerPlay} games × ${handsPerGame} hands = ${totalGames} total games (${totalHands} hands), skip ${skipCard} cards`);
  
  // Distribute workload across CPU cores
  const workloads = distributeWorkload(plays, gamesPerPlay);
  console.log(`Using ${workloads.length} worker threads for parallel processing (${NUM_CORES} CPU cores available)`);
  
  const aggregatedResults = [];
  const allSkippedCards = []; // Collect all skipped cards
  
  try {
    // Create workers and run simulation in parallel
    const workerPromises = workloads.map((workload, workerIndex) => {
      return new Promise((resolve, reject) => {
        // Group games by play number for this worker
        const playGroups = {};
        workload.forEach(({ playNumber, gameNumber }) => {
          if (!playGroups[playNumber]) {
            playGroups[playNumber] = [];
          }
          playGroups[playNumber].push(gameNumber);
        });
        
        const workerResults = [];
        const playPromises = [];
        
        // Process each play in this worker
        for (const [playNumber, gameNumbers] of Object.entries(playGroups)) {
          const workerPromise = new Promise((playResolve, playReject) => {
            const worker = new Worker(path.join(__dirname, 'simulationWorker.js'), {
              workerData: {
                playNumber: parseInt(playNumber),
                gameNumbers,
                handsPerGame,
                deckCount,
                skipCard
              }
            });
            
            worker.on('message', (result) => {
              if (result.success) {
                workerResults.push(...result.results);
                playResolve();
              } else if (result.type === 'skippedCards') {
                // Collect skipped cards information
                allSkippedCards.push({
                  playNumber: result.playNumber,
                  gameNumber: result.gameNumber,
                  skippedCards: result.skippedCards
                });
              } else {
                playReject(new Error(result.error));
              }
            });
            
            worker.on('error', playReject);
            worker.on('exit', (code) => {
              if (code !== 0) {
                playReject(new Error(`Worker stopped with exit code ${code}`));
              }
            });
          });
          
          playPromises.push(workerPromise);
        }
        
        Promise.all(playPromises)
          .then(() => resolve(workerResults))
          .catch(reject);
      });
    });
    
    // Wait for all workers to complete
    console.log('Waiting for all workers to complete...');
    const allWorkerResults = await Promise.all(workerPromises);
    
    // Flatten and sort results
    const flatResults = allWorkerResults.flat();
    console.log(`Received ${flatResults.length} game results from workers`);
    
    // Group results by play number and insert into database
    const playGroups = {};
    flatResults.forEach(gameResult => {
      if (!playGroups[gameResult.playNumber]) {
        playGroups[gameResult.playNumber] = [];
      }
      playGroups[gameResult.playNumber].push(gameResult);
    });
    
    // Process each play sequentially for database insertion
    for (let play = 1; play <= plays; play++) {
      const playData = { playNumber: play, games: [] };
      const playGames = playGroups[play] || [];
      
      // Sort games by game number
      playGames.sort((a, b) => a.gameNumber - b.gameNumber);
      
      for (const gameResult of playGames) {
        // Find skipped cards for this game
        const gameSkippedCards = allSkippedCards.find(
          sc => sc.playNumber === play && sc.gameNumber === gameResult.gameNumber
        );

        const gameObj = {
          gameNumber: gameResult.gameNumber,
          gameId: null,
          totalHands: gameResult.totalHands,
          bankerWins: gameResult.bankerWins,
          playerWins: gameResult.playerWins,
          tieWins: gameResult.tieWins,
          bankerPairs: gameResult.bankerPairs,
          playerPairs: gameResult.playerPairs,
          hands: gameResult.hands,
          skippedCards: gameSkippedCards ? gameSkippedCards.skippedCards : []
        };
        
        // Insert game record
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO games (simulation_id, play_number, game_number, total_hands, banker_wins, player_wins, tie_wins, banker_pairs, player_pairs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [simulationId, play, gameResult.gameNumber, gameResult.totalHands, gameResult.bankerWins, gameResult.playerWins, gameResult.tieWins, gameResult.bankerPairs, gameResult.playerPairs],
            function(err) {
              if (err) return reject(err);
              
              const insertedGameId = this.lastID;
              gameObj.gameId = insertedGameId;
              
              // Insert hand records in batch
              const handInserts = gameResult.hands.map(hand => 
                new Promise((resolveHand, rejectHand) => {
                  db.run(
                    'INSERT INTO hands (game_id, hand_number, result, player_total, banker_total, player_cards, banker_cards, banker_pair, player_pair) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                      insertedGameId,
                      hand.handNumber,
                      hand.result,
                      hand.playerTotal,
                      hand.bankerTotal,
                      JSON.stringify(hand.playerCards),
                      JSON.stringify(hand.bankerCards),
                      hand.bankerPair,
                      hand.playerPair
                    ],
                    (handErr) => {
                      if (handErr) return rejectHand(handErr);
                      resolveHand();
                    }
                  );
                })
              );
              
              Promise.all(handInserts)
                .then(() => {
                  playData.games.push(gameObj);
                  resolve();
                })
                .catch(reject);
            }
          );
        });
      }
      
      aggregatedResults.push(playData);
      
      // Update progress
      const progress = Math.round((play / plays) * 100);
      db.run(
        'UPDATE simulations SET progress = ? WHERE id = ?',
        [progress, simulationId]
      );
    }
    
    // Mark simulation as completed
    db.run(
      'UPDATE simulations SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['completed', simulationId]
    );
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    const handsPerSecond = Math.round(totalHands / duration);
    
    console.log(`Simulation completed successfully: ${aggregatedResults.length} plays processed in ${duration.toFixed(2)}s`);
    console.log(`Performance: ${handsPerSecond} hands/second using ${workloads.length} worker threads`);
    return aggregatedResults;
    
  } catch (error) {
    console.error('Parallel simulation error:', error);
    db.run(
      'UPDATE simulations SET status = ? WHERE id = ?',
      ['error', simulationId]
    );
    throw error;
  }
}

// Initialize database when server starts
async function startServer() {
  try {
    console.log('Starting Baccarat API Server...');
    console.log(`💾 Node.js heap limit: ${Math.round(require('v8').getHeapStatistics().heap_size_limit / 1024 / 1024 / 1024 * 10) / 10}GB`);
    console.log('Cleaning up any existing databases...');
    
    // Clean up first
    cleanupDatabase();
    
    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Initializing fresh database...');
    await initTempDatabase();
    
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`✅ Baccarat API Server running on http://localhost:${PORT}`);
      console.log('✅ Database initialized and ready');
      console.log(`📊 Health check available at: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to initialize server:', error);
    process.exit(1);
  }
}

// Cleanup when server shuts down
process.on('SIGINT', () => {
  console.log('\n🧹 Cleaning up database...');
  cleanupDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🧹 Cleaning up database...');
  cleanupDatabase();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  cleanupDatabase();
  process.exit(1);
});

// Start the server
startServer();
