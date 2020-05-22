// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @param {!Date} date
 * @return {boolean}
 */
export const isValid = date => {
  return !isNaN(date.getTime());
};
