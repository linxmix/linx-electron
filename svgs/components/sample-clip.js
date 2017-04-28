const React = require('react')
const d3 = require('d3')
const { map } = require('lodash')
const { DragSource } = require('react-dnd')

const getPeaks = require('../../samples/helpers/get-peaks')
const { beatToTime } = require('../../lib/number-utils')

class SampleClip extends React.Component {
  handleGridMarkerClick (marker, e) {
    console.log('handleGridMarkerClick', { marker, e })
    e.preventDefault()
    e.stopPropagation()

    this.props.selectGridMarker({ clip: this.props.clip, marker })
  }

  render () {
    const { clip, height, color, sampleResolution, scaleX, connectDragSource, isDragging } = this.props
    if (!clip || (clip.status !== 'loaded')) { return null }

    const { sample, startBeat, audioStartTime, beatCount } = clip
    const { audioBuffer, meta: { bpm: audioBpm } } = sample
    const peaks = getPeaks({
      audioBuffer,
      startTime: audioStartTime,
      endTime: audioStartTime + beatToTime(beatCount, audioBpm),
      length: beatCount * sampleResolution
    })

    const median = Math.ceil(height / 2.0)
    const area = d3.area()
      .x((peak, i) => {
        const percent = i / peaks.length
        const audioBeat = percent * beatCount

        // TODO: reverse process of what happens in createAudioGraph? map from audioBeat to mixBeat
        return audioBeat
      })
      .y0(([ ymin, ymax ]) => median + ymin * median)
      .y1(([ ymin, ymax ]) => median + ymax * median)

    return connectDragSource(<g transform={`translate(${startBeat})`}>
      <rect width={beatCount} height={height} fill='transparent' />
      <path fill={color} d={area(peaks)} opacity={isDragging ? 0.5 : 1} />

      {this.props.showGridMarkers && map(clip.gridMarkers || [], (marker) => 
        <g key={marker.id} transform={`translate(${marker.beat})`}
          onMouseUp={this.handleGridMarkerClick.bind(this, marker)}>
          <rect width={marker.clickWidth / scaleX} height={height} fill='transparent'/>
          <line
            style={{ stroke: marker.stroke, strokeWidth: marker.strokeWidth / scaleX }}
            y1={0}
            y2={height}
          />
        </g>
      )}
    </g>)
  }
}

SampleClip.defaultProps = {
  height: 100,
  color: 'green',
  sampleResolution: 1,
  scaleX: 1,
  canDrag: false,
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
      id: props.clip.id,
      type: props.clip.type,
      startBeat: props.clip.startBeat
    }
  },
  isDragging (props, monitor) {
    const item = monitor.getItem()
    return item && item.id && (item.id === props.clip.id)
  },
  canDrag (props) {
    return props.canDrag
  }
}

module.exports = DragSource('sample-clip', dragSource, collectDrag)(SampleClip)
