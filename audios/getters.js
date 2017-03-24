const { createSelector: Getter } = require('reselect')

const getPlayStatesRecords = (state) => state.audios.playStates
const getAudioContext = (state) => state.audios.audioContext

const getPlayStates = Getter(
  getPlayStatesRecords,
  (playStates) => playStates
)

module.exports = {
  getPlayStates,
  getAudioContext
}
