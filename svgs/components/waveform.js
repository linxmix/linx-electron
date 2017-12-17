const React = require('react')
const d3 = require('d3')
const { isEqual } = require('lodash')

const getPeaks = require('../../samples/helpers/get-peaks')

class Waveform extends React.Component {
  
  shouldComponentUpdate(nextProps) {
    return !isEqual(nextProps, this.props)
  }

  render () {
    const { audioBuffer, startTime, endTime, length, height, beatCount, gain, color, opacity } = this.props

    const peaks = getPeaks({
      audioBuffer,
      startTime,
      endTime,
      length
    })

    const median = Math.ceil(height / 2.0)
    const area = d3.area()
      .x((peak, i) => {
        const percent = i / (peaks.length - 1)
        const audioBeat = percent * beatCount
        return audioBeat
      })
      .y0(([ ymin, ymax ]) => median + ymin * median * gain)
      .y1(([ ymin, ymax ]) => median + ymax * median * gain)

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
  opacity: 1,
  gain: 1
}

module.exports = Waveform
