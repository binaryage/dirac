"use strict";
/**
 * Copyright 2020 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserRunner = void 0;
const Debug_js_1 = require("../common/Debug.js");
const rimraf_1 = __importDefault(require("rimraf"));
const childProcess = __importStar(require("child_process"));
const assert_js_1 = require("../common/assert.js");
const helper_js_1 = require("../common/helper.js");
const Connection_js_1 = require("../common/Connection.js");
const WebSocketTransport_js_1 = require("../common/WebSocketTransport.js");
const PipeTransport_js_1 = require("./PipeTransport.js");
const readline = __importStar(require("readline"));
const Errors_js_1 = require("../common/Errors.js");
const util_1 = require("util");
const removeFolderAsync = util_1.promisify(rimraf_1.default);
const debugLauncher = Debug_js_1.debug('puppeteer:launcher');
const PROCESS_ERROR_EXPLANATION = `Puppeteer was unable to kill the process which ran the browser binary.
This means that, on future Puppeteer launches, Puppeteer might not be able to launch the browser.
Please check your open processes and ensure that the browser processes that Puppeteer launched have been killed.
If you think this is a bug, please report it on the Puppeteer issue tracker.`;
class BrowserRunner {
    constructor(executablePath, processArguments, tempDirectory) {
        this.proc = null;
        this.connection = null;
        this._closed = true;
        this._listeners = [];
        this._executablePath = executablePath;
        this._processArguments = processArguments;
        this._tempDirectory = tempDirectory;
    }
    start(options) {
        const { handleSIGINT, handleSIGTERM, handleSIGHUP, dumpio, env, pipe, } = options;
        let stdio = ['pipe', 'pipe', 'pipe'];
        if (pipe) {
            if (dumpio)
                stdio = ['ignore', 'pipe', 'pipe', 'pipe', 'pipe'];
            else
                stdio = ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'];
        }
        assert_js_1.assert(!this.proc, 'This process has previously been started.');
        debugLauncher(`Calling ${this._executablePath} ${this._processArguments.join(' ')}`);
        this.proc = childProcess.spawn(this._executablePath, this._processArguments, {
            // On non-windows platforms, `detached: true` makes child process a
            // leader of a new process group, making it possible to kill child
            // process tree with `.kill(-pid)` command. @see
            // https://nodejs.org/api/child_process.html#child_process_options_detached
            detached: process.platform !== 'win32',
            env,
            stdio,
        });
        if (dumpio) {
            this.proc.stderr.pipe(process.stderr);
            this.proc.stdout.pipe(process.stdout);
        }
        this._closed = false;
        this._processClosing = new Promise((fulfill) => {
            this.proc.once('exit', () => {
                this._closed = true;
                // Cleanup as processes exit.
                if (this._tempDirectory) {
                    removeFolderAsync(this._tempDirectory)
                        .then(() => fulfill())
                        .catch((error) => console.error(error));
                }
                else {
                    fulfill();
                }
            });
        });
        this._listeners = [
            helper_js_1.helper.addEventListener(process, 'exit', this.kill.bind(this)),
        ];
        if (handleSIGINT)
            this._listeners.push(helper_js_1.helper.addEventListener(process, 'SIGINT', () => {
                this.kill();
                process.exit(130);
            }));
        if (handleSIGTERM)
            this._listeners.push(helper_js_1.helper.addEventListener(process, 'SIGTERM', this.close.bind(this)));
        if (handleSIGHUP)
            this._listeners.push(helper_js_1.helper.addEventListener(process, 'SIGHUP', this.close.bind(this)));
    }
    close() {
        if (this._closed)
            return Promise.resolve();
        if (this._tempDirectory) {
            this.kill();
        }
        else if (this.connection) {
            // Attempt to close the browser gracefully
            this.connection.send('Browser.close').catch((error) => {
                helper_js_1.debugError(error);
                this.kill();
            });
        }
        // Cleanup this listener last, as that makes sure the full callback runs. If we
        // perform this earlier, then the previous function calls would not happen.
        helper_js_1.helper.removeEventListeners(this._listeners);
        return this._processClosing;
    }
    kill() {
        // Attempt to remove temporary profile directory to avoid littering.
        try {
            rimraf_1.default.sync(this._tempDirectory);
        }
        catch (error) { }
        // If the process failed to launch (for example if the browser executable path
        // is invalid), then the process does not get a pid assigned. A call to
        // `proc.kill` would error, as the `pid` to-be-killed can not be found.
        if (this.proc && this.proc.pid && !this.proc.killed) {
            try {
                this.proc.kill('SIGKILL');
            }
            catch (error) {
                throw new Error(`${PROCESS_ERROR_EXPLANATION}\nError cause: ${error.stack}`);
            }
        }
        // Cleanup this listener last, as that makes sure the full callback runs. If we
        // perform this earlier, then the previous function calls would not happen.
        helper_js_1.helper.removeEventListeners(this._listeners);
    }
    async setupConnection(options) {
        const { usePipe, timeout, slowMo, preferredRevision } = options;
        if (!usePipe) {
            const browserWSEndpoint = await waitForWSEndpoint(this.proc, timeout, preferredRevision);
            const transport = await WebSocketTransport_js_1.WebSocketTransport.create(browserWSEndpoint);
            this.connection = new Connection_js_1.Connection(browserWSEndpoint, transport, slowMo);
        }
        else {
            // stdio was assigned during start(), and the 'pipe' option there adds the
            // 4th and 5th items to stdio array
            const { 3: pipeWrite, 4: pipeRead } = this.proc.stdio;
            const transport = new PipeTransport_js_1.PipeTransport(pipeWrite, pipeRead);
            this.connection = new Connection_js_1.Connection('', transport, slowMo);
        }
        return this.connection;
    }
}
exports.BrowserRunner = BrowserRunner;
function waitForWSEndpoint(browserProcess, timeout, preferredRevision) {
    return new Promise((resolve, reject) => {
        const rl = readline.createInterface({ input: browserProcess.stderr });
        let stderr = '';
        const listeners = [
            helper_js_1.helper.addEventListener(rl, 'line', onLine),
            helper_js_1.helper.addEventListener(rl, 'close', () => onClose()),
            helper_js_1.helper.addEventListener(browserProcess, 'exit', () => onClose()),
            helper_js_1.helper.addEventListener(browserProcess, 'error', (error) => onClose(error)),
        ];
        const timeoutId = timeout ? setTimeout(onTimeout, timeout) : 0;
        /**
         * @param {!Error=} error
         */
        function onClose(error) {
            cleanup();
            reject(new Error([
                'Failed to launch the browser process!' +
                    (error ? ' ' + error.message : ''),
                stderr,
                '',
                'TROUBLESHOOTING: https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md',
                '',
            ].join('\n')));
        }
        function onTimeout() {
            cleanup();
            reject(new Errors_js_1.TimeoutError(`Timed out after ${timeout} ms while trying to connect to the browser! Only Chrome at revision r${preferredRevision} is guaranteed to work.`));
        }
        function onLine(line) {
            stderr += line + '\n';
            const match = line.match(/^DevTools listening on (ws:\/\/.*)$/);
            if (!match)
                return;
            cleanup();
            resolve(match[1]);
        }
        function cleanup() {
            if (timeoutId)
                clearTimeout(timeoutId);
            helper_js_1.helper.removeEventListeners(listeners);
        }
    });
}
