const { Effects, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const { map } = require('lodash')

const {
  setChannels,
  unsetChannels,
  unsetChannel
} = require('./actions')
const { unsetClips } = require('../clips/actions')

module.exports = createReducer

function createReducer (config) {
  return handleActions({
    [setChannels]: (state, action) => {
      const { records } = state
      const { payload: channels } = action
      return { ...state, records: { ...records, ...channels } }
    },
    [unsetChannels]: (state, action) => loop(state, Effects.batch(
      map(action.payload, channel => Effects.constant(unsetChannel(channel))))),
    [unsetChannel]: (state, action) => {
      const channel = action.payload
      const { id, channels, clips } = channel

      const nextRecords = state.records
      delete nextRecords[id]

      return loop({
        ...state,
        records: nextRecords
      }, Effects.batch([
        Effects.constant(unsetChannels(channels)),
        Effects.constant(unsetClips(clips))
      ]))
    }
  }, {
    records: {}
  })
}
