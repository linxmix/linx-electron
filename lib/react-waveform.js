const React = require('react')

class Waveform extends React.Component {
  render () {
    const { audioBuffer, height, start, zoom, color } = this.props
    const data = audioBuffer.getChannelData(0)
    const width = Math.ceil(audioBuffer.duration * (zoom / 1))
    const path = getPathForData(data, width, height, start)

    return <svg height={height} width={width}>
      <path fill={color} d={path} />
    </svg>
  }
}

Waveform.propTypes = {
  audioBuffer: React.PropTypes.object.isRequired,
  // width: React.PropTypes.number,
  height: React.PropTypes.number,
  zoom: React.PropTypes.number,
  color: React.PropTypes.string
}

Waveform.defaultProps = {
  audioBuffer: null,
  // width: 500,
  height: 100,
  start: 0,
  zoom: 1,
  color: 'black'
}

module.exports = Waveform

/*
set viewbox height as -1.0 to 1.0
set viewbox width as 0 to (data.length / zoom)
*/
function getPathForData (data, width, height, start) {
  // TODO why?
  width += 1

  var step = Math.ceil(data.length / width)
  var amp = (height / 2)

  var maxValues = []
  var minValues = []

  for (var i = 0; i < width; i++) {
    var min = 1.0
    var max = -1.0
    var defined = false

    for (var j = 0; j < step; j++) {
      var datum = data[(i * step) + j]
      if (datum < min) {
        min = datum
        defined = true
      }
      if (datum > max) {
        max = datum
        defined = true
      }
    }

    if (defined) {
      maxValues[i] = max
      minValues[i] = min
    } else {
      maxValues[i] = 0
      minValues[i] = 0
    }
  }

  // start point
  var result = 'M ' + (start - 1) + ',' + (height / 2)

  // top
  maxValues.forEach(function (val, i) {
    result += ' L' + (i + start) + ',' + Math.round(amp + (val * amp))
  })

  // end point
  result += ' L' + (width + start) + ',' + (height / 2)

  // bottom
  minValues.reverse().forEach(function (val, i) {
    result += ' L' + (width + start - i - 1) + ',' + Math.round(amp + (val * amp))
  })

  return result + ' Z'
}
