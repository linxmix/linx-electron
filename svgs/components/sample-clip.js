const React = require('react')
const d3 = require('d3')
const { map, isEqual, omit } = require('lodash')
const { DragSource } = require('react-dnd')
const classnames = require('classnames')

const { beatToTime, timeToBeat, validNumberOrDefault } = require('../../lib/number-utils')
const ResizeHandle = require('./resize-handle')
const Waveform = require('./waveform')
const { isRightClick, getPosition } = require('../../lib/mouse-event-utils')

class SampleClip extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      dragX: null,
      dragY: null
    }
  }

  handleClick (e) {
    if (this.props.canEdit) {
      if (isRightClick(e)) {
        e.preventDefault()
        e.stopPropagation()

        if (e.shiftKey) {
          const { beat, value } = getPosition({ e, scaleX: this.props.scaleX, height: this.props.height })
          this.props.snipClip({ clip: this.props.clip, beat, value })
        } else {
          this.props.deleteClip({ clipId: this.props.clip.id })
        }

      // left click
      } else {
        if (e.shiftKey) {
          const { beat, value } = getPosition({ e, scaleX: this.props.scaleX, height: this.props.height })
          this.props.splitTrackGroup({ clip: this.props.clip, beat, value })
        } else {
          this.props.selectClip({ clip: this.props.clip })
        }
      }
    }
  }

  handleGridMarkerClick (marker, e) {
    e.preventDefault()
    e.stopPropagation()

    this.props.selectGridMarker({ clip: this.props.clip, marker })
  }

  render () {
    const { clip, gain, height, color, sampleResolution, scaleX, connectDragSource, isDragging, isSelected,
      canResize, canDrag, canEdit } = this.props
    if (!clip || (clip.status !== 'loaded')) { return null }

    const { sample, startBeat, audioStartTime, beatCount } = clip
    const { audioBuffer, meta: { bpm: audioBpm, duration } } = sample
    const audioStartBeat = timeToBeat(audioStartTime, audioBpm)

    const onResizeArgs = {
      audioBpm,
      audioBuffer,
      audioStartTime,
      minStartBeat: clip.startBeat - audioStartBeat,
      maxBeatCount: timeToBeat(duration - audioStartTime, audioBpm)
    }
    const dragX = validNumberOrDefault(this.state.dragX, 0)

    return connectDragSource(<g className={classnames("SampleClip", {
      "is-selected": isSelected,
      "is-draggable": canDrag,
      "is-editable": canEdit
    })}
      transform={`translate(${startBeat + dragX})`}
      onMouseUp={this.handleClick.bind(this)}>
      <rect className="SampleClip-backdrop"
        width={beatCount}
        height={height}
      />

      <Waveform
        audioBuffer={audioBuffer}
        startTime={audioStartTime}
        endTime={audioStartTime + beatToTime(beatCount, audioBpm)}
        length={beatCount * sampleResolution}
        beatCount={beatCount}
        gain={gain}
        height={height}
        color={color}
        opacity={isDragging ? 0.5 : 1}
      />

      {canResize && <g>
        <ResizeHandle
          id={clip.id}
          height={height}
          width={10 / scaleX}
          scaleX={scaleX}
          translateX={0}
          startBeat={clip.startBeat}
          beatCount={clip.beatCount}
          audioBpm={audioBpm}
          canDrag
          onResizeArgs={onResizeArgs}
        />
        <ResizeHandle
          id={clip.id}
          height={height}
          width={10 / scaleX}
          scaleX={scaleX}
          translateX={clip.beatCount}
          startBeat={clip.startBeat}
          beatCount={clip.beatCount}
          audioBpm={audioBpm}
          canDrag
          onResizeArgs={onResizeArgs}
        />
      </g>}

      {this.props.showGridMarkers && <g transform={`translate(${-audioStartBeat})`}>
        {map(clip.gridMarkers || [], (marker) =>
          <g key={marker.id} transform={`translate(${marker.beat})`}
            onMouseUp={this.handleGridMarkerClick.bind(this, marker)}>
            <rect x={-(marker.clickWidth / scaleX) / 2}
              width={marker.clickWidth / scaleX}
              height={height}
              fill='transparent' />
            <line style={{ stroke: marker.stroke, strokeWidth: marker.strokeWidth / scaleX }}
              y1={0}
              y2={height}
            />
          </g>
        )}
      </g>}
    </g>)
  }
}

SampleClip.defaultProps = {
  height: 100,
  color: 'green',
  sampleResolution: 1,
  scaleX: 1,
  gain: 1,
  canDrag: false,
  canResize: false,
  canEdit: false,
  isSelected: false,
  showGridMarkers: false
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
      id: props.clip.id,
      type: props.clip.type,
      startBeat: props.clip.startBeat,
      channel: props.channel
    }
  },
  isDragging (props, monitor) {
    const item = monitor.getItem()
    return item && item.id && (item.id === props.clip.id)
  },
  canDrag (props) {
    return props.canDrag
  },
  endDrag(props, monitor, component) {
    component.setState({
      dragX: null,
      dragY: null,
    })
  }
}

module.exports = DragSource('sample-clip', dragSource, collectDrag)(SampleClip)
