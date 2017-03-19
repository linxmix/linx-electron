const React = require('react')
const d3 = require('d3')
const { DragSource } = require('react-dnd')
const { throttle } = require('lodash')

const getPeaks = require('../../samples/helpers/get-peaks')
const { beatToTime } = require('../../lib/number-utils')

class SampleClip extends React.Component {
  render () {
    const { clip, height, color, resolution, connectDragSource } = this.props
    if (!clip || (clip.status !== 'loaded')) { return null }

    const { sample, audioStartTime, beatCount } = clip
    const { audioBuffer, meta: { bpm: audioBpm } } = sample
    const peaks = getPeaks({
      audioBuffer,
      startTime: audioStartTime,
      endTime: audioStartTime + beatToTime(beatCount, audioBpm),
      length: beatCount * resolution
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

    return connectDragSource(<g transform={`translate(${clip.startBeat})`}>
      <path fill={color} d={area(peaks)} />
    </g>)
  }
}

SampleClip.defaultProps = {
  height: 100,
  color: 'green',
  resolution: 1,
  canDrag: false
}

function collectDrag (connect, monitor) {
  return {
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging(),
    canDrag: monitor.canDrag()
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
  isDragging: throttle(function (props, monitor) {
    const item = monitor.getItem()
    const diff = monitor.getDifferenceFromInitialOffset()
    if (!item || !diff) { return false }

    const isDragging = item.id === props.clip.id
    isDragging && props.moveClip({
      id: props.clip.id,
      startBeat: diff.x + item.startBeat
    })

    return isDragging
  }, 10),
  canDrag (props) {
    return props.canDrag
  }
}

module.exports = DragSource('sample-clip', dragSource, collectDrag)(SampleClip)
