const { timeToBeat } = require('../../lib/number-utils')

module.exports = function (masterChannel, time) {
  // TODO: find master tempo automation, then compute beat
  // for now, just assume constant 128bpm

  return timeToBeat(time, 128)
}
