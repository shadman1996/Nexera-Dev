const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Nexera Core - Desktop Client",
    backgroundColor: '#0a0a0a',
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  ipcMain.on('window-close',    () => win.close());
  ipcMain.on('window-minimize', () => win.minimize());
  ipcMain.on('window-maximize', () => win.isMaximized() ? win.unmaximize() : win.maximize());

  // Enable dark mode theme options natively
  win.webContents.on('dom-ready', () => {
    win.setTitle("Nexera OS - Swarm Workspace");
  });

  // Load the Next.js local dashboard server
  win.loadURL("http://localhost:3000");

  // Gracefully show the window once layout renders
  win.once('ready-to-show', () => {
    win.show();
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
