const React = require('react')
const d3 = require('d3')

const getPeaks = require('../../samples/helpers/get-peaks')
const { beatToTime } = require('../../lib/number-utils')

class SampleClip extends React.Component {
  render () {
    const { clip, beatScale, height, color, resolution } = this.props
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

    return <g transform={`translate(${clip.startBeat})`}>
      <path fill={color} d={area(peaks)} />
    </g>
  }
}

SampleClip.defaultProps = {
  height: 100,
  color: 'green',
  resolution: 3
}

module.exports = SampleClip
