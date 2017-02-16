const { beatToTime } = require('../../lib/number-utils')

module.exports = function (masterChannel, beat) {
  // TODO: find master tempo automation, then compute time 
  // for now, just assume constant 128bpm

  return beatToTime(beat, 128)
}
