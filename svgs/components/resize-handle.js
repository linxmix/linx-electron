const React = require('react')
const { DragSource } = require('react-dnd')

class ResizeHandle extends React.Component {
  render () {
    const { height, width, connectDragSource, isDragging, translateX } = this.props

    return connectDragSource(<rect
      transform={`translate(${translateX - width / 2})`}
      width={width}
      height={height}
      style={{ fill: 'rgba(0,0,255)' }}
    />)
  }
}

ResizeHandle.defaultProps = {
  canDrag: false,
  height: 10,
  width: 10,
  translateX: 0
}

function collectDrag (connect, monitor) {
  return {
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging()
  }
}

const dragSource = {
  beginDrag (props, monitor, component) {
    console.log('drag resize-handle')
    return {
      id: props.id,
      startBeat: props.startBeat,
      beatCount: props.beatCount,
      isResizeLeft: props.translateX === 0
    }
  },
  isDragging (props, monitor) {
    const item = monitor.getItem()
    return item && item.id && (item.id === props.id)
  },
  canDrag (props) {
    return props.canDrag
  }
}

module.exports = DragSource('resize-handle', dragSource, collectDrag)(ResizeHandle)
