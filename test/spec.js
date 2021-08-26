const Application = require('spectron').Application
const assert = require('assert')
const electronPath = require('electron')


describe('Application launch', function() {
  this.timeout(60000)
  beforeEach(() => {
    this.app = new Application({
      path: electronPath,
      args: ['./dist']
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
