const React = require('react')
const d3 = require('d3')
const { DropTarget } = require('react-dnd')
const HTML5Backend = require('react-dnd-html5-backend')
const { first, get, last, map, throttle } = require('lodash')
const classnames = require('classnames')
const uuid = require('uuid/v4')

const BeatAxis = require('./beat-axis')
const AutomationControl = require('./automation-control')
const Playhead = require('./playhead')
const { clamp, validNumberOrDefault, quantizeBeat } = require('../../lib/number-utils')
const { CONTROL_TYPES } = require('../../clips/constants')
const getCurrentBeat = require('../../audios/helpers/get-current-beat')
const getControlPointsValueScale = require('../../clips/helpers/get-control-points-value-scale')

const ZOOM_STEP = 0.5
const MIN_SCALE_X = 0.1
const MAX_SCALE_X = 15000

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
      resizeHandler: null,
      isDragging: false,
      dragCoords: null,
      renderedSvgWidth: 0,
    }
  }

  componentDidMount () {
    this.updateRenderedDimensions()
    const resizeHandler = this.updateRenderedDimensions.bind(this)
    const mouseMoveHandler = this.handleMouseMove.bind(this)
    const mouseUpHandler = this.handleMouseUp.bind(this)

    document.addEventListener('mousemove', mouseMoveHandler)
    document.addEventListener('mouseup', mouseUpHandler)
    window.addEventListener('resize', resizeHandler)

    this.setState({
      mouseMoveHandler,
      mouseUpHandler,
      resizeHandler
    })
  }

  componentWillUnmount () {
    document.removeEventListener('mousemove', this.state.mouseMoveHandler)
    document.removeEventListener('mouseup', this.state.mouseUpHandler)
    window.removeEventListener('resize', this.state.resizeHandler)

    this.setState({
      mouseMoveHandler: null,
      mouseUpHandler: null,
      resizeHandler: null
    })
  }

  updateRenderedDimensions () {
    this.setState({
      renderedSvgWidth: this.svgElement.getBoundingClientRect().width
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
    scaleX = clamp(MIN_SCALE_X, scaleX, MAX_SCALE_X)

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

    const { mix, seekToBeat, translateX, scaleX, getQuantization } = this.props
    const mouseX = e.nativeEvent.offsetX
    const beat = (mouseX - translateX) / scaleX
    let seekBeat = beat

    // quantize to same distance as current position
    if (getQuantization) {
      const quantization = getQuantization()
      const currentBeat = getCurrentBeat({
        playState: mix.playState,
        beatScale: mix.channel.beatScale,
        audioContext: this.props.audioContext
      })

      const quantizedCurrentBeat = quantizeBeat({
        quantization,
        beat: currentBeat,
      })
      const quantizedBeat = quantizeBeat({
        beat,
        quantization
      })

      seekBeat = quantizedBeat + (currentBeat - quantizedCurrentBeat)
    }

    seekToBeat({
      seekBeat,
      channel: mix.channel
    })
  }

  handleSelectControlType (e) {
    const value = e.target.value

    this.props.selectControlType(value)
    this.selectControlTypeElement.blur()
  }
  
  handleToggleIsEditingAutomations (e) {
    this.props.toggleIsEditingAutomations()
    this.editAutomationsInputElement.blur()
  }

  _asyncUpdateAudioGraph (e) {
    // Make sure this.props.mix is updated from previous action
    window.setTimeout(() => this.props.updateAudioGraph({ channel: this.props.mix.channel }))
  }

  render () {
    const { mix, audioContext, height, connectDropTarget, scaleX, translateX, translateY,
      beatAxisHeight, tempoAxisHeight, showTempoAxis, selectedControlType, selectedAutomation,
      selectControlType, isOverWithFiles, canDropFiles, showLastPlayMarker } = this.props
    if (!(mix && mix.channel)) { return null }

    const transform = `translate(${translateX},${translateY}) scale(${scaleX}, 1)`
    const beatScale = mix.channel.beatScale
    const minBeat = mix.channel.minBeat
    const maxBeat = mix.channel.maxBeat
    const editAutomationsInputId = uuid()

    // compute min and max beats in view within mix
    const renderedSvgWidth = this.state.renderedSvgWidth
    const minBeatInView = Math.max(minBeat, (-translateX / scaleX))
    const maxBeatInView = Math.min(maxBeat, (-translateX + renderedSvgWidth) / scaleX)

    const dropClassName = canDropFiles && isOverWithFiles ? 'u-valid-file-drag-over' : ''

    return connectDropTarget(<div
      className={classnames('MixArrangementLayout', 'VerticalLayout', 'VerticalLayout--fullHeight',
        dropClassName, { 'is-loading': mix.isLoading })}
      onMouseDown={this.handleMouseDown.bind(this)}
      onWheel={this.handleMouseWheel.bind(this)}>

      <div style={{ display: 'flex', flex: 1 }}>
        {this.props.trackControls && <div style={{ flex: '0 0 auto', width: '200px', borderRight: '1px solid gray' }}>
          <div className="VerticalLayout VerticalLayout--fullHeight">
            <div className="VerticalLayout-flexSection">
              <div style={{ borderBottom: '1px solid gray', borderTop: '1px solid gray', height: beatAxisHeight, width: '100%', display: 'flex', alignItems: 'center' }}>
                <span style={{ width: '25%' }}>
                  <input id={editAutomationsInputId}
                    ref={(element) => { this.editAutomationsInputElement = element }}
                    type='checkbox'
                    checked={this.props.isEditingAutomations}
                    onChange={this.handleToggleIsEditingAutomations.bind(this)} />
                  <label htmlFor={editAutomationsInputId}>Edit</label>
                </span>

                <select
                  value={selectedControlType || ""}
                  onChange={this.handleSelectControlType.bind(this)}
                  ref={(element) => { this.selectControlTypeElement = element }}
                  style={{ width: '75%' }}>
                  <option key="none" value="">none</option>)}

                  {map(CONTROL_TYPES, controlType =>
                    <option key={controlType} value={controlType}>{controlType}</option>)}
                </select>
              </div>

              {this.props.trackControls}
            </div>

            {selectedAutomation && selectedAutomation.controlPoint && <div className="VerticalLayout-fixedSection" style={{ borderTop: '1px solid gray' }}>
              <AutomationControl
                controlType={get(selectedAutomation, 'clip.controlType')}
                minBeat={get(selectedAutomation, 'channel.minBeat')}
                maxBeat={get(selectedAutomation, 'channel.maxBeat')}
                minValue={first(get(selectedAutomation, 'controlPoint.valueScale').range())}
                maxValue={last(get(selectedAutomation, 'controlPoint.valueScale').range())}
                beat={get(selectedAutomation, 'controlPoint.beat')}
                value={get(selectedAutomation, 'controlPoint.scaledValue')}
                updateBeat={(beat) => {
                  this.props.updateControlPointPosition({
                    beat,
                    id: get(selectedAutomation, 'controlPoint.id'),
                    sourceId: get(selectedAutomation, 'clip.id'),
                    quantization: 'sample'
                  })
                  this._asyncUpdateAudioGraph()
                }}
                updateValue={(scaledValue) => {
                  const controlPointsValueScale =
                    getControlPointsValueScale(get(selectedAutomation, 'clip.controlType'))

                  this.props.updateControlPointValue({
                    value: controlPointsValueScale.invert(scaledValue),
                    id: get(selectedAutomation, 'controlPoint.id'),
                    sourceId: get(selectedAutomation, 'clip.id'),
                  })
                  this._asyncUpdateAudioGraph()
                }}
              />
            </div>}
          </div>
        </div>}

        <div className='VerticalLayout VerticalLayout--fullHeight'
          onMouseUp={this.handleClick.bind(this)}
          style={{ flex: 1, cursor: 'pointer' }}>
          <svg
            className='VerticalLayout-fixedSection'
            width='100%'
            height={beatAxisHeight}
            style={{ borderBottom: '1px solid gray', borderTop: '1px solid gray' }}>

            <g transform={transform}>
              <BeatAxis
                scaleX={scaleX}
                minBeat={minBeatInView}
                maxBeat={maxBeatInView}
                beatScale={beatScale}
                height='100%'
                strokeWidth={1 / scaleX}
                showText
              />

              <Playhead
                playState={mix.playState}
                seekBeat={mix.playState.seekBeat}
                showLastPlayMarker={showLastPlayMarker}
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
            ref={(element) => { this.svgElement = element }}>

            <g transform={transform}>
              <BeatAxis
                scaleX={scaleX}
                minBeat={minBeatInView}
                maxBeat={maxBeatInView}
                height={height}
                strokeWidth={1 / scaleX}
              />

              {this.props.children}

              <Playhead
                playState={mix.playState}
                seekBeat={mix.playState.seekBeat}
                showLastPlayMarker={showLastPlayMarker}
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
                seekBeat={mix.playState.seekBeat}
                showLastPlayMarker={showLastPlayMarker}
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
  canDropFiles: false,
  selectedControlType: null,
  selectedAutomation: {},
  isEditingAutomations: false,
  showLastPlayMarker: false
}

const dropTarget = {
  hover: throttle(function (props, monitor, component) {
    const item = monitor.getItem()
    const diff = monitor.getDifferenceFromInitialOffset()
    if (!(item && diff)) { return false }

    // if there is an item dragging, say something is dragging but not us
    component.setState({ dragCoords: null, isDragging: true })

    // if component is provided, perform drag there
    if (item.component) {
      const quantizedDiffX = quantizeBeat({
        quantization: props.getQuantization(),
        beat: (diff.x / props.scaleX)
      })

      item.component.setState({
        dragX: quantizedDiffX,
        dragY: (diff.y / item.height)
      })

    // otherwise execute real action
    } else {
      _executeDragAction({
        props,
        item,
        diff,
        itemType: monitor.getItemType()
      })
    }
  }, 10),
  drop (props, monitor, component) {
    const item = monitor.getItem()
    const itemType = monitor.getItemType()

    // handle files drop
    if (item && props.canDropFiles && (itemType === HTML5Backend.NativeTypes.FILE)) {
      const clientOffset = monitor.getClientOffset()
      const svgOffset = component.svgElement.getBoundingClientRect()
      const { translateX, scaleX } = props

      props.handleFilesDrop({
        files: item.files,
        beat: quantizeBeat({
          quantization: props.getQuantization(),
          beat: ((clientOffset.x - svgOffset.left - translateX) / props.scaleX)
        })
      })
    
    // handle arrangement updates
    } else {
      _executeDragAction({
        props,
        item,
        itemType,
        diff: monitor.getDifferenceFromInitialOffset()
      })
      component._asyncUpdateAudioGraph()
    }
  }
}

function _executeDragAction({ props, item, diff, itemType }) {
  let action
  const payload = {
    diffBeats: (diff.x / props.scaleX),
    diffValue: (diff.y / item.height),
    ...item
  }

  switch (itemType) {
    case 'sample-clip':
      action = props.onDragSampleClip
      break
    case 'resize-handle':
      if (item.isSampleClip) {
        action = props.resizeSampleClip
      } else if (item.isTrackChannel) {
        action = props.moveChannel
      } else {
        throw new Error('Cannot drag resize-handle without valid item.')
      }
      break
    case 'automation-clip/control-point':
      action = props.moveControlPoint
      break
    case 'tempo-clip/control-point':
      action = props.moveControlPoint
      delete payload.diffValue
      break
  }

  action(payload)
}

function collectDrop (connect, monitor) {
  return {
    connectDropTarget: connect.dropTarget(),
    isOverWithFiles: monitor.isOver() && monitor.canDrop() &&
      (monitor.getItemType() === HTML5Backend.NativeTypes.FILE)
  }
}

module.exports = DropTarget(
  [HTML5Backend.NativeTypes.FILE, 'sample-clip', 'resize-handle',
    'automation-clip/control-point', 'tempo-clip/control-point'],
  dropTarget, collectDrop)(MixArrangementLayout)
