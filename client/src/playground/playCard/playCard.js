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
        return <div className="finish-icon">✓</div>;
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
        {state === 'finish' && 'Click to view'}
        {state === 'idle' && 'Waiting'}
      </div>
    </div>
  );
};

export default PlayCard;