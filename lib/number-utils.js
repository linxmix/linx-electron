module.exports = {
  isNumber,
  isValidNumber,
  validNumberOrDefault,
  clamp,
  bpmToBps,
  beatToTime,
  timeToBeat,
  bpmToSpb
}

function isNumber (number) {
  return typeof (number) === 'number'
}

function isValidNumber (number) {
  return isNumber(number) && isFinite(number)
}

function validNumberOrDefault (number, _default) {
  return isValidNumber(number) ? number : _default
}

function clamp (min, n, max) {
  if (n < min) {
    return min
  } else if (n > max) {
    return max
  } else {
    return n
  }
}

function bpmToBps (bpm) {
  return bpm / 60.0
};

function beatToTime (beat, bpm) {
  var bps = bpmToBps(bpm)
  return beat * (1.0 / bps)
}

function timeToBeat (time, bpm) {
  var bps = bpmToBps(bpm)
  return time * bps
}

function bpmToSpb (bpm) {
  return 1.0 / bpmToBps(bpm)
}
