// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {NetworkRequest} from '../../../../front_end/sdk/NetworkRequest.js';
import {issuesAssociatedWith} from '../../../../front_end/browser_sdk/RelatedIssue.js';
import {Issue} from '../../../../front_end/sdk/Issue.js';
import {Cookie} from '../../../../front_end/sdk/Cookie.js';

import {StubIssue} from '../sdk/StubIssue.js';

describe('issuesAssociatedWith', () => {
  it('should return no issues if no issues exist', () => {
    const request = new NetworkRequest('', '', '', '', '', null);
    assert.strictEqual(issuesAssociatedWith([], request).length, 0);
  });

  it('should return no issues if issues dont affect any resources', () => {
    const issue = new Issue('code');
    const request = new NetworkRequest('', '', '', '', '', null);

    assert.strictEqual(issuesAssociatedWith([issue], request).length, 0);
  });

  it('should correctly filter issues associated with a given request id', () => {
    const issue1 = StubIssue.createFromRequestIds(['id1', 'id2']);
    const issue2 = StubIssue.createFromRequestIds(['id1']);
    const issues = [issue1, issue2];

    const request1 = new NetworkRequest('id1', '', '', '', '', null);
    const request2 = new NetworkRequest('id2', '', '', '', '', null);

    assert.deepStrictEqual(issuesAssociatedWith(issues, request1), issues);
    assert.deepStrictEqual(issuesAssociatedWith(issues, request2), [issue1]);
  });

  function createTestCookie(name: string): Cookie {
    const cookie = new Cookie(name, '');
    cookie.addAttribute('domain', '');
    cookie.addAttribute('path', '');
    return cookie;
  }

  it('should correctly filter issues associated with a cookie', () => {
    const issue1 = StubIssue.createFromCookieNames(['c1', 'c2']);
    const issue2 = StubIssue.createFromCookieNames(['c3']);
    const issue3 = StubIssue.createFromCookieNames(['c1']);
    const issues = [issue1, issue2, issue3];

    const cookie1 = createTestCookie('c1');
    const cookie2 = createTestCookie('c2');
    const cookie3 = createTestCookie('c3');

    assert.deepStrictEqual(issuesAssociatedWith(issues, cookie1), [issue1, issue3]);
    assert.deepStrictEqual(issuesAssociatedWith(issues, cookie2), [issue1]);
    assert.deepStrictEqual(issuesAssociatedWith(issues, cookie3), [issue2]);
  });
});
