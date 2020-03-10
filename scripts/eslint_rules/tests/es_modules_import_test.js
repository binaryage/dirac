// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/es_modules_import.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
});

ruleTester.run('es_modules_import', rule, {
  valid: [
    {
      code: `import { Exporting } from './Exporting.js';`,
      filename: 'front_end/common/Importing.js',
    },
    {
      code: `import * as Namespace from '../namespace/namespace.js';`,
      filename: 'front_end/common/Importing.js',
    },
    {
      code: `import * as EventTarget from './EventTarget.js';`,
      filename: 'front_end/common/common.js',
    },
    {
      code: `import { Exporting } from '../../../front_end/common/EventTarget.js';`,
      filename: 'test/common/common.js',
    },
    {
      code: `import * as CommonModule from './common.js';`,
      filename: 'front_end/common/common-legacy.js',
    },
    {
      code: `import * as ARIAProperties from '../generated/ARIAProperties.js';`,
      filename: 'front_end/accessibility/ARIAMetadata.js',
    },
    {
      code: `import { DebuggerLanguagePlugin } from '../DebuggerLanguagePlugins.js';`,
      filename: 'front_end/bindings/language_plugins/CXXDWARFLanguagePlugin.js',
    },
    {
      code: `import '../../common/common.js';`,
      filename: 'front_end/formatter_worker/formatter_worker.js',
    },
    // ARIAUtils.js is legacy and exempted from these rules
    {
      code: `import * as ARIAUtils from './ARIAUtils.js';`,
      filename: 'front_end/ui/Toolbar.js',
    },
  ],

  invalid: [
    {
      code: `import { Exporting } from '../namespace/Exporting.js';`,
      filename: 'front_end/common/Importing.js',
      errors: [{
        message:
            `Incorrect cross-namespace import: "../namespace/Exporting.js". Use "import * as Namespace from '../namespace/namespace.js';" instead.`
      }],
    },
    {
      code: `import * as Common from '../common/common.js';`,
      filename: 'front_end/common/Importing.js',
      errors: [{
        message:
            `Incorrect same-namespace import: "../common/common.js". Use "import { Symbol } from './relative-file.js';" instead.`
      }],
    },
  ]
});
