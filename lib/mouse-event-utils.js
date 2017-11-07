module.exports = {
  isRightClick,
  getPosition
}

function isRightClick (e) {
  return e && e.nativeEvent && e.nativeEvent.which === 3
}

function getPosition ({ e, scaleX, height }) {
  const dim = e.target.getBoundingClientRect()
  const x = e.clientX - dim.left
  const y = e.clientY - dim.top

  return {
    beat: (x / scaleX),
    value: 1 - (y / height)
  }
}
