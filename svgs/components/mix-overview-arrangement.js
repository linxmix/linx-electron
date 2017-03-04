const React = require('react')
const { map, sortBy } = require('lodash')
const d3 = require('d3')

const Playhead = require('./playhead')
const Axis = require('./axis')
const PrimaryTrackChannel = require('./primary-track-channel')
const TransitionChannel = require('./transition-channel')
const {
  CHANNEL_TYPE_PRIMARY_TRACK,
  CHANNEL_TYPE_TRANSITION
} = require('../../channels/constants')
const { validNumberOrDefault } = require('../../lib/number-utils')

const ZOOM_STEP = 0.2
const MIN_SCALE_X = 0.1

function _isNegative (n) {
  // So we can handle the mousewheel returning -0 or 0
  return ((n = +n) || 1 / n) < 0
}

class MixOverviewArrangement extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      scaleX: 1,
      translateX: 1,
      mouseMoveHandler: null,
      mouseUpHandler: null
    }
  }

  componentDidMount () {
    const mouseMoveHandler = this.handleMouseMove.bind(this)
    const mouseUpHandler = this.handleMouseUp.bind(this)

    document.addEventListener('mousemove', mouseMoveHandler)
    document.addEventListener('mouseup', mouseUpHandler)

    this.setState({
      mouseMoveHandler: mouseMoveHandler,
      mouseUpHandler: mouseUpHandler
    })
  }

  componentWillUnmount () {
    document.removeEventListener('mousemove', this.state.mouseMoveHandler)
    document.removeEventListener('mouseup', this.state.mouseUpHandler)

    this.setState({
      mouseMoveHandler: null,
      mouseUpHandler: null
    })
  }

  handleMouseDown (e) {
    this.setState({
      isDragging: true,
      dragCoords: {
        x: e.pageX,
        y: e.pageY
      }
    })
  }

  handleMouseUp () {
    this.setState({
      isDragging: false,
      dragCoords: {}
    })
  }

  handleMouseMove (e) {
    if (!this.state.isDragging) { return }

    e.preventDefault()
    e.stopPropagation()

    const xDiff = this.state.dragCoords.x - e.pageX
    this.setState({
      translateX: this.state.translateX - xDiff,
      dragCoords: {
        x: e.pageX,
        y: e.pageY
      }
    })
  }

  handleMouseWheel (e) {
    e.preventDefault()
    e.stopPropagation()

    let scaleX = this.state.scaleX
    if (_isNegative(e.deltaY)) {
      scaleX += ZOOM_STEP * scaleX
    } else {
      scaleX -= ZOOM_STEP * scaleX
    }
    scaleX = Math.max(MIN_SCALE_X, scaleX)

    const factor = 1 - (scaleX / this.state.scaleX)
    const mouseX = e.nativeEvent.offsetX

    this.setState({
      scaleX,
      translateX: this.state.translateX + ((mouseX - this.state.translateX) * factor)
    })
  }

  handleClick (e) {
    const { mix, seekToBeat } = this.props
    const { translateX, scaleX } = this.state
    const mouseX = e.nativeEvent.offsetX

    seekToBeat({
      channel: mix.channel,
      seekBeat: (mouseX - translateX) / scaleX
    })
  }

  render () {
    const { mix, audioContext, height } = this.props
    const { scaleX, translateX } = this.state
    if (!mix) { return null }

    const transform = `translate(${translateX}) scale(${scaleX}, 1)`
    const mixBeatCount = validNumberOrDefault(mix.channel && mix.channel.beatCount, 0)
    const mixPhraseCount = mixBeatCount / 32  // TODO: need to round?
    const phraseScale = d3.scaleLinear()
      .domain([0, mixPhraseCount])
      .range([0, mixBeatCount])

    return <div
      onMouseDown={this.handleMouseDown.bind(this)}
      onMouseUp={this.handleMouseUp.bind(this)}
      onWheel={this.handleMouseWheel.bind(this)}>

      <svg
        onClick={this.handleClick.bind(this)}
        width='100%'
        height={height}
        style={{ border: '1px solid gray' }}
        ref='svg'>

        <g transform={transform} >
          <Axis
            scale={phraseScale}
            tickCount={mixPhraseCount}
            height={height}
            strokeWidth={1 / scaleX}
          />

          {map(sortBy(mix.channel.channels, ['startBeat', 'id']), (channel, i, channels) => {
            let Element
            switch (channel.type) {
              case CHANNEL_TYPE_PRIMARY_TRACK:
                Element = PrimaryTrackChannel; break
              case CHANNEL_TYPE_TRANSITION:
                Element = TransitionChannel; break
            }
            return Element ? <Element
              key={channel.id}
              channel={channel}
              color={d3.interpolateCool(i / channels.length)}
              /> : null
          })}

          <Playhead
            playState={mix.playState}
            audioContext={audioContext}
            height={height}
            strokeWidth={1.5 / scaleX}
          />
        </g>
      </svg>
    </div>
  }
}

MixOverviewArrangement.defaultProps = {
  height: 100
}

module.exports = MixOverviewArrangement