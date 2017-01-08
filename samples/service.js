const pify = require('pify')
const fsRaw = require('fs')
const fs = pify(fsRaw)
const { join } = require('path')
const crypto = require('crypto')
const { omitBy, isNil } = require('lodash')
const JsMediaTags = require('jsmediatags')

module.exports = createService

function createService (config) {
  const { dataDirectory, audioContext } = config
  const samplesDirectory = join(dataDirectory, 'samples')

  return {
    readSampleList,
    readSample,
    createSample,
    analyzeSample
  }

  function _getSamplePath (id) {
    return join(samplesDirectory, id)
  }

  function readSampleList () {
    return fs.readdir(samplesDirectory)
      .then(list => list.filter(item => {
        return !item.startsWith('.')
      }))
      .then(list => list.map(item => ({ id: item })))
  }

  function readSample (id) {
    const path = _getSamplePath(id)

    return fs.readFile(path)
      .then(data => {
        const { buffer } = data
        return audioContext.decodeAudioData(buffer)
          .then(audioBuffer => ({ data, audioBuffer }))
      })
      .then(({ data, audioBuffer }) => ({ id, path, data, audioBuffer }))
  }

  function createSample (file) {
    const { path } = file

    return fs.readFile(path).then((data) => {
      const { buffer } = data
      // TODO: dedupe against checksum
      const id = checksum(data)
      const targetPath = _getSamplePath(id)

      // TODO: is there a clean way to not have to read the file so many times?
      return fs.writeFile(targetPath, data)
        .then(() => readSample(id))
    })
  }

  function analyzeSample (id) {
    return readSample(id).then(({ path, data, audioBuffer }) => {
      return readId3Tags(data).then(({ tags }) => {
        const attrs = {
          id,
          title: tags.title,
          artist: tags.artist,
          bpm: parseFloat(tags.TBPM && tags.TBPM.data) || 128,
          key: tags.comment && tags.comment.text,
          duration: audioBuffer.duration
        }

        return omitBy(attrs, isNil)
      })
    })
  }
}

function readId3Tags (file) {
  return new Promise((resolve, reject) => {
    JsMediaTags.read(file, {
      onSuccess: resolve,
      onError: reject
    })
  })
}

function checksum (str, algorithm = 'sha256', encoding = 'hex') {
  return crypto
    .createHash(algorithm)
    .update(str, 'utf8')
    .digest(encoding)
}
