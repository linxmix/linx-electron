const electron = require('electron-connect').server.create()
const chokidar = require('chokidar')

electron.start()

chokidar.watch('main.js', {
  ignored: '*/node_modules/*'
})
.on('change', () => electron.restart())

chokidar.watch('**/*.(js|json|html)', {
  ignored: '*/node_modules/*'
})
.on('change', () => electron.reload())
