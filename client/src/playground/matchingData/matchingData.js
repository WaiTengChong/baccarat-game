import { Column } from '@ant-design/plots';
import { Card } from 'antd';
import useStyles from '../style.style';
import './matchingData.css';

const SkippedCardsDisplay = ({ gameResults }) => {
  // Extract all skipped cards from game results
  const allSkippedCards = [];
  
  if (gameResults && Array.isArray(gameResults)) {
    // Handle nested structure (multiple plays)
    gameResults.forEach(play => {
      if (play.games) {
        play.games.forEach(game => {
          if (game.skippedCards && game.skippedCards.length > 0) {
            allSkippedCards.push({
              playNumber: play.playNumber,
              gameNumber: game.gameNumber,
              skippedCards: game.skippedCards
            });
          }
        });
      }
    });
  } else if (gameResults && gameResults.skippedCards) {
    // Handle single game structure
    if (gameResults.skippedCards.length > 0) {
      allSkippedCards.push({
        playNumber: gameResults.playNumber || 1,
        gameNumber: gameResults.gameNumber || 1,
        skippedCards: gameResults.skippedCards
      });
    }
  }

  if (allSkippedCards.length === 0) {
    return (
      <Card style={{ marginBottom: 16 }} title="飛牌記錄">
        <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
          此次模擬未使用飛牌功能
        </div>
      </Card>
    );
  }

  return (
    <Card style={{ marginBottom: 16 }} title="飛牌記錄">
      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
        {allSkippedCards.map((item, index) => (
          <div key={index} style={{ 
            marginBottom: '8px', 
            padding: '8px', 
            backgroundColor: '#f5f5f5', 
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            <strong>第{item.playNumber}局 第{item.gameNumber}遊戲:</strong>
            <div style={{ marginTop: '4px', color: '#666' }}>
              {item.skippedCards.join(', ')}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

const MatchingData = ({
  matchingData,
  loading,
  gameResults,
}) => {
  const { styles } = useStyles();
  
  // Process matchingData to create display text
  const generateDataText = (data) => {
    if (!data || data.length === 0) return "暫無數據";
    
    // Group data by x value and type
    const grouped = {};
    data.forEach(item => {
      if (!grouped[item.x]) {
        grouped[item.x] = {};
      }
      grouped[item.x][item.type] = item.y;
    });
    
    // Generate display text
    const displayItems = [];
    const maxX = Math.max(...data.map(item => item.x));
    
    for (let i = 1; i <= maxX; i++) {
      const bankerCount = grouped[i]?.['莊'] || 0;
      const playerCount = grouped[i]?.['閑'] || 0;
      
      if (bankerCount > 0 || playerCount > 0) {
        if (bankerCount > 0) {
          displayItems.push(`莊(${i}) = ${bankerCount}次`);
        }
        if (playerCount > 0) {
          displayItems.push(`閑(${i}) = ${playerCount}次`);
        }
      }
    }
    
    return displayItems.length > 0 ? displayItems.join(', ') : "暫無數據";
  };

  // Ensure we have valid data for the chart
  const chartData = matchingData && Array.isArray(matchingData) ? matchingData : [];
  const hasData = chartData.length > 0;

  return (
    <>
      <Card
        className={styles.salesCard}
        loading={loading}
        title="連續開莊閑次數統計 (全部遊戲)"
        bodyStyle={{
          padding: 16,
        }}
      >
        <div className={styles.salesCard}>
          <div className={styles.salesBar}>
            {hasData ? (
              <Column
                autoFit
                height={270}
                data={chartData}
                xField="x"
                yField="y"
                seriesField="type"
                paddingBottom={12}
                axis={{
                    x: {
                      title: "連續",
                      gridLineDash: null,
                      gridStroke: '#000',
                    },
                    y: {
                      title: "次數",
                      gridLineDash: null,
                      gridStroke: '#000',
                    },
                  }}
                  scale={{
                    x: { paddingInner: 0.4 },
                  }}
                  legend={{
                    position: 'top',
                  }}
                  color={['#fa1414', '#1890ff']}
                  columnStyle={(datum) => {
                    return {
                      fill: datum.type === '莊' ? '#fa1414' : '#1890ff'
                    };
                  }}
              />
            ) : (
              <div style={{ height: 270, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                暫無數據可顯示
              </div>
            )}
          </div>
        </div>

        <div className="consecutive-wins-table" style={{ marginTop: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'center' }}>連續次數</th>
                <th style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'center', color: '#fa1414' }}>莊 (勝率%)</th>
                <th style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'center', color: '#1890ff' }}>閑 (勝率%)</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                if (!hasData) {
                  return (
                    <tr>
                      <td colSpan="3" style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'center', color: '#999' }}>
                        暫無數據
                      </td>
                    </tr>
                  );
                }
                
                // Group data by x value and type
                const grouped = {};
                chartData.forEach(item => {
                  if (!grouped[item.x]) {
                    grouped[item.x] = {};
                  }
                  grouped[item.x][item.type] = item.y;
                });
                
                // Generate table rows
                const rows = [];
                const maxX = Math.max(...chartData.map(item => item.x));
                
                for (let i = 1; i <= maxX; i++) {
                  const bankerCount = grouped[i]?.['莊'] || 0;
                  const playerCount = grouped[i]?.['閑'] || 0;
                  
                  if (bankerCount > 0 || playerCount > 0) {
                    rows.push(
                      <tr key={i}>
                        <td style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'center' }}>
                          {i}次連續
                        </td>
                        <td style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'center', color: bankerCount > 0 ? '#fa1414' : '#999' }}>
                          {bankerCount > 0 ? `${bankerCount}次` : '-'}
                        </td>
                        <td style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'center', color: playerCount > 0 ? '#1890ff' : '#999' }}>
                          {playerCount > 0 ? `${playerCount}次` : '-'}
                        </td>
                      </tr>
                    );
                  }
                }
                
                return rows.length > 0 ? rows : (
                  <tr>
                    <td colSpan="3" style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'center', color: '#999' }}>
                      暫無連續數據
                    </td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>

      <SkippedCardsDisplay gameResults={gameResults} />
      </Card>
    </>
  );
};

export default MatchingData;
