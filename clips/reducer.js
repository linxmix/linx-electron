const { handleActions } = require('redux-actions')

const { setClips } = require('./actions')

module.exports = createReducer

function createReducer (config) {
  return handleActions({
    [setClips]: (state, action) => {
      const { records } = state
      const { payload: clips } = action
      return { ...state, records: { ...records, ...clips } }
    }
  }, {
    records: {}
  })
}
