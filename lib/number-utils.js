module.exports = {
  isNumber,
  isValidNumber,
  validNumberOrDefault,
  clamp
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
