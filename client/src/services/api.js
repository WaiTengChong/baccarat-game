const API_BASE_URL = 'http://localhost:3001/api';

class BaccaratAPI {
  // Start a new simulation (now returns summary data only) - Enhanced for Windows compatibility
  static async startSimulation(plays, gamesPerPlay, handsPerGame, deckCount = 8, skipCard = 0, useInMemory = true, isContinuousMode = false, logger = null, smallCardReduction = 0, bigCardReduction = 0) {
    try {
      const modeText = useInMemory ? 'ultra-fast in-memory' : 'database-backed';
      const continuousText = isContinuousMode ? ' (continuous)' : '';
      const cardReductionText = (smallCardReduction > 0 || bigCardReduction > 0) ? `, small cards -${smallCardReduction}%, big cards -${bigCardReduction}%` : '';
      
      if (logger) {
        logger(`🚀 Starting ${modeText}${continuousText} simulation: ${plays} plays, ${gamesPerPlay} games/play, ${handsPerGame} hands/game, ${deckCount} decks, skip ${skipCard} cards${cardReductionText}`);
        logger(`📡 Sending request to ${API_BASE_URL}/simulations`);
        
        // Log platform information for debugging
        const platform = navigator.platform || 'Unknown';
        const userAgent = navigator.userAgent || 'Unknown';
        logger(`🖥️ Platform: ${platform}, Agent: ${userAgent.substring(0, 50)}...`);
      }

      const requestBody = {
        plays: parseInt(plays) || 1,
        gamesPerPlay: parseInt(gamesPerPlay) || 10,
        handsPerGame: parseInt(handsPerGame) || 70,
        deckCount: parseInt(deckCount) || 8,
        skipCard: parseInt(skipCard) || 0,
        useInMemory: Boolean(useInMemory),
        isContinuousMode: Boolean(isContinuousMode),
        smallCardReduction: parseInt(smallCardReduction) || 0,
        bigCardReduction: parseInt(bigCardReduction) || 0
      };
      
      // Add additional timeout for Windows
      const isWindows = navigator.platform.toLowerCase().includes('win');
      const timeoutMs = isWindows ? 300000 : 120000; // 5 minutes for Windows, 2 minutes for others
      
      if (logger && isWindows) {
        logger(`🪟 Windows detected - using extended timeout (${timeoutMs/1000}s)`);
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(`${API_BASE_URL}/simulations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read response');
        const errorMsg = `HTTP error! status: ${response.status}, body: ${errorText}`;
        if (logger) {
          logger(`❌ API Error: ${errorMsg}`);
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      
      // Validate result structure for Windows compatibility
      if (!result || typeof result !== 'object') {
        const errorMsg = 'Invalid response format from server';
        if (logger) {
          logger(`❌ ${errorMsg}: ${typeof result}`);
        }
        throw new Error(errorMsg);
      }
      
      const optimizationText = result.optimizationLevel === 'ultra-fast' ? 'ULTRA-FAST (no database)' : (result.optimizationLevel || 'standard');
      if (logger) {
        logger(`✅ ${optimizationText} simulation completed with ID: ${result.simulationId || 'N/A'}`);
        if (result.optimizationLevel === 'ultra-fast') {
          logger(`⚡ Pure in-memory processing - no database operations performed`);
          logger(`🚀 Maximum speed achieved with zero I/O overhead`);
        } else {
          logger(`📊 Summary data loaded (detailed hands available on-demand)`);
        }
        logger(`🔥 Response size significantly reduced for performance`);
        
        // Log result validation for debugging
        logger(`📋 Result validation: simulationId=${!!result.simulationId}, results=${Array.isArray(result.results) ? result.results.length : 'N/A'}`);
      }

      return result;
    } catch (error) {
      console.error('Error starting simulation:', error);
      if (logger) {
        logger(`❌ Failed to start simulation: ${error.message}`);
        
        // Additional Windows-specific error logging
        if (error.name === 'AbortError') {
          logger(`⏱️ Request timed out - this may indicate network or server issues`);
        } else if (error.message.includes('fetch')) {
          logger(`🌐 Network error - check server connectivity`);
        }
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

  // Get detailed game hands - Enhanced for Windows compatibility
  static async getGameHands(gameId, logger = null) {
    try {
      // Validate gameId before making request
      if (!gameId || gameId === 'undefined' || gameId === 'null') {
        const errorMsg = `Invalid game ID: ${gameId}`;
        if (logger) {
          logger(`❌ ${errorMsg}`);
        }
        throw new Error(errorMsg);
      }

      if (logger) {
        logger(`🎮 Loading detailed hands for game ID: ${gameId}`);
      }

      // Add timeout for Windows compatibility
      const isWindows = navigator.platform.toLowerCase().includes('win');
      const timeoutMs = isWindows ? 60000 : 30000; // 60s for Windows, 30s for others
      
      // Add cache-busting parameters for Windows compatibility
      const cacheBuster = Date.now();
      const params = new URLSearchParams({
        timestamp: cacheBuster.toString(),
        platform: isWindows ? 'windows' : 'other',
        noCache: 'true'
      });

      if (logger && isWindows) {
        logger(`🪟 Adding cache-busting params: ${cacheBuster}`);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(`${API_BASE_URL}/games/${gameId}/hands?${params}`, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read response');
        const errorMsg = `HTTP error! status: ${response.status}, response: ${errorText}`;
        if (logger) {
          logger(`❌ Game hands fetch failed: ${errorMsg}`);
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      
      // Validate result structure
      if (!result || typeof result !== 'object') {
        const errorMsg = 'Invalid response format from server';
        if (logger) {
          logger(`❌ ${errorMsg}: ${typeof result}`);
        }
        throw new Error(errorMsg);
      }
      
      // Ensure hands array exists
      if (!result.hands || !Array.isArray(result.hands)) {
        if (logger) {
          logger(`⚠️ No hands array in response, creating empty array`);
        }
        result.hands = [];
      }
      
      if (logger) {
        const handCount = result.hands.length;
        logger(`✅ Loaded ${handCount} hands for game ${gameId}`);
        
        if (handCount > 0) {
          try {
            const bankerWins = result.hands.filter(h => h && h.result === 'Banker').length;
            const playerWins = result.hands.filter(h => h && h.result === 'Player').length;
            const ties = result.hands.filter(h => h && h.result === 'Tie').length;
            
            logger(`🎯 Game ${gameId} results: Banker ${bankerWins} | Player ${playerWins} | Ties ${ties}`);
          } catch (countError) {
            logger(`⚠️ Error counting results: ${countError.message}`);
          }
        }
      }

      return result;
    } catch (error) {
      console.error('Error getting game hands:', error);
      if (logger) {
        if (error.name === 'AbortError') {
          logger(`⏱️ Request timed out for game ${gameId}`);
        } else {
          logger(`❌ Error loading game hands: ${error.message}`);
        }
      }
      throw error;
    }
  }

  // NEW: Get games for a specific play with pre-computed table data (optimized) - Enhanced for Windows
  static async getPlayGames(simulationId, playNumber, page = 1, pageSize = 1000, logger = null) {
    try {
      if (logger) {
        logger(`📋 Loading games for simulation ${simulationId}, play ${playNumber} (page ${page})`);
      }

      // Add cache-busting parameters for Windows compatibility
      const isWindows = navigator.userAgent.toLowerCase().includes('win') || 
                       navigator.platform.toLowerCase().includes('win');
      
      const cacheBuster = Date.now();
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        timestamp: cacheBuster.toString(),
        platform: isWindows ? 'windows' : 'other'
      });

      if (logger && isWindows) {
        logger(`🪟 Windows detected - adding cache-busting parameters`);
      }

      const response = await fetch(`${API_BASE_URL}/simulations/${simulationId}/plays/${playNumber}/games?${params}`);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read response');
        const errorMsg = `HTTP error! status: ${response.status}, response: ${errorText}`;
        if (logger) {
          logger(`❌ Play games fetch failed: ${errorMsg}`);
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      
      // Validate result structure
      if (!result || typeof result !== 'object') {
        const errorMsg = 'Invalid response format from server';
        if (logger) {
          logger(`❌ ${errorMsg}: ${typeof result}`);
        }
        throw new Error(errorMsg);
      }
      
      if (logger) {
        const gameCount = result.games ? result.games.length : 0;
        const pagination = result.pagination || {};
        logger(`✅ Loaded ${gameCount} games for play ${playNumber} (page ${pagination.page}/${pagination.totalPages})`);
        logger(`📊 Pre-computed table data ready - no frontend processing needed!`);
        
        // Log cache-busting for Windows debugging
        if (isWindows) {
          logger(`🔍 Cache-buster: ${cacheBuster}`);
        }
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

  // NEW: Clear all database data (for Windows reset issues)
  static async clearAllData(logger = null) {
    try {
      if (logger) {
        logger(`🗑️ Clearing all database data...`);
      }

      const response = await fetch(`${API_BASE_URL}/admin/clear-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read response');
        const errorMsg = `HTTP error! status: ${response.status}, response: ${errorText}`;
        if (logger) {
          logger(`❌ Database clear failed: ${errorMsg}`);
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      
      if (logger) {
        logger(`✅ Database cleared successfully`);
        if (result.cleared) {
          logger(`🗑️ Cleared: ${JSON.stringify(result.cleared)}`);
        }
      }

      return result;
    } catch (error) {
      console.error('Error clearing database:', error);
      if (logger) {
        logger(`❌ Error clearing database: ${error.message}`);
      }
      // Don't throw - this should be optional and not break the reset flow
      return { cleared: false, error: error.message };
    }
  }

  // NEW: Reset specific simulation data
  static async resetSimulationData(simulationId, logger = null) {
    try {
      if (!simulationId) {
        if (logger) {
          logger(`⚠️ No simulation ID provided for reset`);
        }
        return { reset: false };
      }

      if (logger) {
        logger(`🔄 Resetting simulation data for ID: ${simulationId}`);
      }

      const response = await fetch(`${API_BASE_URL}/simulations/${simulationId}/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read response');
        const errorMsg = `HTTP error! status: ${response.status}, response: ${errorText}`;
        if (logger) {
          logger(`❌ Simulation reset failed: ${errorMsg}`);
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      
      if (logger) {
        logger(`✅ Simulation ${simulationId} reset successfully`);
      }

      return result;
    } catch (error) {
      console.error('Error resetting simulation:', error);
      if (logger) {
        logger(`❌ Error resetting simulation: ${error.message}`);
      }
      // Don't throw - this should be optional and not break the reset flow
      return { reset: false, error: error.message };
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