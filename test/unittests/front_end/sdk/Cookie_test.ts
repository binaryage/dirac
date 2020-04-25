// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {Protocol} from '../../../../front_end/protocol_client/protocol_client.js';
import {Cookie} from '../../../../front_end/sdk/Cookie.js';

describe('Cookie', () => {
  it('can be instantiated without issues', () => {
    const cookie = new Cookie('name', 'value');

    assert.strictEqual(cookie.key(), '- name -');
    assert.strictEqual(cookie.name(), 'name');
    assert.strictEqual(cookie.value(), 'value');

    assert.strictEqual(cookie.type(), undefined);
    assert.strictEqual(cookie.httpOnly(), false);
    assert.strictEqual(cookie.secure(), false);
    assert.strictEqual(cookie.sameSite(), undefined);
    assert.strictEqual(cookie.priority(), 'Medium');
    assert.strictEqual(cookie.session(), true);
    assert.strictEqual(cookie.path(), undefined);
    assert.strictEqual(cookie.port(), undefined);
    assert.strictEqual(cookie.domain(), undefined);
    assert.strictEqual(cookie.expires(), undefined);
    assert.strictEqual(cookie.maxAge(), undefined);
    assert.strictEqual(cookie.size(), 0);
    assert.strictEqual(cookie.url(), null);
    assert.strictEqual(cookie.getCookieLine(), null);
  });

  it('can be created from a protocol Cookie with all optional fields set', () => {
    const expires = new Date().getTime() + 3600 * 1000;
    const cookie = Cookie.fromProtocolCookie({
      domain: '.example.com',
      expires: expires / 1000,
      httpOnly: true,
      name: 'name',
      path: '/test',
      sameSite: Protocol.Network.CookieSameSite.Strict,
      secure: true,
      session: false,
      size: 23,
      value: 'value',
      priority: Protocol.Network.CookiePriority.High,
    });

    assert.strictEqual(cookie.key(), '.example.com name /test');
    assert.strictEqual(cookie.name(), 'name');
    assert.strictEqual(cookie.value(), 'value');

    assert.strictEqual(cookie.type(), null);
    assert.strictEqual(cookie.httpOnly(), true);
    assert.strictEqual(cookie.secure(), true);
    assert.strictEqual(cookie.sameSite(), 'Strict');
    assert.strictEqual(cookie.session(), false);
    assert.strictEqual(cookie.path(), '/test');
    assert.strictEqual(cookie.port(), undefined);
    assert.strictEqual(cookie.domain(), '.example.com');
    assert.strictEqual(cookie.expires(), expires);
    assert.strictEqual(cookie.maxAge(), undefined);
    assert.strictEqual(cookie.size(), 23);
    assert.strictEqual(cookie.url(), 'https://.example.com/test');
    assert.strictEqual(cookie.getCookieLine(), null);
  });

  // The jsdoc states that the fields are required, not optional
  it.skip('[crbug.com/1061125] can be created from a protocol Cookie with no optional fields set', () => {
    const cookie = Cookie.fromProtocolCookie({
      domain: '.example.com',
      name: 'name',
      path: '/test',
      size: 23,
      value: 'value',
      expires: 42,
      httpOnly: false,
      secure: false,
      session: true,
      priority: Protocol.Network.CookiePriority.Medium,
    });

    assert.strictEqual(cookie.key(), '.example.com name /test');
    assert.strictEqual(cookie.name(), 'name');
    assert.strictEqual(cookie.value(), 'value');

    assert.strictEqual(cookie.type(), undefined);
    assert.strictEqual(cookie.httpOnly(), false);
    assert.strictEqual(cookie.secure(), false);
    assert.strictEqual(cookie.sameSite(), undefined);
    assert.strictEqual(cookie.priority(), 'Medium');
    assert.strictEqual(cookie.session(), true);
    assert.strictEqual(cookie.path(), '/test');
    assert.strictEqual(cookie.port(), undefined);
    assert.strictEqual(cookie.domain(), '.example.com');
    assert.strictEqual(cookie.expires(), 42);
    assert.strictEqual(cookie.maxAge(), undefined);
    assert.strictEqual(cookie.size(), 23);
    assert.strictEqual(cookie.url(), 'http://.example.com/test');
    assert.strictEqual(cookie.getCookieLine(), null);
  });

  it('can handle secure urls', () => {
    const cookie = new Cookie('name', 'value');
    cookie.addAttribute('Secure');
    cookie.addAttribute('Domain', 'example.com');
    cookie.addAttribute('Path', '/test');
    assert.strictEqual(cookie.url(), 'https://example.com/test');
  });

  it('can handle insecure urls', () => {
    const cookie = new Cookie('name', 'value');
    cookie.addAttribute('Domain', 'example.com');
    cookie.addAttribute('Path', '/test');
    assert.strictEqual(cookie.url(), 'http://example.com/test');
  });

  it('can set attributes used as flags', () => {
    const cookie = new Cookie('name', 'value');
    cookie.addAttribute('HttpOnly');
    assert.strictEqual(cookie.httpOnly(), true);
  });

  it('can set attributes used as key=value', () => {
    const cookie = new Cookie('name', 'value');
    cookie.addAttribute('Path', '/test');
    assert.strictEqual(cookie.path(), '/test');
  });

  it('can set initialize with a different priority', () => {
    const cookie = new Cookie('name', 'value', null, Protocol.Network.CookiePriority.High);
    assert.strictEqual(cookie.priority(), 'High');
  });

  it('can change the priority', () => {
    const cookie = new Cookie('name', 'value');
    cookie.addAttribute('Priority', 'Low');
    assert.strictEqual(cookie.priority(), 'Low');
  });

  it('can set the cookie line', () => {
    const cookie = new Cookie('name', 'value');
    cookie.setCookieLine('name=value');
    assert.strictEqual(cookie.getCookieLine(), 'name=value');
  });

  it('can calculate the expiration date for session cookies', () => {
    const cookie = new Cookie('name', 'value');
    assert.strictEqual(cookie.expiresDate(new Date()), null);
  });

  it('can calculate the expiration date for max age cookies', () => {
    const cookie = new Cookie('name', 'value');
    const now = new Date();
    const expires = Math.floor(now.getTime()) + 3600 * 1000;
    cookie.addAttribute('Max-Age', '3600');
    assert.strictEqual(cookie.expiresDate(now)!.toISOString(), new Date(expires).toISOString());
  });

  it('can calculate the expiration date for cookies with expires attribute', () => {
    const cookie = new Cookie('name', 'value');
    const now = new Date();
    const expires = Math.floor(now.getTime()) + 3600 * 1000;
    cookie.addAttribute('Expires', expires);
    assert.strictEqual(cookie.expiresDate(now)!.toISOString(), new Date(expires).toISOString());
  });
});
