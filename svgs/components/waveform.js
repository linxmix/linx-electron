const React = require('react')
const d3 = require('d3')
const { isEqual } = require('lodash')

const getPeaks = require('../../samples/helpers/get-peaks')

class Waveform extends React.Component {
  
  shouldComponentUpdate(nextProps) {
    return !isEqual(nextProps, this.props)
  }

  render () {
    const { audioBuffer, startTime, endTime, length, height, beatCount, color, opacity } = this.props

    const peaks = getPeaks({
      audioBuffer,
      startTime,
      endTime,
      length
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

    return <path fill={color} d={area(peaks)} opacity={opacity} />
  }
}

Waveform.defaultProps = {
  audioBuffer: null,
  startTime: 0,
  endTime: 0,
  length: 0,
  beatCount: 0,
  height: 100,
  color: 'green',
  opacity: 1
}

module.exports = Waveform