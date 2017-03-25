const React = require('react')
const { DragSource } = require('react-dnd')

class ResizeHandle extends React.Component {
  render () {
    const { height, width, connectDragSource, translateX, translateY } = this.props

    return connectDragSource(<rect
      transform={`translate(${translateX - width / 2}, ${translateY})`}
      width={width}
      height={height}
      style={{ fill: 'rgba(0,0,255,0.4' }}
    />)
  }
}

ResizeHandle.defaultProps = {
  canDrag: false,
  height: 10,
  width: 10,
  translateX: 0,
  translateY: 0
}

function collectDrag (connect, monitor) {
  return {
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging()
  }
}

const dragSource = {
  beginDrag (props, monitor, component) {
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
