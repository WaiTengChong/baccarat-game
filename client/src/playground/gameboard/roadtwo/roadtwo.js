import React, { useEffect, useState } from 'react';
import './roadtwo.css';

const RoadTwo = ({ gameResults = [] }) => {
  const [displayResults, setDisplayResults] = useState([]);
  const [roadtwoGrid, setroadtwoGrid] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  // Convert gameResults to display format
  const convertGameResults = (results) => {
    const converted = [];
    let handId = 1;

    // Function to detect pairs in cards
    const hasPair = (cards) => {
      return cards && Array.isArray(cards) && cards.length >= 2 && 
             cards[0] && cards[1] && cards[0].value === cards[1].value;
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
          bankPair: hand.bankerPair || hasPair(hand.bankerCards || []),
          playerPair: hand.playerPair || hasPair(hand.playerCards || []),
          playerTotal: hand.playerTotal || 0,
          bankerTotal: hand.bankerTotal || 0,
          playerCards: hand.playerCards || [],
          bankerCards: hand.bankerCards || [],
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
                  bankPair: hand.bankerPair || hasPair(hand.bankerCards || []),
                  playerPair: hand.playerPair || hasPair(hand.playerCards || []),
                  playerTotal: hand.playerTotal || 0,
                  bankerTotal: hand.bankerTotal || 0,
                  playerCards: hand.playerCards || [],
                  bankerCards: hand.bankerCards || [],
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
      (Array.isArray(gameResults) ? gameResults.length > 0 : 
       (gameResults.hands && gameResults.hands.length > 0))
    ) {
      try {
        const converted = convertGameResults(gameResults);
        setDisplayResults(converted);
        const roadtwoData = convertToroadtwo(converted);
        setroadtwoGrid(roadtwoData);
      } catch (error) {
        console.warn('Error processing road data:', error);
        setDisplayResults([]);
        setroadtwoGrid([]);
      }
    } else {
      setDisplayResults([]);
      setroadtwoGrid([]);
    }
  }, [gameResults]);

  // Calculate grid dimensions for Big Road with pagination based on actual data
  const getGridDimensions = (gridData) => {
    if (!gridData || gridData.length === 0) return { 
      rows: 6, cols: 70, totalCells: 420, 
      hasOverflow: false, totalPages: 1, actualMaxColumn: 0 
    };
    
    const maxRowsPerColumn = 6;
    const minColumns = 70;
    const maxDisplayColumns = 150; // Columns per page for performance
    
    // Find the maximum column used in the actual data
    const maxColumn = Math.max(...gridData.map(item => item.column), 0);
    const totalRequiredColumns = maxColumn + 10; // Add buffer for dragon tails
    
    // Calculate total pages needed based on columns
    const totalPages = Math.ceil(totalRequiredColumns / maxDisplayColumns);
    
    // For current page, calculate column range to display
    const startColumn = (currentPage - 1) * maxDisplayColumns;
    const endColumn = Math.min(startColumn + maxDisplayColumns, totalRequiredColumns);
    const currentPageColumns = endColumn - startColumn;
    
    // Ensure minimum columns
    const displayColumns = Math.max(minColumns, currentPageColumns);
    
    return {
      rows: maxRowsPerColumn,
      cols: displayColumns,
      totalCells: displayColumns * maxRowsPerColumn,
      actualMaxColumn: maxColumn,
      hasOverflow: totalRequiredColumns > maxDisplayColumns,
      totalPages: totalPages,
      startColumn: startColumn,
      endColumn: endColumn,
      totalRequiredColumns: totalRequiredColumns
    };
  };

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

  const gridDimensions = getGridDimensions(roadtwoGrid);
  const isLargeDataset = displayResults.length > 1000;
  
  // Filter grid data for current page (by column range)
  const currentPageGridData = roadtwoGrid.filter(item => 
    item.column >= gridDimensions.startColumn && 
    item.column < gridDimensions.endColumn
  ).map(item => ({
    ...item,
    column: item.column - gridDimensions.startColumn // Adjust column position for current page
  }));
  
  // Reset to page 1 when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [roadtwoGrid.length]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const renderPaginationControls = () => {
    if (gridDimensions.totalPages <= 1) return null;
    
    const handleJumpToPage = (e) => {
      const page = parseInt(e.target.value);
      if (page >= 1 && page <= gridDimensions.totalPages) {
        handlePageChange(page);
      }
    };
    
    return (
      <div className="pagination-controls">
        <button 
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="pagination-btn"
        >
          ← Previous
        </button>
        <div className="pagination-info">
          <div>
            Page 
            <select 
              value={currentPage} 
              onChange={handleJumpToPage}
              className="page-select"
            >
              {Array.from({ length: gridDimensions.totalPages }, (_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}</option>
              ))}
            </select>
             of {gridDimensions.totalPages}
          </div>
          <div>Columns {gridDimensions.startColumn + 1}-{gridDimensions.endColumn}</div>
        </div>
        <button 
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === gridDimensions.totalPages}
          className="pagination-btn"
        >
          Next →
        </button>
      </div>
    );
  };

  return (
    <div className="roadtwo-container">
      <div className="roadtwo-header">
        <h3>Big Road (大路)</h3>
        <div className="roadtwo-info">
          <span>Total Games: {displayResults.length}</span>
          <span>Display Cols: {gridDimensions.cols}</span>
          <span>Max Used: {gridDimensions.actualMaxColumn + 1}</span>
          {gridDimensions.hasOverflow && (
            <span className="overflow-warning">
              (Page {currentPage}/{gridDimensions.totalPages})
            </span>
          )}
        </div>
      </div>
      
      {renderPaginationControls()}

      <div className={`roadtwo-grid-wrapper ${isLargeDataset ? 'large-dataset' : ''}`}>
        <div 
          className="roadtwo-grid"
          style={{
            gridTemplateColumns: `repeat(${gridDimensions.cols}, 1fr)`,
            gridTemplateRows: `repeat(${gridDimensions.rows}, 1fr)`
          }}
        >
          {Array.from({ length: gridDimensions.totalCells }, (_, index) => {
            // Find if there's a game result for this position
            const gridPos = getGridPosition(index);
            const result = currentPageGridData.find(
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
        
        {gridDimensions.hasOverflow && (
          <div className="overflow-indicator">
            <p>📊 Large Big Road: {displayResults.length} total results</p>
            <p>💡 Use pagination to navigate through {gridDimensions.totalRequiredColumns} columns</p>
            <p>📄 Currently showing page {currentPage} of {gridDimensions.totalPages}</p>
          </div>
        )}
      </div>
      
      {renderPaginationControls()}

      {displayResults.length === 0 && (
        <div className="empty-state">
          <p>No game results yet. Click PLAY to start the game!</p>
        </div>
      )}
    </div>
  );
};

export default RoadTwo;