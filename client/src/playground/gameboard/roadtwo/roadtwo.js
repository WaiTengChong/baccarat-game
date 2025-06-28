import React, { useEffect, useState } from 'react';
import './roadtwo.css';

const RoadTwo = ({ gameResults = [] }) => {
  const [displayResults, setDisplayResults] = useState([]);
  const [roadtwoGrid, setroadtwoGrid] = useState([]);

  // Convert gameResults to display format
  const convertGameResults = (results) => {
    const converted = [];
    let handId = 1;

    // Function to detect pairs in cards
    const hasPair = (cards) => {
      return cards && cards.length >= 2 && cards[0].value === cards[1].value;
    };

    // Check if results is a single game object with hands array
    if (results && results.hands && Array.isArray(results.hands)) {
      // Single game object - process hands directly
      results.hands.forEach((hand) => {
        converted.push({
          id: handId++,
          outcome:
            hand.result === "Player"
              ? "閑"
              : hand.result === "Banker"
              ? "莊"
              : "和",
          type: hand.result.toLowerCase(),
          bankPair: hand.bankerPair || hasPair(hand.bankerCards),
          playerPair: hand.playerPair || hasPair(hand.playerCards),
          playerTotal: hand.playerTotal,
          bankerTotal: hand.bankerTotal,
          playerCards: hand.playerCards,
          bankerCards: hand.bankerCards,
        });
      });
    } else if (Array.isArray(results)) {
      // Nested structure - process as before
      results.forEach((play) => {
        if (play.games && Array.isArray(play.games)) {
          play.games.forEach((game) => {
            if (game.hands && Array.isArray(game.hands)) {
              game.hands.forEach((hand) => {
                converted.push({
                  id: handId++,
                  outcome:
                    hand.result === "Player"
                      ? "閑"
                      : hand.result === "Banker"
                      ? "莊"
                      : "和",
                  type: hand.result.toLowerCase(),
                  bankPair: hand.bankerPair || hasPair(hand.bankerCards),
                  playerPair: hand.playerPair || hasPair(hand.playerCards),
                  playerTotal: hand.playerTotal,
                  bankerTotal: hand.bankerTotal,
                  playerCards: hand.playerCards,
                  bankerCards: hand.bankerCards,
                });
              });
            }
          });
        }
      });
    }

    return converted;
  };

  // Convert game results to Big Road format with proper dragon tail logic
  const convertToroadtwo = (results) => {
    if (!results.length) return [];

    const grid = [];
    const MAX_ROWS = 6;
    let currentColumn = 0;
    let currentRow = 0;
    let lastNonTieResult = null;

    // Helper function to check if a position is occupied
    const isPositionOccupied = (column, row) => {
      return grid.some((item) => item.column === column && item.row === row);
    };

    // Helper function to find the next available position for dragon tail
    const findNextTailPosition = (startColumn, startRow, resultType) => {
      let column = startColumn;
      let row = startRow;

      // If we're at the bottom row (5) and need to place same result type,
      // move to the right (dragon tail)
      if (row >= MAX_ROWS - 1) {
        // Check if the next column at the same row is available
        while (isPositionOccupied(column + 1, row)) {
          column++;
        }
        return { column: column + 1, row };
      }

      return { column, row };
    };

    results.forEach((result, index) => {
      if (result.type === "tie") {
        // Ties are marked on the previous non-tie result
        if (grid.length > 0) {
          // Find the last non-tie result in the grid and add tie marker
          for (let i = grid.length - 1; i >= 0; i--) {
            if (grid[i].type !== "tie") {
              grid[i].tieCount = (grid[i].tieCount || 0) + 1;
              break;
            }
          }
        }
        // Don't add tie as separate grid item
      } else {
        // Banker or Player result
        if (lastNonTieResult && lastNonTieResult.type === result.type) {
          // Same as previous result
          const nextRow = currentRow + 1;

          if (nextRow >= MAX_ROWS) {
            // We've reached the maximum rows, need to implement dragon tail
            const tailPosition = findNextTailPosition(
              currentColumn,
              currentRow,
              result.type
            );
            currentColumn = tailPosition.column;
            currentRow = tailPosition.row;
          } else {
            // Normal vertical placement
            currentRow = nextRow;
          }
        } else {
          // Different result or first non-tie result, start new column
          if (lastNonTieResult) {
            currentColumn++;
            currentRow = 0;
          }
        }

        // Handle special case: if we're trying to place at the same position as existing result
        // This can happen with dragon tail logic
        while (isPositionOccupied(currentColumn, currentRow)) {
          if (lastNonTieResult && lastNonTieResult.type === result.type) {
            // Move right for same result type (dragon tail continues)
            currentColumn++;
          } else {
            // This shouldn't happen for different result types, but handle gracefully
            currentColumn++;
            currentRow = 0;
          }
        }

        grid.push({
          ...result,
          column: currentColumn,
          row: currentRow,
          tieCount: 0,
        });

        lastNonTieResult = result;
      }
    });

    return grid;
  };

  useEffect(() => {
    if (
      gameResults &&
      (Array.isArray(gameResults) ? gameResults.length > 0 : gameResults.hands)
    ) {
      const converted = convertGameResults(gameResults);
      setDisplayResults(converted);
      const roadtwoData = convertToroadtwo(converted);
      setroadtwoGrid(roadtwoData);
    } else {
      setDisplayResults([]);
      setroadtwoGrid([]);
    }
  }, [gameResults]);

  // Calculate grid position for each result
  const getGridPosition = (index) => {
    const maxRowsPerColumn = 6;
    const column = Math.floor(index / maxRowsPerColumn);
    const row = index % maxRowsPerColumn;

    return {
      gridColumn: column + 1,
      gridRow: row + 1,
    };
  };

  return (
    <div className="roadtwo-container">
      <div className="roadtwo-header">
        <h3>Big Road (大路)</h3>
        <div className="roadtwo-info">
          <span>Games: {displayResults.length}</span>
          <span>Columns: 16</span>
        </div>
      </div>

      <div className="roadtwo-grid">
        {Array.from({ length: 420 }, (_, index) => {
          // Find if there's a game result for this position
          const gridPos = getGridPosition(index);
          const result = roadtwoGrid.find(
            (item) =>
              item.column === gridPos.gridColumn - 1 &&
              item.row === gridPos.gridRow - 1
          );

          return (
            <div
              key={index}
              className="roadtwo-grid-item"
              style={getGridPosition(index)}
            >
              {result ? (
                <div
                  className={`road-ring ${result.type}`}
                  title={`Game ${result.id}: ${result.outcome} (Player: ${
                    result.playerTotal
                  }, Banker: ${result.bankerTotal})${
                    result.bankPair ? " + Bank Pair" : ""
                  }${result.playerPair ? " + Player Pair" : ""}${
                    result.tieCount > 0 ? ` + ${result.tieCount} Tie(s)` : ""
                  }`}
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
              ) : (
                <div className="road-ring empty-cell"></div>
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

export default RoadTwo;