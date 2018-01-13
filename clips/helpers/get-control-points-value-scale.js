const d3 = require('d3')

const { 
  CONTROL_TYPE_GAIN,
  CONTROL_TYPE_LOW_BAND,
  CONTROL_TYPE_MID_BAND,
  CONTROL_TYPE_HIGH_BAND,
  CONTROL_TYPE_FILTER_HIGHPASS_CUTOFF,
  CONTROL_TYPE_FILTER_HIGHPASS_Q,
  CONTROL_TYPE_FILTER_LOWPASS_CUTOFF,
  CONTROL_TYPE_FILTER_LOWPASS_Q,
  CONTROL_TYPE_DELAY_CUTOFF
} = require('../constants')

module.exports = function getControlPointsValueScale(controlType) {
  let scale

  switch(controlType) {
    case CONTROL_TYPE_LOW_BAND:
    case CONTROL_TYPE_MID_BAND:
    case CONTROL_TYPE_HIGH_BAND:
      scale = d3.scaleLinear().domain([0, 1]).range([-40, 40]); break
    case CONTROL_TYPE_FILTER_HIGHPASS_Q:
    case CONTROL_TYPE_FILTER_LOWPASS_Q:
      scale = d3.scaleLinear().domain([0, 1]).range([0.001, 30]); break
    case CONTROL_TYPE_FILTER_HIGHPASS_CUTOFF:
    case CONTROL_TYPE_FILTER_LOWPASS_CUTOFF:
    case CONTROL_TYPE_DELAY_CUTOFF:
      scale = d3.scalePow().exponent(2.5).domain([0, 1]).range([10, 22050]); break
    default:
      scale = d3.scaleIdentity()
  }

  return scale.clamp ? scale.clamp(true) : scale
}
