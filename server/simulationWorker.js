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

// Worker function to simulate a batch of games
function simulateGameBatch(playNumber, gameNumbers, handsPerGame, deckCount, skipCard = 0) {
  const results = [];
  
  for (const gameNumber of gameNumbers) {
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
    
    results.push({
      playNumber,
      gameNumber,
      totalHands: handsPerGame,
      bankerWins,
      playerWins,
      tieWins,
      bankerPairs,
      playerPairs,
      hands: gameHands
    });
  }
  
  return results;
}

// Main worker execution
try {
  const { playNumber, gameNumbers, handsPerGame, deckCount, skipCard } = workerData;
  const results = simulateGameBatch(playNumber, gameNumbers, handsPerGame, deckCount, skipCard);
  parentPort.postMessage({ success: true, results });
} catch (error) {
  parentPort.postMessage({ success: false, error: error.message });
} 