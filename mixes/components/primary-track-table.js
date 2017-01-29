const React = require('react')
const ReactTable = require('react-table').default
const { findIndex } = require('lodash')

const {
  createPrimaryTrackRowClass
} = require('./primary-track-row')

class PrimaryTrackTable extends React.Component {
  render () {
    const { tracks, isLoading, reorderPrimaryTrack } = this.props
    console.log('tracks', tracks)

    const PrimaryTrackRow = createPrimaryTrackRowClass({
      onDragEnter () {},
      onDrop ({ sourceRowId, targetRowId }) {
        const targetIndex = targetRowId ? findIndex(tracks, { id: targetRowId }) : 0
        const sourceIndex = findIndex(tracks, { id: sourceRowId })
        reorderPrimaryTrack({ targetIndex, sourceIndex, tracks })
      }
    })

    const columns = [{
      id: 'number',
      header: '#',
      accessor: track => track.index,
      render: props => <span title={props.value}>{props.value + 1}</span>,
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
    />
  }
}

module.exports = PrimaryTrackTable
