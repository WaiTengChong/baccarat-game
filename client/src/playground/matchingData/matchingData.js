import { Column } from '@ant-design/plots';
import { Card } from 'antd';
import React, { useEffect, useState } from 'react';
import BaccaratAPI from '../../services/api';
import useStyles from '../style.style';
import './matchingData.css';

const SkippedCardsDisplay = ({ gameResults }) => {
  // Extract all skipped cards from game results
  const allSkippedCards = [];
  
  if (gameResults && Array.isArray(gameResults)) {
    // Handle nested structure (multiple plays)
    gameResults.forEach(play => {
      if (play.games) {
        play.games.forEach(game => {
          if (game.skippedCards && game.skippedCards.length > 0) {
            allSkippedCards.push({
              playNumber: play.playNumber,
              gameNumber: game.gameNumber,
              skippedCards: game.skippedCards
            });
          }
        });
      }
    });
  } else if (gameResults && gameResults.skippedCards) {
    // Handle single game structure
    if (gameResults.skippedCards.length > 0) {
      allSkippedCards.push({
        playNumber: gameResults.playNumber || 1,
        gameNumber: gameResults.gameNumber || 1,
        skippedCards: gameResults.skippedCards
      });
    }
  }

  // if (allSkippedCards.length === 0) {
  //   return (
  //     <Card style={{ marginBottom: 16 }} title="飛牌記錄">
  //       <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
  //         此次模擬未使用飛牌功能
  //       </div>
  //     </Card>
  //   );
  // }

  // return (
  //   <Card style={{ marginBottom: 16 }} title="飛牌記錄">
  //     <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
  //       {allSkippedCards.map((item, index) => (
  //         <div key={index} style={{ 
  //           marginBottom: '8px', 
  //           padding: '8px', 
  //           backgroundColor: '#f5f5f5', 
  //           borderRadius: '4px',
  //           fontSize: '12px'
  //         }}>
  //           <strong>第{item.playNumber}局 第{item.gameNumber}遊戲:</strong>
  //           <div style={{ marginTop: '4px', color: '#666' }}>
  //             {item.skippedCards.join(', ')}
  //           </div>
  //         </div>
  //       ))}
  //     </div>
  //   </Card>
  // );
};

const MatchingData = ({
  matchingData,
  loading,
  gameResults,
  betweenCounts: betweenCountsProp,
}) => {
  const { styles } = useStyles();
  
  // Process matchingData to create display text
  const generateDataText = (data) => {
    if (!data || data.length === 0) return "暫無數據";
    
    // Group data by x value and type
    const grouped = {};
    data.forEach(item => {
      if (!grouped[item.x]) {
        grouped[item.x] = {};
      }
      grouped[item.x][item.type] = item.y;
    });
    
    // Generate display text
    const displayItems = [];
    const maxX = Math.max(...data.map(item => item.x));
    
    for (let i = 1; i <= maxX; i++) {
      const bankerCount = grouped[i]?.['莊'] || 0;
      const playerCount = grouped[i]?.['閑'] || 0;
      
      if (bankerCount > 0 || playerCount > 0) {
        if (bankerCount > 0) {
          displayItems.push(`莊(${i}) = ${bankerCount}次`);
        }
        if (playerCount > 0) {
          displayItems.push(`閑(${i}) = ${playerCount}次`);
        }
      }
    }
    
    return displayItems.length > 0 ? displayItems.join(', ') : "暫無數據";
  };

  // Ensure we have valid data for the chart
  const chartData = matchingData && Array.isArray(matchingData) ? matchingData : [];
  const hasData = chartData.length > 0;

  // Transform data structure for the new Column component and filter out zero values
  const transformedData = hasData ? chartData
    .filter(item => item.y > 0) // Filter out zero values to prevent empty bars
    .map(item => ({
      連續次數: String(item.x), // Convert to string to ensure proper categorical handling
      次數: item.y,
      類型: item.type
    })) : [];



  const columnConfig = {
    data: transformedData,
    xField: '連續次數',
    yField: '次數',
    colorField: '類型',
    group: true,
    height: 270,
    autoFit: true,
    style: {
      inset: 3,
    },
    scale: {
      x: {
        type: 'band',
        paddingInner: 0.2,
        paddingOuter: 0.1,
      },
      y: {
        type: 'linear',
        nice: true,
        min: 0,
      },
      color: {
        type: 'ordinal',
        range: ['#fa1414', '#1890ff'],
        domain: ['莊', '閑'],
      },
    },
    legend: {
      position: 'top',
    },
    axis: {
      x: {
        title: '連續',
        gridLineDash: null,
        gridStroke: '#000',
      },
      y: {
        title: '次數',
        gridLineDash: null,
        gridStroke: '#000',
      },
    },
  };

  return (
    <>
      <Card
        className={styles.salesCard}
        loading={loading}
        title="連續開莊閑次數統計 (全部遊戲)"
        bodyStyle={{
          padding: 16,
        }}
      >
        <div className={styles.salesCard}>
          <div className={styles.salesBar}>
            {hasData ? (
              <Column {...columnConfig} />
            ) : (
              <div style={{ height: 270, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                暫無數據可顯示
              </div>
            )}
          </div>
        </div>

        <div className="consecutive-wins-table" style={{ marginTop: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'center' }}>連續次數</th>
                <th style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'center', color: '#fa1414' }}>莊 (勝率%)</th>
                <th style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'center', color: '#1890ff' }}>閑 (勝率%)</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                if (!hasData) {
                  return (
                    <tr>
                      <td colSpan="3" style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'center', color: '#999' }}>
                        暫無數據
                      </td>
                    </tr>
                  );
                }
                
                // Group data by x value and type
                const grouped = {};
                chartData.forEach(item => {
                  if (!grouped[item.x]) {
                    grouped[item.x] = {};
                  }
                  grouped[item.x][item.type] = item.y;
                });
                
                // Generate table rows
                const rows = [];
                const maxX = Math.max(...chartData.map(item => item.x));
                
                for (let i = 1; i <= maxX; i++) {
                  const bankerCount = grouped[i]?.['莊'] || 0;
                  const playerCount = grouped[i]?.['閑'] || 0;
                  
                  if (bankerCount > 0 || playerCount > 0) {
                    rows.push(
                      <tr key={i}>
                        <td style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'center' }}>
                          {i}次連續
                        </td>
                        <td style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'center', color: bankerCount > 0 ? '#fa1414' : '#999' }}>
                          {bankerCount > 0 ? `${bankerCount}次` : '-'}
                        </td>
                        <td style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'center', color: playerCount > 0 ? '#1890ff' : '#999' }}>
                          {playerCount > 0 ? `${playerCount}次` : '-'}
                        </td>
                      </tr>
                    );
                  }
                }
                
                return rows.length > 0 ? rows : (
                  <tr>
                    <td colSpan="3" style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'center', color: '#999' }}>
                      暫無連續數據
                    </td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>

        {/* New: Between-counts table (Road Two style: counts of X between single Y, excluding trailing open segment) */}
        {(() => {
          // Helper: extract chronological outcome sequence (0 = 莊/Banker, 1 = 閑/Player) ignoring ties
          const extractOutcomeSequence = (results) => {
            const sequence = [];
            if (!results) return sequence;

            // Case 1: single game object with hands
            if (results.hands && Array.isArray(results.hands)) {
              results.hands.forEach((hand) => {
                if (!hand || !hand.result) return;
                if (hand.result === 'Banker') sequence.push(0);
                else if (hand.result === 'Player') sequence.push(1);
              });
              return sequence;
            }

            // Case 2: play object with games (optional hands)
            if (results.games && Array.isArray(results.games)) {
              // Sort games by gameNumber if present to ensure order
              const games = [...results.games].sort((a, b) => (a.gameNumber || 0) - (b.gameNumber || 0));
              games.forEach((game) => {
                if (!game || !Array.isArray(game.hands)) return;
                // Sort hands by handNumber if present
                const hands = [...game.hands].sort((a, b) => (a.handNumber || 0) - (b.handNumber || 0));
                hands.forEach((hand) => {
                  if (!hand || !hand.result) return;
                  if (hand.result === 'Banker') sequence.push(0);
                  else if (hand.result === 'Player') sequence.push(1);
                });
              });
              return sequence;
            }

            // Case 3: array of plays
            if (Array.isArray(results)) {
              results.forEach((play) => {
                if (!play || !Array.isArray(play.games)) return;
                const games = [...play.games].sort((a, b) => (a.gameNumber || 0) - (b.gameNumber || 0));
                games.forEach((game) => {
                  if (!game || !Array.isArray(game.hands)) return;
                  const hands = [...game.hands].sort((a, b) => (a.handNumber || 0) - (b.handNumber || 0));
                  hands.forEach((hand) => {
                    if (!hand || !hand.result) return;
                    if (hand.result === 'Banker') sequence.push(0);
                    else if (hand.result === 'Player') sequence.push(1);
                  });
                });
              });
              return sequence;
            }

            return sequence;
          };

          // Helper: compute counts of patterns 0 1^k 0 (player between bankers) and 1 0^k 1 (banker between players)
          const computeBetweenCounts = (seq) => {
            const result = { banker: {}, player: {} };
            if (!seq || seq.length === 0) return result;

            // Build run-length encoding of the sequence
            const runs = [];
            let i = 0;
            while (i < seq.length) {
              const value = seq[i];
              let j = i;
              while (j < seq.length && seq[j] === value) j++;
              runs.push({ value, length: j - i });
              i = j;
            }

            // Exclude last open run ("the last one forever not count")
            const lastIndex = runs.length - 1;
            const effectiveEnd = Math.max(0, lastIndex - 1); // exclude final run by only iterating up to lastIndex-1 center runs

            // NEW: also count the FIRST run at the start (as requested)
            if (runs.length > 0) {
              const first = runs[0];
              if (first.value === 0) {
                result.banker[first.length] = (result.banker[first.length] || 0) + 1;
              } else if (first.value === 1) {
                result.player[first.length] = (result.player[first.length] || 0) + 1;
              }
            }

            for (let r = 1; r <= effectiveEnd; r++) {
              // We look at triplets: runs[r-1], runs[r], runs[r+1]
              const prev = runs[r - 1];
              const curr = runs[r];
              const next = runs[r + 1];
              if (!prev || !curr || !next) continue;

              // Count patterns bounded on both sides by the opposite value
              // Player between bankers: 0 1^k 0
              if (prev.value === 0 && curr.value === 1 && next.value === 0) {
                const k = curr.length;
                result.player[k] = (result.player[k] || 0) + 1;
              }

              // Banker between players: 1 0^k 1
              if (prev.value === 1 && curr.value === 0 && next.value === 1) {
                const k = curr.length;
                result.banker[k] = (result.banker[k] || 0) + 1;
              }
            }

            return result;
          };

          const seq = extractOutcomeSequence(gameResults);
          const betweenCounts = betweenCountsProp || computeBetweenCounts(seq);
          const playerKeys = Object.keys(betweenCounts.player).map(Number).sort((a, b) => a - b);
          const bankerKeys = Object.keys(betweenCounts.banker).map(Number).sort((a, b) => a - b);
          const hasBetweenData = playerKeys.length > 0 || bankerKeys.length > 0;

          return (
            <div className="consecutive-wins-table" style={{ marginTop: '16px' }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>夾中連續統計（Road Two 計數法）</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <th style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'center' }}>連續次數</th>
                    <th style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'center', color: '#fa1414' }}>莊被夾 (0^k 於 1 之間)</th>
                    <th style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'center', color: '#1890ff' }}>閑被夾 (1^k 於 0 之間)</th>
                  </tr>
                </thead>
                <tbody>
                  {hasBetweenData ? (
                    (() => {
                      const allK = Array.from(new Set([...playerKeys, ...bankerKeys])).sort((a, b) => a - b);
                      return allK.map((k) => (
                        <tr key={k}>
                          <td style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'center' }}>{k}次</td>
                          <td style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'center', color: betweenCounts.banker[k] ? '#fa1414' : '#999' }}>
                            {betweenCounts.banker[k] ? `${betweenCounts.banker[k]}次` : '-'}
                          </td>
                          <td style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'center', color: betweenCounts.player[k] ? '#1890ff' : '#999' }}>
                            {betweenCounts.player[k] ? `${betweenCounts.player[k]}次` : '-'}
                          </td>
                        </tr>
                      ));
                    })()
                  ) : (
                    <tr>
                      <td colSpan="3" style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'center', color: '#999' }}>
                        暫無夾中統計數據
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          );
        })()}

      <SkippedCardsDisplay gameResults={gameResults} />
      </Card>
    </>
  );
};

// Helper function to process road grid into chart data format
const processRoadGridToChartData = (roadGrid) => {
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

  // Convert to chart data format
  const chartData = [];
  const maxStreak = Math.max(
    Math.max(...Object.keys(columnCounts["莊"]).map(Number), 0),
    Math.max(...Object.keys(columnCounts["閑"]).map(Number), 0)
  );

  for (let i = 1; i <= Math.max(maxStreak, 5); i++) {
    chartData.push({
      x: i,
      y: columnCounts["莊"][i] || 0,
      type: "莊",
    });
    chartData.push({
      x: i,
      y: columnCounts["閑"][i] || 0,
      type: "閑",
    });
  }

  return chartData;
};

// Function to analyze consecutive wins from API data (optimized for API response)
const analyzeConsecutiveWinsFromAPI = (apiResponseData) => {
  // Check if we have pre-calculated consecutive analysis (from embedded server)
  if (apiResponseData && 
      apiResponseData.consecutiveBanker && 
      apiResponseData.consecutivePlayer && 
      apiResponseData.consecutiveTie) {
    
    console.log('🎯 Using pre-calculated consecutive analysis from server');
    
    // Convert server data to chart format
    const chartData = [];
    
    // Get max streak length
    const bankerLengths = apiResponseData.consecutiveBanker.map(item => item.length);
    const playerLengths = apiResponseData.consecutivePlayer.map(item => item.length);
    const maxStreak = Math.max(
      Math.max(...bankerLengths, 0),
      Math.max(...playerLengths, 0),
      5 // Minimum 5 for display
    );
    
    // Convert to chart format
    for (let i = 1; i <= maxStreak; i++) {
      // Find banker count for this length
      const bankerEntry = apiResponseData.consecutiveBanker.find(entry => entry.length === i);
      const bankerCount = bankerEntry ? bankerEntry.count : 0;
      
      // Find player count for this length
      const playerEntry = apiResponseData.consecutivePlayer.find(entry => entry.length === i);
      const playerCount = playerEntry ? playerEntry.count : 0;
      
      chartData.push({
        x: i,
        y: bankerCount,
        type: "莊",
      });
      chartData.push({
        x: i,
        y: playerCount,
        type: "閑",
      });
    }
    
    return chartData;
  }
  
  // Check if we have games with handsForAnalysis (from continuous/in-memory mode)
  if (apiResponseData && apiResponseData.games && 
      apiResponseData.games.some(game => game.handsForAnalysis)) {
    console.log('🔄 Processing continuous/in-memory mode games data for consecutive analysis');
    
    // Convert handsForAnalysis format to display format
    const convertedResults = [];
    let handId = 1;
    
    apiResponseData.games.forEach((game) => {
      if (game.handsForAnalysis && Array.isArray(game.handsForAnalysis)) {
        game.handsForAnalysis.forEach((hand) => {
          convertedResults.push({
            id: handId++,
            outcome: hand.result === "Player" ? "閑" : hand.result === "Banker" ? "莊" : "和",
            type: hand.result.toLowerCase(),
          });
        });
      }
    });
    
    if (convertedResults.length > 0) {
      // Use the same Big Road analysis as the fallback
      const roadGrid = convertToroadtwo(convertedResults);
      return processRoadGridToChartData(roadGrid);
    }
  }
  
  // Fallback: Check if we have raw games data (from original server)
  if (!apiResponseData || !apiResponseData.games) {
    console.warn('⚠️ No consecutive analysis or games data found');
    return [];
  }

  console.log('🔄 Processing raw games data for consecutive analysis');

  // Convert API response to display format
  const convertGameResults = (apiData) => {
    const converted = [];
    let handId = 1;

    apiData.games.forEach((game) => {
      game.hands.forEach((hand) => {
        converted.push({
          id: handId++,
          outcome: hand.result === "Player" ? "閑" : hand.result === "Banker" ? "莊" : "和",
          type: hand.result.toLowerCase(),
        });
      });
    });

    return converted;
  };

  // Convert to Big Road grid logic (same as original)
  const convertToroadtwo = (results) => {
    if (!results.length) return [];

    const grid = [];
    let currentColumn = 0;
    let currentRow = 0;
    let lastNonTieResult = null;

    results.forEach((result) => {
      if (result.type === "tie") {
        if (grid.length > 0) {
          for (let i = grid.length - 1; i >= 0; i--) {
            if (grid[i].type !== "tie") {
              grid[i].tieCount = (grid[i].tieCount || 0) + 1;
              break;
            }
          }
        }
      } else {
        if (lastNonTieResult && lastNonTieResult.type === result.type) {
          currentRow++;
        } else {
          if (lastNonTieResult) {
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

  // Convert and analyze
  const displayResults = convertGameResults(apiResponseData);
  const roadtwoGrid = convertToroadtwo(displayResults);

  // Use the helper function to process road grid
  return processRoadGridToChartData(roadtwoGrid);
};

// Lazy loading MatchingData component
const MatchingDataLazy = ({ 
  simulationId, 
  playNumber, 
  gameResults, 
  consecutiveWinsCache, 
  setConsecutiveWinsCache, 
  addLog,
  precomputedMatchingData,
  isContinuousMode = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [matchingData, setMatchingData] = useState([]);
  const [betweenCounts, setBetweenCounts] = useState(null);
  const cacheKey = `${simulationId}_${playNumber}`;
  const betweenCacheKey = `${cacheKey}_between`;

  useEffect(() => {
    let isCancelled = false;
    const loadConsecutiveWinsData = async () => {
      // Check cache first
      if (consecutiveWinsCache[cacheKey] && !precomputedMatchingData) {
        if (!isCancelled) setMatchingData(consecutiveWinsCache[cacheKey]);
      }
      // Restore between-counts from cache if available
      if (consecutiveWinsCache[betweenCacheKey]) {
        if (!isCancelled) setBetweenCounts(consecutiveWinsCache[betweenCacheKey]);
      }

      // If we have precomputed chart data, set it immediately (mega/ultra-fast)
      if (precomputedMatchingData && Array.isArray(precomputedMatchingData)) {
        if (!isCancelled) setMatchingData(precomputedMatchingData);
      }

      // Check if we already have pre-computed consecutive data (for in-memory/continuous mode)
      if (gameResults && gameResults.consecutiveWinsData) {
        addLog(`📊 Using pre-computed consecutive wins analysis for play ${playNumber} (in-memory mode)`);
        
        // Cache the pre-computed result
        setConsecutiveWinsCache(prev => ({
          ...prev,
          [cacheKey]: gameResults.consecutiveWinsData
        }));
        
        if (!isCancelled) setMatchingData(gameResults.consecutiveWinsData);
        // Still try to compute betweenCounts via API if possible
      }

      // Fallback: Load consecutive analysis data from API (for database mode)
      if (!isCancelled) setLoading(true);
      try {
        if (!precomputedMatchingData) {
          addLog(`📊 Loading consecutive wins analysis from API for play ${playNumber}...`);
        } else {
          addLog(`📊 Loading between-counts (Road Two) from API for play ${playNumber}...`);
        }
        
        // Load consecutive analysis data from API
        const analysisData = await BaccaratAPI.getPlayConsecutiveAnalysis(simulationId, playNumber, addLog);
        
        // Analyze the data for chart (if not precomputed)
        if (!precomputedMatchingData) {
          const consecutiveWinsData = analyzeConsecutiveWinsFromAPI(analysisData);
          // Cache the result
          setConsecutiveWinsCache(prev => ({
            ...prev,
            [cacheKey]: consecutiveWinsData
          }));
          if (!isCancelled) setMatchingData(consecutiveWinsData);
          addLog(`✅ Consecutive wins analysis loaded from API for play ${playNumber}`);
        }

        // Build sequences based on mode:
        // - Standard: per-game sequences
        // - Continuous: single concatenated sequence across all games
        const extractSeqsFromAnalysis = (data) => {
          const seqs = [];
          if (!data || !Array.isArray(data.games)) return seqs;
          const games = [...data.games].sort((a, b) => (a.gameNumber || 0) - (b.gameNumber || 0));
          if (isContinuousMode) {
            // Single sequence for the whole play
            const seq = [];
            games.forEach((game) => {
              const hands = Array.isArray(game.handsForAnalysis)
                ? game.handsForAnalysis
                : Array.isArray(game.hands) ? game.hands : [];
              const sortedHands = [...hands].sort((a, b) => (a.handNumber || a.hand_number || 0) - (b.handNumber || b.hand_number || 0));
              sortedHands.forEach((hand) => {
                if (hand.result === 'Banker') seq.push(0);
                else if (hand.result === 'Player') seq.push(1);
              });
            });
            if (seq.length) seqs.push(seq);
            return seqs;
          }

          // Standard mode: one sequence per game
          games.forEach((game) => {
            const hands = Array.isArray(game.handsForAnalysis)
              ? game.handsForAnalysis
              : Array.isArray(game.hands) ? game.hands : [];
            const sortedHands = [...hands].sort((a, b) => (a.handNumber || a.hand_number || 0) - (b.handNumber || b.hand_number || 0));
            const seq = [];
            sortedHands.forEach((hand) => {
              const result = hand.result;
              if (result === 'Banker') seq.push(0);
              else if (result === 'Player') seq.push(1);
            });
            if (seq.length) seqs.push(seq);
          });
          return seqs;
        };

        const computeBetweenCountsMulti = (seqs) => {
          const res = { banker: {}, player: {} };
          (seqs || []).forEach((seq) => {
            if (!seq || seq.length === 0) return;
            const runs = [];
            let i = 0;
            while (i < seq.length) {
              const value = seq[i];
              let j = i;
              while (j < seq.length && seq[j] === value) j++;
              runs.push({ value, length: j - i });
              i = j;
            }
            if (runs.length === 0) return;
            // Count FIRST run (per game in standard mode, or once in concatenated mode)
            const first = runs[0];
            if (first.value === 0) res.banker[first.length] = (res.banker[first.length] || 0) + 1;
            else if (first.value === 1) res.player[first.length] = (res.player[first.length] || 0) + 1;

            // Count middle runs (bounded), excluding the LAST run of the sequence
            const lastIndex = runs.length - 1;
            const effectiveEnd = Math.max(0, lastIndex - 1);
            for (let r = 1; r <= effectiveEnd; r++) {
              const prev = runs[r - 1];
              const curr = runs[r];
              const next = runs[r + 1];
              if (!prev || !curr || !next) continue;
              if (prev.value === 0 && curr.value === 1 && next.value === 0) {
                const k = curr.length;
                res.player[k] = (res.player[k] || 0) + 1;
              }
              if (prev.value === 1 && curr.value === 0 && next.value === 1) {
                const k = curr.length;
                res.banker[k] = (res.banker[k] || 0) + 1;
              }
            }
          });
          return res;
        };

        const seqs = extractSeqsFromAnalysis(analysisData);
        const computed = computeBetweenCountsMulti(seqs);
        if (!isCancelled) setBetweenCounts(computed);
        // Cache between-counts for persistence across view changes
        setConsecutiveWinsCache(prev => ({
          ...prev,
          [betweenCacheKey]: computed
        }));
        
      } catch (error) {
        console.error('Error loading consecutive wins data:', error);
        addLog(`❌ Error loading consecutive wins data: ${error.message}`);
        // Try to generate data from gameResults if available
        if (gameResults && gameResults.games) {
          addLog(`🔄 Falling back to client-side analysis from game results...`);
          const consecutiveWinsData = analyzeConsecutiveWinsFromAPI(gameResults);
          if (!isCancelled) setMatchingData(consecutiveWinsData);
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    if (simulationId && playNumber) {
      loadConsecutiveWinsData();
    }
    return () => { isCancelled = true; };
  }, [cacheKey, simulationId, playNumber, precomputedMatchingData]);

  return (
    <MatchingData 
      matchingData={matchingData} 
      loading={loading} 
      gameResults={gameResults}
      betweenCounts={betweenCounts}
    />
  );
};

export default MatchingData;
export { MatchingDataLazy };
