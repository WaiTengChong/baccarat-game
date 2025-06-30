// LogContext.js
import React, { createContext, useState } from 'react';

// Create the context
export const LogContext = createContext();

// Provider component to manage logs
export function LogProvider({ children }) {
  const [logs, setLogs] = useState([]);

  // Function to add a new log with a timestamp
  const addLog = async (message) => {
    const timestamp = new Date().toLocaleTimeString();
    // Add small delay before adding log
    await new Promise(resolve => setTimeout(resolve, 100));
    setLogs((prevLogs) => [...prevLogs, `[${timestamp}] \n ${message}`]);
  };

  // Function specifically for skipped cards logging
  const addSkippedCardsLog = async (playNumber, gameNumber, skippedCards) => {
    const timestamp = new Date().toLocaleTimeString();
    const message = `🎴 第${playNumber}局 第${gameNumber}遊戲 飛牌: ${skippedCards.join(', ')}`;
    await new Promise(resolve => setTimeout(resolve, 100));
    setLogs((prevLogs) => [...prevLogs, `[${timestamp}] \n ${message}`]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <LogContext.Provider value={{ logs, addLog, addSkippedCardsLog, clearLogs }}>
      {children}
    </LogContext.Provider>
  );
}