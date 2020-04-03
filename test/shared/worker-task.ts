// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable no-console */
// no-console disabled here as this is a test runner and expects to output to the console.

import * as Mocha from 'mocha';
import * as puppeteer from 'puppeteer';

import {getEnvVar} from './config.js';
import {logFailure, logToStdOut, store} from './helper.js';
import {color, TextColor} from './text-color.js';

interface DevToolsTarget {
  url: string;
  id: string;
}

const envStress = getEnvVar('STRESS');
const envSlowMo = getEnvVar('SLOWMO', envStress ? 50 : undefined);
const envChromeBinary = getEnvVar('CHROME_BIN');
const envInteractive = getEnvVar('INTERACTIVE');
const envDebug = getEnvVar('DEBUG');
const envChromeFeatures = getEnvVar('CHROME_FEATURES');

let defaultTimeout = 5000;
if (envDebug || envInteractive) {
  defaultTimeout = 300000;
} else if (envStress) {
  defaultTimeout = 10000;
}

const envTimeout = getEnvVar('TIMEOUT', defaultTimeout);
const envThrottleRate = getEnvVar('THROTTLE', envStress ? 3 : 1);

const interactivePage = 'http://localhost:8090/test/screenshots/interactive/index.html';
const blankPage = 'data:text/html,';
const headless = !envDebug;
const width = 1280;
const height = 720;

let mochaRun: Mocha.Runner;
let launchedBrowser: puppeteer.Browser;
let envPort = 9222;
export async function initBrowser(port: number) {
  envPort = port;

  const launchArgs = [`--remote-debugging-port=${envPort}`];
  const opts: puppeteer.LaunchOptions = {
    headless,
    executablePath: envChromeBinary,
    defaultViewport: null,
    slowMo: envSlowMo,
  };

  // Toggle either viewport or window size depending on headless vs not.
  if (headless) {
    opts.defaultViewport = {width, height};
  } else {
    launchArgs.push(`--window-size=${width},${height}`);
  }

  if (envChromeFeatures !== undefined) {
    launchArgs.push(envChromeFeatures);
  }

  opts.args = launchArgs;
  launchedBrowser = await puppeteer.launch(opts);

  try {
    let screenshotPage: puppeteer.Page|undefined;
    if (envInteractive) {
      const screenshotBrowser = await puppeteer.launch({
        headless: false,
        executablePath: envChromeBinary,
        defaultViewport: null,
        args: [`--window-size=${width},${height}`],
      });
      screenshotPage = await screenshotBrowser.newPage();
      await screenshotPage.goto(interactivePage, {waitUntil: ['domcontentloaded']});
    }

    // Load the target page.
    const srcPage = await launchedBrowser.newPage();
    await srcPage.goto(blankPage);

    // Now get the DevTools listings.
    const devtools = await launchedBrowser.newPage();
    await devtools.goto(`http://localhost:${envPort}/json`);

    // Find the appropriate item to inspect the target page.
    const listing = await devtools.$('pre');
    const json = await devtools.evaluate(listing => listing.textContent, listing);
    const targets: DevToolsTarget[] = JSON.parse(json);
    const target = targets.find(target => target.url === blankPage);
    if (!target) {
      throw new Error(`Unable to find target page: ${blankPage}`);
    }

    const {id} = target;
    await devtools.close();

    // Connect to the DevTools frontend.
    const frontend = await launchedBrowser.newPage();
    const frontendUrl = `http://localhost:8090/front_end/devtools_app.html?ws=localhost:${envPort}/devtools/page/${id}`;
    await frontend.goto(frontendUrl, {waitUntil: ['networkidle2', 'domcontentloaded']});

    frontend.on('error', err => {
      console.error(color('Error in Frontend', TextColor.RED));
      console.error(err);
      logFailure();
    });

    frontend.on('pageerror', err => {
      console.error(color('Page Error in Frontend', TextColor.RED));
      console.error(err);
      logFailure();
    });

    const resetPages =
        async (opts: {enabledExperiments?: string[], selectedPanel?: {name: string, selector?: string}} = {}) => {
      // Reload the target page.
      await srcPage.goto(blankPage, {waitUntil: ['domcontentloaded']});

      // Clear any local storage settings.
      await frontend.evaluate(() => localStorage.clear());

      const {enabledExperiments} = opts;
      let {selectedPanel} = opts;
      await frontend.evaluate(enabledExperiments => {
        for (const experiment of enabledExperiments) {
          // @ts-ignore
          globalThis.Root.Runtime.experiments.setEnabled(experiment, true);
        }
      }, enabledExperiments || []);

      if (selectedPanel) {
        await frontend.evaluate(name => {
          // @ts-ignore
          globalThis.localStorage.setItem('panel-selectedTab', `"${name}"`);
        }, selectedPanel.name);
      }

      // Reload the DevTools frontend and await the elements panel.
      await frontend.goto(blankPage, {waitUntil: ['domcontentloaded']});
      await frontend.goto(frontendUrl, {waitUntil: ['domcontentloaded']});

      // Default to elements if no other panel is defined.
      if (!selectedPanel) {
        selectedPanel = {
          name: 'elements',
          selector: '.elements',
        };
      }

      if (!selectedPanel.selector) {
        return;
      }

      // For the unspecified case wait for loading, then wait for the elements panel.
      await frontend.waitForSelector(selectedPanel.selector);

      // Under stress conditions throttle the CPU down.
      if (envThrottleRate !== 1) {
        logToStdOut(`${color('Throttling CPU:', TextColor.MAGENTA)} ${envThrottleRate}x slowdown`);

        const client = await frontend.target().createCDPSession();
        await client.send('Emulation.setCPUThrottlingRate', {rate: envThrottleRate});
      }

      if (envSlowMo) {
        logToStdOut(`${color('Slow mo:', TextColor.MAGENTA)} ${envSlowMo}ms per step`);
      }
    };

    store(launchedBrowser, srcPage, frontend, screenshotPage, resetPages);
  } catch (err) {
    console.warn(err);
  }
}

interface TestResult {
  state?: string;
  timedOut: boolean;
  title: string;
  duration: number;
  err?: {
    name: string,
    message: string,
    showDiff: boolean,
    actual: string,
    expected: string,
    stack: string,
  }
}

function formatTestResult(suiteTitle: string, timeout: number, testResult: TestResult) {
  let output = '';
  let stateColor = TextColor.GREEN;
  if (!testResult.state) {
    stateColor = TextColor.CYAN;
  } else if (testResult.state !== 'passed') {
    stateColor = TextColor.RED;
  }

  const testColor = testResult.state ? TextColor.DIM : TextColor.CYAN;
  let state = capitalize(testResult.state);

  if (testResult.timedOut || testResult.duration > timeout) {
    state += ' - Timed out';
  }

  // [Passed].
  output += `[${color(state, stateColor)}] `;

  // Foo can be read by bar.
  output += `${color(`${suiteTitle} ${testResult.title}`, testColor)}`;

  // : 300ms.
  if (testResult.duration) {
    const durationColor = testResult.duration > timeout ? TextColor.RED : TextColor.CYAN;
    output += `: ${color(`${testResult.duration}ms`, durationColor)}`;
  }
  output += '\n';

  if (testResult.err) {
    const {message, stack, actual, expected} = testResult.err;
    output += `\n${color(capitalize(message), TextColor.RED)}\n${stack}\n\n`;

    if (actual && expected) {
      output += color(`Actual: ${actual}\n\n`, TextColor.RED);
      output += color(`Expected: ${expected}\n`, TextColor.GREEN);
    }
  }

  return output;
}

export async function runTest(test: string): Promise<{code: number, output: string}> {
  let output = color(`Worker (${process.pid}): ${test}\n`, TextColor.DIM);
  let suiteTitle = '';
  let code = 0;
  return new Promise(resolve => {
    const mocha = new Mocha();
    mocha.addFile(test);
    mocha.ui('bdd');
    mocha.reporter('list');
    mocha.timeout(envTimeout);

    mochaRun = mocha.run();
    mochaRun.on('end', () => {
      (mocha as any).unloadFiles();
      resolve({output, code});
    });

    mochaRun.on('suite', (suite: {title: string}) => {
      suiteTitle = suite.title;
    });

    mochaRun.on('test end', (testResult: TestResult) => {
      output += formatTestResult(suiteTitle, envTimeout, testResult);
    });

    mochaRun.on('fail', (testResult: TestResult) => {
      console.log(testResult);
      code = 1;
    });
  });
}

export function cancelTest() {
  if (!mochaRun) {
    return;
  }

  mochaRun.abort();
}

function capitalize(str?: string) {
  if (!str) {
    return 'Skipped';
  }

  return `${str[0].toUpperCase()}${str.slice(1)}`;
}
