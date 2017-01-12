const pify = require('pify')
const fs = pify(require('fs'))
const { join } = require('path')
const crypto = require('crypto')

module.exports = createService

function createService (config) {
  const { dataDirectory, audioContext } = config
  const samplesDirectory = join(dataDirectory, 'samples')

  return {
    readSampleList,
    readSample,
    createSample
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

  function createSample (file) {
    const { path } = file

    return fs.readFile(path)
      .then(({ buffer }) => {
        // TODO: dedupe against checksum
        const id = checksum(arrayBufferToBuffer(buffer))

        return audioContext
          .decodeAudioData(buffer)
          .then(audioBuffer => ({ id, path, audioBuffer }))
      })
  }
}

function checksum (str, algorithm = 'sha256', encoding = 'hex') {
  return crypto
    .createHash(algorithm)
    .update(str, 'utf8')
    .digest(encoding)
}

function arrayBufferToBuffer (ab) {
  var buf = new Buffer(ab.byteLength)
  var view = new Uint8Array(ab)
  for (var i = 0; i < buf.length; ++i) {
    buf[i] = view[i]
  }
  return buf
}
