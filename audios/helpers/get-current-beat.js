const { validNumberOrDefault } = require('../../lib/number-utils')

module.exports = function getCurrentBeat ({ playState = {}, beatScale, audioContext }) {
  let currentBeat = playState.seekBeat
  if (playState.isPlaying) {
    const elapsedTime = audioContext.currentTime - playState.absSeekTime
    currentBeat = beatScale.invert(beatScale(currentBeat) + elapsedTime)
  }

  return validNumberOrDefault(currentBeat, 0)
}
