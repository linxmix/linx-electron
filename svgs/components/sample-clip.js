const React = require('react')
const d3 = require('d3')
const { map, isEqual, omit } = require('lodash')
const { DragSource } = require('react-dnd')

const getPeaks = require('../../samples/helpers/get-peaks')
const { beatToTime, timeToBeat } = require('../../lib/number-utils')

class SampleClip extends React.Component {
  handleGridMarkerClick (marker, e) {
    e.preventDefault()
    e.stopPropagation()

    this.props.selectGridMarker({ clip: this.props.clip, marker })
  }

  // TODO(BEATGRID): need to make beatScale able to meet the equality check when unchanged
  // also do not omit scaleX
  shouldComponentUpdate(nextProps) {
    return !isEqual(
      omit(nextProps, ['connectDragSource', 'beatScale', 'selectGridMarker', 'scaleX']),
      omit(this.props, ['connectDragSource', 'beatScale', 'selectGridMarker', 'scaleX']))
  }

  render () {
    const { clip, height, color, sampleResolution, scaleX, connectDragSource, isDragging } = this.props
    if (!clip || (clip.status !== 'loaded')) { return null }

    const { sample, startBeat, audioStartTime, beatCount } = clip
    const { audioBuffer, meta: { bpm: audioBpm } } = sample
    const audioStartBeat = timeToBeat(audioStartTime, audioBpm)
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
        return audioBeat
      })
      .y0(([ ymin, ymax ]) => median + ymin * median)
      .y1(([ ymin, ymax ]) => median + ymax * median)

    return connectDragSource(<g transform={`translate(${startBeat})`}>
      <rect width={beatCount} height={height} fill='transparent' />
      <path fill={color} d={area(peaks)} opacity={isDragging ? 0.5 : 1} />

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
