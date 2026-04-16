import log from './log';

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

let userDir: string;
let flowFile: string;

async function readJsonFile(file: string, defaultValue: any): Promise<any> {
  return fs.readFile(file, 'utf8')
    .then((data: string) => {
      if (!data.trim()) {
        return defaultValue;
      }
      try {
        return JSON.parse(data);
      } catch (err: any) {
        const backupFile = `${file}.corrupt-${Date.now()}`;
        log.warn(`Invalid JSON in ${file}; archiving corrupt file as ${path.basename(backupFile)}`);
        return fs.rename(file, backupFile)
          .then(() => defaultValue)
          .catch((renameErr: any) => {
            log.error(renameErr, `Failed to archive corrupt file ${file}`);
            return defaultValue;
          });
      }
    })
    .catch((err: any) => {
      if (err.code === 'ENOENT') {
        return defaultValue;
      }
      throw err;
    });
}

function init(settings: any, runtime: any): Promise<void> {
  userDir = settings.userDir;
  flowFile = settings.flowFile;
  // Verify userDir exists and is writable
  return fs.access(userDir, fs.constants.W_OK)
    .catch((err: any) => {
      throw new Error(`userDir ${userDir} is not writable: ${err.message}`);
    });
}

function getFlows(): Promise<any[]> {
  return readJsonFile(flowFile, []);
}

function saveFlows(flows: any[]): Promise<void> {
  const data = JSON.stringify(flows, null, 2);
  const tempFile = path.join(os.tmpdir(), `flows-${Date.now()}.json`);
  return fs.writeFile(tempFile, data)
    .then(() => fs.rename(tempFile, flowFile));
}

function getCredentials(): Promise<any> {
  const credFile = path.join(userDir, 'credentials.json');
  return readJsonFile(credFile, {});
}

function saveCredentials(creds: any): Promise<void> {
  const data = JSON.stringify(creds, null, 2);
  const credFile = path.join(userDir, 'credentials.json');
  const tempFile = path.join(os.tmpdir(), `credentials-${Date.now()}.json`);
  return fs.writeFile(tempFile, data)
    .then(() => fs.rename(tempFile, credFile));
}

function getSettings(): Promise<any> {
  const settingsFile = path.join(userDir, 'settings.json');
  return readJsonFile(settingsFile, {});
}

function saveSettings(settings: any): Promise<void> {
  const data = JSON.stringify(settings, null, 2);
  const settingsFile = path.join(userDir, 'settings.json');
  const tempFile = path.join(os.tmpdir(), `settings-${Date.now()}.json`);
  return fs.writeFile(tempFile, data)
    .then(() => fs.rename(tempFile, settingsFile));
}

function getSessions(): Promise<any> {
  const sessionsFile = path.join(userDir, 'sessions.json');
  return readJsonFile(sessionsFile, {});
}

function saveSessions(sessions: any): Promise<void> {
  const data = JSON.stringify(sessions, null, 2);
  const sessionsFile = path.join(userDir, 'sessions.json');
  const tempFile = path.join(os.tmpdir(), `sessions-${Date.now()}.json`);
  return fs.writeFile(tempFile, data)
    .then(() => fs.rename(tempFile, sessionsFile));
}

function getLibraryEntry(type: string, name: string): Promise<any> {
  const libDir = path.join(userDir, 'lib', type);
  if (!name) {
    // List entries
    return fs.readdir(libDir)
      .then((files: string[]) => {
        return files.map((f) => ({ fn: f }));
      })
      .catch((err: any) => {
        if (err.code === 'ENOENT') {
          return [];
        } else {
          throw err;
        }
      });
  } else {
    // Get file content
    const filePath = path.join(libDir, name);
    return fs.readFile(filePath, 'utf8');
  }
}

function saveLibraryEntry(type: string, name: string, meta: any, body: string): Promise<void> {
  const libDir = path.join(userDir, 'lib', type);
  const filePath = path.join(libDir, name);
  return fs.mkdir(libDir, { recursive: true })
    .then(() => {
      const tempFile = path.join(os.tmpdir(), `lib-${Date.now()}`);
      return fs.writeFile(tempFile, body)
        .then(() => fs.rename(tempFile, filePath));
    });
}

export {
  init,
  getFlows,
  saveFlows,
  getCredentials,
  saveCredentials,
  getSettings,
  saveSettings,
  getSessions,
  saveSessions,
  getLibraryEntry,
  saveLibraryEntry
};
