const { handleActions } = require('redux-actions')

const { setChannels } = require('./actions')

module.exports = createReducer

function createReducer (config) {
  return handleActions({
    [setChannels]: (state, action) => {
      const { records } = state
      const { payload: channels } = action
      return { ...state, records: { ...records, ...channels } }
    }
  }, {
    records: {}
  })
}
