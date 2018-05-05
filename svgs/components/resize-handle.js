const React = require('react')
const { DragSource } = require('react-dnd')

class ResizeHandle extends React.Component {
  render () {
    const { height, width, connectDragSource, translateX, translateY, scaleX,
      isLeftHandle } = this.props
    const adjustedTranslateX = isLeftHandle ? translateX : translateX - width

    return connectDragSource(<rect
      transform={`translate(${adjustedTranslateX}, ${translateY})`}
      width={width}
      height={height}
      visibility={scaleX > 0.5 ? 'visible' : 'hidden'}
      cursor='col-resize'
      fill={this.props.fill}
    />)
  }
}

ResizeHandle.defaultProps = {
  canDrag: false,
  height: 10,
  width: 10,
  translateX: 0,
  translateY: 0,
  scaleX: 1,
  fill: 'rgba(0,0,0,0.2)',
  onResizeArgs: {}
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
      isResizeLeft: props.isLeftHandle,
      ...props.onResizeArgs
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
