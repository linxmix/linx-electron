const pify = require('pify')
const fs = pify(require('fs'))
const { join, basename, extname } = require('path')

module.exports = createService

function createService (config) {
  const { dataDirectory } = config
  const metasDirectory = join(dataDirectory, 'metas')

  return {
    readMetaList,
    readMeta,
    saveMeta,
    deleteMeta
  }

  function readMetaList () {
    return fs.readdir(metasDirectory)
      .then(list => list.filter(item => {
        return extname(item) === '.json'
      }))
      .then(list => list.map(item => {
        return basename(item, '.json')
      }))
      .then(list => Promise.all(list.map(readMeta)))
  }

  function readMeta (id) {
    const path = join(metasDirectory, id) + '.json'
    return fs.readFile(path, 'utf8')
      .then(JSON.parse)
      .then(meta => ({ ...meta, id }))
  }

  function saveMeta (meta) {
    const path = join(metasDirectory, meta.id) + '.json'
    return fs.writeFile(path, JSON.stringify(meta, null, 2), 'utf8')
  }

  function deleteMeta (id) {
    const path = join(metasDirectory, id) + '.json'
    return fs.unlink(path)
  }
}
