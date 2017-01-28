const React = require('react')
const classnames = require('classnames')
const { DragSource, DropTarget } = require('react-dnd')
const { get } = require('lodash')

class PrimaryTrackRow extends React.Component {
  componentWillReceiveProps (nextProps) {
    // drag enter
    if (this.props.isOverCurrent && !nextProps.isOverCurrent) {
      const targetRowId = _getRowFromProps(this.props).id
      const sourceRowId = get(this, 'props.draggingItem.id')
      this.props.dragEnterAction({ sourceRowId, targetRowId })
    }
  }

  render () {
    const {
      connectDragSource,
      connectDropTarget,
      children,
      className,
      canDrop,
      isOverCurrent,
      style,
      onClick
    } = this.props

    const dropClassName = (isOverCurrent && canDrop) ? 'bg-green' : ''
    const row = _getRowFromProps(this.props)

    return connectDropTarget(connectDragSource(
      <div
        className={classnames('rt-tr', className, dropClassName)}
        style={style}
        onClick={onClick}
        key={row && row.id}
      >
        {children}
      </div>
    ))
  }
}

// we cannot pass props directly to react-table TrComponent
// this is a workaround to grab the data object from a known location
// in this case, a `row` is a `primaryTrack` object
function _getRowFromProps (props) {
  return get(props, 'children[0].props.children.props.row')
}

// allows binding of actions to this component from outside
function createPrimaryTrackRowClass ({ onDragEnter = () => {}, onDrop = () => {} }) {
  function collectDrop (connect, monitor) {
    return {
      dragEnterAction: onDragEnter,
      connectDropTarget: connect.dropTarget(),
      isOverCurrent: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
      itemType: monitor.getItemType(),
      draggingItem: monitor.getItem()
    }
  }

  const dropTarget = {
    drop: function (props, monitor, component) {
      const targetRowId = _getRowFromProps(props).id
      return { targetRowId }
    }
  }

  function collectDrag (connect, monitor) {
    return {
      connectDragSource: connect.dragSource(),
      isDragging: monitor.isDragging()
    }
  }

  const dragSource = {
    beginDrag: function (props) {
      return {
        id: _getRowFromProps(props).id
      }
    },

    endDrag: function (props, monitor) {
      if (!monitor.didDrop()) { return }
      const { targetRowId } = monitor.getDropResult()
      const sourceRowId = get(monitor.getItem(), 'id')
      onDrop({ sourceRowId, targetRowId })
    }
  }

  const DraggablePrimaryTrackRow = DragSource('primary-track-row', dragSource, collectDrag)(PrimaryTrackRow)

  const DroppablePrimaryTrackRow = DropTarget('primary-track-row', dropTarget, collectDrop)(DraggablePrimaryTrackRow)

  return DroppablePrimaryTrackRow
}

module.exports = {
  createPrimaryTrackRowClass
}
