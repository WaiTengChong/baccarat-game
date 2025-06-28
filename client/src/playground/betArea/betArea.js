import { Button, InputNumber, message, Progress, Select, Space, Typography } from 'antd';
import React, { useContext, useState } from 'react';
import { LogContext } from "../../Terminal/LongContext";
import BaccaratAPI from "../../services/api";
import "./betArea.css";

const { Text, Title } = Typography;

// Helper function to convert backend results to frontend format
function convertBackendResultsToFrontend(backendResults) {
  // Group games by play number
  const groupedByPlay = backendResults.games.reduce((acc, game) => {
    if (!acc[game.play_number]) {
      acc[game.play_number] = [];
    }
    acc[game.play_number].push(game);
    return acc;
  }, {});

  // Convert to expected frontend format
  return Object.keys(groupedByPlay).map(playNumber => ({
    playNumber: parseInt(playNumber),
    games: groupedByPlay[playNumber].map(game => ({
      gameNumber: game.game_number,
      gameId: game.id,
      // Include the backend statistics
      totalHands: game.total_hands,
      bankerWins: game.banker_wins,
      playerWins: game.player_wins,
      tieWins: game.tie_wins,
      bankerPairs: game.banker_pairs,
      playerPairs: game.player_pairs,
      hands: [] // Hands will be loaded separately when needed
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
      // Start simulation on backend with logging
      const startResponse = await BaccaratAPI.startSimulation(
        plays, 
        gamesPerPlay, 
        handsPerGame, 
        deckCount,
        addLog  // Pass the logger
      );
      
      setSimulationStatus('Simulation running...');
      
      // Poll for completion with progress updates and logging
      const results = await BaccaratAPI.pollSimulationUntilComplete(
        startResponse.simulationId,
        (statusUpdate) => {
          setProgress(statusUpdate.progress || 0);
          setSimulationStatus(`Progress: ${statusUpdate.progress || 0}%`);
        },
        addLog  // Pass the logger
      );
      
      setSimulationStatus('Simulation completed!');
      
      // Convert backend results to frontend format
      const frontendResults = convertBackendResultsToFrontend(results);
      
      // Create play cards data for the UI
      const newPlayCardsData = frontendResults.map(playData => ({
        ...playData,
        state: 'finish' // Mark as finished since backend simulation is complete
      }));
      
      // Pass results to parent component
      onGameStart(plays, frontendResults, newPlayCardsData);
      
    } catch (error) {
      console.error('Simulation error:', error);
      message.error(`Simulation failed: ${error.message}`);
      addLog(`Simulation failed: ${error.message}`);
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
