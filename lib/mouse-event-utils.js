module.exports = {
  isRightClick
}

function isRightClick (e) {
  return e && e.nativeEvent && e.nativeEvent.which === 3
}

