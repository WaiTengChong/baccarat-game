# 百家樂遊戲模擬器

這是一個高效能的百家樂模擬器，所有遊戲邏輯皆在後端執行，讓瀏覽器在模擬大量牌局時依然保持流暢。

## 功能特色
- 以後端驅動模擬，性能最佳
- 單次可處理數萬場遊戲
- 即時進度追蹤
- 重啟後自動清除的記憶體型 SQLite 資料庫
- 完整實作百家樂發牌與補牌規則
- 前端採用 React 與 Ant Design
- 支援 Electron 桌面版

## 架構
```
前端 (React) ──► API ──► Node.js 後端 ──► SQLite (暫存)
```
這樣的結構避免記憶體溢位，同時在大量工作負載下仍能保持 UI 反應速度。

## 先決條件
- Node.js 16 以上
- npm 或 yarn
- SQLite3

## 安裝
```bash
# 後端
cd server
npm install

# 前端
cd ../client
npm install
```

## 使用方式
### 啟動後端
```bash
cd server
npm run dev
# 服務位於 http://localhost:3001
```
### 啟動前端
```bash
cd client
npm start
# 服務位於 http://localhost:3000
```

### 基本模擬流程
1. 選擇牌組數量（6–8 副）
2. 設定要模擬的次數、遊戲數及每局手數
3. 點選 **Run** 立即開始，並於畫面上看到即時進度
4. 模擬完成後可開啟結果查看詳細數據

## API
- `POST /api/simulations` – 啟動新模擬
- `GET /api/simulations/{id}/status` – 查詢進度
- `GET /api/simulations/{id}/results` – 取得結果摘要
- `GET /api/games/{id}/hands` – 查看單場遊戲所有手牌

## 模擬邏輯
後端（`server/index.js` 與 `server/simulationWorker.js`）負責洗牌、發牌與計分。每個工作執行緒會依指定的牌組數建立牌靴並洗牌。正式開始前先燒掉第一張牌，並依牌面點數再棄掉相同張數。接著在牌靴底部 14～29 張處放置切牌卡，當剩餘張數到達該位置時會重新洗牌並再次燒牌，如此更貼近賭場流程且不用每幾手就重洗。

每手牌流程如下：
1. 閒家與莊家各發兩張牌。
2. 若任一方點數為 8 或 9（天然勝），該手結束。
3. 否則閒家點數 0–5 時補一張。
4. 莊家則依官方第三張牌規則決定是否補牌，並考慮閒家補的牌點數。
5. 所有牌取總點數末位，比較大小決定勝負（可能平局）。

除非要求完整手牌記錄，否則工作執行緒僅回傳統計數據，方便一次模擬數十萬手。完成後結果會存入暫存 SQLite 資料庫。

### 真實度
發牌規則與第三張牌邏輯完全符合賭場標準。燒牌與隨機切牌卡的位置能呈現更接近真實牌路的連莊或連閒情況。每局遊戲仍會從新牌靴開始，因此與實際賭場相比洗牌頻率較高，但對統計分析影響不大。

---

# Baccarat Game Simulator

A high-performance simulator for the casino card game **Baccarat**. The project moves all game logic to a backend service so the browser can remain responsive while running large numbers of games.

## Features
- Backend-driven simulations for optimal performance
- Handles tens of thousands of games per run
- Real‑time progress tracking
- Temporary in-memory database (SQLite) that cleans itself on restart
- Accurate implementation of Baccarat rules, including third‑card logic
- React frontend using Ant Design components
- Desktop support through Electron

## Architecture
```
Frontend (React) ──► API ──► Node.js backend ──► SQLite (temporary)
```
This structure avoids memory crashes and keeps the UI responsive even with heavy workloads.

## Prerequisites
- Node.js 16+
- npm or yarn
- SQLite3

## Installation
```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

## Usage
### Start the backend
```bash
cd server
npm run dev
# Available at http://localhost:3001
```
### Start the frontend
```bash
cd client
npm start
# Available at http://localhost:3000
```

### Basic simulation
1. Choose the number of card decks (6–8)
2. Select how many runs, games and hands to simulate
3. Click **Run** and watch progress in real time
4. Open completed simulations to view detailed results

## API
- `POST /api/simulations` – start a new simulation
- `GET /api/simulations/{id}/status` – check progress
- `GET /api/simulations/{id}/results` – summary of results
- `GET /api/games/{id}/hands` – individual hands for a game

## Simulation Logic
The backend (see `server/index.js` and `server/simulationWorker.js`) performs all
dealing and scoring. Each worker thread builds a shoe containing the requested
number of decks and shuffles it. Before dealing the first hand the top card is
burned and additional cards equal to its value are discarded. A cut card is then
placed roughly 14–29 cards from the bottom. Once the shoe reaches this position
it is reshuffled and the burn procedure repeats. This mimics standard casino
practice and prevents reshuffling every few hands.

For every hand:
1. Player and banker receive two cards.
2. If either total is 8 or 9 (a natural) the hand ends.
3. Otherwise the player draws a third card when the total is 0–5.
4. The banker draws based on the official third‑card chart and the player's
   third card.
5. Hands are scored modulo 10 and the higher total wins (ties are possible).

Workers keep only summary statistics unless full details are requested, allowing
hundreds of thousands of hands to be simulated quickly. Results are stored in a
temporary SQLite database once the workers finish.

### Realism
The dealing rules and third‑card logic match casino baccarat. The use of a burn
card and a randomized cut card position produces more authentic streaks than
simply reshuffling whenever the deck runs low. Each game still starts with a new
shoe, so in that sense the simulation resets more often than a real casino, but
for statistical analysis the difference is minor.

## Troubleshooting
- Ensure the backend is running on port `3001`
- Restart the backend if the temporary database becomes locked
- Reduce simulation size if your system runs out of memory

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes with tests
4. Open a pull request

## License
MIT
