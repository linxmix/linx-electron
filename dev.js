const electron = require('electron-connect').server.create()
const chokidar = require('chokidar')

electron.start()

chokidar
  .watch('main.js')
  .on('change', () => electron.restart())

chokidar
  .watch('**/*.(js|json|html|css)', {
    ignored: '**/data/**'
  })
  .on('change', () => electron.reload())
