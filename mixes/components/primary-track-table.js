const React = require('react')
const { default: ReactTable } = require('react-table')
const { findIndex, isEmpty, isEqual } = require('lodash')

const {
  createPrimaryTrackRowClass
} = require('./primary-track-row')

class PrimaryTrackTable extends React.Component {
  render () {
    const { tracks, isLoading, reorderPrimaryTrack } = this.props
    let tableSorting = []

    const PrimaryTrackRow = createPrimaryTrackRowClass({
      onDragEnter () {},
      onDrop ({ sourceRowId, targetRowId }) {
        const targetIndex = targetRowId ? findIndex(tracks, { id: targetRowId }) : 0
        const sourceIndex = findIndex(tracks, { id: sourceRowId })
        reorderPrimaryTrack({ targetIndex, sourceIndex, tracks })
      },
      canDrag () {
        return isEmpty(tableSorting) || isEqual(tableSorting[0], { asc: true, id: 'index' })
      }
    })

    const columns = [{
      id: 'index',
      header: '#',
      accessor: track => track.index + 1,
      // providing this render function allows PrimaryTrackRow to access the track object
      render: props => <span>{props.value}</span>,
      width: 30
    }, {
      header: 'Title',
      accessor: 'meta.title',
      minWidth: 100,
      render: props => <span title={props.value}>{props.value}</span>
    }, {
      header: 'Artist',
      accessor: 'meta.artist',
      minWidth: 100,
      render: props => <span title={props.value}>{props.value}</span>
    }, {
      header: 'Key',
      accessor: 'meta.key',
      minWidth: 70,
      maxWidth: 100
    }, {
      header: 'Bpm',
      accessor: 'meta.bpm',
      minWidth: 50,
      maxWidth: 100
    }]

    return <ReactTable
      loading={isLoading}
      data={tracks}
      columns={columns}
      TrComponent={PrimaryTrackRow}
      showPagination={false}
      minRows={0}
      className='-striped -highlight'
    >
      {(state, makeTable, instance) => {
        tableSorting = state.sorting
        return makeTable()
      }}
    </ReactTable>
  }
}

module.exports = PrimaryTrackTable
