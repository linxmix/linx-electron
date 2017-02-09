// const { createSelector: Getter, createStructuredSelector: Struct } = require('reselect')

const getMetas = (state) => state.metas.records

module.exports = {
  getMetas
}
