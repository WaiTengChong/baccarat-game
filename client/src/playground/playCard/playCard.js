// client/src/playCard/playCard.js
import React, { useEffect, useState } from 'react';
import './playCard.css';

const PlayCard = ({ title, initialState = 'idle', onClick, playData }) => {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    setState(initialState);
  }, [initialState]);

  const handleClick = () => {
    // Only allow clicks when in finish state
    if (state === 'finish' && onClick) {
      onClick(playData);
    }
  };

  const renderContent = () => {
    switch (state) {
      case 'loading':
        return <div className="loading-spinner"></div>;
      case 'finish':
        return (
          <div className="finish-content">
            <div className="finish-icon">✓</div>
            {playData && playData.timing && (
              <div className="timing-info">
                <div className="timing-duration">
                  ⏱️ {playData.timing.duration}s
                </div>
                <div className="timing-speed">
                  🚀 {playData.timing.handsPerSecond} hands/sec
                </div>
              </div>
            )}
            {playData && (
              <div className="play-stats">
                <div className="stat-item">
                  🎮 {playData.totalGames} games
                </div>
                {playData.optimizationLevel && (
                  <div className="optimization-badge">
                    {playData.optimizationLevel === 'ultra-fast' && '⚡ Ultra-Fast'}
                    {playData.optimizationLevel === 'mega' && '🚀 Mega'}
                    {playData.optimizationLevel === 'standard' && '🔧 Standard'}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      default:
        return <div className="idle-content">Ready</div>;
    }
  };

  const getStateClass = () => {
    return state;
  };

  return (
    <div 
      className={`play-card ${getStateClass()}`} 
      onClick={handleClick}
      style={{ 
        cursor: state === 'finish' ? 'pointer' : 'default',
        pointerEvents: state === 'loading' ? 'none' : 'auto'
      }}
    >
      <div className="play-title">{title}</div>
      <div className="play-content">
        {renderContent()}
      </div>
      <div className="play-label">
        {state === 'loading' && 'Processing...'}
        {state === 'finish' && 'Click to view details'}
        {state === 'idle' && 'Waiting'}
      </div>
    </div>
  );
};

export default PlayCard;