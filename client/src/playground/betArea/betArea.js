import { Button, InputNumber, message, Progress, Select, Space, Typography } from 'antd';
import React, { useContext, useState } from 'react';
import { LogContext } from "../../Terminal/LongContext";
import BaccaratAPI from "../../services/api";
import "./betArea.css";

const { Text, Title } = Typography;

// Helper function to convert new API results to frontend format
function convertNewAPIResultsToFrontend(apiResponse) {
  // The new API returns results directly in the response.results array
  // Each item in results array is a play with games array, each game has hands array
  if (!apiResponse.results || !Array.isArray(apiResponse.results)) {
    console.error('Invalid API response structure:', apiResponse);
    return [];
  }

  return apiResponse.results.map(playData => ({
    playNumber: playData.playNumber,
    games: playData.games.map(game => ({
      gameNumber: game.gameNumber,
      gameId: game.gameId,
      totalHands: game.totalHands,
      bankerWins: game.bankerWins,
      playerWins: game.playerWins,
      tieWins: game.tieWins,
      bankerPairs: game.bankerPairs,
      playerPairs: game.playerPairs,
      hands: game.hands // Full hands data is now included
    }))
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

  const handlePlay = async () => {
    console.log('Starting game with:', {
      plays,
      gamesPerPlay,
      handsPerGame,
      deckCount
    });

    clearLogs();
    addLog(`運行 ${plays}, 局數 ${gamesPerPlay}, 手 ${handsPerGame}`);
    
    setIsPlaying(true);
    setProgress(0);
    setSimulationStatus('Starting simulation...');
    
    try {
      // Start simulation on backend with logging - now returns complete data
      addLog(`🚀 Starting simulation: ${plays} plays, ${gamesPerPlay} games/play, ${handsPerGame} hands/game, ${deckCount} decks`);
      setSimulationStatus('Running simulation...');
      setProgress(50); // Show some progress
      
      const response = await BaccaratAPI.startSimulation(
        plays, 
        gamesPerPlay, 
        handsPerGame, 
        deckCount,
        addLog  // Pass the logger
      );
      
      console.log('API Response:', response);
      
      setProgress(100);
      setSimulationStatus('Simulation completed!');
      
      // Convert new API results to frontend format
      const frontendResults = convertNewAPIResultsToFrontend(response);
      
      // Create play cards data for the UI
      const newPlayCardsData = frontendResults.map(playData => ({
        ...playData,
        state: 'finish' // Mark as finished since simulation is complete
      }));
      
      // Log completion
      const totalHands = frontendResults.reduce((total, play) => 
        total + play.games.reduce((gameTotal, game) => 
          gameTotal + game.hands.length, 0), 0);
      
      addLog(`✅ Simulation completed with ${frontendResults.length} plays and ${totalHands} total hands`);
      
      // Pass results to parent component
      onGameStart(plays, frontendResults, newPlayCardsData);
      
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
        <Select
          value={deckCount}
          onChange={(value) => setDeckCount(value)}
          className="control-input"
          disabled={isPlaying}
          style={{ width: 80 }}
        >
          <Select.Option value={6}>6</Select.Option>
          <Select.Option value={7}>7</Select.Option>
          <Select.Option value={8}>8</Select.Option>
        </Select>
        </div>
        <div className="control-group">
          <Text className="control-label">運行:</Text>
          <InputNumber
            min={1}
            max={5}
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
            max={100000}
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
            max={70}
            value={handsPerGame}
            onChange={(value) => setHandsPerGame(value || 1)}
            className="control-input"
            disabled={isPlaying}
          />
        </div>
        
        <Button
          type="primary"
          size="large"
          onClick={handlePlay}
          className="play-button"
          loading={isPlaying}
          disabled={isPlaying}
        >
          {isPlaying ? '運行中...' : '運行'}
        </Button>
        
        {isPlaying && (
          <div className="simulation-progress">
            <Progress 
              percent={progress} 
              status={progress === 100 ? 'success' : 'active'}
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
