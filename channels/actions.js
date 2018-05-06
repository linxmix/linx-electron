const { createActions } = require('redux-actions')

module.exports = createActions(
  'SET_CHANNELS',
  'SET_CHANNEL',
  'UNSET_CHANNELS',
  'UNSET_CHANNEL',
  'UNDIRTY_CHANNELS',
  'UNDIRTY_CHANNEL',
  'CREATE_CHANNEL',
  'UPDATE_CHANNEL',
  'UPDATE_CHANNELS',
  'MOVE_CHANNEL',
  'SET_CLIPS_CHANNEL',
  'REMOVE_CLIPS_FROM_CHANNEL',
  'SET_CHANNELS_PARENT',
  'SWAP_CHANNELS',
  'MOVE_TRACK_GROUP',
  'SPLIT_TRACK_GROUP',
  'SNIP_CLIP_AND_SPLIT_TRACK_GROUP',
  'INSERT_CHANNEL_AT_INDEX',
  'CREATE_TRACK_GROUP_FROM_FILE',
  'CREATE_SAMPLE_TRACK_FROM_FILE'
)
