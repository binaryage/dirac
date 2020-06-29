// @ts-nocheck
// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

if (typeof runtime !== 'undefined') {
  // this code runs only in dev mode
  // we want to avoid tweaking inspector.html
  (function (d, script) {
    const insertScript = function (url, f) {
      script = d.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      if (f) {
        script.onload = f;
      }
      script.src = url;
      d.getElementsByTagName('head')[0].appendChild(script);
    };

    insertScript('dirac/.compiled/implant/goog/base.js', function () {
      goog.define('goog.ENABLE_CHROME_APP_SAFE_SCRIPT_LOADING', true);
      goog.ENABLE_CHROME_APP_SAFE_SCRIPT_LOADING = true;
      insertScript('dirac/.compiled/implant/goog/deps.js', function () {
        insertScript('dirac/.compiled/implant/cljs_deps.js', function () {
          goog.require('dirac.devtools');
          goog.require('dirac.implant');
        });
      });
    });
  })(document);
}
