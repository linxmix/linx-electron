const pify = require('pify')
const fs = pify(require('fs'))
const { join, basename, extname } = require('path')

module.exports = createService

function createService (config) {
  return {
    exportWav
  }

  function exportWav ({ fileName, recorderNode }) {
    fileName = fileName || `output-${Date.now()}`

    return new Promise((resolve, reject) => {
      return recorderNode.exportWAV((blob) => {
        _forceDownload(blob, `${fileName}.wav`)
        resolve()
      })
    })
  }
}

// adapted from Recorder.forceDownload, which stopped working
function _forceDownload(blob, fileName) {
  const url = (window.URL || window.webkitURL).createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = url
  link.download = fileName || 'output.wav'
  // const click = document.createEvent("Event")
  // click.initEvent("click", true, true)
  // link.dispatchEvent(click)
  link.click()
}
