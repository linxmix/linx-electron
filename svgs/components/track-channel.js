const React = require('react')
const { get, map, find, assign, filter, includes } = require('lodash')

const SampleClip = require('./sample-clip')
const AutomationClip = require('./automation-clip')
const { CLIP_TYPE_SAMPLE, CLIP_TYPE_AUTOMATION } = require('../../clips/constants')
const { isRightClick, getPosition } = require('../../lib/mouse-event-utils')

class TrackChannel extends React.Component {
  handleClick (e) {
    const { showAutomationControlType, canEditClips, channel } = this.props

    if (isRightClick(e) && (showAutomationControlType || canEditClips)) {
      e.preventDefault()
      e.stopPropagation()

      let { beat, value } = getPosition({
        e,
        target: this.clipsGroupElement,
        scaleX: this.props.scaleX,
        height: this.props.height
      })

      // subtract this because the clipsGroup target is offset this amount
      beat += this.props.clickBoxTranslateX

      if (showAutomationControlType) {
        const automationClip = find(channel.clips, { controlType: showAutomationControlType })

        if (automationClip) {
          this.props.createControlPoint({
            sourceId: automationClip.id,
            minBeat: channel.minBeat,
            maxBeat: channel.maxBeat,
            beat,
            value
          })
        } else {
          this.props.createAutomationClipWithControlPoint({
            channelId: channel.id,
            minBeat: channel.minBeat,
            maxBeat: channel.maxBeat,
            beat,
            value
          })
        }

      } else if (canEditClips) {
        const selectedClip = this.props.selectedClip

        let clipOptions
        if (selectedClip) {
          clipOptions = {
            startBeat: beat,
            beatCount: selectedClip.beatCount,
            audioStartTime: selectedClip.audioStartTime
          }
        } else {
          clipOptions = {
            startBeat: beat
          }
        }

        this.props.createSampleClip({
          clipOptions,
          channelId: channel.id,
          sampleId: channel.sampleId,
        })
      }
    }
  }

  render () {
    const { channel, color, beatScale, translateY, scaleX, sampleResolution, height, canEditClips, 
      canDragClips, canResizeClips, showAutomationControlType, showGridMarkers } = this.props
    if (!channel) { return null }

    const selectedClipId = get(this.props.selectedClip, 'id')

    return <g className="TrackChannel"
      onMouseUp={this.handleClick.bind(this)}>
      {(showAutomationControlType || canEditClips) &&
        <rect transform={`translate(${this.props.clickBoxTranslateX},${translateY})`}
          height={height}
          width={this.props.clickBoxWidth}
          fill="transparent"
          ref={(element) => { this.clipsGroupElement = element }}
        />
      }

      <g transform={`translate(${channel.startBeat},${translateY})`}>
        {map(filter(channel.clips, { type: CLIP_TYPE_SAMPLE }), clip =>
          <SampleClip
            key={clip.id}
            clip={clip}
            channel={channel}
            scaleX={scaleX}
            beatScale={beatScale}
            color={color}
            sampleResolution={sampleResolution}
            height={height}
            gain={channel.gain}
            canDrag={canDragClips}
            canResize={canResizeClips}
            canEdit={canEditClips}
            isSelected={selectedClipId && selectedClipId === clip.id}
            snipClip={options =>
              this.props.snipClip(assign({ channel }, options))}
            deleteClip={options =>
              this.props.deleteClip(assign({ channel }, options))}
            selectClip={options =>
              this.props.selectClip(assign({ channel }, options))}
            showGridMarkers={showGridMarkers}
            selectGridMarker={options =>
              this.props.selectGridMarker(assign({ channel }, options))}
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
            minBeat={channel.minBeat}
            maxBeat={channel.maxBeat}
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
  selectedClip: null,
  clickBoxTranslateX: 0,
  clickBoxWidth: 0,
  translateY: 0,
  scaleX: 1,
  height: 100,
  color: 'green',
  canDragClips: false,
  canResizeClips: false,
  canEditClips: false,
  showAutomationControlType: undefined,
  showGridMarkers: true
}

module.exports = TrackChannel
