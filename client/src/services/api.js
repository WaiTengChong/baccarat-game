const API_BASE_URL = 'http://localhost:3001/api';

class BaccaratAPI {
  // Start a new simulation (now returns summary data only)
  static async startSimulation(plays, gamesPerPlay, handsPerGame, deckCount = 8, skipCard = 0, useInMemory = true, isContinuousMode = false, logger = null) {
    try {
      const modeText = useInMemory ? 'ultra-fast in-memory' : 'database-backed';
      const continuousText = isContinuousMode ? ' (continuous)' : '';
      if (logger) {
        logger(`🚀 Starting ${modeText}${continuousText} simulation: ${plays} plays, ${gamesPerPlay} games/play, ${handsPerGame} hands/game, ${deckCount} decks, skip ${skipCard} cards`);
        logger(`📡 Sending request to ${API_BASE_URL}/simulations`);
      }

      const requestBody = {
        plays,
        gamesPerPlay,
        handsPerGame,
        deckCount,
        skipCard,
        useInMemory,
        isContinuousMode
      };
      
      const response = await fetch(`${API_BASE_URL}/simulations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorMsg = `HTTP error! status: ${response.status}`;
        if (logger) {
          logger(`❌ API Error: ${errorMsg}`);
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      const optimizationText = result.optimizationLevel === 'ultra-fast' ? 'ULTRA-FAST (no database)' : result.optimizationLevel;
      if (logger) {
        logger(`✅ ${optimizationText} simulation completed with ID: ${result.simulationId}`);
        if (result.optimizationLevel === 'ultra-fast') {
          logger(`⚡ Pure in-memory processing - no database operations performed`);
          logger(`🚀 Maximum speed achieved with zero I/O overhead`);
        } else {
          logger(`📊 Summary data loaded (detailed hands available on-demand)`);
        }
        logger(`🔥 Response size significantly reduced for performance`);
      }

      return result;
    } catch (error) {
      console.error('Error starting simulation:', error);
      if (logger) {
        logger(`❌ Failed to start simulation: ${error.message}`);
      }
      throw error;
    }
  }

  // Get simulation status
  static async getSimulationStatus(simulationId, logger = null) {
    try {
      if (logger) {
        logger(`🔍 Checking status for simulation: ${simulationId}`);
      }

      const response = await fetch(`${API_BASE_URL}/simulations/${simulationId}/status`);
      
      if (!response.ok) {
        const errorMsg = `HTTP error! status: ${response.status}`;
        if (logger) {
          logger(`❌ Status check failed: ${errorMsg}`);
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      if (logger) {
        logger(`📈 Simulation status: ${result.status} (${result.progress || 0}% complete)`);
      }

      return result;
    } catch (error) {
      console.error('Error getting simulation status:', error);
      if (logger) {
        logger(`❌ Error checking simulation status: ${error.message}`);
      }
      throw error;
    }
  }

  // Get simulation results
  static async getSimulationResults(simulationId, logger = null) {
    try {
      if (logger) {
        logger(`📋 Fetching results for simulation: ${simulationId}`);
      }

      const response = await fetch(`${API_BASE_URL}/simulations/${simulationId}/results`);
      
      if (!response.ok) {
        const errorMsg = `HTTP error! status: ${response.status}`;
        if (logger) {
          logger(`❌ Results fetch failed: ${errorMsg}`);
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      if (logger) {
        const gameCount = result.games ? result.games.length : 0;
        logger(`✅ Retrieved results: ${gameCount} games processed`);
        
        if (result.games && result.games.length > 0) {
          const totalHands = result.games.reduce((sum, game) => sum + (game.total_hands || 0), 0);
          const totalBankerWins = result.games.reduce((sum, game) => sum + (game.banker_wins || 0), 0);
          const totalPlayerWins = result.games.reduce((sum, game) => sum + (game.player_wins || 0), 0);
          const totalTies = result.games.reduce((sum, game) => sum + (game.tie_wins || 0), 0);
          
          logger(`📊 Summary: ${totalHands} hands | Banker: ${totalBankerWins} | Player: ${totalPlayerWins} | Ties: ${totalTies}`);
        }
      }

      return result;
    } catch (error) {
      console.error('Error getting simulation results:', error);
      if (logger) {
        logger(`❌ Error fetching results: ${error.message}`);
      }
      throw error;
    }
  }

  // Get detailed game hands
  static async getGameHands(gameId, logger = null) {
    try {
      if (logger) {
        logger(`🎮 Loading detailed hands for game ID: ${gameId}`);
      }

      const response = await fetch(`${API_BASE_URL}/games/${gameId}/hands`);
      
      if (!response.ok) {
        const errorMsg = `HTTP error! status: ${response.status}`;
        if (logger) {
          logger(`❌ Game hands fetch failed: ${errorMsg}`);
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      if (logger) {
        const handCount = result.hands ? result.hands.length : 0;
        logger(`✅ Loaded ${handCount} hands for game ${gameId}`);
        
        if (result.hands && result.hands.length > 0) {
          const bankerWins = result.hands.filter(h => h.result === 'Banker').length;
          const playerWins = result.hands.filter(h => h.result === 'Player').length;
          const ties = result.hands.filter(h => h.result === 'Tie').length;
          
          logger(`🎯 Game ${gameId} results: Banker ${bankerWins} | Player ${playerWins} | Ties ${ties}`);
        }
      }

      return result;
    } catch (error) {
      console.error('Error getting game hands:', error);
      if (logger) {
        logger(`❌ Error loading game hands: ${error.message}`);
      }
      throw error;
    }
  }

  // NEW: Get games for a specific play with pre-computed table data (optimized)
  static async getPlayGames(simulationId, playNumber, page = 1, pageSize = 1000, logger = null) {
    try {
      if (logger) {
        logger(`📋 Loading games for simulation ${simulationId}, play ${playNumber} (page ${page})`);
      }

      const response = await fetch(`${API_BASE_URL}/simulations/${simulationId}/plays/${playNumber}/games?page=${page}&pageSize=${pageSize}`);
      
      if (!response.ok) {
        const errorMsg = `HTTP error! status: ${response.status}`;
        if (logger) {
          logger(`❌ Play games fetch failed: ${errorMsg}`);
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      if (logger) {
        const gameCount = result.games ? result.games.length : 0;
        const pagination = result.pagination || {};
        logger(`✅ Loaded ${gameCount} games for play ${playNumber} (page ${pagination.page}/${pagination.totalPages})`);
        logger(`📊 Pre-computed table data ready - no frontend processing needed!`);
      }

      return result;
    } catch (error) {
      console.error('Error getting play games:', error);
      if (logger) {
        logger(`❌ Error loading play games: ${error.message}`);
      }
      throw error;
    }
  }

  // NEW: Get consecutive wins analysis data for a specific play
  static async getPlayConsecutiveAnalysis(simulationId, playNumber, logger = null) {
    try {
      if (logger) {
        logger(`📊 Loading consecutive wins analysis for simulation ${simulationId}, play ${playNumber}`);
      }

      const response = await fetch(`${API_BASE_URL}/simulations/${simulationId}/plays/${playNumber}/consecutive-analysis`);
      
      if (!response.ok) {
        const errorMsg = `HTTP error! status: ${response.status}`;
        if (logger) {
          logger(`❌ Consecutive analysis fetch failed: ${errorMsg}`);
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      if (logger) {
        // Check if we have pre-calculated consecutive analysis (embedded server)
        if (result.consecutiveBanker || result.consecutivePlayer || result.consecutiveTie) {
          const bankerStreaks = result.consecutiveBanker ? result.consecutiveBanker.length : 0;
          const playerStreaks = result.consecutivePlayer ? result.consecutivePlayer.length : 0;
          const tieStreaks = result.consecutiveTie ? result.consecutiveTie.length : 0;
          logger(`✅ Loaded pre-calculated consecutive analysis for play ${playNumber}: ${bankerStreaks + playerStreaks + tieStreaks} streak patterns`);
        } 
        // Fallback for raw games data (original server)
        else if (result.games) {
          const gameCount = result.games.length;
          const totalHands = result.games.reduce((sum, g) => sum + g.hands.length, 0);
          logger(`✅ Loaded consecutive analysis for play ${playNumber}: ${gameCount} games, ${totalHands} hands`);
        }
        else {
          logger(`✅ Loaded consecutive analysis data for play ${playNumber}`);
        }
      }

      return result;
    } catch (error) {
      console.error('Error getting consecutive analysis:', error);
      if (logger) {
        logger(`❌ Error loading consecutive analysis: ${error.message}`);
      }
      throw error;
    }
  }

  // Poll simulation status until completed
  static async pollSimulationUntilComplete(simulationId, onProgress, logger = null) {
    if (logger) {
      logger(`⏳ Starting to poll simulation ${simulationId} until completion...`);
    }

    return new Promise((resolve, reject) => {
      let pollCount = 0;
      const pollInterval = setInterval(async () => {
        try {
          pollCount++;
          const status = await this.getSimulationStatus(simulationId, logger);
          
          if (logger && pollCount % 5 === 0) { // Log every 5th poll to avoid spam
            logger(`🔄 Poll #${pollCount}: ${status.status} - ${status.progress || 0}% complete`);
          }
          
          if (onProgress) {
            onProgress(status);
          }

          if (status.status === 'completed') {
            clearInterval(pollInterval);
            if (logger) {
              logger(`🎉 Simulation completed after ${pollCount} status checks!`);
              logger(`📥 Fetching final results...`);
            }
            
            const results = await this.getSimulationResults(simulationId, logger);
            
            if (logger) {
              logger(`✅ Simulation fully completed and results retrieved`);
            }
            
            resolve(results);
          } else if (status.status === 'error') {
            clearInterval(pollInterval);
            const errorMsg = 'Simulation failed on server';
            if (logger) {
              logger(`❌ ${errorMsg} after ${pollCount} polls`);
            }
            reject(new Error(errorMsg));
          }
        } catch (error) {
          clearInterval(pollInterval);
          if (logger) {
            logger(`❌ Polling error after ${pollCount} attempts: ${error.message}`);
          }
          reject(error);
        }
      }, 1000); // Poll every second
    });
  }
}

export default BaccaratAPI; 