const React = require('react')
const { DragSource } = require('react-dnd')
const uuid = require('uuid/v4')
const { map } = require('lodash')

const { isValidNumber } = require('../../lib/number-utils')

// TODO: does this really belong under svgs/? its not an svg
class AutomationControl extends React.Component {
  handleChangeBeat (e) {
    const newBeat = parseFloat(e.target.value)

    if (isValidNumber(newBeat) && (newBeat !== this.props.beat)) {
      this.props.updateBeat(newBeat)
    }
  }

  onBeatInputMouseLeave (e) {
    // this.beatInputElement.blur()
  }

  handleChangeValue (e) {
    const newValue = parseFloat(e.target.value)

    if (isValidNumber(newValue) && (newValue !== this.props.value)) {
      this.props.updateValue(newValue)
    }
  }

  onValueInputMouseLeave (e) {
    // this.valueInputElement.blur()
  }

  render () {
    const { height, width, minBeat, maxBeat, beat, value, controlType,
      minValue, maxValue } = this.props
    const beatInputId = uuid()
    const valueInputId = uuid()

    return <div className="AutomationControl" style={{ height, width }}>
      <span className="u-multiline-ellipsis-1" title={controlType}>
        {controlType}
      </span>

      <div>
        <span onMouseLeave={this.onBeatInputMouseLeave.bind(this)}>
          <input id={beatInputId}
            type='number'
            value={beat}
            onChange={this.handleChangeBeat.bind(this)}
            step={0.1}
            ref={(element) => { this.beatInputElement = element }}
          />
          <label htmlFor={beatInputId}>Beat</label>
        </span>
      </div>
      <div style={{ marginBottom: '5px' }}>
        Min: {minBeat} | Max: {maxBeat}
      </div>

      <div>
        <span onMouseLeave={this.onValueInputMouseLeave.bind(this)}>
          <input id={valueInputId}
            type='number'
            value={value}
            onChange={this.handleChangeValue.bind(this)}
            step={0.1}
            ref={(element) => { this.valueInputElement = element }}
          />
          <label htmlFor={valueInputId}>Value</label>
        </span>
      </div>
      <div>
        Min: {minValue} | Max: {maxValue}
      </div>
    </div>
  }
}

AutomationControl.defaultProps = {
  height: 100,
  width: '100%',
  beat: 0,
  value: 0,
  minBeat: 0,
  maxBeat: 0,
  minValue: 0,
  maxValue: 0,
  controlType: '',
}

module.exports = AutomationControl
