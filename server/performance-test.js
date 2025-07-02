// Use built-in fetch (available in Node.js 18+)
const API_BASE_URL = 'http://localhost:3001/api';

async function testSimulation(name, params) {
  console.log(`\n🚀 Testing ${name}...`);
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${API_BASE_URL}/simulations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const result = await response.json();
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`✅ ${name} completed in ${duration.toFixed(2)}s`);
    console.log(`📊 Mode: ${result.optimizationLevel}`);
    console.log(`🎮 Games: ${result.totalGames}`);
    
    if (result.results && result.results.length > 0) {
      const totalHands = result.results.reduce((total, play) => 
        total + play.games.reduce((gameTotal, game) => 
          gameTotal + (game.totalHands || 0), 0), 0);
      
      const handsPerSecond = Math.round(totalHands / duration);
      console.log(`⚡ Performance: ${handsPerSecond} hands/second`);
      
      // Check if consecutive wins data is available
      const hasConsecutiveData = result.results.some(play => play.consecutiveWinsData);
      console.log(`📈 Consecutive wins pre-computed: ${hasConsecutiveData ? 'YES' : 'NO'}`);
    }
    
    return { duration, result };
  } catch (error) {
    console.error(`❌ ${name} failed:`, error.message);
    return { duration: null, error };
  }
}

async function runPerformanceTests() {
  console.log('🧪 Baccarat Simulation Performance Tests');
  console.log('=' .repeat(50));
  
  const baseParams = {
    plays: 2,
    gamesPerPlay: 500,  // 1000 total games
    handsPerGame: 70,
    deckCount: 8,
    skipCard: 0
  };
  
  // Test 1: Ultra-fast in-memory mode
  const inMemoryResult = await testSimulation('Ultra-Fast In-Memory Mode', {
    ...baseParams,
    useInMemory: true
  });
  
  // Test 2: Database mode (MEGA optimization)
  const databaseResult = await testSimulation('Database Mode (MEGA)', {
    ...baseParams,
    useInMemory: false
  });
  
  // Compare performance
  if (inMemoryResult.duration && databaseResult.duration) {
    console.log('\n📊 Performance Comparison:');
    console.log('=' .repeat(30));
    
    const speedupFactor = (databaseResult.duration / inMemoryResult.duration).toFixed(2);
    const timeSaved = (databaseResult.duration - inMemoryResult.duration).toFixed(2);
    
    console.log(`⚡ Ultra-Fast Mode: ${inMemoryResult.duration.toFixed(2)}s`);
    console.log(`💾 Database Mode: ${databaseResult.duration.toFixed(2)}s`);
    console.log(`🚀 Speedup: ${speedupFactor}x faster`);
    console.log(`⏱️  Time saved: ${timeSaved}s`);
    
    if (speedupFactor > 1.5) {
      console.log('🎉 Ultra-fast mode provides significant performance improvement!');
    } else if (speedupFactor > 1.1) {
      console.log('✅ Ultra-fast mode provides moderate performance improvement');
    } else {
      console.log('📝 Performance difference is minimal for this test size');
    }
  }
  
  console.log('\n🔬 Test completed!');
  console.log('💡 Try larger datasets (e.g., 10,000+ games) to see more dramatic differences');
}

// Wait for server to be ready and run tests
setTimeout(runPerformanceTests, 2000); 