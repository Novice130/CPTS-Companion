import * as esbuild from 'esbuild';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nativeBuiltins = [
  'assert', 'async_hooks', 'buffer', 'crypto', 'diagnostics_channel', 
  'events', 'path', 'process', 'querystring', 'stream', 'string_decoder', 
  'timers', 'util', 'url', 'zlib', 'http', 'net'
];

async function build() {
  console.log('Building Worker with CJS onLoad Shims...');
  
  const distDir = path.resolve(__dirname, '../dist');

  if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);

  const nodeShimPlugin = {
    name: 'node-shim',
    setup(build) {
      // Shim unsupported modules
      build.onResolve({ filter: /^(node:)?(https|tls|os|fs|tty)$/ }, args => {
        const name = args.path.replace(/^node:/, '');
        return { path: `virtual-shim:${name}`, namespace: 'node-shim' };
      });

      // Redirect bare builtins (require('stream')) → node:stream so they hit external list
      const bareBuiltins = new Set([
        'assert', 'async_hooks', 'buffer', 'crypto', 'diagnostics_channel',
        'events', 'path', 'process', 'querystring', 'stream', 'string_decoder',
        'timers', 'util', 'url', 'zlib', 'http', 'net'
      ]);
      build.onResolve({ filter: /.*/ }, args => {
        if (bareBuiltins.has(args.path)) {
          return { path: `node:${args.path}`, external: true };
        }
      });

      build.onLoad({ filter: /.*/, namespace: 'node-shim' }, args => {
        const name = args.path.replace(/^virtual-shim:/, '');
        
        let contents = '';
        if (name === 'http' || name === 'https') {
          contents = `
            exports.METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
            exports.STATUS_CODES = {};
            exports.IncomingMessage = class {};
            exports.ServerResponse = class {};
            exports.Agent = class {};
            exports.globalAgent = {};
            exports.validateHeaderName = () => {};
            exports.validateHeaderValue = () => {};
            exports.createServer = () => ({ listen: () => ({}), on: () => ({}), address: () => ({}) });
            exports.request = () => ({ on: () => ({}), end: () => ({}), write: () => ({}) });
          `;
        } else if (name === 'net' || name === 'tls') {
          contents = `
            exports.isIP = () => 0;
            exports.Socket = class { connect() { return this; } on() { return this; } };
            exports.Server = class { listen() { return this; } on() { return this; } };
            exports.createServer = () => ({ listen: () => ({}), on: () => ({}) });
            exports.createConnection = () => ({ on: () => ({}) });
          `;
        } else if (name === 'os') {
          contents = `
            exports.hostname = () => 'cloudflare-worker';
            exports.type = () => 'Workers';
            exports.platform = () => 'browser';
            exports.arch = () => 'v8';
            exports.release = () => '1.0.0';
            exports.uptime = () => 0;
            exports.loadavg = () => [0, 0, 0];
            exports.totalmem = () => 128 * 1024 * 1024;
            exports.freemem = () => 64 * 1024 * 1024;
            exports.cpus = () => [{ model: 'v8', speed: 0, times: {} }];
            exports.networkInterfaces = () => ({});
            exports.homedir = () => '/';
            exports.tmpdir = () => '/tmp';
            exports.endianness = () => 'LE';
          `;
        } else if (name === 'fs') {
          contents = `
            exports.readFileSync = () => '';
            exports.existsSync = () => false;
            exports.promises = {};
          `;
        } else if (name === 'tty') {
          contents = `
            exports.isatty = () => false;
          `;
        }

        return { contents, loader: 'js' };
      });
    },
  };

  try {
    await esbuild.build({
      entryPoints: ['worker.ts'],
      bundle: true,
      outfile: 'dist/_worker.js',
      format: 'esm', 
      target: 'es2024',
      platform: 'browser', 
      mainFields: ['module', 'main'],
      conditions: ['worker', 'browser', 'node'],
      plugins: [nodeShimPlugin],
      external: [
        'cloudflare:*',
        ...nativeBuiltins.map(b => `node:${b}`)
      ],
      alias: {
        'iconv-lite': path.join(__dirname, 'iconv-lite-shim.ts'),
        'ejs': path.join(__dirname, 'empty.ts'),
        'express-ejs-layouts': path.join(__dirname, 'empty.ts'),
        'depd': path.join(__dirname, 'depd-shim.cjs'),
        // Workers have native WebSocket; ws is only needed in Node dev
        'ws': path.join(__dirname, 'empty.ts'),
      },
      inject: [path.join(__dirname, 'node-globals.ts')],
      define: {
        'process.env.NODE_ENV': '"production"',
        'process.env.CF_PAGES': '"1"',
        'global': 'globalThis',
      },
      keepNames: true,
      sourcemap: true,
      banner: {
        js: `
import * as _n_assert from "node:assert";
import * as _n_async_hooks from "node:async_hooks";
import * as _n_buffer from "node:buffer";
import * as _n_crypto from "node:crypto";
import * as _n_diagnostics_channel from "node:diagnostics_channel";
import * as _n_events from "node:events";
import * as _n_path from "node:path";
import * as _n_process from "node:process";
import * as _n_querystring from "node:querystring";
import * as _n_stream from "node:stream";
import * as _n_string_decoder from "node:string_decoder";
import * as _n_timers from "node:timers";
import * as _n_util from "node:util";
import * as _n_url from "node:url";
import * as _n_zlib from "node:zlib";
import * as _n_http from "node:http";
import * as _n_net from "node:net";

const _native_builtins = {
  "assert": _n_assert, "node:assert": _n_assert,
  "async_hooks": _n_async_hooks, "node:async_hooks": _n_async_hooks,
  "buffer": _n_buffer, "node:buffer": _n_buffer,
  "crypto": _n_crypto, "node:crypto": _n_crypto,
  "diagnostics_channel": _n_diagnostics_channel, "node:diagnostics_channel": _n_diagnostics_channel,
  "events": _n_events, "node:events": _n_events,
  "path": _n_path, "node:path": _n_path,
  "process": _n_process, "node:process": _n_process,
  "querystring": _n_querystring, "node:querystring": _n_querystring,
  "stream": _n_stream, "node:stream": _n_stream,
  "string_decoder": _n_string_decoder, "node:string_decoder": _n_string_decoder,
  "timers": _n_timers, "node:timers": _n_timers,
  "util": _n_util, "node:util": _n_util,
  "url": _n_url, "node:url": _n_url,
  "zlib": _n_zlib, "node:zlib": _n_zlib,
  "http": _n_http, "node:http": _n_http,
  "net": _n_net, "node:net": _n_net
};

globalThis.require = (id) => {
  const mod = _native_builtins[id];
  if (mod) return mod.default || mod;
  throw new Error('Dynamic require of "' + id + '" is not supported in this Worker.');
};
`
      },
      logLevel: 'info',
    });
    console.log('Build complete: dist/_worker.js');
  } catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
  }
}

build();
