const { createSelector: Getter } = require('reselect')

const getSvgsZooms = (state) => state.svgs.zooms

const getZooms = Getter(
  getSvgsZooms,
  (zooms) => zooms
)

module.exports = {
  getZooms
}
