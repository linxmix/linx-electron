const { createSelector: Getter } = require('reselect')
const { assign, mapValues } = require('lodash')

const { PLAY_STATE_PLAYING, PLAY_STATE_PAUSED } = require('./constants')

const getPlayStatesRecords = (state) => state.audios.playStates
const getAudioContext = (state) => state.audios.audioContext

const getPlayStates = Getter(
  getPlayStatesRecords,
  (playStates) => mapValues(playStates, playState => assign({
    isPlaying: playState.status === PLAY_STATE_PLAYING
  }, playState))
)

module.exports = {
  getPlayStates,
  getAudioContext
}
