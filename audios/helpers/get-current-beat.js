const { validNumberOrDefault } = require('../../lib/number-utils')
const { PLAY_STATE_PLAYING } = require('../../audios/constants')

module.exports = function getCurrentBeat ({ playState = {}, beatScale, audioContext }) {
  let currentBeat = playState.seekBeat

  if (playState.status === PLAY_STATE_PLAYING) {
    const elapsedTime = audioContext.currentTime - playState.absSeekTime
    currentBeat = beatScale.invert(beatScale(currentBeat) + elapsedTime)
  }

  return validNumberOrDefault(currentBeat, 0)
}
