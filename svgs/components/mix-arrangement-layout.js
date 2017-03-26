const React = require('react')
const d3 = require('d3')
const { DropTarget } = require('react-dnd')
const { throttle } = require('lodash')

const Axis = require('./axis')
const Playhead = require('./playhead')
const { validNumberOrDefault } = require('../../lib/number-utils')

const ZOOM_STEP = 0.2
const MIN_SCALE_X = 0.1

function _isNegative (n) {
  // So we can handle the mousewheel returning -0 or 0
  return ((n = +n) || 1 / n) < 0
}

class MixArrangementLayout extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      mouseMoveHandler: null,
      mouseUpHandler: null,
      isDragging: false,
      dragCoords: null
    }
  }

  componentDidMount () {
    const mouseMoveHandler = this.handleMouseMove.bind(this)
    const mouseUpHandler = this.handleMouseUp.bind(this)

    document.addEventListener('mousemove', mouseMoveHandler)
    document.addEventListener('mouseup', mouseUpHandler)

    this.setState({
      mouseMoveHandler: mouseMoveHandler,
      mouseUpHandler: mouseUpHandler
    })
  }

  componentWillUnmount () {
    document.removeEventListener('mousemove', this.state.mouseMoveHandler)
    document.removeEventListener('mouseup', this.state.mouseUpHandler)

    this.setState({
      mouseMoveHandler: null,
      mouseUpHandler: null
    })
  }

  handleMouseDown (e) {
    this.setState({
      dragCoords: {
        x: e.pageX,
        y: e.pageY
      }
    })
  }

  handleMouseUp (e) {
    if (this.state.dragCoords) {
      e.preventDefault()
      e.stopPropagation()
    }

    this.setState({
      isDragging: false,
      dragCoords: null
    })
  }

  handleMouseMove (e) {
    if (!this.state.dragCoords) { return }

    e.preventDefault()
    e.stopPropagation()

    const xDiff = this.state.dragCoords.x - e.pageX

    this.setState({
      isDragging: true,
      dragCoords: {
        x: e.pageX,
        y: e.pageY
      }
    })

    this.props.updateZoom({
      id: this.props.mix.id,
      translateX: this.props.translateX - xDiff
    })
  }

  handleMouseWheel (e) {
    e.preventDefault()
    e.stopPropagation()

    let scaleX = this.props.scaleX
    if (_isNegative(e.deltaY)) {
      scaleX += ZOOM_STEP * scaleX
    } else {
      scaleX -= ZOOM_STEP * scaleX
    }
    scaleX = Math.max(MIN_SCALE_X, scaleX)

    const factor = 1 - (scaleX / this.props.scaleX)
    const mouseX = e.nativeEvent.offsetX
    const translateX = this.props.translateX

    this.props.updateZoom({
      id: this.props.mix.id,
      scaleX,
      translateX: translateX + ((mouseX - translateX) * factor)
    })
  }

  handleClick (e) {
    if (this.state.isDragging) { return }

    const { mix, seekToBeat, translateX, scaleX } = this.props
    const mouseX = e.nativeEvent.offsetX

    seekToBeat({
      channel: mix.channel,
      seekBeat: (mouseX - translateX) / scaleX
    })
  }

  render () {
    const { mix, audioContext, height, connectDropTarget, scaleX, translateX, translateY } = this.props
    if (!(mix && mix.channel)) { return null }

    const transform = `translate(${translateX},${translateY}) scale(${scaleX}, 1)`
    const beatScale = mix.channel.beatScale
    const mixBeatCount = validNumberOrDefault(mix.channel.beatCount, 0)
    const mixPhraseCount = mixBeatCount / 32  // TODO: need to round?
    const phraseScale = d3.scaleLinear()
      .domain([0, mixPhraseCount])
      .range([0, mixBeatCount])

    return connectDropTarget(<div
      onMouseDown={this.handleMouseDown.bind(this)}
      onWheel={this.handleMouseWheel.bind(this)}>

      <svg
        onMouseUp={this.handleClick.bind(this)}
        width='100%'
        height={height}
        style={{ border: '1px solid gray' }}
        ref='svg'>

        <g transform={transform} >
          <Axis
            scale={phraseScale}
            tickCount={mixPhraseCount}
            height={height}
            strokeWidth={1 / scaleX}
          />

          {this.props.children}

          <Playhead
            playState={mix.playState}
            beatScale={beatScale}
            audioContext={audioContext}
            height={height}
            strokeWidth={1.5 / scaleX}
          />
        </g>
      </svg>
    </div>)
  }
}

MixArrangementLayout.defaultProps = {
  height: 100,
  scaleX: 1,
  translateX: 1,
  translateY: 0
}

const dropTarget = {
  hover: throttle(function (props, monitor, component) {
    const item = monitor.getItem()
    const diff = monitor.getDifferenceFromInitialOffset()
    if (!(item && diff)) { return false }

    // if there is an item dragging, say something is dragging but not us
    component.setState({ dragCoords: null, isDragging: true })

    let action
    const payload = {
      diffBeats: (diff.x / props.scaleX),
      ...item
    }
    switch (monitor.getItemType()) {
      case 'sample-clip':
        action = props.moveClip
        break
      case 'transition-channel':
        action = props.moveChannel
        break
      case 'resize-handle':
        action = props.resizeChannel
        break
      case 'control-point':
        action = props.moveControlPoint
        payload.diffValue = (diff.y / item.height)
        break
    }

    action(payload)
  }, 10),
  drop (props, monitor, component) {
    const item = monitor.getItem()
    const diff = monitor.getDifferenceFromInitialOffset()
    console.log('endDrag', item, diff)

    // report if clip moved
    if (item && item.id && diff && (diff.x !== 0)) {
      props.updateAudioGraph({ channel: props.mix.channel })
    }
  }
}

function collect (connect, monitor) {
  return {
    connectDropTarget: connect.dropTarget()
  }
}

module.exports = DropTarget(['sample-clip', 'transition-channel', 'resize-handle', 'control-point'],
  dropTarget, collect)(MixArrangementLayout)
