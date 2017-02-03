// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
Runtime.startApplication('inspector');

// this is here to signal our extension that we are done with our work,
// cannot easily inject script myself: https://bugs.chromium.org/p/chromium/issues/detail?id=30756
document.title = "#";
