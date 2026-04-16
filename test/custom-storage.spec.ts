import { test } from '@playwright/test';
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CustomStorage = require('../dist/main/custom-storage');

test.describe('CustomStorage', () => {
  let tempDir: string;

  test.beforeEach(async () => {
    const tmpDir = path.join(os.tmpdir(), 'custom-storage-test-' + Date.now());
    await fs.promises.mkdir(tmpDir, { recursive: true });
    tempDir = tmpDir;
  });

  test.afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  test.describe('init', () => {
    test('should resolve paths and verify userDir is writable', async () => {
      const settings = { userDir: tempDir, flowFile: path.join(tempDir, 'flows.json') };
      await CustomStorage.init(settings, {});
    });

    test('should throw error if userDir is not writable', async () => {
      const invalidDir = '/invalid/path';
      const settings = { userDir: invalidDir, flowFile: path.join(invalidDir, 'flows.json') };
      try {
        await CustomStorage.init(settings, {});
        assert.fail('Should have thrown an error');
      } catch (err: any) {
        assert.ok(err.message.includes('not writable'));
      }
    });
  });

  test.describe('getFlows / saveFlows', () => {
    test('should return empty array when flow file does not exist', async () => {
      const settings = { userDir: tempDir, flowFile: path.join(tempDir, 'flows.json') };
      await CustomStorage.init(settings, {});
      const flows = await CustomStorage.getFlows();
      assert.deepEqual(flows, []);
    });

    test('should save and get flows', async () => {
      const settings = { userDir: tempDir, flowFile: path.join(tempDir, 'flows.json') };
      const testFlows = [{ id: '1', type: 'tab' }];
      await CustomStorage.init(settings, {});
      await CustomStorage.saveFlows(testFlows);
      const flows = await CustomStorage.getFlows();
      assert.deepEqual(flows, testFlows);
    });

    test('should recover from invalid flow JSON and archive the corrupt file', async () => {
      const flowFilePath = path.join(tempDir, 'flows.json');
      const settings = { userDir: tempDir, flowFile: flowFilePath };
      await CustomStorage.init(settings, {});
      await fs.promises.writeFile(flowFilePath, '{ invalid json', 'utf8');

      const flows = await CustomStorage.getFlows();
      assert.deepEqual(flows, []);

      const files = await fs.promises.readdir(tempDir);
      assert.equal(files.includes('flows.json'), false);
      assert.ok(files.some((name) => name.startsWith('flows.json.corrupt-')));
    });
  });

  test.describe('getCredentials / saveCredentials', () => {
    test('should return empty object when credentials file does not exist', async () => {
      const settings = { userDir: tempDir, flowFile: path.join(tempDir, 'flows.json') };
      await CustomStorage.init(settings, {});
      const creds = await CustomStorage.getCredentials();
      assert.deepEqual(creds, {});
    });

    test('should save and get credentials', async () => {
      const settings = { userDir: tempDir, flowFile: path.join(tempDir, 'flows.json') };
      const testCreds = { username: 'test', password: 'secret' };
      await CustomStorage.init(settings, {});
      await CustomStorage.saveCredentials(testCreds);
      const creds = await CustomStorage.getCredentials();
      assert.deepEqual(creds, testCreds);
    });
  });

  test.describe('getSettings / saveSettings', () => {
    test('should return empty object when settings file does not exist', async () => {
      const settings = { userDir: tempDir, flowFile: path.join(tempDir, 'flows.json') };
      await CustomStorage.init(settings, {});
      const settingsData = await CustomStorage.getSettings();
      assert.deepEqual(settingsData, {});
    });

    test('should save and get settings', async () => {
      const settings = { userDir: tempDir, flowFile: path.join(tempDir, 'flows.json') };
      const testSettings = { httpAdminRoot: '/admin', ui: { path: '/ui' } };
      await CustomStorage.init(settings, {});
      await CustomStorage.saveSettings(testSettings);
      const settingsData = await CustomStorage.getSettings();
      assert.deepEqual(settingsData, testSettings);
    });
  });

  test.describe('getSessions / saveSessions', () => {
    test('should return empty object when sessions file does not exist', async () => {
      const settings = { userDir: tempDir, flowFile: path.join(tempDir, 'flows.json') };
      await CustomStorage.init(settings, {});
      const sessions = await CustomStorage.getSessions();
      assert.deepEqual(sessions, {});
    });

    test('should save and get sessions', async () => {
      const settings = { userDir: tempDir, flowFile: path.join(tempDir, 'flows.json') };
      const testSessions = { user1: { expires: Date.now() + 3600000 } };
      await CustomStorage.init(settings, {});
      await CustomStorage.saveSessions(testSessions);
      const sessions = await CustomStorage.getSessions();
      assert.deepEqual(sessions, testSessions);
    });
  });

  test.describe('getLibraryEntry / saveLibraryEntry', () => {
    test('should return empty array when library directory does not exist', async () => {
      const settings = { userDir: tempDir, flowFile: path.join(tempDir, 'flows.json') };
      await CustomStorage.init(settings, {});
      const entries = await CustomStorage.getLibraryEntry('functions', '');
      assert.deepEqual(entries, []);
    });

    test('should save and get library entry', async () => {
      const settings = { userDir: tempDir, flowFile: path.join(tempDir, 'flows.json') };
      const testBody = 'function test() { return "hello"; }';
      await CustomStorage.init(settings, {});
      await CustomStorage.saveLibraryEntry('functions', 'test.js', {}, testBody);
      const content = await CustomStorage.getLibraryEntry('functions', 'test.js');
      assert.equal(content, testBody);
    });

    test('should list library entries', async () => {
      const settings = { userDir: tempDir, flowFile: path.join(tempDir, 'flows.json') };
      await CustomStorage.init(settings, {});
      await CustomStorage.saveLibraryEntry('functions', 'test1.js', {}, 'content1');
      await CustomStorage.saveLibraryEntry('functions', 'test2.js', {}, 'content2');
      const entries = await CustomStorage.getLibraryEntry('functions', '');
      assert.equal(entries.length, 2);
      assert.ok(entries.some((e: any) => e.fn === 'test1.js'));
      assert.ok(entries.some((e: any) => e.fn === 'test2.js'));
    });
  });
});
