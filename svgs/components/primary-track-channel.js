const React = require('react')
const { map, filter } = require('lodash')

const SampleClip = require('./sample-clip')
const AutomationClip = require('./automation-clip')
const { CLIP_TYPE_SAMPLE, CLIP_TYPE_AUTOMATION } = require('../../clips/constants')

class PrimaryTrackChannel extends React.Component {
  render () {
    const { channel, color, beatScale,
      translateY, canDrag, height, showAutomations } = this.props
    if (!channel) { return null }

      console.log("CHANNEL", { channel })

    return <g transform={`translate(${channel.startBeat},${translateY})`}>
      {map(filter(channel.clips, { type: CLIP_TYPE_SAMPLE }), clip =>
        <SampleClip
          key={clip.id}
          clip={clip}
          beatScale={beatScale}
          color={color}
          height={height}
          canDrag={canDrag}
        />
      )}

      {showAutomations && map(filter(channel.clips, { type: CLIP_TYPE_AUTOMATION }), clip =>
        <AutomationClip
          key={clip.id}
          clip={clip}
          minBeat={channel.startBeat}
          maxBeat={channel.beatCount}
          beatScale={beatScale}
          color={color}
          height={height}
          canDrag={canDrag}
        />
      )}
    </g>
  }
}

PrimaryTrackChannel.defaultProps = {
  translateY: 0,
  canDrag: false,
  height: 100,
  showAutomations: false
}

module.exports = PrimaryTrackChannel
