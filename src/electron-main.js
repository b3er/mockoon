process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const objectPath = require('object-path');
const {
  clipboard,
  dialog,
  BrowserWindow,
  ipcMain,
  shell,
  app,
  Menu
} = require('electron');
const windowState = require('electron-window-state');
const path = require('path');
const { promisify } = require('util');
const isDev = require('electron-is-dev');
const { get: storageGet, set: storageSet } = require('electron-json-storage');
const { lookup: mimeTypeLookup } = require('mime-types');
const { promises: fsPromises } = require('fs');

let mainWindow;
let splashScreen;

// get command line args
const args = process.argv.slice(1);
const isServing = args.some((val) => val === '--serve');
const isTesting = args.some((val) => val === '--tests');

if (!isDev) {
  process.env.NODE_ENV = 'production';
}

// set local data folder when in dev mode or running tests
if (isTesting || isDev) {
  app.setPath('userData', path.resolve('./tmp'));
}

const log = require('electron-log');
log.catchErrors();

// when serving (devmode) enable hot reloading
if (isDev && isServing) {
  require('electron-reload')(__dirname, {});
}

const createSplashScreen = function () {
  splashScreen = new BrowserWindow({
    width: 450,
    maxWidth: 450,
    minWidth: 450,
    height: 175,
    maxHeight: 175,
    minHeight: 175,
    frame: false,
    resizable: false,
    fullscreenable: false,
    center: true,
    fullscreen: false,
    show: false,
    movable: true,
    maximizable: false,
    minimizable: false,
    backgroundColor: '#3C637C',
    icon: path.join(__dirname, '/icon_512x512x32.png')
  });

  splashScreen.loadURL(`file://${__dirname}/splashscreen.html`);

  splashScreen.on('closed', () => {
    splashScreen = null;
  });

  splashScreen.once('ready-to-show', () => {
    splashScreen.show();
  });
};

const createAppMenu = function () {
  const menu = [
    {
      label: 'Application',
      submenu: [
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: function () {
            mainWindow.webContents.send('APP_MENU', {
              action: 'OPEN_SETTINGS'
            });
          }
        },
        { type: 'separator' }
      ]
    }
  ];

  if (process.platform === 'darwin') {
    menu[0].submenu.push(
      { label: 'Hide', role: 'hide' },
      { role: 'hideOthers' },
      { type: 'separator' }
    );
  }

  menu[0].submenu.push({ label: 'Quit', role: 'quit' });

  // add edit menu for mac (for copy paste)
  if (process.platform === 'darwin') {
    menu.push({
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:' },
        { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          selector: 'selectAll:'
        }
      ]
    });
  }

  // add actions menu, send action through web contents
  menu.push({
    label: 'Actions',
    submenu: [
      {
        label: 'Add new environment',
        accelerator: 'Shift+CmdOrCtrl+E',
        click: function () {
          mainWindow.webContents.send('APP_MENU', {
            action: 'NEW_ENVIRONMENT'
          });
        }
      },
      {
        label: 'Add new route',
        accelerator: 'Shift+CmdOrCtrl+R',
        click: function () {
          mainWindow.webContents.send('APP_MENU', { action: 'NEW_ROUTE' });
        }
      },
      { type: 'separator' },
      {
        label: 'Duplicate current environment',
        accelerator: 'CmdOrCtrl+D',
        click: function () {
          mainWindow.webContents.send('APP_MENU', {
            action: 'DUPLICATE_ENVIRONMENT'
          });
        }
      },
      {
        label: 'Duplicate current route',
        accelerator: 'Shift+CmdOrCtrl+D',
        click: function () {
          mainWindow.webContents.send('APP_MENU', {
            action: 'DUPLICATE_ROUTE'
          });
        }
      },
      { type: 'separator' },
      {
        label: 'Delete current environment',
        accelerator: 'Alt+CmdOrCtrl+U',
        click: function () {
          mainWindow.webContents.send('APP_MENU', {
            action: 'DELETE_ENVIRONMENT'
          });
        }
      },
      {
        label: 'Delete current route',
        accelerator: 'Alt+Shift+CmdOrCtrl+U',
        click: function () {
          mainWindow.webContents.send('APP_MENU', { action: 'DELETE_ROUTE' });
        }
      },
      { type: 'separator' },
      {
        label: 'Start/Stop/Reload current environment',
        accelerator: 'Shift+CmdOrCtrl+S',
        click: function () {
          mainWindow.webContents.send('APP_MENU', {
            action: 'START_ENVIRONMENT'
          });
        }
      },
      {
        label: 'Start/Stop/Reload all environments',
        accelerator: 'Shift+CmdOrCtrl+A',
        click: function () {
          mainWindow.webContents.send('APP_MENU', {
            action: 'START_ALL_ENVIRONMENTS'
          });
        }
      },
      { type: 'separator' },
      {
        label: 'Select previous environment',
        accelerator: 'CmdOrCtrl+Up',
        click: function () {
          mainWindow.webContents.send('APP_MENU', {
            action: 'PREVIOUS_ENVIRONMENT'
          });
        }
      },
      {
        label: 'Select next environment',
        accelerator: 'CmdOrCtrl+Down',
        click: function () {
          mainWindow.webContents.send('APP_MENU', {
            action: 'NEXT_ENVIRONMENT'
          });
        }
      },
      {
        label: 'Select previous route',
        accelerator: 'Shift+CmdOrCtrl+Up',
        click: function () {
          mainWindow.webContents.send('APP_MENU', { action: 'PREVIOUS_ROUTE' });
        }
      },
      {
        label: 'Select next route',
        accelerator: 'Shift+CmdOrCtrl+Down',
        click: function () {
          mainWindow.webContents.send('APP_MENU', { action: 'NEXT_ROUTE' });
        }
      }
    ]
  });

  menu.push({
    label: 'Import/export',
    submenu: [
      {
        label: "Mockoon's format",
        submenu: [
          {
            label: 'Import from clipboard',
            click: function () {
              mainWindow.webContents.send('APP_MENU', {
                action: 'IMPORT_CLIPBOARD'
              });
            }
          },
          {
            label: 'Import from a file (JSON)',
            click: function () {
              mainWindow.webContents.send('APP_MENU', {
                action: 'IMPORT_FILE'
              });
            }
          },
          {
            label: 'Export all environments to a file (JSON)',
            accelerator: 'CmdOrCtrl+O',
            click: function () {
              mainWindow.webContents.send('APP_MENU', {
                action: 'EXPORT_FILE'
              });
            }
          },
          {
            label: 'Export current environment to a file (JSON)',
            click: function () {
              mainWindow.webContents.send('APP_MENU', {
                action: 'EXPORT_FILE_SELECTED'
              });
            }
          }
        ]
      },
      { type: 'separator' },
      {
        label: 'Swagger/OpenAPI',
        submenu: [
          {
            label: 'Import Swagger v2/OpenAPI v3 (JSON or YAML)',
            click: function () {
              mainWindow.webContents.send('APP_MENU', {
                action: 'IMPORT_OPENAPI_FILE'
              });
            }
          },
          {
            label: 'Export current environment to OpenAPI v3 (JSON)',
            click: function () {
              mainWindow.webContents.send('APP_MENU', {
                action: 'EXPORT_OPENAPI_FILE'
              });
            }
          }
        ]
      }
    ]
  });

  menu.push({
    label: 'Tools',
    submenu: [
      {
        label: 'CLI',
        click: function () {
          shell.openExternal('https://mockoon.com/cli/');
        }
      },
      {
        label: 'Docker repository',
        click: function () {
          shell.openExternal('https://hub.docker.com/u/mockoon');
        }
      },
      { type: 'separator' },
      {
        label: 'Show app data folder',
        click: function () {
          shell.showItemInFolder(app.getPath('userData'));
        }
      }
    ]
  });

  menu.push({
    label: 'Help',
    submenu: [
      {
        label: 'Official website',
        click: function () {
          shell.openExternal('https://mockoon.com');
        }
      },
      {
        label: 'Docs',
        click: function () {
          shell.openExternal('https://mockoon.com/docs');
        }
      },
      {
        label: 'Tutorials',
        click: function () {
          shell.openExternal('https://mockoon.com/tutorials/');
        }
      },
      {
        label: 'Get support',
        click: function () {
          shell.openExternal('https://mockoon.com/contact/');
        }
      },
      { type: 'separator' },
      {
        label: 'Release notes',
        click: function () {
          mainWindow.webContents.send('APP_MENU', {
            action: 'OPEN_CHANGELOG'
          });
        }
      }
    ]
  });

  return menu;
};

const init = function () {
  // only show the splashscreen when not running the tests
  if (!isTesting) {
    createSplashScreen();
  }

  const mainWindowState = windowState({
    defaultWidth: 1024,
    defaultHeight: 768
  });

  mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    minWidth: 1024,
    minHeight: 768,
    resizable: true,
    maximizable: true,
    minimizable: true,
    width: mainWindowState.width,
    height: mainWindowState.height,
    title: 'Mockoon',
    backgroundColor: '#252830',
    icon: path.join(__dirname, '/icon_512x512x32.png'),
    // directly show the main window when running the tests
    show: isTesting ? true : false,
    webPreferences: {
      nodeIntegration: false,
      devTools: isDev ? true : false,
      enableRemoteModule: false,
      contextIsolation: true,
      spellcheck: false,
      preload: path.join(__dirname, '/preload.js'),
      sandbox: false
    }
  });

  if (isTesting) {
    mainWindowState.manage(mainWindow);
    // ensure focus, as manage function does not necessarily focus
    mainWindow.show();
  } else {
    // when main app finished loading, hide splashscreen and show the mainWindow
    // use two timeout as page is still assembling after "dom-ready" event
    mainWindow.webContents.on('dom-ready', () => {
      setTimeout(() => {
        if (splashScreen) {
          splashScreen.close();
        }

        // adding a timeout diff (100ms) between splashscreen close and mainWindow.show to fix a bug: https://github.com/electron/electron/issues/27353
        setTimeout(() => {
          mainWindowState.manage(mainWindow);
          // ensure focus, as manage function does not necessarily focus
          mainWindow.show();

          // Open the DevTools in dev mode except when running functional tests
          if (isDev && !isTesting) {
            mainWindow.webContents.openDevTools();
          }
        }, 100);
      }, 500);
    });
  }

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`);

  // intercept all links and open in a new window
  mainWindow.webContents.on('new-window', (event, targetUrl) => {
    event.preventDefault();

    if (targetUrl.includes('openexternal::')) {
      shell.openExternal(targetUrl.split('::')[1]);
    }
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

  Menu.setApplicationMenu(Menu.buildFromTemplate(createAppMenu()));
};

const toggleExportMenuItems = function (state) {
  const menu = Menu.getApplicationMenu();

  if (
    menu &&
    objectPath.has(menu, 'items.2.submenu.items.0.submenu.items.2') &&
    objectPath.has(menu, 'items.2.submenu.items.2.submenu.items.1')
  ) {
    menu.items[2].submenu.items[0].submenu.items[2].enabled = state;
    menu.items[2].submenu.items[0].submenu.items[3].enabled = state;
    menu.items[2].submenu.items[2].submenu.items[1].enabled = state;
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', init);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q (except when running tests)
  if (process.platform !== 'darwin' || isTesting) {
    app.quit();
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    init();
  }
});

// Quit requested by renderer (when waiting for save to finish)
ipcMain.on('APP_QUIT', function () {
  // destroy the window otherwise app.quit() will trigger beforeunload again. Also there is no app.quit for macos
  mainWindow.destroy();
});

ipcMain.on('APP_DISABLE_EXPORT', () => {
  toggleExportMenuItems(false);
});

ipcMain.on('APP_ENABLE_EXPORT', () => {
  toggleExportMenuItems(true);
});

ipcMain.on('APP_LOGS', (event, data) => {
  if (data.type === 'info') {
    log.info(data.message);
  } else if (data.type === 'error') {
    log.error(data.message);
  }
});

ipcMain.on('APP_OPEN_EXTERNAL_LINK', (event, url) => {
  shell.openExternal(url);
});

ipcMain.handle('APP_READ_JSON_DATA', async (event, key) => {
  console.log('read data', key);
  //return await Promise.reject('cannot load');

  return await promisify(storageGet)(key);
});

ipcMain.handle('APP_WRITE_JSON_DATA', async (event, key, data) => {
  console.log('write data', key);

  return await promisify(storageSet)(key, data);
});

ipcMain.handle('APP_READ_FILE', async (event, path) => {
  console.log('read file', path);

  return await fsPromises.readFile(path, 'utf-8');
});

ipcMain.handle('APP_WRITE_FILE', async (event, path, data) => {
  console.log('write file', path);

  return await fsPromises.writeFile(path, data, 'utf-8');
});

ipcMain.handle('APP_READ_CLIPBOARD', async (event) => {
  console.log('clipboard read');

  return clipboard.readText('clipboard');
});

ipcMain.handle('APP_SHOW_OPEN_DIALOG', async (event, options) => {
  return await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), options);
});

ipcMain.handle('APP_SHOW_SAVE_DIALOG', async (event, options) => {
  return await dialog.showSaveDialog(BrowserWindow.getFocusedWindow(), options);
});

ipcMain.handle('APP_GET_PLATFORM', (event) => {
  return process.platform;
});

ipcMain.handle('APP_GET_MIME_TYPE', (event, path) => {
  return mimeTypeLookup(path);
});

ipcMain.on('APP_WRITE_CLIPBOARD', async (event, data) => {
  console.log('clipboard write');

  clipboard.writeText(data, 'clipboard');
});
