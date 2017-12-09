const React = require('react')
const { DragSource } = require('react-dnd')

const { validNumberOrDefault } = require('../../lib/number-utils')

class ResizeHandle extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      dragX: null,
      dragY: null
    }
  }

  render () {
    const { height, width, connectDragSource, translateX, translateY, scaleX } = this.props
    const dragX = validNumberOrDefault(this.state.dragX, 0)
    const adjustedTranslateX = (translateX === 0) ? 0 : translateX - width

    return connectDragSource(<rect
      transform={`translate(${adjustedTranslateX + dragX}, ${translateY})`}
      width={width}
      height={height}
      visibility={scaleX > 0.5 ? 'visible' : 'hidden'}
      cursor="col-resize"
      style={{ fill: 'rgba(0,0,0,0.2' }}
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
      component,
      id: props.id,
      startBeat: props.startBeat,
      beatCount: props.beatCount,
      isResizeLeft: props.translateX === 0,
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
