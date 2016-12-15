const { join } = require('path')

module.exports = {
  dataDirectory: join(__dirname, 'data'),
  audioContext: new window.AudioContext()
}
