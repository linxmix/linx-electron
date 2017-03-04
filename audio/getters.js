const { createSelector: Getter } = require('reselect')

const getPlayStatesRecords = (state) => state.audio.playStates
const getAudioContext = (state) => state.audio.audioContext

const getPlayStates = Getter(
  getPlayStatesRecords,
  (playStates) => playStates
)

module.exports = {
  getPlayStates,
  getAudioContext
}
