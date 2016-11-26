const pify = require('pify')
const fs = pify(require('fs'))
const { join, basename, extname } = require('path')

module.exports = createService

function createService (config) {
  const { dataDirectory, audioContext } = config
  const samplesDirectory = join(dataDirectory, 'samples')

  return {
    readSampleList,
    readSample
  }

  function readSampleList () {
    return fs.readdir(samplesDirectory)
      .then(list => list.filter(item => {
        return !item.startsWith('.')
      }))
      .then(list => list.map(item => ({ id: item })))
  }

  function readSample (id) {
    const path = join(samplesDirectory, id)

    return fs.readFile(path)
      .then(({ buffer }) => {
        return audioContext.decodeAudioData(buffer)
      })
      .then(audioBuffer => ({ id, path, audioBuffer }))
  }
}
