const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chuchotage', {
  request(command, payload) {
    return ipcRenderer.invoke('bridge:request', command, payload || {});
  },
  openExternal(url) {
    return ipcRenderer.invoke('shell:openExternal', url);
  },
  onEvent(callback) {
    const listener = (_event, message) => callback(message.event, message.data);
    ipcRenderer.on('backend:event', listener);
    return () => ipcRenderer.removeListener('backend:event', listener);
  },
});
