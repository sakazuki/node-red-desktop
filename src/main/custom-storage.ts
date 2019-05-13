// @ts-ignore
import lfs = require("@node-red/runtime/lib/storage/localfilesystem");

module.exports = {
  init: lfs.init,
  getFlows: lfs.getFlows,
  saveFlows: lfs.saveFlows,
  getCredentials: lfs.getCredentials,
  saveCredentials: lfs.saveCredentials,
  getSettings: lfs.getSessions,
  saveSettings: lfs.saveSessions,
  getSessions: lfs.getSessions,
  saveSession: lfs.saveSession,
  getLibraryEntry: lfs.getLibraryEntry,
  saveLibraryEntry: lfs.saveLibraryEntry,
  projects: lfs.projects
}
