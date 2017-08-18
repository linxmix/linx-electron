const { validNumberOrDefault } = require('../../lib/number-utils')
const { PLAY_STATE_PLAYING } = require('../../audios/constants')

// TODO: not sure this works! needs manual testing
module.exports = function getCurrentTime ({ playState = {}, beatScale, audioContext }) {
  let currentTime = beatScale(playState.seekBeat || 0)
  if (playState.status === PLAY_STATE_PLAYING) {
    const elapsedTime = audioContext.currentTime - playState.absSeekTime
    currentTime += elapsedTime
  }

  return validNumberOrDefault(currentTime, 0)
}
