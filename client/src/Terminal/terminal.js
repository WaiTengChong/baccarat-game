// TerminalSidebar.js
import React, { useContext, useEffect, useRef } from 'react';
import { LogContext } from './LongContext';

function TerminalSidebar() {
  const { logs } = useContext(LogContext);
  const terminalRef = useRef(null);

  // Scroll to the bottom whenever logs update
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div
      ref={terminalRef}
      style={{
        backgroundColor: 'black',
        color: 'green',
        fontFamily: 'monospace',
        height: '100vh',
        width: '100%',
        overflowY: 'auto',
        padding: '10px',
      }}
    >
      {logs.map((log, index) => (
        <p key={index} style={{ margin: 0 }}>
          &gt; {log}
        </p>
      ))}
    </div>
  );
}

export default TerminalSidebar;