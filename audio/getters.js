const { createSelector: Getter } = require('reselect')

const getPlayStatesRecords = (state) => state.audio.playStates

const getPlayStates = Getter(
  getPlayStatesRecords,
  (playStates) => playStates
)

module.exports = {
  getPlayStates
}
