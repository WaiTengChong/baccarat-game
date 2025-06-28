const express = require('express');
const cors = require('cors');
const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(express.json());
app.use(cors());

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
        const totalTables = 3;
        
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
        )`, checkComplete);
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

// Start a new simulation
app.post('/api/simulations', async (req, res) => {
  try {
    const { plays, gamesPerPlay, handsPerGame, deckCount = 8 } = req.body;
    
    if (!plays || !gamesPerPlay || !handsPerGame) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Check if database is ready
    if (!db) {
      return res.status(503).json({ error: 'Database not ready. Please try again in a moment.' });
    }
    
    const simulationId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Insert simulation record
    db.run(
      'INSERT INTO simulations (id, plays, games_per_play, hands_per_game, deck_count, status, progress) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [simulationId, plays, gamesPerPlay, handsPerGame, deckCount, 'running', 0],
      function(err) {
        if (err) {
          console.error('Database insert error:', err);
          return res.status(500).json({ error: err.message });
        }
        
        // Start simulation in background
        runSimulation(simulationId, plays, gamesPerPlay, handsPerGame, deckCount);
        
        res.json({ 
          simulationId,
          status: 'started',
          message: 'Simulation started successfully'
        });
      }
    );
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

// Run simulation function
async function runSimulation(simulationId, plays, gamesPerPlay, handsPerGame, deckCount) {
  const totalGames = plays * gamesPerPlay;
  let completedGames = 0;
  
  try {
    for (let play = 1; play <= plays; play++) {
      for (let game = 1; game <= gamesPerPlay; game++) {
        let deck = shuffleDeck(createDeck(deckCount));
        const gameHands = [];
        let bankerWins = 0, playerWins = 0, tieWins = 0;
        let bankerPairs = 0, playerPairs = 0;
        
        for (let hand = 1; hand <= handsPerGame; hand++) {
          if (deck.length < 20) {
            deck = shuffleDeck(createDeck(deckCount));
          }
          
          const handResult = playBaccaratHand(deck);
          deck = handResult.remainingDeck;
          
          // Count results
          if (handResult.result === 'Banker') bankerWins++;
          else if (handResult.result === 'Player') playerWins++;
          else tieWins++;
          
          // Count pairs
          if (hasPair(handResult.bankerCards)) bankerPairs++;
          if (hasPair(handResult.playerCards)) playerPairs++;
          
          gameHands.push({
            handNumber: hand,
            ...handResult,
            bankerPair: hasPair(handResult.bankerCards),
            playerPair: hasPair(handResult.playerCards)
          });
        }
        
        // Insert game record
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO games (simulation_id, play_number, game_number, total_hands, banker_wins, player_wins, tie_wins, banker_pairs, player_pairs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [simulationId, play, game, handsPerGame, bankerWins, playerWins, tieWins, bankerPairs, playerPairs],
            function(err) {
              if (err) return reject(err);
              
              const gameId = this.lastID;
              
              // Insert hand records
              const handInserts = gameHands.map(hand => 
                new Promise((resolveHand, rejectHand) => {
                  db.run(
                    'INSERT INTO hands (game_id, hand_number, result, player_total, banker_total, player_cards, banker_cards, banker_pair, player_pair) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                      gameId,
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
                .then(() => resolve())
                .catch(reject);
            }
          );
        });
        
        completedGames++;
        const progress = Math.round((completedGames / totalGames) * 100);
        
        // Update progress
        db.run(
          'UPDATE simulations SET progress = ? WHERE id = ?',
          [progress, simulationId]
        );
      }
    }
    
    // Mark simulation as completed
    db.run(
      'UPDATE simulations SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['completed', simulationId]
    );
    
  } catch (error) {
    console.error('Simulation error:', error);
    db.run(
      'UPDATE simulations SET status = ? WHERE id = ?',
      ['error', simulationId]
    );
  }
}

// Initialize database when server starts
async function startServer() {
  try {
    console.log('Starting Baccarat API Server...');
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
