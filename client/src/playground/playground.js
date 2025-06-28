import { Card, Flex, Space, Splitter, Table } from "antd";
import React, { useContext, useState } from "react";
import { cardImages } from "../components/CardImages";
import BaccaratAPI from "../services/api";
import { LogContext } from "../Terminal/LongContext";
import BetArea from "./betArea/betArea";
import RoadOne from "./gameboard/roadone/roadone";
import RoadTwo from "./gameboard/roadtwo/roadtwo";
import MatchingData from "./matchingData/matchingData";
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
}) => {
  // Generate table data based on the selected play
  const generateTableData = (playData) => {
    if (!playData || !playData.games) return [];

    return playData.games.map((game, index) => {
      // Calculate statistics for each game
      const totalHands = game.hands.length;
      const bankerWins = game.hands.filter(
        (hand) => hand.result === "Banker"
      ).length;
      const playerWins = game.hands.filter(
        (hand) => hand.result === "Player"
      ).length;
      const bankerPair = game.hands.filter(
        (hand) => hand.result === "Banker Pair"
      ).length;
      const playerPair = game.hands.filter(
        (hand) => hand.result === "Player Pair"
      ).length;
      const tieWins = bankerPair + playerPair;

      // Calculate pairs
      const bankerPairs = game.hands.filter((hand) => {
        const bankerCards = hand.bankerCards;
        return (
          bankerCards.length >= 2 &&
          bankerCards[0].value === bankerCards[1].value
        );
      }).length;

      const playerPairs = game.hands.filter((hand) => {
        const playerCards = hand.playerCards;
        return (
          playerCards.length >= 2 &&
          playerCards[0].value === playerCards[1].value
        );
      }).length;

      return {
        key: index + 1,
        gameNumber: game.gameNumber,
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
        gameData: game,
      };
    });
  };

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
          <a onClick={() => onViewGameDetail(record.gameData)}>查看</a>
        </Space>
      ),
    },
  ];

  // Table View
  if (showTableView && tableViewData) {
    const tableData = generateTableData(tableViewData);
    // Calculate consecutive wins data from ALL games instead of just current play
    const allGamesConsecutiveWinsData = analyzeConsecutiveWins(gameResults);

    return (
      <div className="table-view-container">
        <Card className="table-view-card">
          <div className="table-view-header">
            <button onClick={onBackToPlays} className="back-button">
              ← 返回
            </button>
            <h3>第{tableViewData.playNumber}局 - 遊戲統計</h3>
          </div>
        </Card>
        <MatchingData matchingData={allGamesConsecutiveWinsData} />
        <div className="table-view-content">
          <Card className="table-view-card">
            <Table
              className="table-view-table"
              columns={columns}
              dataSource={tableData}
              pagination={false}
            />
          </Card>
        </div>
      </div>
    );
  }

  // Detailed View
  if (showDetailedView && detailedViewData) {
    // Calculate consecutive wins data from ALL games instead of just current game
    const allGamesConsecutiveWinsData = analyzeConsecutiveWins(gameResults);

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

  const handleGameStart = (plays, gameResultsData, playCardsData) => {
    console.log('Received game results:', gameResultsData);
    
    // Reset views
    setShowTableView(false);
    setShowDetailedView(false);
    setTableViewData(null);
    setDetailedViewData(null);

    // Use the playCardsData passed from BetArea (already marked as 'finish')
    setPlayCardsData(playCardsData || []);
    setGameResults(gameResultsData);
    
    addLog(`Simulation completed with ${gameResultsData.length} plays`);
  };

  const handleCardClick = (playData) => {
    if (playData.state === "finish") {
      const selectedPlayData = gameResults.find(
        (result) => result.playNumber === playData.playNumber
      );
      setTableViewData(selectedPlayData);
      setShowTableView(true);
      setShowDetailedView(false);
    }
  };

  const handleViewGameDetail = async (gameData) => {
    try {
      addLog(`Loading detailed data for game ${gameData.gameNumber}...`);
      
      // Load hands from backend API
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
        />
      </Splitter.Panel>
      <Splitter.Panel max="20%" min="10%" defaultSize="20%">
        <BetArea onGameStart={handleGameStart} onResetGame={handleResetGame} />
      </Splitter.Panel>
    </Splitter>
  );
};

export default Playground;
