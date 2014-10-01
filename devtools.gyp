#
# Copyright (C) 2013 Google Inc. All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are
# met:
#
#         * Redistributions of source code must retain the above copyright
# notice, this list of conditions and the following disclaimer.
#         * Redistributions in binary form must reproduce the above
# copyright notice, this list of conditions and the following disclaimer
# in the documentation and/or other materials provided with the
# distribution.
#         * Neither the name of Google Inc. nor the names of its
# contributors may be used to endorse or promote products derived from
# this software without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
# "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
# LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
# A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
# OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
# SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
# LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
# DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
# THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
# (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
# OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
#

{
    'includes': [
      'devtools.gypi',
    ],
    'targets': [
        {
            'target_name': 'devtools_frontend_resources',
            'type': 'none',
            'dependencies': [
                'devtools_html',
                'toolbox_html',
                'supported_css_properties',
                'frontend_protocol_sources',
                'build_applications',
            ],
            'conditions': [
                ['debug_devtools==0', {
                    'dependencies': [
                        'copy_standalone_css',
                        'concatenated_devtools_css',
                        'concatenated_toolbox_css',
                    ],
                }],
            ],
            'copies': [
                {
                    'destination': '<(PRODUCT_DIR)/resources/inspector/Images',
                    'files': [
                        '<@(devtools_image_files)',
                    ],
                },
            ],
        },
        {
            'target_name': 'devtools_html',
            'type': 'none',
            'sources': ['front_end/devtools.html'],
            'actions': [{
                'action_name': 'devtools_html',
                'script_name': 'scripts/generate_devtools_html.py',
                'input_page': 'front_end/devtools.html',
                'inputs': [
                    '<@(_script_name)',
                    '<@(_input_page)',
                ],
                'outputs': ['<(PRODUCT_DIR)/resources/inspector/devtools.html'],
                'action': ['python', '<@(_script_name)', '<@(_input_page)', '<@(_outputs)', '<@(debug_devtools)'],
            }],
        },
        {
            'target_name': 'toolbox_html',
            'type': 'none',
            'sources': ['front_end/toolbox.html'],
            'actions': [{
                'action_name': 'toolbox_html',
                'script_name': 'scripts/generate_devtools_html.py',
                'input_page': 'front_end/toolbox.html',
                'inputs': [
                    '<@(_script_name)',
                    '<@(_input_page)',
                ],
                'outputs': ['<(PRODUCT_DIR)/resources/inspector/toolbox.html'],
                'action': ['python', '<@(_script_name)', '<@(_input_page)', '<@(_outputs)', '<@(debug_devtools)'],
            }],
        },
        {
            'target_name': 'devtools_extension_api',
            'type': 'none',
            'actions': [{
                'action_name': 'devtools_extension_api',
                'script_name': 'scripts/generate_devtools_extension_api.py',
                'inputs': [
                    '<@(_script_name)',
                    '<@(devtools_extension_api_files)',
                ],
                'outputs': ['<(PRODUCT_DIR)/resources/inspector/devtools_extension_api.js'],
                'action': ['python', '<@(_script_name)', '<@(_outputs)', '<@(devtools_extension_api_files)'],
            }],
        },
        {
            'target_name': 'generate_devtools_grd',
            'type': 'none',
            'dependencies': [
                'devtools_html',
                'toolbox_html',
                'devtools_extension_api',
                'devtools_frontend_resources',
            ],
            'conditions': [
                ['debug_devtools==0', {
                    'actions': [{
                        'action_name': 'generate_devtools_grd',
                        'script_name': 'scripts/generate_devtools_grd.py',
                        'relative_path_dirs': [
                            '<(PRODUCT_DIR)/resources/inspector',
                            'front_end'
                        ],
                        'input_pages': [
                            '<(PRODUCT_DIR)/resources/inspector/devtools.css',
                            '<(PRODUCT_DIR)/resources/inspector/devtools.html',
                            '<(PRODUCT_DIR)/resources/inspector/devtools.js',
                            '<(PRODUCT_DIR)/resources/inspector/toolbox.css',
                            '<(PRODUCT_DIR)/resources/inspector/toolbox.html',
                            '<(PRODUCT_DIR)/resources/inspector/toolbox.js',
                            '<(PRODUCT_DIR)/resources/inspector/audits_module.js',
                            '<(PRODUCT_DIR)/resources/inspector/console_module.js',
                            '<(PRODUCT_DIR)/resources/inspector/devices_module.js',
                            '<(PRODUCT_DIR)/resources/inspector/documentation_module.js',
                            '<(PRODUCT_DIR)/resources/inspector/elements_module.js',
                            '<(PRODUCT_DIR)/resources/inspector/extensions_module.js',
                            '<(PRODUCT_DIR)/resources/inspector/heap_snapshot_worker_module.js',
                            '<(PRODUCT_DIR)/resources/inspector/layers_module.js',
                            '<(PRODUCT_DIR)/resources/inspector/network_module.js',
                            '<(PRODUCT_DIR)/resources/inspector/profiler_module.js',
                            '<(PRODUCT_DIR)/resources/inspector/promises_module.js',
                            '<(PRODUCT_DIR)/resources/inspector/resources_module.js',
                            '<(PRODUCT_DIR)/resources/inspector/script_formatter_worker_module.js',
                            '<(PRODUCT_DIR)/resources/inspector/settings_module.js',
                            '<(PRODUCT_DIR)/resources/inspector/source_frame_module.js',
                            '<(PRODUCT_DIR)/resources/inspector/sources_module.js',
                            '<(PRODUCT_DIR)/resources/inspector/temp_storage_shared_worker_module.js',
                            '<(PRODUCT_DIR)/resources/inspector/timeline_module.js',
                            '<(PRODUCT_DIR)/resources/inspector/devtools_extension_api.js',
                            '<@(devtools_standalone_files)',
                            '<@(devtools_cm_css_files)',
                        ],
                        'images': [
                            '<@(devtools_image_files)',
                        ],
                        'inputs': [
                            '<@(_script_name)',
                            '<@(_input_pages)',
                            '<@(_images)',
                        ],
                        'images_path': [
                            'front_end/Images',
                        ],
                        'outputs': ['<(SHARED_INTERMEDIATE_DIR)/devtools/devtools_resources.grd'],
                        'action': ['python', '<@(_script_name)', '<@(_input_pages)', '--relative_path_dirs', '<@(_relative_path_dirs)', '--images', '<@(_images_path)', '--output', '<@(_outputs)'],
                    }],
                },
                {
                    # If we're not concatenating devtools files, we want to
                    # run after the original files have been copied to
                    # <(PRODUCT_DIR)/resources/inspector.
                    'dependencies': ['devtools_frontend_resources'],
                    'actions': [{
                        'action_name': 'generate_devtools_grd',
                        'script_name': 'scripts/generate_devtools_grd.py',
                        'relative_path_dirs': [
                            'front_end',
                            '<(PRODUCT_DIR)/resources/inspector',
                        ],
                        'input_pages': [
                            '<@(all_devtools_files)',
                            'front_end/Runtime.js',
                            '<(PRODUCT_DIR)/resources/inspector/InspectorBackendCommands.js',
                            '<(PRODUCT_DIR)/resources/inspector/SupportedCSSProperties.js',
                            '<(PRODUCT_DIR)/resources/inspector/devtools.html',
                            '<(PRODUCT_DIR)/resources/inspector/toolbox.html',
                        ],
                        'images': [
                            '<@(devtools_image_files)',
                        ],
                        'inputs': [
                            '<@(_script_name)',
                            '<@(_input_pages)',
                            '<@(_images)',
                        ],
                        'images_path': [
                            'front_end/Images',
                        ],
                        # Note that other files are put under /devtools directory, together with declared devtools_resources.grd
                        'outputs': ['<(SHARED_INTERMEDIATE_DIR)/devtools/devtools_resources.grd'],
                        'action': ['python', '<@(_script_name)', '<@(_input_pages)', '--relative_path_dirs', '<@(_relative_path_dirs)', '--images', '<@(_images_path)', '--output', '<@(_outputs)'],
                    }],
                }],
            ],
        },
        {
          'target_name': 'frontend_protocol_sources',
          'type': 'none',
          'actions': [
            {
              'action_name': 'generateInspectorProtocolFrontendSources',
              'inputs': [
                # The python script in action below.
                'scripts/CodeGeneratorFrontend.py',
                # Input file for the script.
                'protocol.json',
              ],
              'outputs': [
                '<(PRODUCT_DIR)/resources/inspector/InspectorBackendCommands.js',
              ],
              'action': [
                'python',
                'scripts/CodeGeneratorFrontend.py',
                'protocol.json',
                '--output_js_dir', '<(PRODUCT_DIR)/resources/inspector/',
              ],
              'message': 'Generating Inspector protocol frontend sources from protocol.json',
            },
          ]
        },
        {
          'target_name': 'supported_css_properties',
          'type': 'none',
          'actions': [
            {
              'action_name': 'generateSupportedCSSProperties',
              'inputs': [
                # The python script in action below.
                'scripts/generate_supported_css.py',
                # Input files for the script.
                '../core/css/CSSProperties.in',
              ],
              'outputs': [
                '<(PRODUCT_DIR)/resources/inspector/SupportedCSSProperties.js',
              ],
              'action': [
                'python',
                '<@(_inputs)',
                '<@(_outputs)',
              ],
              'message': 'Generating supported CSS properties for front end',
            },
          ]
        },

        # Frontend applications and modules.
        {
            'target_name': 'build_applications',
            'type': 'none',
            'conditions': [
                ['debug_devtools==0', { # Release
                    'dependencies': [
                        'devtools_html',
                        'toolbox_html',
                        'supported_css_properties',
                        'frontend_protocol_sources',
                    ],
                    'actions': [{
                        'action_name': 'build_applications',
                        'script_name': 'scripts/build_applications.py',
                        'helper_scripts': [
                            'scripts/modular_build.py',
                            'scripts/concatenate_application_code.py',
                        ],
                        'inputs': [
                            '<@(_script_name)',
                            '<@(_helper_scripts)',
                            '<@(all_devtools_files)',
                            '<(PRODUCT_DIR)/resources/inspector/InspectorBackendCommands.js',
                            '<(PRODUCT_DIR)/resources/inspector/SupportedCSSProperties.js',
                        ],
                        'output_path': '<(PRODUCT_DIR)/resources/inspector/',
                        'outputs': [
                            '<(_output_path)/devtools.js',
                            '<(_output_path)/toolbox.js',
                            '<(_output_path)/audits_module.js',
                            '<(_output_path)/console_module.js',
                            '<(_output_path)/devices_module.js',
                            '<(_output_path)/documentation_module.js',
                            '<(_output_path)/elements_module.js',
                            '<(_output_path)/extensions_module.js',
                            '<(_output_path)/heap_snapshot_worker_module.js',
                            '<(_output_path)/layers_module.js',
                            '<(_output_path)/network_module.js',
                            '<(_output_path)/profiler_module.js',
                            '<(_output_path)/promises_module.js',
                            '<(_output_path)/resources_module.js',
                            '<(_output_path)/script_formatter_worker_module.js',
                            '<(_output_path)/settings_module.js',
                            '<(_output_path)/source_frame_module.js',
                            '<(_output_path)/sources_module.js',
                            '<(_output_path)/temp_storage_shared_worker_module.js',
                            '<(_output_path)/timeline_module.js',
                        ],
                        'action': ['python', '<@(_script_name)', 'devtools', 'toolbox', '--input_path', 'front_end', '--output_path', '<@(_output_path)', '--debug', '<@(debug_devtools)'],
                    }]
                },
                { # Debug
                  # Copy Runtime.js and all modules of all applications here.
                    'app_target': '<(PRODUCT_DIR)/resources/inspector',
                    'copies': [
                        {
                            'destination': '<(_app_target)',
                            'files': [
                                '<@(devtools_core_base_files)',
                            ],
                        },
                        {
                            'destination': '<(_app_target)/common',
                            'files': [
                                '<@(devtools_common_js_files)',
                                'front_end/common/module.json',
                            ],
                        },
                        {
                            'destination': '<(_app_target)/components',
                            'files': [
                                '<@(devtools_components_js_files)',
                                'front_end/components/module.json',
                            ],
                        },
                        {
                            'destination': '<(_app_target)/sdk',
                            'files': [
                                '<@(devtools_sdk_js_files)',
                                'front_end/sdk/module.json',
                            ],
                        },
                        {
                            'destination': '<(_app_target)/workspace',
                            'files': [
                                '<@(devtools_workspace_js_files)',
                                'front_end/workspace/module.json',
                            ],
                        },
                        {
                            'destination': '<(_app_target)/bindings',
                            'files': [
                                '<@(devtools_bindings_js_files)',
                                'front_end/bindings/module.json',
                            ],
                        },
                        {
                            'destination': '<(_app_target)/ui',
                            'files': [
                                '<@(devtools_ui_js_files)',
                                'front_end/ui/module.json',
                            ],
                        },
                        {
                            'destination': '<(_app_target)/host',
                            'files': [
                                '<@(devtools_host_js_files)',
                                'front_end/host/module.json',
                            ],
                        },
                        {
                            'destination': '<(_app_target)/screencast',
                            'files': [
                                '<@(devtools_screencast_js_files)',
                                'front_end/screencast/module.json',
                            ],
                        },
                        {
                            'destination': '<(_app_target)/toolbox',
                            'files': [
                                '<@(devtools_toolbox_js_files)',
                                'front_end/toolbox/module.json',
                            ],
                        },
                        {
                            'destination': '<(_app_target)/toolbox_bootstrap',
                            'files': [
                                '<@(devtools_toolbox_bootstrap_js_files)',
                                'front_end/toolbox_bootstrap/module.json',
                            ],
                        },
                        {
                            'destination': '<(_app_target)/main',
                            'files': [
                                '<@(devtools_main_js_files)',
                                'front_end/main/module.json',
                            ],
                        },
                        {
                            'destination': '<(_app_target)/audits',
                            'files': [
                                '<@(devtools_audits_js_files)',
                                'front_end/audits/module.json',
                            ],
                        },
                        {
                            'destination': '<(_app_target)/console',
                            'files': [
                                '<@(devtools_console_js_files)',
                                'front_end/console/module.json',
                            ],
                        },
                        {
                            'destination': '<(_app_target)/devices',
                            'files': [
                                '<@(devtools_devices_js_files)',
                                'front_end/devices/module.json',
                            ],
                        },
                        {
                            'destination': '<(_app_target)/documentation',
                            'files': [
                                '<@(devtools_documentation_js_files)',
                                'front_end/documentation/module.json',
                            ],
                        },
                        {
                            'destination': '<(_app_target)/elements',
                            'files': [
                                '<@(devtools_elements_js_files)',
                                'front_end/elements/module.json',
                            ],
                        },
                        {
                            'destination': '<(_app_target)/extensions',
                            'files': [
                                '<@(devtools_extensions_js_files)',
                                'front_end/extensions/module.json',
                            ],
                        },
                        {
                            'destination': '<(_app_target)/heap_snapshot_worker',
                            'files': [
                                '<@(devtools_heap_snapshot_worker_js_files)',
                                'front_end/heap_snapshot_worker/module.json',
                            ],
                        },
                        {
                            'destination': '<(_app_target)/layers',
                            'files': [
                                '<@(devtools_layers_js_files)',
                                'front_end/layers/module.json',
                            ],
                        },
                        {
                            'destination': '<(_app_target)/network',
                            'files': [
                                '<@(devtools_network_js_files)',
                                'front_end/network/module.json',
                            ],
                        },
                        {
                            'destination': '<(_app_target)/profiler',
                            'files': [
                                '<@(devtools_profiler_js_files)',
                                'front_end/profiler/module.json',
                            ],
                        },
                        {
                            'destination': '<(_app_target)/promises',
                            'files': [
                                '<@(devtools_promises_js_files)',
                                'front_end/promises/module.json',
                            ],
                        },
                        {
                            'destination': '<(_app_target)/resources',
                            'files': [
                                '<@(devtools_resources_js_files)',
                                'front_end/resources/module.json',
                            ],
                        },
                        {
                            'destination': '<(_app_target)/script_formatter_worker',
                            'files': [
                                # FIXME: This will excessively copy files from common/ and cm/ folders into worker folder, which is fine for the debug mode.
                                '<@(devtools_script_formatter_worker_js_files)',
                                'front_end/script_formatter_worker/module.json',
                            ],
                        },
                        {
                            'destination': '<(_app_target)/UglifyJS',
                            'files': [
                                '<@(devtools_uglify_files)',
                            ],
                        },
                        {
                            'destination': '<(_app_target)/settings',
                            'files': [
                                '<@(devtools_settings_js_files)',
                                'front_end/settings/module.json',
                            ],
                        },
                        {
                            'destination': '<(_app_target)/source_frame',
                            'files': [
                                '<@(devtools_source_frame_js_files)',
                                'front_end/source_frame/module.json',
                            ],
                        },
                        {
                            'destination': '<(_app_target)/cm',
                            'files': [
                                '<@(devtools_cm_js_files)',
                                '<@(devtools_cm_css_files)',
                            ],
                        },
                        {
                            'destination': '<(_app_target)/sources',
                            'files': [
                                '<@(devtools_sources_js_files)',
                                'front_end/sources/module.json',
                            ],
                        },
                        {
                            'destination': '<(_app_target)/temp_storage_shared_worker',
                            'files': [
                                '<@(devtools_temp_storage_shared_worker_js_files)',
                                'front_end/temp_storage_shared_worker/module.json',
                            ],
                        },
                        {
                            'destination': '<(_app_target)/timeline',
                            'files': [
                                '<@(devtools_timeline_js_files)',
                                'front_end/timeline/module.json',
                            ],
                        }
                    ]
                }]
            ]
        },
    ], # targets
    'conditions': [
        ['debug_devtools==0', {
            'targets': [
                {
                    'target_name': 'copy_standalone_css',
                    'type': 'none',
                    'copies': [{
                        'destination': '<(PRODUCT_DIR)/resources/inspector',
                        'files': [
                            '<@(devtools_standalone_files)',
                        ],
                    },
                    {
                        'destination': '<(PRODUCT_DIR)/resources/inspector/cm',
                        'files': [
                            '<@(devtools_cm_css_files)',
                        ],
                    }],
                },
                {
                    'target_name': 'concatenated_devtools_css',
                    'type': 'none',
                    'dependencies': [
                        'devtools_html',
                    ],
                    'actions': [{
                        'action_name': 'concatenate_devtools_css',
                        'script_name': 'scripts/concatenate_css_files.py',
                        'input_stylesheet': 'front_end/devtools.css',
                        'inputs': [
                            '<@(_script_name)',
                            '<@(_input_stylesheet)',
                            '<@(devtools_core_base_files)',
                        ],
                        'search_path': [ 'front_end' ],
                        'outputs': ['<(PRODUCT_DIR)/resources/inspector/devtools.css'],
                        'action': ['python', '<@(_script_name)', '<@(_input_stylesheet)', '<@(_outputs)'],
                    }],
                },
                {
                    'target_name': 'concatenated_toolbox_css',
                    'type': 'none',
                    'dependencies': [
                        'toolbox_html',
                    ],
                    'actions': [{
                        'action_name': 'concatenate_toolbox_css',
                        'script_name': 'scripts/concatenate_css_files.py',
                        'input_stylesheet': 'front_end/toolbox.css',
                        'inputs': [
                            '<@(_script_name)',
                            '<@(_input_stylesheet)',
                            '<@(devtools_core_base_files)',
                        ],
                        'search_path': [ 'front_end' ],
                        'outputs': ['<(PRODUCT_DIR)/resources/inspector/toolbox.css'],
                        'action': ['python', '<@(_script_name)', '<@(_input_stylesheet)', '<@(_outputs)'],
                    }],
                },
            ],
        }],
    ], # conditions
}
