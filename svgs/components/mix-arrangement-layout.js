const React = require('react')
const d3 = require('d3')
const { DropTarget } = require('react-dnd')
const { throttle } = require('lodash')

const BeatAxis = require('./beat-axis')
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
    const { mix, audioContext, height, connectDropTarget, scaleX, translateX, translateY,
      topAxisHeight } = this.props
    if (!(mix && mix.channel)) { return null }

    const transform = `translate(${translateX},${translateY}) scale(${scaleX}, 1)`
    const beatScale = mix.channel.beatScale
    const mixBeatCount = validNumberOrDefault(mix.channel.beatCount, 0)

    return connectDropTarget(<div
      className='VerticalLayout VerticalLayout--fullHeight'
      onMouseDown={this.handleMouseDown.bind(this)}
      onWheel={this.handleMouseWheel.bind(this)}>

      <div style={{ display: 'flex', flex: 1 }}>
        {this.props.trackControls && <div style={{ flex: '0 0 auto', width: '200px', borderRight: '1px solid gray' }}>
          <div style={{ borderBottom: '1px solid gray', borderTop: '1px solid gray', height: topAxisHeight, width: '100%' }} />
          {this.props.trackControls}
        </div>}

        <div className='VerticalLayout VerticalLayout--fullHeight'
          onMouseUp={this.handleClick.bind(this)}
          style={{ flex: 1 }}>
          <svg
            className='VerticalLayout-fixedSection'
            width='100%'
            height={topAxisHeight}
            style={{ borderBottom: '1px solid gray', borderTop: '1px solid gray' }}>
            
            <g transform={transform}>
              <BeatAxis
                scaleX={scaleX}
                beatCount={mixBeatCount}
                height='100%'
                strokeWidth={1 / scaleX}
                showText
              />

              <Playhead
                playState={mix.playState}
                beatScale={beatScale}
                audioContext={audioContext}
                height='100%'
                strokeWidth={1.5 / scaleX}
              />
            </g>
          </svg>

          <svg
            className='VerticalLayout-flexSection'
            width='100%'
            height={height}
            ref='svg'>

            <g transform={transform}>
              <BeatAxis
                scaleX={scaleX}
                beatCount={mixBeatCount}
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
        </div>
      </div>
    </div>)
  }
}

MixArrangementLayout.defaultProps = {
  topAxisHeight: 25,
  height: 100,
  scaleX: 1,
  translateX: 1,
  translateY: 0,
  trackControls: false
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
      case 'primary-track-channel':
        action = props.movePrimaryTrackChannel
        payload.mixChannels = props.mix.channel.channels // TODO: does this belong in reducer?
        break
      case 'transition-channel':
        action = props.moveTransitionChannel
        payload.mixChannels = props.mix.channel.channels // TODO: does this belong in reducer?
        break
      case 'sample-clip':
        action = props.moveClip
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

module.exports = DropTarget(
  ['primary-track-channel', 'transition-channel', 'sample-clip', 'resize-handle', 'control-point'],
  dropTarget, collect)(MixArrangementLayout)
