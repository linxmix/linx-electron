const { validNumberOrDefault } = require('../../lib/number-utils')

// TODO: not sure this works! needs manual testing
module.exports = function getCurrentTime ({ playState = {}, beatScale, audioContext }) {
  let currentTime = beatScale(playState.seekBeat || 0)
  if (playState.status) {
    const elapsedTime = audioContext.currentTime - playState.absSeekTime
    currentTime += elapsedTime
  }

  return validNumberOrDefault(currentTime, 0)
}
