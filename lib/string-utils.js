const assert = require('assert')
const { isNil } = require('lodash')

module.exports = {
  pluralize
}

function pluralize (length, single, plural) {
  plural = plural || single + 's'

  assert('pluralize requires a singular string', single)
  assert('pluralize requires a length', !isNil(length))

  return (length === 1) ? single : plural
}

