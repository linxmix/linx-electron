const { getPrimaryTracks } = require('./get-tracks')

module.exports = {
  getPrimaryTracks,
  flatten: require('./flatten'),
  nest: require('./nest')
}
