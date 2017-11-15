const React = require('react')
const classnames = require('classnames')
const { DragSource, DropTarget } = require('react-dnd')
const { get } = require('lodash')
const { connect: connectFela } = require('react-fela')

const styles = require('../styles/primary-track-row')

class PrimaryTrackRow extends React.Component {
  componentWillReceiveProps (nextProps) {
    // drag enter
    if (!this.props.isOverCurrent && nextProps.isOverCurrent) {
      const targetRowId = get(_getRowFromProps(this.props), 'id')
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
      canDrag,
      isOverCurrent,
      style,
      styles,
      isDragging,
      onClick
    } = this.props

    const dropClassName = (isOverCurrent && canDrop) ? 'primary-track-row-drag-over' : ''
    const draggableClassName = canDrag ? 'primary-track-row-draggable' : ''
    const draggingClassName = isDragging ? 'primary-track-row-dragging' : ''
    const row = _getRowFromProps(this.props)

    return connectDropTarget(connectDragSource(
      <div
        className={classnames('rt-tr', 'primary-track-row', className, dropClassName,
          draggingClassName, draggableClassName)}
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
function createPrimaryTrackRowClass ({
  handleDragEnter = () => {},
  handleDrop = () => {},
  canDrag = () => {}
}) {
  function collectDrop (connect, monitor) {
    return {
      dragEnterAction: handleDragEnter,
      connectDropTarget: connect.dropTarget(),
      isOverCurrent: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
      itemType: monitor.getItemType(),
      draggingItem: monitor.getItem()
    }
  }

  const dropTarget = {
    canDrop: function (props, monitor, component) {
      const targetRow = _getRowFromProps(props)
      const targetRowIndex = get(targetRow, 'index') || 0
      const {
        index: sourceRowIndex
      } = monitor.getItem()

      // ignore cases that result in no movement
      return (targetRowIndex !== sourceRowIndex) &&
        (targetRowIndex + 1 !== sourceRowIndex)
    },
    drop: function (props, monitor, component) {
      const targetRowId = get(_getRowFromProps(props), 'id')
      return { targetRowId }
    }
  }

  function collectDrag (connect, monitor) {
    return {
      connectDragSource: connect.dragSource(),
      isDragging: monitor.isDragging(),
      canDrag: monitor.canDrag()
    }
  }

  const dragSource = {
    beginDrag: function (props, monitor, component) {
      const row = _getRowFromProps(props)
      return {
        id: row.id,
        index: row.index
      }
    },
    endDrag: function (props, monitor) {
      if (!monitor.didDrop()) { return }

      const { targetRowId } = monitor.getDropResult()
      const sourceRowId = get(monitor.getItem(), 'id')
      handleDrop({ sourceRowId, targetRowId })
    },
    canDrag: function (props) {
      const row = _getRowFromProps(props)
      return !!row && canDrag()
    }
  }

  const DraggablePrimaryTrackRow = DragSource('primary-track-row', dragSource, collectDrag)(PrimaryTrackRow)

  const DroppablePrimaryTrackRow = DropTarget('primary-track-row', dropTarget, collectDrop)(DraggablePrimaryTrackRow)

  return connectFela(styles)(DroppablePrimaryTrackRow)
}

module.exports = {
  createPrimaryTrackRowClass
}
