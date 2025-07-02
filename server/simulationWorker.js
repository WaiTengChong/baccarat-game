const { parentPort, workerData } = require('worker_threads');

// Game logic functions (copied from main file for worker isolation)
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

// Helper function to format card for display
function formatCard(card) {
  return `${card.value}${card.suit}`;
}

// Memory-optimized worker function that only returns summary statistics
function simulateGameBatchOptimized(workload, handsPerGame, deckCount, skipCard = 0, optimizedMode = false) {
  const results = [];
  
  for (const { playNumber, gameNumber } of workload) {
    let deck = shuffleDeck(createDeck(deckCount));
    
    // Skip cards if specified and log them
    const skippedCards = [];
    for (let i = 0; i < skipCard; i++) {
      if (deck.length > 0) {
        const skippedCard = deck.pop();
        skippedCards.push(skippedCard);
      }
    }
    
    // Send skipped cards info back to main thread for logging
    if (skippedCards.length > 0) {
      parentPort.postMessage({
        type: 'skippedCards',
        playNumber,
        gameNumber,
        skippedCards: skippedCards.map(formatCard)
      });
    }
    
    // Only store summary statistics to minimize memory usage
    let bankerWins = 0, playerWins = 0, tieWins = 0;
    let bankerPairs = 0, playerPairs = 0;
    
    // For consecutive analysis, we only need results, not full hand details
    const handsForAnalysis = optimizedMode ? [] : null;
    
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
      
      // In optimized mode, only store minimal data for consecutive analysis
      if (optimizedMode && handsForAnalysis) {
        handsForAnalysis.push({
          handNumber: hand,
          result: handResult.result
        });
      } else if (!optimizedMode) {
        // Legacy mode: store full hand details (causes memory issues)
        if (!handsForAnalysis) handsForAnalysis = [];
        handsForAnalysis.push({
          handNumber: hand,
          ...handResult,
          bankerPair: hasPair(handResult.bankerCards),
          playerPair: hasPair(handResult.playerCards)
        });
      }
    }
    
    const gameResult = {
      playNumber,
      gameNumber,
      totalHands: handsPerGame,
      bankerWins,
      playerWins,
      tieWins,
      bankerPairs,
      playerPairs
    };
    
    // Include appropriate hands data based on mode
    if (optimizedMode) {
      // In optimized mode, only include minimal data for consecutive analysis
      gameResult.handsForAnalysis = handsForAnalysis;
    } else {
      // Legacy mode: include full hands data
      gameResult.hands = handsForAnalysis;
    }
    
    results.push(gameResult);
  }
  
  return results;
}

// Function to compute consecutive wins analysis locally in worker
function computeConsecutiveWinsAnalysis(allHandResults) {
  if (!allHandResults || allHandResults.length === 0) return { 莊: {}, 閑: {} };
  
  // Convert hand results to Big Road format
  const roadGrid = [];
  let currentColumn = 0;
  let currentRow = 0;
  let lastNonTieResult = null;

  allHandResults.forEach((hand) => {
    if (hand.result === "Tie") {
      // Ties are marked on the previous non-tie result
      if (roadGrid.length > 0) {
        for (let i = roadGrid.length - 1; i >= 0; i--) {
          if (roadGrid[i].result !== "Tie") {
            roadGrid[i].tieCount = (roadGrid[i].tieCount || 0) + 1;
            break;
          }
        }
      }
    } else {
      // Banker or Player result
      const outcome = hand.result === "Player" ? "閑" : "莊";
      
      if (lastNonTieResult && lastNonTieResult.result === hand.result) {
        // Same as previous, continue in same column
        currentRow++;
      } else {
        // Different result or first non-tie result, start new column
        if (lastNonTieResult) {
          currentColumn++;
          currentRow = 0;
        }
      }

      roadGrid.push({
        ...hand,
        outcome,
        column: currentColumn,
        row: currentRow,
        tieCount: 0,
      });

      lastNonTieResult = hand;
    }
  });

  // Count consecutive wins by column
  const columnCounts = { 莊: {}, 閑: {} };
  const columns = {};

  // Group results by column
  roadGrid.forEach((item) => {
    if (!columns[item.column]) {
      columns[item.column] = [];
    }
    columns[item.column].push(item);
  });

  // Count consecutive wins in each column
  Object.values(columns).forEach((column) => {
    if (column.length > 0) {
      const columnType = column[0].outcome;
      const columnLength = column.length;

      if (!columnCounts[columnType][columnLength]) {
        columnCounts[columnType][columnLength] = 0;
      }
      columnCounts[columnType][columnLength]++;
    }
  });

  return columnCounts;
}

// MEGA-optimized worker function for very large simulations
function simulateGameBatchMegaOptimized(workload, handsPerGame, deckCount, skipCard = 0) {
  const results = [];
  
  for (const { playNumber, gameNumber } of workload) {
    let deck = shuffleDeck(createDeck(deckCount));
    
    // Skip cards if specified
    const skippedCards = [];
    for (let i = 0; i < skipCard; i++) {
      if (deck.length > 0) {
        const skippedCard = deck.pop();
        skippedCards.push(skippedCard);
      }
    }
    
    // Send skipped cards info
    if (skippedCards.length > 0) {
      parentPort.postMessage({
        type: 'skippedCards',
        playNumber,
        gameNumber,
        skippedCards: skippedCards.map(formatCard)
      });
    }
    
    // Run all hands and store only results (not full hand data)
    const handResults = [];
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
      
      // Store only result for consecutive analysis
      handResults.push({
        handNumber: hand,
        result: handResult.result
      });
    }
    
    // Compute consecutive wins analysis locally
    const consecutiveWins = computeConsecutiveWinsAnalysis(handResults);
    
    // Return only summary data + pre-computed consecutive wins
    results.push({
      playNumber,
      gameNumber,
      totalHands: handsPerGame,
      bankerWins,
      playerWins,
      tieWins,
      bankerPairs,
      playerPairs,
      consecutiveWins // Pre-computed analysis
    });
  }
  
  return results;
}

// Main worker execution
try {
  const { workload, playNumber, gameNumbers, handsPerGame, deckCount, skipCard, optimizedMode, megaOptimizedMode, inMemoryMode } = workerData;
  
  let results;
  
  if ((megaOptimizedMode || inMemoryMode) && workload) {
    // MEGA/Ultra-fast optimization: pre-compute everything locally, return only final stats
    const modeText = inMemoryMode ? 'ULTRA-FAST in-memory' : 'MEGA-optimized';
    console.log(`Worker running in ${modeText} mode for ${workload.length} games`);
    results = simulateGameBatchMegaOptimized(workload, handsPerGame, deckCount, skipCard);
    parentPort.postMessage({ success: true, megaData: results });
  } else if (optimizedMode && workload) {
    // Standard optimization: minimal memory usage
    console.log(`Worker running in optimized mode for ${workload.length} games`);
    results = simulateGameBatchOptimized(workload, handsPerGame, deckCount, skipCard, true);
    parentPort.postMessage({ success: true, summaryData: results });
  } else if (playNumber && gameNumbers) {
    // Legacy mode: full hands data (for backwards compatibility)
    console.log(`Worker running in legacy mode for play ${playNumber} with ${gameNumbers.length} games`);
    results = simulateGameBatchOptimized([...gameNumbers.map(gn => ({playNumber, gameNumber: gn}))], handsPerGame, deckCount, skipCard, false);
    parentPort.postMessage({ success: true, results });
  } else {
    throw new Error('Invalid worker data: missing required parameters');
  }
} catch (error) {
  console.error('Worker error:', error);
  parentPort.postMessage({ success: false, error: error.message });
} 