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
  roundToNearestPowerOfTwo,
  mod
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
  return n * Math.round(x / n)

  // original implementation below - why more complicated?
  // const rest = mod(x, n)

  // if (rest <= (n / 2)) {
  //   return parseInt(x - rest)
  // } else {
  //   return parseInt(x + n - rest)
  // }
}

function _quantizeBeat ({ quantization, beat, timeSignature = 4 }) {
  let result

  switch (quantization) {
    case 'bar':
      result = roundTo(beat, timeSignature)
      break
    case 'beat':
      result = Math.round(beat)
      break
    default:
      result = beat
  }

  return result
}

function quantizeBeat ({ quantization, beat, offset, timeSignature = 4 }) {
  if (isValidNumber(offset)) {
    const offsetBeat = beat + offset
    const quantizedOffsetBeat = _quantizeBeat({ quantization, timeSignature, beat: offsetBeat })

    return quantizedOffsetBeat - offset
  } else {
    return _quantizeBeat({ quantization, beat, timeSignature })
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

// native javascript % is remainder instead of modulus (doesnt work with negative numbers)
function mod(n, m) {
  return ((n % m) + m) % m;
}
