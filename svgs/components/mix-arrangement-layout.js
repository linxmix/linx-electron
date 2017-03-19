const React = require('react')
const d3 = require('d3')

const Axis = require('./axis')
const Playhead = require('./playhead')
const { validNumberOrDefault } = require('../../lib/number-utils')

const ZOOM_STEP = 0.2
const MIN_SCALE_X = 0.1

function _isNegative (n) {
  // So we can handle the mousewheel returning -0 or 0
  return ((n = +n) || 1 / n) < 0
}

class MixArrangementOverview extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      scaleX: 1,
      translateX: 1,
      mouseMoveHandler: null,
      mouseUpHandler: null,
      isDragging: false,
      dragCoords: null
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
      dragCoords: {
        x: e.pageX,
        y: e.pageY
      }
    })
  }

  handleMouseUp (e) {
    if (this.state.dragCoords) {
      e.preventDefault()
      e.stopPropagation()
    }

    this.setState({
      isDragging: false,
      dragCoords: null
    })
  }

  handleMouseMove (e) {
    if (!this.state.dragCoords) { return }

    e.preventDefault()
    e.stopPropagation()

    const xDiff = this.state.dragCoords.x - e.pageX
    this.setState({
      isDragging: true,
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
    if (this.state.isDragging) { return }

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
    if (!(mix && mix.channel)) { return null }

    const transform = `translate(${translateX}) scale(${scaleX}, 1)`
    const beatScale = mix.channel.beatScale
    const mixBeatCount = validNumberOrDefault(mix.channel.beatCount, 0)
    const mixPhraseCount = mixBeatCount / 32  // TODO: need to round?
    const phraseScale = d3.scaleLinear()
      .domain([0, mixPhraseCount])
      .range([0, mixBeatCount])

    return <div
      onMouseDown={this.handleMouseDown.bind(this)}
      onWheel={this.handleMouseWheel.bind(this)}>

      <svg
        onMouseUp={this.handleClick.bind(this)}
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

          {this.props.children}

          <Playhead
            playState={mix.playState}
            beatScale={beatScale}
            audioContext={audioContext}
            height={height}
            strokeWidth={1.5 / scaleX}
          />
        </g>
      </svg>
    </div>
  }
}

MixArrangementOverview.defaultProps = {
  height: 100
}

module.exports = MixArrangementOverview
