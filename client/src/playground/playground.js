import { Button, Card, Flex, Space, Splitter, Table } from "antd";
import React, { useContext, useState } from "react";
import { cardImages } from "../components/CardImages";
import BaccaratAPI from "../services/api";
import { LogContext } from "../Terminal/LongContext";
import BetArea from "./betArea/betArea";
import RoadOne from "./gameboard/roadone/roadone";
import RoadTwo from "./gameboard/roadtwo/roadtwo";
import MatchingData, { MatchingDataLazy } from "./matchingData/matchingData";
import PlayCard from "./playCard/playCard";
import "./playground.css";

// Helper function to get card image path
const getCardImagePath = (card) => {
  // Convert 10 to T for filename
  const value = card.value === "10" ? "T" : card.value;

  // Convert Unicode suit symbols to letters
  const suitMapping = {
    "♠": "S",
    "♥": "H",
    "♦": "D",
    "♣": "C",
  };

  const suit = suitMapping[card.suit] || card.suit;
  const cardKey = `${value}${suit}`;

  return cardImages[cardKey];
};

// Function to analyze consecutive wins from game results using Big Road logic
const analyzeConsecutiveWins = (gameData) => {
  if (!gameData) return [];

  // Use the same convertGameResults function as RoadTwo.js
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
          bankPair: hasPair(hand.bankerCards),
          playerPair: hasPair(hand.playerCards),
          playerTotal: hand.playerTotal,
          bankerTotal: hand.bankerTotal,
          playerCards: hand.playerCards,
          bankerCards: hand.bankerCards,
        });
      });
    } else if (Array.isArray(results)) {
      // Original nested structure - process as before
      results.forEach((play) => {
        play.games.forEach((game) => {
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
              bankPair: hasPair(hand.bankerCards),
              playerPair: hasPair(hand.playerCards),
              playerTotal: hand.playerTotal,
              bankerTotal: hand.bankerTotal,
              playerCards: hand.playerCards,
              bankerCards: hand.bankerCards,
            });
          });
        });
      });
    }

    return converted;
  };

  // Use the same convertToroadtwo function as RoadTwo.js
  const convertToroadtwo = (results) => {
    if (!results.length) return [];

    const grid = [];
    let currentColumn = 0;
    let currentRow = 0;
    let lastNonTieResult = null;

    results.forEach((result) => {
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
          tieCount: 0,
        });

        lastNonTieResult = result;
      }
    });

    return grid;
  };

  // First convert game data to display format, then to Big Road grid
  const displayResults = convertGameResults(gameData);
  const roadtwoGrid = convertToroadtwo(displayResults);

  // Now count consecutive wins by column from the actual Big Road grid
  const columnCounts = { 莊: {}, 閑: {} };
  const columns = {};

  // Group Big Road grid results by column
  roadtwoGrid.forEach((item) => {
    if (!columns[item.column]) {
      columns[item.column] = [];
    }
    columns[item.column].push(item);
  });

  // Count consecutive wins in each column (each column is one streak)
  Object.values(columns).forEach((column) => {
    if (column.length > 0) {
      const columnType = column[0].outcome; // All items in a column should be the same type
      const columnLength = column.length; // Length of this column = streak length

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

const View = ({
  gameResults,
  playCardsData,
  onCardClick,
  showTableView,
  showDetailedView,
  tableViewData,
  detailedViewData,
  onBackToPlays,
  onBackToTable,
  onViewGameDetail,
  simulationId,
  consecutiveWinsCache,
  setConsecutiveWinsCache,
  addLog,
  setTableViewData,
}) => {
  // No longer needed! Backend now returns pre-computed table data
  // This eliminates the frontend performance bottleneck for large datasets
  const [showLargeTable, setShowLargeTable] = useState(false);

  const columns = [
    {
      title: "局數",
      dataIndex: "gameNumber",
      key: "gameNumber",
    },
    {
      title: "總手數",
      dataIndex: "totalHands",
      key: "totalHands",
    },
    {
      title: "莊贏",
      dataIndex: "bankerWins",
      key: "bankerWins",
    },
    {
      title: "閑贏",
      dataIndex: "playerWins",
      key: "playerWins",
    },
    {
      title: "和贏",
      dataIndex: "tieWins",
      key: "tieWins",
    },
    {
      title: "莊對",
      dataIndex: "bankerPair",
      key: "bankerPair",
    },
    {
      title: "閑對",
      dataIndex: "playerPair",
      key: "playerPair",
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Space size="middle">
          <a
            onClick={() =>
              onViewGameDetail({
                gameNumber: record.gameNumber,
                gameId: record.gameId,
                totalHands: record.rawData?.totalHands || record.totalHands,
                bankerWins: record.rawData?.bankerWins || 0,
                playerWins: record.rawData?.playerWins || 0,
                tieWins: record.rawData?.tieWins || 0,
                bankerPairs: record.rawData?.bankerPairs || 0,
                playerPairs: record.rawData?.playerPairs || 0,
              })
            }
          >
            查看
          </a>
        </Space>
      ),
    },
  ];
  // Table View with optimized pre-computed data (no frontend processing!)
  if (showTableView && tableViewData) {
    // Use pre-computed table data from backend (instant display)
    const tableData = tableViewData.tableData || [];
    const pagination = tableViewData.pagination || {};
    const totalRows = pagination.total || tableViewData.games?.length || 0;
    const isLargeTable = totalRows > 100;

    return (
      <div className="table-view-container">
        <Card className="table-view-card">
          <div className="table-view-header">
            <button onClick={onBackToPlays} className="back-button">
              ← 返回
            </button>
            <h3>
              第{tableViewData.playNumber}局 - 遊戲統計 一共 {totalRows}局
              {pagination.totalPages > 1 &&
                ` (第${pagination.page}/${pagination.totalPages}頁)`}
            </h3>
          </div>
        </Card>

        {/* Check if consecutive wins data is pre-computed (mega mode) or needs lazy loading */}
        {tableViewData.consecutiveWinsData ? (
          // MEGA-optimized: use pre-computed data
          <MatchingData
            matchingData={tableViewData.consecutiveWinsData}
            loading={false}
            gameResults={tableViewData}
          />
        ) : (
          // Standard optimization: lazy load data
          <MatchingDataLazy
            simulationId={simulationId}
            playNumber={tableViewData.playNumber}
            gameResults={tableViewData}
            consecutiveWinsCache={consecutiveWinsCache}
            setConsecutiveWinsCache={setConsecutiveWinsCache}
            addLog={addLog}
          />
        )}

        {/* Large Table Show/Hide Logic */}
        {isLargeTable && !showLargeTable ? (
          <div className="table-view-content">
            <Card
              className="table-view-card"
              style={{ textAlign: "center", padding: "40px" }}
            >
              <div style={{ marginBottom: "16px" }}>
                <h4>此表格包含 {totalRows} 局數據</h4>
                <p style={{ color: "#666", marginBottom: "20px" }}>
                  由於數據量較大，表格已隱藏以提升頁面效能
                </p>
              </div>
              <Button
                type="primary"
                size="large"
                onClick={() => {
                  setShowLargeTable(true);
                  addLog(`📊 顯示大型表格 (${totalRows} 局)`);
                }}
              >
                📊 顯示完整表格 ({totalRows} 局)
              </Button>
            </Card>
          </div>
        ) : (
          <div className="table-view-content">
            <Card className="table-view-card">
              {isLargeTable && showLargeTable && (
                <div style={{ marginBottom: "16px", textAlign: "center" }}>
                  <Button
                    onClick={() => {
                      setShowLargeTable(false);
                      addLog(`📊 隱藏大型表格 (${totalRows} 局)`);
                    }}
                    style={{ marginBottom: "16px" }}
                  >
                    📈 隱藏表格
                  </Button>
                </div>
              )}
              <Table
                className="table-view-table"
                columns={columns}
                dataSource={tableData}
                pagination={
                  pagination.totalPages > 1
                    ? {
                        current: pagination.page,
                        pageSize: pagination.pageSize,
                        total: pagination.total,
                        showSizeChanger: false,
                        showQuickJumper: true,
                        showTotal: (total, range) =>
                          `${range[0]}-${range[1]} of ${total} games`,
                        onChange: async (page) => {
                          try {
                            addLog(
                              `📋 Loading page ${page} for play ${tableViewData.playNumber}...`
                            );
                            const newData = await BaccaratAPI.getPlayGames(
                              simulationId,
                              tableViewData.playNumber,
                              page,
                              pagination.pageSize,
                              addLog
                            );
                            setTableViewData(newData);
                          } catch (error) {
                            console.error("Error loading page:", error);
                            addLog(`❌ Error loading page: ${error.message}`);
                          }
                        },
                      }
                    : false
                }
              />
            </Card>
          </div>
        )}
      </div>
    );
  }

  // Detailed View
  if (showDetailedView && detailedViewData) {
    // Calculate consecutive wins data from the current play (find the play that contains this game)
    let currentPlayData = tableViewData; // Use the current play data from table view
    if (!currentPlayData && detailedViewData.playNumber) {
      // Fallback: find the play data from gameResults if not available
      currentPlayData = gameResults.find(
        (play) => play.playNumber === detailedViewData.playNumber
      );
    }

    // Ensure data is in correct format for analyzeConsecutiveWins function
    let dataForAnalysis;
    if (currentPlayData) {
      // If we have play data, wrap it in array for the function
      dataForAnalysis = [currentPlayData];
    } else if (detailedViewData.hands) {
      // If we only have a single game with hands, use it directly
      dataForAnalysis = detailedViewData;
    } else {
      // Fallback: create a minimal structure
      dataForAnalysis = [];
    }

    const currentPlayConsecutiveWinsData =
      analyzeConsecutiveWins(dataForAnalysis);

    return (
      <div className="detailed-view-container">
        <div className="detailed-view-header">
          <button onClick={onBackToTable} className="back-button">
            ← 返回表格
          </button>
          <h3>第{detailedViewData.gameNumber}局 - 詳細結果</h3>
        </div>
        <div className="detailed-view-content">
          <RoadTwo gameResults={detailedViewData} />
          <RoadOne gameResults={detailedViewData} />

          <div className="hands-list">
            {detailedViewData.hands.map((hand) => {
              // Check for banker pair
              const hasBankerPair =
                hand.bankerCards.length >= 2 &&
                hand.bankerCards[0].value === hand.bankerCards[1].value;

              // Check for player pair
              const hasPlayerPair =
                hand.playerCards.length >= 2 &&
                hand.playerCards[0].value === hand.playerCards[1].value;

              return (
                <div key={hand.handNumber} className="hand-detail">
                  <div className="hand-header">
                    <span className="hand-number">第{hand.handNumber}手</span>
                    <div className="hand-results">
                      <span
                        className={`hand-result ${hand.result.toLowerCase()}`}
                      >
                        {hand.result} 贏
                      </span>
                      {hasBankerPair && (
                        <span className="hand-result banker-pair">莊對</span>
                      )}
                      {hasPlayerPair && (
                        <span className="hand-result player-pair">閑對</span>
                      )}
                    </div>
                  </div>
                  <div className="hand-cards">
                    <div className="player-cards">
                      <span className="cards-label">
                        閑: {hand.playerTotal}點
                      </span>
                      <div className="cards-images">
                        {hand.playerCards.map((card, index) => {
                          const imagePath = getCardImagePath(card);
                          return imagePath ? (
                            <img
                              key={index}
                              src={imagePath}
                              alt={`${card.value}${card.suit}`}
                              className="card-image"
                            />
                          ) : null;
                        })}
                      </div>
                    </div>
                    <div className="banker-cards">
                      <span className="cards-label">
                        莊: {hand.bankerTotal}點
                      </span>
                      <div className="cards-images">
                        {hand.bankerCards.map((card, index) => {
                          const imagePath = getCardImagePath(card);
                          return imagePath ? (
                            <img
                              key={index}
                              src={imagePath}
                              alt={`${card.value}${card.suit}`}
                              className="card-image"
                            />
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <MatchingData
            matchingData={currentPlayConsecutiveWinsData}
            gameResults={currentPlayData || detailedViewData}
          />
        </div>
      </div>
    );
  }

  // PlayCard View (default)
  return (
    <Flex className="desc">
      <div className="play-card-container">
        {playCardsData.map((playData) => (
          <PlayCard
            key={playData.playNumber}
            title={`Play ${playData.playNumber}`}
            initialState={playData.state}
            onClick={() => onCardClick(playData)}
            playData={playData}
          />
        ))}
      </div>
    </Flex>
  );
};

const Playground = () => {
  const { addLog, clearLogs } = useContext(LogContext);
  const [gameResults, setGameResults] = useState([]);
  const [playCardsData, setPlayCardsData] = useState([]);
  const [showTableView, setShowTableView] = useState(false);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [tableViewData, setTableViewData] = useState(null);
  const [detailedViewData, setDetailedViewData] = useState(null);
  const [simulationId, setSimulationId] = useState(null);
  const [consecutiveWinsCache, setConsecutiveWinsCache] = useState({});
  const [optimizationLevel, setOptimizationLevel] = useState('standard');
  const [simulationTiming, setSimulationTiming] = useState(null);

  const handleGameStart = (plays, gameResultsData, playCardsData, simId, optLevel, totalGames, timing) => {
    console.log('Received game results:', gameResultsData);
    console.log('Optimization level:', optLevel);
    console.log('Timing info:', timing);
    
    // Reset views
    setShowTableView(false);
    setShowDetailedView(false);
    setTableViewData(null);
    setDetailedViewData(null);
    setConsecutiveWinsCache({}); // Clear cache

    // Store simulation info
    setSimulationId(simId);
    setOptimizationLevel(optLevel);
    setSimulationTiming(timing);
    
    // Create enhanced play cards data with timing information
    const enhancedPlayCardsData = playCardsData.map((playCard, index) => {
      const playData = gameResultsData.find(result => result.playNumber === playCard.playNumber);
      return {
        ...playCard,
        timing: timing,
        optimizationLevel: optLevel,
        totalGames: playData ? playData.games.length : 0,
        totalPlays: plays
      };
    });
    
    setPlayCardsData(enhancedPlayCardsData);
    setGameResults(gameResultsData);
    
    if (optLevel === 'ultra-fast') {
      addLog(`⚡ ULTRA-FAST in-memory simulation completed with ${gameResultsData.length} plays (${totalGames} games)`);
      addLog(`🚀 All data computed in-memory - no database operations performed!`);
      if (timing) {
        addLog(`⏱️ Execution time: ${timing.duration}s (${timing.handsPerSecond} hands/second)`);
      }
    } else if (optLevel === 'mega') {
      addLog(`🚀 MEGA-optimized simulation completed with ${gameResultsData.length} plays (${totalGames} games)`);
      addLog(`⚡ Consecutive wins analysis pre-computed - no additional loading needed!`);
      if (timing) {
        addLog(`⏱️ Execution time: ${timing.duration}s (${timing.handsPerSecond} hands/second)`);
      }
    } else {
      addLog(`✅ Optimized simulation completed with ${gameResultsData.length} plays (detailed data loads on-demand)`);
      if (timing) {
        addLog(`⏱️ Execution time: ${timing.duration}s (${timing.handsPerSecond} hands/second)`);
      }
    }
  };

  const handleCardClick = async (playData) => {
    if (playData.state === "finish") {
      try {
        addLog(`📋 Loading detailed data for play ${playData.playNumber}...`);
        
        if (optimizationLevel === 'ultra-fast') {
          // Ultra-fast mode: use in-memory data
          const playResult = gameResults.find(result => result.playNumber === playData.playNumber);
          
          if (playResult) {
            // Convert in-memory data to table format
            const tableData = playResult.games.map((game, index) => {
              const totalHands = game.totalHands;
              const bankerWins = game.bankerWins;
              const playerWins = game.playerWins;
              const tieWins = game.tieWins;
              const bankerPairs = game.bankerPairs;
              const playerPairs = game.playerPairs;
              
              return {
                key: index + 1,
                gameNumber: game.gameNumber,
                gameId: `memory_${playData.playNumber}_${game.gameNumber}`, // Fake ID for ultra-fast mode
                totalHands: totalHands,
                bankerWins: `${bankerWins} (${
                  totalHands > 0 ? ((bankerWins / totalHands) * 100).toFixed(1) : 0
                }%)`,
                playerWins: `${playerWins} (${
                  totalHands > 0 ? ((playerWins / totalHands) * 100).toFixed(1) : 0
                }%)`,
                tieWins: `${tieWins} (${
                  totalHands > 0 ? ((tieWins / totalHands) * 100).toFixed(1) : 0
                }%)`,
                bankerPair: `${bankerPairs} (${
                  totalHands > 0 ? ((bankerPairs / totalHands) * 100).toFixed(1) : 0
                }%)`,
                playerPair: `${playerPairs} (${
                  totalHands > 0 ? ((playerPairs / totalHands) * 100).toFixed(1) : 0
                }%)`,
                rawData: {
                  totalHands,
                  bankerWins,
                  playerWins,
                  tieWins,
                  bankerPairs,
                  playerPairs
                }
              };
            });
            
            const ultraFastTableData = {
              playNumber: playData.playNumber,
              tableData: tableData,
              consecutiveWinsData: playResult.consecutiveWinsData, // Pre-computed in ultra-fast mode!
              games: playResult.games,
              pagination: {
                page: 1,
                pageSize: playResult.games.length,
                total: playResult.games.length,
                totalPages: 1,
                hasMore: false
              }
            };
            
            setTableViewData(ultraFastTableData);
            setShowTableView(true);
            setShowDetailedView(false);
            
            addLog(`⚡ Ultra-fast: Loaded ${playResult.games.length} games for play ${playData.playNumber} (from memory)`);
          } else {
            addLog(`❌ No data found for play ${playData.playNumber} in ultra-fast mode`);
          }
        } else {
          // Standard/mega mode: load from database
          const detailedPlayData = await BaccaratAPI.getPlayGames(simulationId, playData.playNumber, 1, 1000, addLog);
          
          setTableViewData(detailedPlayData);
          setShowTableView(true);
          setShowDetailedView(false);
          
          addLog(`✅ Loaded ${detailedPlayData.games.length} games for play ${playData.playNumber}`);
        }
      } catch (error) {
        console.error('Error loading play data:', error);
        addLog(`❌ Error loading play data: ${error.message}`);
      }
    }
  };

  const handleViewGameDetail = async (gameData) => {
    try {
      addLog(`Loading detailed data for game ${gameData.gameNumber}...`);
      
      // Check if hands data is already available in gameData
      if (gameData.hands && gameData.hands.length > 0) {
        // Use existing hands data
        setDetailedViewData(gameData);
        setShowDetailedView(true);
        setShowTableView(false);
        addLog(`Loaded ${gameData.hands.length} hands for game ${gameData.gameNumber}`);
      } else {
        // Load hands from backend API as fallback
        const handsResponse = await BaccaratAPI.getGameHands(gameData.gameId);
        
        // Convert backend hands format to frontend format
        const convertedHands = handsResponse.hands.map(hand => ({
          handNumber: hand.hand_number,
          result: hand.result,
          playerTotal: hand.player_total,
          bankerTotal: hand.banker_total,
          playerCards: hand.player_cards,
          bankerCards: hand.banker_cards,
          bankerPair: hand.banker_pair,
          playerPair: hand.player_pair
        }));
        
        const detailedGameData = {
          ...gameData,
          hands: convertedHands
        };
        
        setDetailedViewData(detailedGameData);
        setShowDetailedView(true);
        setShowTableView(false);
        
        addLog(`Loaded ${convertedHands.length} hands for game ${gameData.gameNumber}`);
      }
    } catch (error) {
      console.error('Error loading game details:', error);
      addLog(`Error loading game details: ${error.message}`);
    }
  };

  const handleBackToPlays = () => {
    setShowTableView(false);
    setShowDetailedView(false);
    setTableViewData(null);
    setDetailedViewData(null);
  };

  const handleBackToTable = () => {
    setShowDetailedView(false);
    setDetailedViewData(null);
    setShowTableView(true);
  };

  const handleResetGame = () => {
    setGameResults([]);
    setPlayCardsData([]);
    setShowTableView(false);
    setShowDetailedView(false);
    setTableViewData(null);
    setDetailedViewData(null);
    setSimulationId(null);
    setConsecutiveWinsCache({});
  };

  return (
    <Splitter layout="vertical" className="playground-container">
      <Splitter.Panel>
        <View
          gameResults={gameResults}
          playCardsData={playCardsData}
          onCardClick={handleCardClick}
          showTableView={showTableView}
          showDetailedView={showDetailedView}
          tableViewData={tableViewData}
          detailedViewData={detailedViewData}
          onBackToPlays={handleBackToPlays}
          onBackToTable={handleBackToTable}
          onViewGameDetail={handleViewGameDetail}
          simulationId={simulationId}
          consecutiveWinsCache={consecutiveWinsCache}
          setConsecutiveWinsCache={setConsecutiveWinsCache}
          addLog={addLog}
        />
      </Splitter.Panel>
      <Splitter.Panel max="20%" min="10%" defaultSize="20%">
        <BetArea onGameStart={handleGameStart} onResetGame={handleResetGame} />
      </Splitter.Panel>
    </Splitter>
  );
};

export default Playground;
