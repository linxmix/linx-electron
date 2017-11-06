const React = require('react')
const d3 = require('d3')
const { DropTarget } = require('react-dnd')
const HTML5Backend = require('react-dnd-html5-backend')
const { map, throttle } = require('lodash')
const classnames = require('classnames')

const BeatAxis = require('./beat-axis')
const Playhead = require('./playhead')
const { validNumberOrDefault } = require('../../lib/number-utils')
const { CONTROL_TYPES } = require('../../clips/constants')

const ZOOM_STEP = 0.5
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
      beatAxisHeight, tempoAxisHeight, showTempoAxis, selectedControlType,
      selectControlType, isOverWithFiles, canDropFiles } = this.props
    if (!(mix && mix.channel)) { return null }

    const transform = `translate(${translateX},${translateY}) scale(${scaleX}, 1)`
    const beatScale = mix.channel.beatScale
    const mixBeatCount = validNumberOrDefault(mix.channel.beatCount, 0)

    const dropClassName = canDropFiles && isOverWithFiles ? 'u-valid-file-drag-over' : ''

    return connectDropTarget(<div
      className={classnames('VerticalLayout', 'VerticalLayout--fullHeight', dropClassName)}
      onMouseDown={this.handleMouseDown.bind(this)}
      onWheel={this.handleMouseWheel.bind(this)}>

      <div style={{ display: 'flex', flex: 1 }}>
        {this.props.trackControls && <div style={{ flex: '0 0 auto', width: '200px', borderRight: '1px solid gray' }}>
          <div style={{ borderBottom: '1px solid gray', borderTop: '1px solid gray', height: beatAxisHeight, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <select
              value={selectedControlType}
              onChange={(event) => selectControlType(event.target.value)}
              style={{ width: '95%' }}>
              {map(CONTROL_TYPES, controlType =>
                <option key={controlType} value={controlType}>{controlType}</option>)}
            </select>
          </div>

          {this.props.trackControls}
        </div>}

        <div className='VerticalLayout VerticalLayout--fullHeight'
          onMouseUp={this.handleClick.bind(this)}
          style={{ flex: 1 }}>
          <svg
            className='VerticalLayout-fixedSection'
            width='100%'
            height={beatAxisHeight}
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

          {showTempoAxis && <svg
            className='VerticalLayout-fixedSection'
            width='100%'
            height={tempoAxisHeight}
            style={{ borderTop: '1px solid gray' }}>

            <g transform={transform}>
              <Playhead
                playState={mix.playState}
                beatScale={beatScale}
                audioContext={audioContext}
                height='100%'
                strokeWidth={1.5 / scaleX}
              />

              {this.props.tempoClipElement}
            </g>
          </svg>}
        </div>
      </div>
    </div>)
  }
}

MixArrangementLayout.defaultProps = {
  beatAxisHeight: 25,
  tempoAxisHeight: 25,
  height: 100,
  scaleX: 1,
  translateX: 1,
  translateY: 0,
  trackControls: false,
  tempoClipElement: null,
  canDropFiles: false
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
      case 'track-group':
        action = props.moveTrackGroup
        payload.mixChannels = props.mix.channel.channels // TODO: does this belong in reducer?
        break
      case 'sample-clip':
        action = props.moveClip
        break
      case 'resize-handle':
        action = props.resizeSampleClip
        break
      case 'automation-clip/control-point':
        action = props.moveControlPoint
        payload.diffValue = (diff.y / item.height)
        break
      case 'tempo-clip/control-point':
        action = props.moveControlPoint
        break
    }

    action(payload)
  }, 10),
  drop (props, monitor, component) {
    const item = monitor.getItem()
    const diff = monitor.getDifferenceFromInitialOffset()
    console.log('endDrag', item, diff)

    // handle files drop
    if (item && props.canDropFiles && (monitor.getItemType() === HTML5Backend.NativeTypes.FILE)) {
      props.handleFilesDrop(item)

    // report if clip moved
    } else if (item && item.id && diff && (diff.x !== 0)) {
      props.updateAudioGraph({ channel: props.mix.channel })
    }
  }
}

function collectDrop (connect, monitor) {
  return {
    connectDropTarget: connect.dropTarget(),
    isOverWithFiles: monitor.isOver() && monitor.canDrop() &&
      (monitor.getItemType() === HTML5Backend.NativeTypes.FILE)
  }
}

module.exports = DropTarget(
  [HTML5Backend.NativeTypes.FILE, 'track-group', 'sample-clip', 'resize-handle',
    'automation-clip/control-point', 'tempo-clip/control-point'],
  dropTarget, collectDrop)(MixArrangementLayout)
