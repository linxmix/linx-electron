module.exports = {
  isNumber,
  isValidNumber,
  validNumberOrDefault,
  clamp,
  bpmToBps,
  beatToTime,
  timeToBeat,
  bpmToSpb,
  roundTo,
  quantizeBeat,
  roundToNearestPowerOfTwo
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
}

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

function roundTo (x, n) {
  const rest = x % n

  if (rest <= (n / 2)) {
    return parseInt(x - rest)
  } else {
    return parseInt(x + n - rest)
  }
}

function quantizeBeat ({ quantization = 'bar', beat, timeSignature = 4 }) {
  switch (quantization) {
    case 'bar':
      return roundTo(beat, timeSignature)
    case 'beat':
      return Math.round(beat)
    case 'sample':
      return beat
  }
}

function roundToNearestPowerOfTwo (n) {
  n--
  n |= n >> 1
  n |= n >> 2
  n |= n >> 4
  n |= n >> 8
  n |= n >> 16
  n++
  return n
}
