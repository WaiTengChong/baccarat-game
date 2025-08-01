import React, { useEffect, useState } from 'react';
import './roadone.css';

const RoadOne = ({ gameResults = [] }) => {
  const [displayResults, setDisplayResults] = useState([]);
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
      results.hands.forEach(hand => {
        converted.push({
          id: handId++,
          outcome: hand.result === 'Player' ? '閑' : hand.result === 'Banker' ? '莊' : '和',
          type: hand.result.toLowerCase(),
          bankPair: hand.bankerPair || hasPair(hand.bankerCards || []),
          playerPair: hand.playerPair || hasPair(hand.playerCards || []),
          playerTotal: hand.playerTotal || 0,
          bankerTotal: hand.bankerTotal || 0,
          playerCards: hand.playerCards || [],
          bankerCards: hand.bankerCards || []
        });
      });
    } else if (Array.isArray(results)) {
      // Nested structure - process as before
      results.forEach(play => {
        if (play.games && Array.isArray(play.games)) {
          play.games.forEach(game => {
            if (game.hands && Array.isArray(game.hands)) {
              game.hands.forEach(hand => {
                converted.push({
                  id: handId++,
                  outcome: hand.result === 'Player' ? '閑' : hand.result === 'Banker' ? '莊' : '和',
                  type: hand.result.toLowerCase(),
                  bankPair: hand.bankerPair || hasPair(hand.bankerCards || []),
                  playerPair: hand.playerPair || hasPair(hand.playerCards || []),
                  playerTotal: hand.playerTotal || 0,
                  bankerTotal: hand.bankerTotal || 0,
                  playerCards: hand.playerCards || [],
                  bankerCards: hand.bankerCards || []
                });
              });
            }
          });
        }
      });
    }
    
    return converted;
  };

  useEffect(() => {
    if (gameResults && (Array.isArray(gameResults) ? gameResults.length > 0 : 
        (gameResults.hands && gameResults.hands.length > 0))) {
      try {
        const converted = convertGameResults(gameResults);
        setDisplayResults(converted);
      } catch (error) {
        console.warn('Error processing road data:', error);
        setDisplayResults([]);
      }
    } else {
      setDisplayResults([]);
    }
  }, [gameResults]);

  // Calculate grid dimensions and pagination based on data size
  const getGridDimensions = (dataLength) => {
    if (dataLength === 0) return { 
      rows: 6, cols: 16, totalCells: 96, 
      hasOverflow: false, resultsPerPage: 96, totalPages: 1 
    };
    
    const maxRowsPerColumn = 6;
    const minColumns = 16;
    const maxDisplayColumns = 100; // Limit for performance per page
    const resultsPerPage = maxDisplayColumns * maxRowsPerColumn; // 600 results per page
    
    // Calculate total pages needed
    const totalPages = Math.ceil(dataLength / resultsPerPage);
    
    // For current page, calculate how many columns we need
    const startIndex = (currentPage - 1) * resultsPerPage;
    const endIndex = Math.min(startIndex + resultsPerPage, dataLength);
    const currentPageResults = endIndex - startIndex;
    
    const requiredColumns = Math.ceil(currentPageResults / maxRowsPerColumn);
    const actualColumns = Math.max(minColumns, requiredColumns);
    const displayColumns = Math.min(actualColumns, maxDisplayColumns);
    
    return {
      rows: maxRowsPerColumn,
      cols: displayColumns,
      totalCells: displayColumns * maxRowsPerColumn,
      hasOverflow: dataLength > resultsPerPage,
      resultsPerPage: resultsPerPage,
      totalPages: totalPages,
      currentPageResults: currentPageResults,
      startIndex: startIndex,
      endIndex: endIndex
    };
  };

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

  const gridDimensions = getGridDimensions(displayResults.length);
  const isLargeDataset = displayResults.length > 1000;
  
  // Get data for current page
  const currentPageData = displayResults.slice(gridDimensions.startIndex, gridDimensions.endIndex);
  
  // Reset to page 1 when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [displayResults.length]);

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
          <div>Showing {gridDimensions.startIndex + 1}-{gridDimensions.endIndex} of {displayResults.length}</div>
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
    <div className="roadone-container">
      <div className="roadone-header">
        <h3>Road One (珠仔路)</h3>
        <div className="roadone-info">
          <span>Total Results: {displayResults.length}</span>
          <span>Columns: {gridDimensions.cols}</span>
          {gridDimensions.hasOverflow && (
            <span className="overflow-warning">
              (Page {currentPage}/{gridDimensions.totalPages})
            </span>
          )}
        </div>
      </div>
      
      {renderPaginationControls()}
      
      <div className={`roadone-grid-wrapper ${isLargeDataset ? 'large-dataset' : ''}`}>
        <div 
          className="roadone-grid"
          style={{
            gridTemplateColumns: `repeat(${gridDimensions.cols}, 1fr)`,
            gridTemplateRows: `repeat(${gridDimensions.rows}, 1fr)`
          }}
        >
          {Array.from({ length: gridDimensions.totalCells }, (_, index) => {
            const result = currentPageData[index];
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
        
        {gridDimensions.hasOverflow && (
          <div className="overflow-indicator">
            <p>📊 Large dataset: {displayResults.length} total results</p>
            <p>💡 Use pagination controls to navigate through all data</p>
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

export default RoadOne;
