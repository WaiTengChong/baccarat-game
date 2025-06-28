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

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <LogContext.Provider value={{ logs, addLog, clearLogs }}>
      {children}
    </LogContext.Provider>
  );
}