const React = require('react')
const { map, merge, filter } = require('lodash')

const SampleClip = require('./sample-clip')
const AutomationClip = require('./automation-clip')
const { CLIP_TYPE_SAMPLE, CLIP_TYPE_AUTOMATION } = require('../../clips/constants')
const { isRightClick, getPosition } = require('../../lib/mouse-event-utils')

class TrackChannel extends React.Component {
  handleClick (e) {
    if (isRightClick(e)) {
      const { channel } = this.props
      e.preventDefault()
      e.stopPropagation()

      if (this.props.showAutomationControlType) {
        let { beat, value } = getPosition({ e, scaleX: this.props.scaleX, height: this.props.height })
        beat -= channel.parentChannel.startBeat

        this.props.createAutomationClipWithControlPoint({
          channelId: channel.id,
          minBeat: channel.startBeat,
          maxBeat: channel.beatCount,
          beat,
          value
        })
      } else if (this.props.canEditClips) {
        let { beat } = getPosition({ e, scaleX: this.props.scaleX, height: this.props.height })
        beat -= channel.parentChannel.startBeat

        this.props.createSampleClip({
          channelId: channel.id,
          sampleId: channel.sampleId,
          clipOptions: {
            startBeat: beat,
            beatCount: 8
          }
        })
      }
    }
  }

  render () {
    const { channel, color, beatScale, translateY, scaleX, sampleResolution, height, canEditClips, 
      canDragClips, canResizeClips, showAutomationControlType, showGridMarkers } = this.props
    if (!channel) { return null }

    return <g className="TrackChannel" onMouseUp={this.handleClick.bind(this)}>
      <rect transform={`translate(${-channel.parentChannel.startBeat},${translateY})`}
        height={height}
        width={this.props.mixBeatCount}
        fill="transparent"
      />

      <g transform={`translate(${channel.startBeat},${translateY})`}>
        {map(filter(channel.clips, { type: CLIP_TYPE_SAMPLE }), clip =>
          <SampleClip
            key={clip.id}
            clip={clip}
            scaleX={scaleX}
            beatScale={beatScale}
            color={color}
            sampleResolution={sampleResolution}
            height={height}
            canDrag={canDragClips}
            canResize={canResizeClips}
            canEdit={canEditClips}
            snipClip={options =>
              this.props.snipClip(merge({ channel }, options))}
            deleteClip={this.props.deleteClip}
            showGridMarkers={showGridMarkers}
            selectGridMarker={options =>
              this.props.selectGridMarker(merge({ channel }, options))}
          />
        )}

        {showAutomationControlType && map(filter(channel.clips, {
          type: CLIP_TYPE_AUTOMATION,
          controlType: showAutomationControlType
        }), clip =>
          <AutomationClip
            key={clip.id}
            clip={clip}
            scaleX={scaleX}
            minBeat={channel.startBeat}
            maxBeat={channel.beatCount}
            createControlPoint={this.props.createControlPoint}
            deleteControlPoint={this.props.deleteControlPoint}
            beatScale={beatScale}
            height={height}
            canDrag
          />
        )}
      </g>
    </g>
  }
}

TrackChannel.defaultProps = {
  channel: null,
  beatScale: null,
  translateY: 0,
  scaleX: 1,
  mixBeatCount: 0,
  height: 100,
  color: 'green',
  canDragClips: false,
  canResizeClips: false,
  canEditClips: false,
  showAutomationControlType: undefined,
  showGridMarkers: true
}

module.exports = TrackChannel
