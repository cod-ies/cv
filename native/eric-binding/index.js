'use strict';
/**
 * Promisified wrappers over the N-API callback-based functions in eric_addon.
 *
 * If the native .node file is not present (e.g. in test environments where
 * ERiC is mocked), this module re-exports a stub implementation so that the
 * rest of the application can still be imported and tested.
 */

let addon;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  addon = require('./build/Release/eric_addon.node');
} catch {
  // Stub: used when ERiC SDK is not installed (dev/test without native lib)
  addon = {
    init:      (_logPath, cb) => cb(null, 0),
    shutdown:  () => {},
    createKey: (_p, _pw, cb) => cb(null, 0),
    sende:     (_xml, _dav, cb) => cb(null, 0, '<EricResponse/>'),
  };
}

function init(logPath) {
  return new Promise((resolve, reject) => {
    addon.init(logPath, (err, rc) => (err ? reject(new Error(err)) : resolve(rc)));
  });
}

function shutdown() {
  addon.shutdown();
}

function createKey(certPath, password) {
  return new Promise((resolve, reject) => {
    addon.createKey(certPath, password, (err, rc) =>
      err ? reject(new Error(err)) : resolve(rc),
    );
  });
}

function sende(xmlData, datenartVersion) {
  return new Promise((resolve, reject) => {
    addon.sende(xmlData, datenartVersion, (err, returnCode, responseXml) =>
      err
        ? reject(new Error(err))
        : resolve({ returnCode, responseXml: responseXml ?? '' }),
    );
  });
}

module.exports = { init, shutdown, createKey, sende };
