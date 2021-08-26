const Application = require('spectron').Application
const assert = require('assert')

describe('Application launch', function() {
  this.timeout(60000)
  beforeEach(() => {
    const _path = (process.platform === "darwin") ? './release/mac/Node-RED-Desktop.app' : './release/win-unpacked/Node-RED-Desktop.exe'
    this.app = new Application({
      path: _path,
    })
    return this.app.start()
  })
  afterEach(() => {
    if (this.app && this.app.isRunning()) {
      return this.app.stop()
    }
  })
  it('shows an initial window', async () => {
    const count = await this.app.client.getWindowCount()
    assert.equal(count, 1)
  })
  it('has the correct title', async () => {
    const title = await this.app.client.getTitle()
    assert.equal(title, 'Node-RED-Desktop')
  })
})
