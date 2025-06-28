const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const http = require('http');

function waitForServer(url, cb) {
  const tryRequest = () => {
    http.get(url, res => {
      if (res.statusCode === 200) cb();
      else setTimeout(tryRequest, 300);
    }).on('error', () => setTimeout(tryRequest, 300));
  };
  tryRequest();
}

function createWindow () {
  if (!process.env.ELECTRON_START_URL) {
    fork(path.join(__dirname, '..', 'server', 'index.js'));    // 啟動後端
  }
  
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    minWidth: 1000,
    minHeight: 800
  });
  const startURL = process.env.ELECTRON_START_URL ||
    `file://${path.join(__dirname, '..', 'client', 'build', 'index.html')}`;

  if (process.env.ELECTRON_START_URL) {
    // Wait for dev server
    waitForServer(process.env.ELECTRON_START_URL, () => win.loadURL(startURL));
  } else {
    win.loadURL(startURL);
  }
}
app.whenReady().then(createWindow);
