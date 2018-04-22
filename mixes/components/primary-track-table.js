const React = require('react')
const { Link } = require('react-router')
const { default: ReactTable, ReactTableDefaults } = require('react-table')
const HTML5Backend = require('react-dnd-html5-backend')
const { DropTarget } = require('react-dnd')
const classnames = require('classnames')
const { findIndex, isEmpty, isEqual } = require('lodash')

const {
  createPrimaryTrackRowClass
} = require('./primary-track-row')
const { calculateHumanReadableTimestamp } = require('../../lib/number-utils')

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
      handleDragEnter: () => {},
      handleDrop: ({ sourceRowId, targetRowId }) => {
        const trackGroups = this.props.trackGroups
        const targetIndex = findIndex(trackGroups, { id: targetRowId })
        const sourceIndex = findIndex(trackGroups, { id: sourceRowId })

        // forward swap
        if (sourceIndex < targetIndex) {
          for (let i = sourceIndex + 1; i <= targetIndex; i++) {
            this.props.swapTrackGroups({
              sourceId: trackGroups[sourceIndex].id,
              targetId: trackGroups[i].id
            })
          }

        // backward swap
        } else {
          for (let i = sourceIndex; i > targetIndex; i--) {
            this.props.swapTrackGroups({
              sourceId: trackGroups[sourceIndex].id,
              targetId: trackGroups[i].id
            })
          }
        }
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
      mixId,
      trackGroups,
      isLoading,
      beatScale,
      isOver,
      canDrop,
      connectDropTarget,
      removeTrackGroup
    } = this.props

    const columns = [{
      id: 'index',
      header: '#',
      sort: 'asc',
      accessor: trackGroup => trackGroup.index + 1,
      // providing this render function allows PrimaryTrackRow to access the trackGroup object
      render: props => <span>
        {props.value}
        <span className='edit-buttons'>
          <button className='delete-button' onClick={() => removeTrackGroup(props.row.id)}>
            x
          </button>
          <Link
            to={`/mixes/${mixId}/trackGroups/${props.row.id}/${(trackGroups[props.row.index + 1] || {}).id}`}>
            <button className='edit-button'>e</button>
          </Link>
        </span>
      </span>,
      width: 60
    }, {
      header: 'Title',
      accessor: 'primaryTrack.sample.meta.title',
      minWidth: 100,
      render: props => <span title={props.value}>{props.value}</span>
    }, {
      header: 'Artist',
      accessor: 'primaryTrack.sample.meta.artist',
      minWidth: 100,
      render: props => <span title={props.value}>{props.value}</span>
    }, {
      id: 'duration',
      header: 'Play Time',
      accessor: trackGroup => {
        const primaryTrack = trackGroup.primaryTrack
        const startBeat = primaryTrack.startBeat

        return calculateHumanReadableTimestamp(
          beatScale(startBeat + primaryTrack.beatCount) - beatScale(startBeat))
      },
      minWidth: 70,
      maxWidth: 100
    }, {
      header: 'Bpm',
      accessor: 'primaryTrack.sample.meta.bpm',
      minWidth: 50,
      maxWidth: 100
    }, {
      header: 'Key',
      accessor: 'primaryTrack.sample.meta.key',
      minWidth: 70,
      maxWidth: 100
    }]

    const dropClassName = (isOver && canDrop) ? 'u-valid-file-drag-over' : ''

    return connectDropTarget(<div>
      <ReactTable
        loading={isLoading}
        data={trackGroups}
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
    props.handleFilesDrop(monitor.getItem())
  }
}

module.exports = DropTarget(HTML5Backend.NativeTypes.FILE, dropTarget, collectDrop)(PrimaryTrackTable)
