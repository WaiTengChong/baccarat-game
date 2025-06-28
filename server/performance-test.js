const axios = require('axios');

async function testPerformance() {
  const baseURL = 'http://localhost:3001';
  
  console.log('🚀 Baccarat Simulation Performance Test');
  console.log('=====================================\n');
  
  const testCases = [
    { plays: 5, gamesPerPlay: 5, handsPerGame: 10, name: 'Small (250 hands)' },
    { plays: 10, gamesPerPlay: 10, handsPerGame: 20, name: 'Medium (2,000 hands)' },
    { plays: 20, gamesPerPlay: 10, handsPerGame: 25, name: 'Large (5,000 hands)' },
    { plays: 50, gamesPerPlay: 20, handsPerGame: 30, name: 'Extra Large (30,000 hands)' }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📊 Testing ${testCase.name}:`);
    console.log(`   Configuration: ${testCase.plays} plays × ${testCase.gamesPerPlay} games × ${testCase.handsPerGame} hands`);
    
    const startTime = Date.now();
    
    try {
      const response = await axios.post(`${baseURL}/api/simulations`, {
        plays: testCase.plays,
        gamesPerPlay: testCase.gamesPerPlay,
        handsPerGame: testCase.handsPerGame,
        deckCount: 8
      });
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      const totalHands = testCase.plays * testCase.gamesPerPlay * testCase.handsPerGame;
      const handsPerSecond = Math.round(totalHands / duration);
      
      if (response.data.status === 'completed') {
        console.log(`   ✅ Completed in ${duration.toFixed(2)}s`);
        console.log(`   ⚡ Performance: ${handsPerSecond.toLocaleString()} hands/second`);
        console.log(`   📈 Results: ${response.data.results.length} plays, ${response.data.results[0].games.length} games per play`);
      } else {
        console.log(`   ❌ Failed: ${response.data.message}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n🎯 Performance test completed!');
  console.log('The parallel simulation uses all available CPU cores for maximum speed.');
}

// Check if server is running first
async function checkServer() {
  try {
    const response = await axios.get('http://localhost:3001/api/health');
    if (response.data.status === 'ok') {
      console.log('✅ Server is running and ready\n');
      return true;
    }
  } catch (error) {
    console.log('❌ Server is not running. Please start the server first:');
    console.log('   cd server && node index.js\n');
    return false;
  }
}

async function main() {
  const serverReady = await checkServer();
  if (serverReady) {
    await testPerformance();
  }
}

main().catch(console.error); 