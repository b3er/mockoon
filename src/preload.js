const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  send: (channel, ...data) => {
    let validChannels = [
      'APP_DISABLE_EXPORT',
      'APP_ENABLE_EXPORT',
      'APP_OPEN_EXTERNAL_LINK',
      'APP_WRITE_CLIPBOARD',
      'APP_QUIT',
      'APP_LOGS'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, ...data);
    }
  },
  invoke: (channel, ...data) => {
    let validChannels = [
      'APP_READ_JSON_DATA',
      'APP_WRITE_JSON_DATA',
      'APP_READ_CLIPBOARD',
      'APP_SHOW_OPEN_DIALOG',
      'APP_SHOW_SAVE_DIALOG',
      'APP_GET_PLATFORM',
      'APP_GET_MIME_TYPE',
      'APP_READ_FILE',
      'APP_WRITE_FILE'
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...data);
    }
  },
  receive: (channel, callback) => {
    let validChannels = ['APP_MENU'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  }
});
