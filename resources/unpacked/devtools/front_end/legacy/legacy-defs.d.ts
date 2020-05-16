// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

interface StringConstructor {
  sprintf(format: string, ...var_arg: any): string;
  hashCode(id: string): number;
}

interface Array<T> {
  peekLast(): T | undefined;
  lowerBound<S>(object: S, comparator?: {(a: S, b: T): number}, left?: number, right?: number): number;
  upperBound<S>(object: S, comparator?: {(a: S, b: T): number}, left?: number, right?: number): number;
}

// Type alias for the Closure-supported ITemplateArray which is equivalent
// to TemplateStringsArray in TypeScript land
type ITemplateArray = TemplateStringsArray

interface String {
  compareTo(other: string): number;
  removeURLFragment(): string;
  trimEndWithMaxLength(maxLength: number): string;
  escapeForRegExp(): string;
}

declare let ls: (template: ITemplateArray, ...args: any[]) => string;

declare namespace Runtime {
  const cachedResources: {[cachePath: string]: string};
}

declare class AnchorBox {}

declare namespace Adb {
  interface Page {
    id: string;
    name: string;
    url: string;
    attached: boolean;
  }
  interface Browser {
    id: string;
    adbBrowserChromeVersion: string;
    compatibleVersion: boolean;
    adbBrowsername: string;
    source: string;
    adbBrowserVersion: string;
    pages: Page[];
  }
  interface Device {
    id: string;
    adbModel: string;
    adbSerial: string;
    browsers: Browser[];
    adbPortStatus: number[];
    adbConnected: boolean;
  }
  interface PortForwardingConfig {
    [field: string]: string;
  }
  interface PortForwardingRule {
    port: string;
    address: string;
  }
  interface DevicePortForwardingStatus {
    ports: {[port: string]: number};
    browserId: string;
  }
  interface PortForwardingStatus {
    [field: string]: DevicePortForwardingStatus;
  }
  interface Config {
    discoverUsbDevices: boolean;
    portForwardingEnabled: boolean;
    portForwardingConfig: PortForwardingConfig;
    networkDiscoveryEnabled: boolean;
    networkDiscoveryConfig: NetworkDiscoveryConfig;
  }
  type NetworkDiscoveryConfig = string[];
}

interface HTMLElement {
  createChild(tagName: string, className?: string, content?: string): HTMLElement;
}
