const React = require('react')
const d3 = require('d3')

const getPeaks = require('../../samples/helpers/get-peaks')

class SampleClip extends React.Component {
  render () {
    const { clip, height, color, resolution, xScale } = this.props
    if (!clip || (clip.status !== 'loaded')) { return null }

    const { sample, audioStartTime, beatCount } = clip
    const { audioBuffer } = sample
    const peaks = getPeaks({
      audioBuffer,
      startTime: audioStartTime,
      endTime: audioBuffer.duration, // TODO: calculate from beatCount
      length: beatCount * resolution * xScale
    })

    const median = Math.ceil(height / 2.0)
    const area = d3.area()
      .x((peak, i) => {
        const percent = i / peaks.length
        const beat = percent * peaks.length
        return beat
      })
      .y0(([ ymin, ymax ]) => median + ymin * median)
      .y1(([ ymin, ymax ]) => median + ymax * median)

    return <g>
      <path fill={color} d={area(peaks)} />
    </g>
  }
}

SampleClip.defaultProps = {
  height: 100,
  color: 'green',
  resolution: 10,
  xScale: 1
}

module.exports = SampleClip
