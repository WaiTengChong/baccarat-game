import React, { useEffect, useState } from 'react';
import './roadone.css';

const RoadOne = ({ gameResults = [] }) => {
  const [displayResults, setDisplayResults] = useState([]);

  // Convert gameResults to display format
  const convertGameResults = (results) => {
    const converted = [];
    let handId = 1;
    
    // Function to detect pairs in cards
    const hasPair = (cards) => {
      return cards.length >= 2 && cards[0].value === cards[1].value;
    };
    
    // Check if results is a single game object with hands array
    if (results && results.hands && Array.isArray(results.hands)) {
      // Single game object - process hands directly
      results.hands.forEach(hand => {
        converted.push({
          id: handId++,
          outcome: hand.result === 'Player' ? '閑' : hand.result === 'Banker' ? '莊' : '和',
          type: hand.result.toLowerCase(),
          bankPair: hasPair(hand.bankerCards),
          playerPair: hasPair(hand.playerCards),
          playerTotal: hand.playerTotal,
          bankerTotal: hand.bankerTotal,
          playerCards: hand.playerCards,
          bankerCards: hand.bankerCards
        });
      });
    } else if (Array.isArray(results)) {
      // Original nested structure - process as before
      results.forEach(play => {
        play.games.forEach(game => {
          game.hands.forEach(hand => {
            converted.push({
              id: handId++,
              outcome: hand.result === 'Player' ? '閑' : hand.result === 'Banker' ? '莊' : '和',
              type: hand.result.toLowerCase(),
              bankPair: hasPair(hand.bankerCards),
              playerPair: hasPair(hand.playerCards),
              playerTotal: hand.playerTotal,
              bankerTotal: hand.bankerTotal,
              playerCards: hand.playerCards,
              bankerCards: hand.bankerCards
            });
          });
        });
      });
    }
    
    return converted;
  };

  useEffect(() => {
    if (gameResults && (Array.isArray(gameResults) ? gameResults.length > 0 : gameResults.hands)) {
      const converted = convertGameResults(gameResults);
      setDisplayResults(converted);
    } else {
      setDisplayResults([]);
    }
  }, [gameResults]);

  // Calculate grid position for each result
  const getGridPosition = (index) => {
    const maxRowsPerColumn = 6;
    const column = Math.floor(index / maxRowsPerColumn);
    const row = index % maxRowsPerColumn;
    
    return {
      gridColumn: column + 1,
      gridRow: row + 1
    };
  };

  return (
    <div className="roadone-container">
      <div className="roadone-header">
        <h3>Road One (珠仔路)</h3>
        <div className="roadone-info">
          <span>Results: {displayResults.length}</span>
        </div>
      </div>
      
      <div className="roadone-grid">
        {Array.from({ length: 96 }, (_, index) => {
          const result = displayResults[index];
          const gridPosition = getGridPosition(index);
          
          return (
            <div 
              key={index}
              className="roadone-grid-item"
              style={gridPosition}
            >
              {result ? (
                <div
                  className={`road-cell ${result.type}`}
                  title={`Game ${result.id}: ${result.outcome} (Player: ${result.playerTotal}, Banker: ${result.bankerTotal})${result.bankPair ? ' + Bank Pair' : ''}${result.playerPair ? ' + Player Pair' : ''}`}
                >
                  <span className="result-text">{result.outcome}</span>
                  <span className="game-number">{result.id}</span>
                  
                  {/* Bank pair dot - top left */}
                  {result.bankPair && (
                    <div className="pair-dot bank-pair-dot"></div>
                  )}
                  
                  {/* Player pair dot - bottom right */}
                  {result.playerPair && (
                    <div className="pair-dot player-pair-dot"></div>
                  )}
                </div>
              ) : (
                <div className="road-cell empty-cell"></div>
              )}
            </div>
          );
        })}
      </div>
      
      {displayResults.length === 0 && (
        <div className="empty-state">
          <p>No game results yet. Click PLAY to start the game!</p>
        </div>
      )}
    </div>
  );
};

export default RoadOne;
