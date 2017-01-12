const pify = require('pify')
const fsRaw = require('fs')
const fs = pify(fsRaw)
const { join } = require('path')
const crypto = require('crypto')
const { merge, omitBy, isNil } = require('lodash')
const JsMediaTags = require('jsmediatags')

const { validNumberOrDefault } = require('../lib/number-utils')
const calculateBeatGrid = require('./helpers/calculate-beat-grid')

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
    return fs.readFile(file.path).then((data) => {
      const id = checksum(data)

      // dedupe against checksum: if sample doesnt exist, create
      return readSample(id)
        .then(sample => merge({ isDuplicateSample: true }, sample))
        .catch(error => {
          if (error && error.code === 'ENOENT') {
            // TODO: is there a clean way to not have to read the file so many times?
            return fs.writeFile(_getSamplePath(id), data).then(() => {
              return readSample(id).then(sample => merge({ file }, sample))
            })
          } else {
            return Promise.reject(error)
          }
        })
    })
  }

  function analyzeSample (id) {
    return readSample(id).then(({ path, data, audioBuffer }) => {
      return Promise.all([
        readId3Tags(data),
        calculateBeatGrid(audioBuffer)
      ]).then(([{ tags }, { peaks, intervals }]) => {
        const tagBpm = parseFloat(tags.TBPM && tags.TBPM.data)
        const calculatedBpm = intervals[0].tempo
        const bpm = validNumberOrDefault(tagBpm, calculatedBpm)

        const attrs = {
          id,
          title: tags.title,
          artist: tags.artist,
          bpm: validNumberOrDefault(bpm, 128),
          key: tags.comment && tags.comment.text,
          duration: audioBuffer.duration,
          barGridTime: peaks[0].time
        }

        return omitBy(attrs, isNil)
      })
    })
  }
}

function checksum (str, algorithm = 'sha256', encoding = 'hex') {
  return crypto
    .createHash(algorithm)
    .update(str, 'utf8')
    .digest(encoding)
}

function readId3Tags (file) {
  return new Promise((resolve, reject) => {
    JsMediaTags.read(file, {
      onSuccess: resolve,
      onError: reject
    })
  })
}
