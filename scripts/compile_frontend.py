#!/usr/bin/env python
# Copyright (c) 2012 Google Inc. All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are
# met:
#
#     * Redistributions of source code must retain the above copyright
# notice, this list of conditions and the following disclaimer.
#     * Redistributions in binary form must reproduce the above
# copyright notice, this list of conditions and the following disclaimer
# in the documentation and/or other materials provided with the
# distribution.
#     * Neither the name of Google Inc. nor the names of its
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

import os
import os.path
import generate_protocol_externs
import re
import shutil
import subprocess
import sys
import tempfile
try:
    import json
except ImportError:
    import simplejson as json

scripts_path = os.path.dirname(os.path.abspath(__file__))
devtools_path = os.path.dirname(scripts_path)
inspector_path = os.path.dirname(devtools_path) + "/core/inspector"
devtools_frontend_path = devtools_path + "/front_end"
protocol_externs_path = devtools_frontend_path + "/protocol_externs.js"
webgl_rendering_context_idl_path = os.path.dirname(devtools_path) + "/core/html/canvas/WebGLRenderingContext.idl"
closure_compiler_jar = scripts_path + "/closure/compiler.jar"
jsdoc_validator_jar = scripts_path + "/jsdoc-validator/jsdoc-validator.jar"
java_exec = "java -Xms512m -server -XX:+TieredCompilation"

generate_protocol_externs.generate_protocol_externs(protocol_externs_path, devtools_path + "/protocol.json")

jsmodule_name_prefix = "jsmodule_"
js_modules_name = "frontend_modules.json"

try:
    with open(os.path.join(scripts_path, js_modules_name), "rt") as js_modules_file:
        modules = json.loads(js_modules_file.read())
except:
    print "ERROR: Failed to read %s" % js_modules_name
    raise

# `importScript` function must not be used in any files
# except module headers. Refer to devtools.gyp file for
# the module header list.
allowed_import_statements_files = [
    "utilities.js",
    "ElementsPanel.js",
    "ResourcesPanel.js",
    "NetworkPanel.js",
    "SourcesPanel.js",
    "TimelinePanel.js",
    "ProfilesPanel.js",
    "AuditsPanel.js",
    "LayersPanel.js",
    "CodeMirrorTextEditor.js",
]

type_checked_jsdoc_tags_list = ["param", "return", "type", "enum"]

type_checked_jsdoc_tags_or = "|".join(type_checked_jsdoc_tags_list)

# Basic regex for invalid JsDoc types: an object type name ([A-Z][A-Za-z0-9.]+[A-Za-z0-9]) not preceded by '!', '?', ':' (this, new), or '.' (object property).
invalid_type_regex = re.compile(r"@(?:" + type_checked_jsdoc_tags_or + r")\s*\{.*(?<![!?:.A-Za-z0-9])([A-Z][A-Za-z0-9.]+[A-Za-z0-9]).*\}")

invalid_type_designator_regex = re.compile(r"@(?:" + type_checked_jsdoc_tags_or + r")\s*.*([?!])=?\}")


def total_memory_mb():
    try:
        totalMemory = os.popen("free -m").readlines()[1].split()[1]
        return int(totalMemory)
    except:
        print "Failed to get total memory size."
        return 0


def can_parallelize_module_compilation():
    # Use a heuristic based on the actual total memory normally consumed by the script.
    return os.environ.get("FORCE_PARALLEL_DEVTOOLS_COMPILATION", "") == "1" or total_memory_mb() > 8192


def verify_importScript_usage():
    for module in modules:
        for file_name in module['sources']:
            if file_name in allowed_import_statements_files:
                continue
            sourceFile = open(devtools_frontend_path + "/" + file_name, "r")
            source = sourceFile.read()
            sourceFile.close()
            if "importScript(" in source:
                print "ERROR: importScript function is allowed in module header files only (found in %s)" % file_name


def dump_all_checked_files():
    file_list = []
    for module in modules:
        for source in module["sources"]:
            file_list.append(devtools_frontend_path + "/" + source)
    return " ".join(file_list)


def verify_jsdoc_extra():
    os.system("%s -jar %s %s" % (java_exec, jsdoc_validator_jar, dump_all_checked_files()))


def verify_jsdoc():
    for module in modules:
        for file_name in module['sources']:
            lineIndex = 0
            full_file_name = devtools_frontend_path + "/" + file_name
            with open(full_file_name, "r") as sourceFile:
                for line in sourceFile:
                    line = line.rstrip()
                    lineIndex += 1
                    if not line:
                        continue
                    verify_jsdoc_line(full_file_name, lineIndex, line)
    verify_jsdoc_extra()


def verify_jsdoc_line(fileName, lineIndex, line):
    def print_error(message, errorPosition):
        print "%s:%s: ERROR - %s\n%s\n%s\n" % (fileName, lineIndex, message, line, " " * errorPosition + "^")

    match = re.search(invalid_type_regex, line)
    if match:
        print_error("Type '%s' nullability not marked explicitly with '?' (nullable) or '!' (non-nullable)" % match.group(1), match.start(1))

    match = re.search(invalid_type_designator_regex, line)
    if (match):
        print_error("Type nullability indicator misplaced, should precede type", match.start(1))


def check_java_path():
    proc = subprocess.Popen("which java", stdout=subprocess.PIPE, shell=True)
    (javaPath, _) = proc.communicate()

    if proc.returncode != 0:
        print "Cannot find java ('which java' return code = %d, should be 0)" % proc.returncode
        sys.exit(1)
    print "Java executable: " + re.sub(r"\n$", "", javaPath)

check_java_path()

print "Verifying 'importScript' function usage..."
verify_importScript_usage()

print "Verifying JSDoc comments..."
verify_jsdoc()

modules_by_name = {}
for module in modules:
    modules_by_name[module["name"]] = module

standalone_modules = []
for module in modules:
    if "standalone" in module:
        standalone_modules.append(module)


def verify_standalone_modules():
    standalone_module_names = {}
    for standalone_module in standalone_modules:
        standalone_module_names[standalone_module["name"]] = True
    for module in modules:
        for dependency in module["dependencies"]:
            if dependency in standalone_module_names:
                print "ERROR: Standalone module %s cannot be in dependencies of %s" % (dependency, module["name"])

verify_standalone_modules()


def nice_child():
    os.nice(10)

def dump_module(name, recursively, processed_modules):
    if name in processed_modules:
        return ""
    processed_modules[name] = True
    module = modules_by_name[name]
    command = ""
    if recursively:
        for dependency in module["dependencies"]:
            command += dump_module(dependency, recursively, processed_modules)
    command += " \\\n    --module " + jsmodule_name_prefix + module["name"] + ":"
    command += str(len(module["sources"]))
    firstDependency = True
    for dependency in module["dependencies"]:
        if firstDependency:
            command += ":"
        else:
            command += ","
        firstDependency = False
        command += jsmodule_name_prefix + dependency
    for script in module["sources"]:
        command += " \\\n        --js " + devtools_frontend_path + "/" + script
    return command

modules_dir = tempfile.mkdtemp()
compiler_command = "%s -jar %s --summary_detail_level 3 --compilation_level SIMPLE_OPTIMIZATIONS \
    --warning_level VERBOSE --language_in ECMASCRIPT5 --accept_const_keyword --module_output_path_prefix %s/ \\\n" % (java_exec, closure_compiler_jar, modules_dir)

process_recursively = len(sys.argv) > 1
if process_recursively:
    module_name = sys.argv[1]
    if module_name != "all":
        modules = []
        for i in range(1, len(sys.argv)):
            modules.append(modules_by_name[sys.argv[i]])

    can_parallelize = can_parallelize_module_compilation()
    if can_parallelize:
        print "Compiling modules in parallel..."
        processes = []
    else:
        print "Compiling modules sequentially..."

    for module in modules:
        echo_command = "echo '='; echo -e \"= Compiling \\\"%s\\\"...\"; echo '='; echo;" % module["name"]
        command = echo_command + compiler_command
        command += "    --externs " + devtools_frontend_path + "/externs.js" + " \\\n"
        command += "    --externs " + protocol_externs_path
        command += dump_module(module["name"], True, {})
        if can_parallelize:
            proc = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, shell=True, preexec_fn=nice_child)
            processes.append(proc)
        else:
            os.system(command)
    if can_parallelize:
        outputs = []
        for proc in processes:
            (out, _) = proc.communicate()
            outputs.append(out)
        print "\n".join(outputs)
else:

    def compile_standalone_module(standalone_module):
        command = compiler_command
        command += "    --externs " + devtools_frontend_path + "/externs.js" + " \\\n"
        command += "    --externs " + protocol_externs_path
        standalone_module_name = standalone_module["name"]
        for module_name in standalone_module["dependencies"] + [standalone_module_name]:
            command += dump_module(module_name, False, {})
        print "Compiling %s..." % standalone_module_name
        return (standalone_module_name, subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, shell=True))

    standalone_compilers = []
    for standalone_module in standalone_modules:
        standalone_compilers.append(compile_standalone_module(standalone_module))

    def unclosure_injected_script(sourceFileName, outFileName):
        sourceFile = open(sourceFileName, "r")
        source = sourceFile.read()
        sourceFile.close()

        def replace_function(matchobj):
            return re.sub(r"@param", "param", matchobj.group(1) or "") + "\n//" + matchobj.group(2)

        # Comment out the closure function and its jsdocs
        source = re.sub(r"(/\*\*(?:[\s\n]*\*\s*@param[^\n]+\n)+\s*\*/\s*)?\n(\(function)", replace_function, source, count=1)

        # Comment out its return statement
        source = re.sub(r"\n(\s*return\s+[^;]+;\s*\n\}\)\s*)$", "\n/*\\1*/", source)

        outFileName = open(outFileName, "w")
        outFileName.write(source)
        outFileName.close()

    injectedScriptSourceTmpFile = inspector_path + "/" + "InjectedScriptSourceTmp.js"
    injectedScriptCanvasModuleSourceTmpFile = inspector_path + "/" + "InjectedScriptCanvasModuleSourceTmp.js"

    unclosure_injected_script(inspector_path + "/" + "InjectedScriptSource.js", injectedScriptSourceTmpFile)
    unclosure_injected_script(inspector_path + "/" + "InjectedScriptCanvasModuleSource.js", injectedScriptCanvasModuleSourceTmpFile)

    print "Compiling InjectedScriptSource.js and InjectedScriptCanvasModuleSource.js..."
    command = compiler_command
    command += "    --externs " + inspector_path + "/" + "InjectedScriptExterns.js" + " \\\n"
    command += "    --externs " + protocol_externs_path + " \\\n"
    command += "    --module " + jsmodule_name_prefix + "injected_script" + ":1" + " \\\n"
    command += "        --js " + injectedScriptSourceTmpFile + " \\\n"
    command += "    --module " + jsmodule_name_prefix + "injected_canvas_script" + ":1:" + jsmodule_name_prefix + "injected_script" + " \\\n"
    command += "        --js " + injectedScriptCanvasModuleSourceTmpFile + " \\\n"
    command += "\n"

    injectedScriptCompileProc = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, shell=True)

    print "Checking generated code in InjectedScriptCanvasModuleSource.js..."
    check_injected_webgl_calls_command = "%s/check_injected_webgl_calls_info.py %s %s/InjectedScriptCanvasModuleSource.js" % (scripts_path, webgl_rendering_context_idl_path, inspector_path)
    canvasModuleCompileProc = subprocess.Popen(check_injected_webgl_calls_command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, shell=True)

    print

    for (name, process) in standalone_compilers:
        (moduleCompileOut, _) = process.communicate()
        print "%s compilation output: %s\n" % (name, moduleCompileOut)

    (injectedScriptCompileOut, _) = injectedScriptCompileProc.communicate()
    print "InjectedScriptSource.js and InjectedScriptCanvasModuleSource.js compilation output:\n", injectedScriptCompileOut

    (canvasModuleCompileOut, _) = canvasModuleCompileProc.communicate()
    print "InjectedScriptCanvasModuleSource.js generated code check output:\n", canvasModuleCompileOut

    os.system("rm " + injectedScriptSourceTmpFile)
    os.system("rm " + injectedScriptCanvasModuleSourceTmpFile)

shutil.rmtree(modules_dir)
os.system("rm " + protocol_externs_path)
