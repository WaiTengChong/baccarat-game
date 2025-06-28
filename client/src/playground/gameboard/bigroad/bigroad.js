import React, { useEffect, useState } from 'react';
import './bigroad.css';

const BigRoad = () => {
  const [gameResults, setGameResults] = useState([]);
  const [bigRoadGrid, setBigRoadGrid] = useState([]);

  // Generate random baccarat results
  const generateRandomResults = (count = 50) => {
    const outcomes = ['莊', '閑', '和']; // Banker, Player, Tie
    const results = [];
    
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * outcomes.length);
      
      // Randomly generate pair states (20% chance for each)
      const hasBankPair = Math.random() < 0.2;
      const hasPlayerPair = Math.random() < 0.2;
      
      results.push({
        id: i + 1,
        outcome: outcomes[randomIndex],
        type: randomIndex === 0 ? 'banker' : randomIndex === 1 ? 'player' : 'tie',
        bankPair: hasBankPair,
        playerPair: hasPlayerPair
      });
    }
    
    return results;
  };

  // Convert game results to Big Road format
  const convertToBigRoad = (results) => {
    if (!results.length) return [];

    const grid = [];
    let currentColumn = 0;
    let currentRow = 0;
    let lastNonTieResult = null;

    results.forEach((result) => {
      if (result.type === 'tie') {
        // Ties are marked on the previous non-tie result
        if (grid.length > 0) {
          // Find the last non-tie result in the grid and add tie marker
          for (let i = grid.length - 1; i >= 0; i--) {
            if (grid[i].type !== 'tie') {
              grid[i].tieCount = (grid[i].tieCount || 0) + 1;
              break;
            }
          }
        }
        // Don't add tie as separate grid item
      } else {
        // Banker or Player result
        if (lastNonTieResult && lastNonTieResult.type === result.type) {
          // Same as previous, continue in same column
          currentRow++;
        } else {
          // Different result or first non-tie result, start new column
          if (lastNonTieResult) {
            currentColumn++;
            currentRow = 0;
          }
        }

        grid.push({
          ...result,
          column: currentColumn,
          row: currentRow,
          tieCount: 0
        });

        lastNonTieResult = result;
      }
    });

    return grid;
  };

  useEffect(() => {
    const results = generateRandomResults();
    setGameResults(results);
    const bigRoadData = convertToBigRoad(results);
    setBigRoadGrid(bigRoadData);
  }, []);

  const regenerateResults = () => {
    const randomCount = Math.floor(Math.random() * (80 - 30 + 1)) + 30;
    const newResults = generateRandomResults(randomCount);
    setGameResults(newResults);
    const newBigRoadData = convertToBigRoad(newResults);
    setBigRoadGrid(newBigRoadData);
  };

  // Calculate the grid dimensions
  const maxColumn = bigRoadGrid.length > 0 ? Math.max(...bigRoadGrid.map(item => item.column)) + 1 : 1;
  const maxRow = 6; // Standard 6 rows for Big Road

  return (
    <div className="bigroad-container">
      <div className="bigroad-header">
        <h3>Big Road (大路)</h3>
        <div className="bigroad-info">
          <span>Games: {gameResults.length}</span>
          <span>Columns: {maxColumn}</span>
        </div>
      </div>
      
      <div 
        className="bigroad-grid"
        style={{
          gridTemplateColumns: `repeat(${Math.max(maxColumn, 10)}, 50px)`,
          gridTemplateRows: `repeat(${maxRow}, 50px)`
        }}
      >
        {bigRoadGrid.map((result, index) => (
          <div 
            key={`${result.id}-${index}`}
            className="bigroad-grid-item"
            style={{
              gridColumn: result.column + 1,
              gridRow: result.row + 1
            }}
          >
            <div
              className={`road-ring ${result.type}`}
              title={`Game ${result.id}: ${result.outcome}${result.bankPair ? ' + Bank Pair' : ''}${result.playerPair ? ' + Player Pair' : ''}${result.tieCount > 0 ? ` + ${result.tieCount} Tie(s)` : ''}`}
            >
              {/* Tie indicators */}
              {result.tieCount === 1 && (
                <div className="tie-diagonal"></div>
              )}
              {result.tieCount > 1 && (
                <span className="tie-number">{result.tieCount}</span>
              )}
              
              {/* Bank pair dot - top left */}
              {result.bankPair && (
                <div className="pair-dot bank-pair-dot"></div>
              )}
              
              {/* Player pair dot - bottom right */}
              {result.playerPair && (
                <div className="pair-dot player-pair-dot"></div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bigroad-controls">
        <button onClick={regenerateResults} className="regenerate-btn">
          Generate New Results
        </button>
      </div>

      <div className="bigroad-legend">
        <div>
          <div className="legend-item">
            <div className="legend-ring banker"></div>
            <span>Banker (莊)</span>
          </div>
          <div className="legend-item">
            <div className="legend-ring player"></div>
            <span>Player (閑)</span>
          </div>
        </div>
        <div className="legend-note">
          <small>• Single tie: Green diagonal line on last result</small>
          <small>• Multiple ties: Green number on last result</small>
          <small>• Dots indicate pairs (red=banker, blue=player)</small>
        </div>
      </div>
    </div>
  );
};

export default BigRoad; 