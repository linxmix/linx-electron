const nestChannels = require('../../channels/helpers/nest')

module.exports = nest

function nest ({ mixId, channelId, channels, clips }) {
  return {
    id: mixId,
    channel: nestChannels({ channelId, channels, clips })
  }
}
