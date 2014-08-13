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
import os.path as path
import generate_protocol_externs
import re
import shutil
import subprocess
import sys
import tempfile
try:
    import simplejson as json
except ImportError:
    import json

scripts_path = path.dirname(path.abspath(__file__))
devtools_path = path.dirname(scripts_path)
inspector_path = path.join(path.dirname(devtools_path), "core", "inspector")
devtools_frontend_path = path.join(devtools_path, "front_end")
global_externs_file = path.join(devtools_frontend_path, "externs.js")
protocol_externs_file = path.join(devtools_frontend_path, "protocol_externs.js")
webgl_rendering_context_idl_path = path.join(path.dirname(devtools_path), "core", "html", "canvas", "WebGLRenderingContextBase.idl")
injected_script_source_name = path.join(inspector_path, "InjectedScriptSource.js")
canvas_injected_script_source_name = path.join(inspector_path, "InjectedScriptCanvasModuleSource.js")
closure_compiler_jar = path.join(scripts_path, "closure", "compiler.jar")
closure_runner_jar = path.join(scripts_path, "compiler-runner", "closure-runner.jar")
jsdoc_validator_jar = path.join(scripts_path, "jsdoc-validator", "jsdoc-validator.jar")
java_exec = "java -Xms1024m -server -XX:+TieredCompilation"

generate_protocol_externs.generate_protocol_externs(protocol_externs_file, path.join(devtools_path, "protocol.json"))

jsmodule_name_prefix = "jsmodule_"
frontend_modules_name = "frontend_modules.json"
runtime_module_name = "_runtime"
module_initializer_name = "_module.js"


def log_error(message):
    print "ERROR: " + message


def error_excepthook(exctype, value, traceback):
    print "ERROR:"
    sys.__excepthook__(exctype, value, traceback)
sys.excepthook = error_excepthook

try:
    with open(path.join(scripts_path, frontend_modules_name), "rt") as js_modules_file:
        modules = json.loads(js_modules_file.read())
except:
    log_error("Failed to read %s" % frontend_modules_name)
    raise

type_checked_jsdoc_tags_list = ["param", "return", "type", "enum"]

type_checked_jsdoc_tags_or = "|".join(type_checked_jsdoc_tags_list)

# Basic regex for invalid JsDoc types: an object type name ([A-Z][A-Za-z0-9.]+[A-Za-z0-9]) not preceded by '!', '?', ':' (this, new), or '.' (object property).
invalid_type_regex = re.compile(r"@(?:" + type_checked_jsdoc_tags_or + r")\s*\{.*(?<![!?:.A-Za-z0-9])([A-Z][A-Za-z0-9.]+[A-Za-z0-9])[^/]*\}")

invalid_type_designator_regex = re.compile(r"@(?:" + type_checked_jsdoc_tags_or + r")\s*.*(?<![{: ])([?!])=?\}")

importscript_regex = re.compile(r"importScript\(\s*[\"']")
error_warning_regex = re.compile(r"(?:WARNING|ERROR)")

errors_found = False


def run_in_shell(command_line):
    return subprocess.Popen(command_line, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, shell=True)


def hasErrors(output):
    return re.search(error_warning_regex, output) != None


def verify_importScript_usage():
    errors_found = False
    for module in modules:
        for file_name in module["sources"]:
            if path.basename(file_name) == module_initializer_name:
                log_error("Module initializer (%s) may not be listed among module's scripts; found in '%s'" % (module_initializer_name, module["name"]))
                errors_found = True
                continue
            try:
                with open(path.join(devtools_frontend_path, file_name), "r") as sourceFile:
                    source = sourceFile.read()
                    if re.search(importscript_regex, source):
                        log_error("importScript() call only allowed in module initializers (%s); found in %s" % (module_initializer_name, file_name))
                        errors_found = True
            except:
                log_error("Failed to access %s" % file_name)
                raise
    return errors_found


def dump_all_checked_files():
    files = {}
    for module in modules:
        for source in module["sources"]:
            files[path.join(devtools_frontend_path, source)] = True
    return files.keys()


def verify_jsdoc_extra(additional_files):
    return run_in_shell("%s -jar %s %s" % (java_exec, jsdoc_validator_jar, " ".join(dump_all_checked_files() + additional_files)))


def verify_jsdoc(additional_files):
    def file_list():
        result = []
        for module in modules:
            for file_name in module["sources"]:
                result.append(path.join(devtools_frontend_path, file_name))
        for file in additional_files:
            result.append(file)
        return result

    errors_found = False
    for full_file_name in file_list():
        lineIndex = 0
        with open(full_file_name, "r") as sourceFile:
            for line in sourceFile:
                line = line.rstrip()
                lineIndex += 1
                if not line:
                    continue
                if verify_jsdoc_line(full_file_name, lineIndex, line):
                    errors_found = True
    return errors_found


def verify_jsdoc_line(fileName, lineIndex, line):
    def print_error(message, errorPosition):
        print "%s:%s: ERROR - %s\n%s\n%s\n" % (fileName, lineIndex, message, line, " " * errorPosition + "^")

    errors_found = False
    match = re.search(invalid_type_regex, line)
    if match:
        print_error("Type '%s' nullability not marked explicitly with '?' (nullable) or '!' (non-nullable)" % match.group(1), match.start(1))
        errors_found = True

    match = re.search(invalid_type_designator_regex, line)
    if (match):
        print_error("Type nullability indicator misplaced, should precede type", match.start(1))
        errors_found = True
    return errors_found


def check_java_path():
    proc = subprocess.Popen("which java", stdout=subprocess.PIPE, shell=True)
    (javaPath, _) = proc.communicate()

    if proc.returncode != 0:
        print "Cannot find java ('which java' return code = %d, should be 0)" % proc.returncode
        sys.exit(1)
    print "Java executable: " + re.sub(r"\n$", "", javaPath)

check_java_path()

print "Verifying 'importScript' function usage..."
errors_found |= verify_importScript_usage()

modules_dir = tempfile.mkdtemp()
common_closure_args = " --summary_detail_level 3 --jscomp_error visibility --compilation_level SIMPLE_OPTIMIZATIONS --warning_level VERBOSE --language_in ECMASCRIPT5 --accept_const_keyword --module_output_path_prefix %s/" % modules_dir

spawned_compiler_command = "%s -jar %s %s \\\n" % (java_exec, closure_compiler_jar, common_closure_args)

modules_by_name = {}
standalone_modules_by_name = {}
dependents_by_module_name = {}

for module in modules:
    name = module["name"]
    modules_by_name[name] = module
    if "standalone" in module:
        standalone_modules_by_name[name] = module
    for dep in module["dependencies"]:
        list = dependents_by_module_name.get(dep)
        if not list:
            list = []
            dependents_by_module_name[dep] = list
        list.append(name)


def verify_standalone_modules():
    for module in modules:
        for dependency in module["dependencies"]:
            if dependency in standalone_modules_by_name:
                log_error("Standalone module '%s' may not be present among the dependencies of '%s'" % (dependency, module["name"]))
                errors_found = True

verify_standalone_modules()


def check_duplicate_files():

    def check_module(module, seen_files, seen_modules):
        name = module["name"]
        seen_modules[name] = True
        for dep_name in module["dependencies"]:
            if not dep_name in seen_modules:
                check_module(modules_by_name[dep_name], seen_files, seen_modules)
        for source in module["sources"]:
            referencing_module = seen_files.get(source)
            if referencing_module:
                log_error("Duplicate use of %s in '%s' (previously seen in '%s')" % (source, name, referencing_module))
            seen_files[source] = name

    for module_name in standalone_modules_by_name:
        check_module(standalone_modules_by_name[module_name], {}, {})

print "Checking duplicate files across modules..."
check_duplicate_files()


def module_arg(module_name):
    return " --module " + jsmodule_name_prefix + module_name


def dump_module(name, recursively, processed_modules):
    if name in processed_modules:
        return ""
    processed_modules[name] = True
    module = modules_by_name[name]
    command = ""
    if recursively:
        for dependency in module["dependencies"]:
            command += dump_module(dependency, recursively, processed_modules)
    command += module_arg(module["name"]) + ":"
    command += str(len(module["sources"]))
    firstDependency = True
    for dependency in module["dependencies"] + [runtime_module_name]:
        if firstDependency:
            command += ":"
        else:
            command += ","
        firstDependency = False
        command += jsmodule_name_prefix + dependency
    for script in module["sources"]:
        command += " --js " + path.join(devtools_frontend_path, script)
    return command

print "Compiling frontend..."

compiler_args_file = tempfile.NamedTemporaryFile(mode='wt', delete=False)
closure_runner_command = "%s -jar %s --compiler-args-file %s" % (java_exec, closure_runner_jar, compiler_args_file.name)

for module in modules:
    closure_args = common_closure_args
    closure_args += " --externs " + global_externs_file
    closure_args += " --externs " + protocol_externs_file
    runtime_module = module_arg(runtime_module_name) + ":1 --js " + path.join(devtools_frontend_path, "Runtime.js")
    closure_args += runtime_module + dump_module(module["name"], True, {})
    compiler_args_file.write("%s %s\n" % (module["name"], closure_args))

compiler_args_file.close()
modular_compiler_proc = run_in_shell(closure_runner_command)


def unclosure_injected_script(sourceFileName, outFileName):
    with open(sourceFileName, "r") as sourceFile:
        source = sourceFile.read()

    def replace_function(matchobj):
        return re.sub(r"@param", "param", matchobj.group(1) or "") + "\n//" + matchobj.group(2)

    # Comment out the closure function and its jsdocs
    source = re.sub(r"(/\*\*(?:[\s\n]*\*\s*@param[^\n]+\n)+\s*\*/\s*)?\n(\(function)", replace_function, source, count=1)

    # Comment out its return statement
    source = re.sub(r"\n(\s*return\s+[^;]+;\s*\n\}\)\s*)$", "\n/*\\1*/", source)

    # Replace the "var Object" override with a "self.Object" one
    source = re.sub(r"\nvar Object =", "\nself.Object =", source, count=1)

    with open(outFileName, "w") as outFileName:
        outFileName.write(source)

injectedScriptSourceTmpFile = path.join(inspector_path, "InjectedScriptSourceTmp.js")
injectedScriptCanvasModuleSourceTmpFile = path.join(inspector_path, "InjectedScriptCanvasModuleSourceTmp.js")

unclosure_injected_script(injected_script_source_name, injectedScriptSourceTmpFile)
unclosure_injected_script(canvas_injected_script_source_name, injectedScriptCanvasModuleSourceTmpFile)

print "Compiling InjectedScriptSource.js and InjectedScriptCanvasModuleSource.js..."
command = spawned_compiler_command
command += "    --externs " + path.join(inspector_path, "InjectedScriptExterns.js") + " \\\n"
command += "    --externs " + protocol_externs_file + " \\\n"
command += "    --module " + jsmodule_name_prefix + "injected_script" + ":1" + " \\\n"
command += "        --js " + injectedScriptSourceTmpFile + " \\\n"
command += "    --module " + jsmodule_name_prefix + "injected_canvas_script" + ":1:" + jsmodule_name_prefix + "injected_script" + " \\\n"
command += "        --js " + injectedScriptCanvasModuleSourceTmpFile + " \\\n"
command += "\n"

injectedScriptCompileProc = run_in_shell(command)

print "Verifying JSDoc comments..."
additional_jsdoc_check_files = [injectedScriptSourceTmpFile, injectedScriptCanvasModuleSourceTmpFile]
errors_found |= verify_jsdoc(additional_jsdoc_check_files)
jsdocValidatorProc = verify_jsdoc_extra(additional_jsdoc_check_files)

print "Checking generated code in InjectedScriptCanvasModuleSource.js..."
check_injected_webgl_calls_command = "%s/check_injected_webgl_calls_info.py %s %s" % (scripts_path, webgl_rendering_context_idl_path, canvas_injected_script_source_name)
canvasModuleCompileProc = run_in_shell(check_injected_webgl_calls_command)

print "Validating InjectedScriptSource.js..."
check_injected_script_command = "%s/check_injected_script_source.py %s" % (scripts_path, injected_script_source_name)
validateInjectedScriptProc = run_in_shell(check_injected_script_command)

print

(jsdocValidatorOut, _) = jsdocValidatorProc.communicate()
if jsdocValidatorOut:
    print ("JSDoc validator output:\n%s" % jsdocValidatorOut)
    errors_found = True

(moduleCompileOut, _) = modular_compiler_proc.communicate()
print "Modular compilation output:"

start_module_regex = re.compile(r"^@@ START_MODULE:(.+) @@$")
end_module_regex = re.compile(r"^@@ END_MODULE @@$")

in_module = False
skipped_modules = {}
error_count = 0

def skip_dependents(module_name):
    for skipped_module in dependents_by_module_name.get(module_name, []):
        skipped_modules[skipped_module] = True

# pylint: disable=E1103
for line in moduleCompileOut.splitlines():
    if not in_module:
        match = re.search(start_module_regex, line)
        if not match:
            continue
        in_module = True
        module_error_count = 0
        module_output = []
        module_name = match.group(1)
        skip_module = skipped_modules.get(module_name)
        if skip_module:
            skip_dependents(module_name)
    else:
        match = re.search(end_module_regex, line)
        if not match:
            if not skip_module:
                module_output.append(line)
                if hasErrors(line):
                    error_count += 1
                    module_error_count += 1
                    skip_dependents(module_name)
            continue

        in_module = False
        if skip_module:
            print "Skipping module %s..." % module_name
        elif not module_error_count:
            print "Module %s compiled successfully: %s" % (module_name, module_output[0])
        else:
            print "Module %s compile failed: %s errors\n" % (module_name, module_error_count)
            print os.linesep.join(module_output)

if error_count:
    print "Total Closure errors: %d\n" % error_count
    errors_found = True

(injectedScriptCompileOut, _) = injectedScriptCompileProc.communicate()
print "InjectedScriptSource.js and InjectedScriptCanvasModuleSource.js compilation output:\n", injectedScriptCompileOut
errors_found |= hasErrors(injectedScriptCompileOut)

(canvasModuleCompileOut, _) = canvasModuleCompileProc.communicate()
print "InjectedScriptCanvasModuleSource.js generated code check output:\n", canvasModuleCompileOut
errors_found |= hasErrors(canvasModuleCompileOut)

(validateInjectedScriptOut, _) = validateInjectedScriptProc.communicate()
print "Validate InjectedScriptSource.js output:\n", (validateInjectedScriptOut if validateInjectedScriptOut else "<empty>")
errors_found |= hasErrors(validateInjectedScriptOut)

if errors_found:
    print "ERRORS DETECTED"

os.remove(injectedScriptSourceTmpFile)
os.remove(injectedScriptCanvasModuleSourceTmpFile)
os.remove(compiler_args_file.name)
os.remove(protocol_externs_file)
shutil.rmtree(modules_dir, True)
