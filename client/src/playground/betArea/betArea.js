import { Button, InputNumber, message, Progress, Select, Space, Switch, Typography } from 'antd';
import React, { useContext, useState } from 'react';
import { LogContext } from "../../Terminal/LongContext";
import BaccaratAPI from "../../services/api";
import "./betArea.css";

const { Text, Title } = Typography;

// Helper function to convert optimized API results to frontend format
function convertOptimizedAPIResultsToFrontend(apiResponse) {
  // The API returns either standard optimized or mega-optimized data
  if (!apiResponse.results || !Array.isArray(apiResponse.results)) {
    console.error('Invalid API response structure:', apiResponse);
    return [];
  }

  return apiResponse.results.map(playData => ({
    playNumber: playData.playNumber,
    games: playData.games.map(game => ({
      gameNumber: game.gameNumber,
      gameId: game.gameId || null, // May not be present in summary data
      totalHands: game.totalHands,
      bankerWins: game.bankerWins,
      playerWins: game.playerWins,
      tieWins: game.tieWins,
      bankerPairs: game.bankerPairs,
      playerPairs: game.playerPairs,
      // No hands data in optimized response - will be loaded on-demand
      skippedCards: game.skippedCards || [] // Include skipped cards data if available
    })),
    // Include pre-computed consecutive wins data if available (mega mode)
    consecutiveWinsData: playData.consecutiveWinsData || null
  }));
}

const BetArea = ({ onGameStart, onResetGame }) => {
  const [plays, setPlays] = useState(1);
  const [gamesPerPlay, setGamesPerPlay] = useState(10);
  const [handsPerGame, setHandsPerGame] = useState(70);
  const [isPlaying, setIsPlaying] = useState(false);
  const [deckCount, setDeckCount] = useState(8);
  const [progress, setProgress] = useState(0);
  const [simulationStatus, setSimulationStatus] = useState('');
  const { addLog, clearLogs } = useContext(LogContext);
  const [skipCard, setSkipCard] = useState(10);
  const [useInMemory, setUseInMemory] = useState(true); // Default to ultra-fast mode
  const [isContinuousMode, setIsContinuousMode] = useState(false); // New continuous mode toggle
  const [smallCardReduction, setSmallCardReduction] = useState(0); // 1-4減少
  const [bigCardReduction, setBigCardReduction] = useState(0); // 5-9減少

  const handlePlay = async () => {
    console.log('Starting game with:', {
      plays,
      gamesPerPlay,
      handsPerGame,
      deckCount,
      skipCard,
      useInMemory,
      isContinuousMode,
      smallCardReduction,
      bigCardReduction
    });

    clearLogs();
    const modeDescription = isContinuousMode ? '連貫模式 (無手數限制)' : '標準模式';
    const cardReductionText = (smallCardReduction > 0 || bigCardReduction > 0) ? `, 1-4減少 ${smallCardReduction}%, 5-9減少 ${bigCardReduction}%` : '';
    addLog(`運行 ${plays}, 局數 ${gamesPerPlay}, 手 ${handsPerGame}, 飛牌數 ${skipCard}${cardReductionText}, ${useInMemory ? '超快記憶體模式' : '資料庫模式'}, ${modeDescription}`);
    
    setIsPlaying(true);
    setProgress(0);
    setSimulationStatus('Starting simulation...');
    
    try {
      // Start simulation on backend with logging - now returns complete data
      const modeText = useInMemory ? 'ultra-fast in-memory mode' : 'database mode';
      const continuousText = isContinuousMode ? ' (continuous)' : '';
      const cardReductionDetail = (smallCardReduction > 0 || bigCardReduction > 0) ? `, 1-4减少 ${smallCardReduction}%, 5-9减少 ${bigCardReduction}%` : '';
      addLog(`🚀 Starting simulation in ${modeText}${continuousText}: ${plays} plays, ${gamesPerPlay} games/play, ${handsPerGame} hands/game, ${deckCount} decks, skip ${skipCard} cards${cardReductionDetail}`);
      setSimulationStatus('Running simulation...');
      setProgress(50); // Show some progress
      
      const response = await BaccaratAPI.startSimulation(
        plays, 
        gamesPerPlay, 
        handsPerGame, 
        deckCount,
        skipCard,
        useInMemory, // Pass the in-memory flag
        isContinuousMode, // Pass the continuous mode flag
        addLog,  // Pass the logger
        smallCardReduction, // Pass 1-4減少 setting
        bigCardReduction // Pass 5-9減少 setting
      );
      
      console.log('API Response:', response);
      
      // Log skipped cards if any (from optimized response)
      if (response.results && Array.isArray(response.results)) {
        response.results.forEach(play => {
          if (play.games && Array.isArray(play.games)) {
            play.games.forEach(game => {
              if (game.skippedCards && Array.isArray(game.skippedCards) && game.skippedCards.length > 0) {
                addLog(`🎴 第${play.playNumber}局 第${game.gameNumber}遊戲 飛牌: ${game.skippedCards.join(', ')}`);
              }
            });
          }
        });
      }
      
      setProgress(100);
      setSimulationStatus('Simulation completed!');
      
      // Convert optimized API results to frontend format
      const frontendResults = convertOptimizedAPIResultsToFrontend(response);
      
      // Create play cards data for the UI
      const newPlayCardsData = frontendResults.map(playData => ({
        ...playData,
        state: 'finish' // Mark as finished since simulation is complete
      }));
      
      // Log completion - use totalHands from summary data since hands array is not available
      const totalHands = frontendResults.reduce((total, play) => 
        total + play.games.reduce((gameTotal, game) => 
          gameTotal + (game.totalHands || 0), 0), 0);
      
      const optimizationText = response.optimizationLevel === 'ultra-fast' ? 'ULTRA-FAST (no database)' : response.optimizationLevel;
      const continuousModeText = response.isContinuousMode ? ' (連貫模式)' : '';
      addLog(`✅ Simulation completed with ${frontendResults.length} plays and ${totalHands} total hands using ${optimizationText} mode${continuousModeText}`);
      
      // Extract timing information from API response
      const timingInfo = response.timing || null;
      if (timingInfo) {
        addLog(`⏱️ Performance: ${timingInfo.duration}s execution time (${timingInfo.handsPerSecond} hands/second)`);
      }
      
      // Pass results to parent component including simulation ID, optimization info, timing, and simulation settings
      onGameStart(plays, frontendResults, newPlayCardsData, response.simulationId, response.optimizationLevel, response.totalGames, timingInfo, {
        deckCount,
        gamesPerPlay,
        handsPerGame,
        skipCard,
        useInMemory,
        isContinuousMode,
        smallCardReduction,
        bigCardReduction
      });
      
    } catch (error) {
      console.error('Simulation error:', error);
      message.error(`Simulation failed: ${error.message}`);
      addLog(`❌ Simulation failed: ${error.message}`);
      setSimulationStatus('Simulation failed');
    }
    
    setIsPlaying(false);
    setProgress(0);
  };

  const handleReset = () => {
    onResetGame();
    setIsPlaying(false);
    clearLogs();
  };

  return (
    <div className="bet-area-container">
      <Space size="large" className="bet-controls">
        <div className="control-group">
          <Text className="control-label">SHOES數:</Text>
                          <InputNumber
          min={1}
          max={1000000}
          value={deckCount}
          onChange={(value) => {
            const newDeckCount = value || 8;
            setDeckCount(newDeckCount);
            // Auto-adjust hands per game based on deck count (8.75 hands per deck)
            const newHandsPerGame = Math.round(newDeckCount * 8.75);
            setHandsPerGame(newHandsPerGame);
          }}
          className="control-input"
          disabled={isPlaying}
          style={{ width: 80 }}
        />
        </div>
        <div className="control-group">
          <Text className="control-label">運行:</Text>
          <InputNumber
            min={1}
            max={10}
            value={plays}
            onChange={(value) => setPlays(value || 1)}
            className="control-input"
            disabled={isPlaying}
          />
        </div>

        <div className="control-group">
          <Text className="control-label">局數:</Text>
          <InputNumber
            min={1}
            max={10000000000000}
            value={gamesPerPlay}
            onChange={(value) => setGamesPerPlay(value || 1)}
            className="control-input"
            disabled={isPlaying}
          />
        </div>

        <div className="control-group">
          <Text className="control-label">手:</Text>
          <InputNumber
            min={1}
            max={10000000000000}
            value={handsPerGame}
            onChange={(value) => setHandsPerGame(value || 1)}
            className="control-input"
            disabled={isPlaying}
          />
        </div>

        <div className="control-group">
          <Text className="control-label">飛牌數:</Text>
          <InputNumber
            min={0}
            max={10}
            value={skipCard}
            onChange={(value) => setSkipCard(value || 0)}
            className="control-input"
            disabled={isPlaying}
          />
        </div>

        <div className="control-group">
          <Text className="control-label">1-4減少:</Text>
          <Select
            value={smallCardReduction}
            onChange={(value) => setSmallCardReduction(value)}
            className="control-input"
            disabled={isPlaying}
            style={{ width: 80 }}
          >
            <Select.Option value={0}>0%</Select.Option>
            <Select.Option value={10}>10%</Select.Option>
            <Select.Option value={20}>20%</Select.Option>
            <Select.Option value={30}>30%</Select.Option>
          </Select>
        </div>

        <div className="control-group">
          <Text className="control-label">5-9減少:</Text>
          <Select
            value={bigCardReduction}
            onChange={(value) => setBigCardReduction(value)}
            className="control-input"
            disabled={isPlaying}
            style={{ width: 80 }}
          >
            <Select.Option value={0}>0%</Select.Option>
            <Select.Option value={10}>10%</Select.Option>
            <Select.Option value={20}>20%</Select.Option>
            <Select.Option value={30}>30%</Select.Option>
          </Select>
        </div>

        <div className="control-group">
          <Text className="control-label">模式:</Text>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Switch
              checked={useInMemory}
              onChange={(checked) => setUseInMemory(checked)}
              disabled={isPlaying}
              checkedChildren="⚡"
              unCheckedChildren="💾"
            />
            <Text
              style={{
                fontSize: "10px",
                marginTop: "4px",
                textAlign: "center",
              }}
            >
              {useInMemory ? "超快記憶體" : "資料庫儲存"}
            </Text>
          </div>
        </div>

        <div className="control-group">
          <Text className="control-label">遊戲模式:</Text>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Switch
              checked={isContinuousMode}
              onChange={(checked) => setIsContinuousMode(checked)}
              disabled={isPlaying}
              checkedChildren="🔗"
              unCheckedChildren="🎯"
            />
            <Text
              style={{
                fontSize: "10px",
                marginTop: "4px",
                textAlign: "center",
              }}
            >
              {isContinuousMode ? "連貫模式" : "標準模式"}
            </Text>
          </div>
        </div>

        <Button
          type="primary"
          size="large"
          onClick={handlePlay}
          className="play-button"
          loading={isPlaying}
          disabled={isPlaying}
        >
          {isPlaying ? "運行中..." : "運行"}
        </Button>

        {isPlaying && (
          <div className="simulation-progress">
            <Progress
              percent={progress}
              status={progress === 100 ? "success" : "active"}
              style={{ width: 200 }}
            />
            <Text style={{ marginLeft: 10, fontSize: 12 }}>
              {simulationStatus}
            </Text>
          </div>
        )}

        <Button
          size="large"
          onClick={handleReset}
          className="reset-button"
          disabled={isPlaying}
        >
          重置
        </Button>
      </Space>
    </div>
  );
};

export default BetArea;

