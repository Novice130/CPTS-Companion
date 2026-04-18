// fs-shim.cjs
module.exports = {
  readFileSync: () => { throw new Error('fs.readFileSync is not supported in Workers'); },
  exists: (path, cb) => cb(false),
  existsSync: () => false,
  readFile: (path, cb) => cb(new Error('fs.readFile is not supported')),
  stat: (path, cb) => cb(new Error('fs.stat is not supported')),
  statSync: () => { throw new Error('fs.statSync is not supported'); },
  promises: {
    readFile: async () => { throw new Error('fs.promises.readFile is not supported'); },
    stat: async () => { throw new Error('fs.promises.stat is not supported'); },
  }
};
