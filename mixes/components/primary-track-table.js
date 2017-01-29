const React = require('react')
const { default: ReactTable, ReactTableDefaults } = require('react-table')
const classnames = require('classnames')
const { findIndex, isEmpty, isEqual } = require('lodash')
const HTML5Backend = require('react-dnd-html5-backend')
const { DropTarget } = require('react-dnd')

const {
  createPrimaryTrackRowClass
} = require('./primary-track-row')

class PrimaryTrackTable extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      PrimaryTrackRow: ReactTableDefaults.TrComponent,
      tableSorting: []
    }
  }

  componentWillMount () {
    const PrimaryTrackRow = createPrimaryTrackRowClass({
      onDragEnter: () => {},
      onDrop: ({ sourceRowId, targetRowId }) => {
        const tracks = this.props.tracks
        const targetIndex = findIndex(tracks, { id: targetRowId })
        const sourceIndex = findIndex(tracks, { id: sourceRowId })
        this.props.reorderPrimaryTrack({ targetIndex, sourceIndex, tracks })
      },
      canDrag: () => {
        const tableSorting = this.state.tableSorting
        return isEmpty(tableSorting) || isEqual(tableSorting[0], { asc: true, id: 'index' })
      }
    })

    this.setState({ PrimaryTrackRow })
  }

  render () {
    const {
      tracks,
      isLoading,
      isOver,
      canDrop,
      connectDropTarget,
      removeTrack
    } = this.props

    const columns = [{
      id: 'index',
      header: '#',
      sort: 'asc',
      accessor: track => track.index + 1,
      // providing this render function allows PrimaryTrackRow to access the track object
      render: props => <span>
        {props.value}
        <button className='delete-button' onClick={() => removeTrack(props.row.id)}>x</button>
      </span>,
      width: 60
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
      header: 'Start',
      accessor: 'channel.startBeat',
      minWidth: 70,
      maxWidth: 100
    }, {
      header: 'Bpm',
      accessor: 'meta.bpm',
      minWidth: 50,
      maxWidth: 100
    }, {
      header: 'Key',
      accessor: 'meta.key',
      minWidth: 70,
      maxWidth: 100
    }]

    const dropClassName = (isOver && canDrop) ? 'primary-track-table-drag-over' : ''

    return connectDropTarget(<div>
      <ReactTable
        loading={isLoading}
        data={tracks}
        columns={columns}
        TrComponent={this.state.PrimaryTrackRow}
        showPagination={false}
        minRows={0}
        className={classnames('-striped', '-highlight', dropClassName)}
      >
        {(state, makeTable, instance) => {
          // workaround to match local state to table state
          // cannot synchronously update state in render function
          if (this.state.tableSorting !== state.sorting) {
            window.setTimeout(() => this.setState({ tableSorting: state.sorting }))
          }

          return makeTable()
        }}
      </ReactTable>
    </div>)
  }
}

function collectDrop (connect, monitor) {
  return {
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop(),
    itemType: monitor.getItemType(),
    draggingItem: monitor.getItem()
  }
}

const dropTarget = {
  drop: function (props, monitor, component) {
    props.onFilesDrop(monitor.getItem())
  }
}

module.exports = DropTarget(HTML5Backend.NativeTypes.FILE, dropTarget, collectDrop)(PrimaryTrackTable)
