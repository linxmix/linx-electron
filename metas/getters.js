const { createSelector: Getter } = require('reselect')
const { mapValues, includes } = require('lodash')

const getMetasRecords = (state) => state.metas.records
const getMetasDirty = (state) => state.metas.dirty

const getMetas = Getter(
  getMetasRecords,
  getMetasDirty,
  (metas, dirtyMetas) => {
    return mapValues(metas, meta => {
      return {
        ...meta,
        isDirty: includes(dirtyMetas, meta.id)
      }
    })
  }
)

module.exports = {
  getMetas
}
