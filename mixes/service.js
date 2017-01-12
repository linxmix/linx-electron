const pify = require('pify')
const fs = pify(require('fs'))
const { join, basename, extname } = require('path')

module.exports = createService

function createService (config) {
  const mixesDirectory = join(config.dataDirectory, 'mixes')

  return {
    readMixList,
    readMix,
    saveMix,
    deleteMix
  }

  function readMixList () {
    return fs.readdir(mixesDirectory)
      .then(list => list.filter(item => {
        return extname(item) === '.json'
      }))
      .then(list => list.map(item => {
        return basename(item, '.json')
      }))
      .then(list => Promise.all(list.map(readMix)))
  }

  function readMix (id) {
    const path = _getMixPath(id)
    return fs.readFile(path, 'utf8')
      .then(JSON.parse)
      .then(mix => ({ ...mix, id }))
  }

  function saveMix (mix) {
    const path = _getMixPath(mix.id)
    return fs.writeFile(path, JSON.stringify(mix, null, 2), 'utf8')
  }

  function deleteMix (mix) {
    const path = _getMixPath(mix.id)
    return fs.unlink(path)
  }

  function _getMixPath (id) {
    return join(mixesDirectory, id) + '.json'
  }
}
