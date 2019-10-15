#!/usr/bin/env bash

# the goal is to build minified ready-to-be-released version into resources/release
# resources/release should be still working and we should be able to load it as unpacked extension for testing
# (our test tasks rely on it)
#
# for our code we use clojurescript with :advanced optimizations
# for devtools we use build_release_applications.py which does concatenation and minification of devtools files,
# it also embeds resource files and compiles lazy-loaded code into modules

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

TASK=${1:-compile-dirac-pseudo-names}

cd "$ROOT"

./scripts/check-versions.sh

if [[ -z "$RELEASE_BUILD_DEVTOOLS" ]]; then
  echo "invalid config: RELEASE_BUILD_DEVTOOLS env var is empty"
  exit 111
fi

if [[ -f "$RELEASE_BUILD_COMPILED_BACKGROUND_JS" ]]; then
  rm "$RELEASE_BUILD_COMPILED_BACKGROUND_JS"
fi
if [[ -f "$RELEASE_BUILD_COMPILED_OPTIONS_JS" ]]; then
  rm "$RELEASE_BUILD_COMPILED_OPTIONS_JS"
fi
if [[ -d "$RELEASE_BUILD_DEVTOOLS" ]]; then
  rm -rf "$RELEASE_BUILD_DEVTOOLS"
fi
if [[ ! -d "$RELEASE_BUILD_DEVTOOLS_FRONTEND" ]]; then
  mkdir -p "$RELEASE_BUILD_DEVTOOLS_FRONTEND"
fi

FRONTEND="$DEVTOOLS_ROOT/front_end"

echo "Building dirac extension in advanced mode..."
lein "${TASK}"

cd "$DEVTOOLS_ROOT"

# http://stackoverflow.com/a/34676160/84283
WORK_DIR=$(mktemp -q -d /tmp/dirac-build-XXXXXXX)
# shellcheck disable=SC2181
if [[ $? -ne 0 ]]; then
  echo "$0: Can't create temp file, exiting..."
  exit 1
fi

function cleanup {
  if [[ "$WORK_DIR" == /tmp/dirac-build-* ]]; then  # this is just a paranoid test if something went terribly wrong and mktemp returned "/" or something non-tmp-ish
    rm -rf "$WORK_DIR"
    # echo "Deleted temp working directory $WORK_DIR"
  else
    echo "Unexpected temporary directory. Delete it manually '$WORK_DIR'."
  fi
}
trap cleanup EXIT

WORK_DIR="$WORK_DIR/front_end" # a hack for input_path of copy_devtools_modules.py

mkdir -p "$WORK_DIR"

cp -r "$FRONTEND"/* "$WORK_DIR"

# the compiled dir might exist because of dev build
WORK_DIR_DIRAC_COMPILED="$WORK_DIR/dirac/.compiled"
if [[ -d "$WORK_DIR_DIRAC_COMPILED" ]]; then
  rm -rf "$WORK_DIR_DIRAC_COMPILED"
fi
cp -r "$ROOT/target/resources/release/devtools/front_end/dirac/.compiled" "$WORK_DIR/dirac" # produced by `lein compile-dirac`

echo -n "" > "$WORK_DIR/dirac/require-implant.js" # when doing advanced build, all implant files are required automatically

echo "Building devtools in advanced mode..."
# DANGER! this list of applications must be the same as specified in resources/unpacked/devtools/BUILD.gn (search for "-- darwin")
./scripts/build/build_release_applications.py \
  audits_worker \
  devtools_app \
  formatter_worker \
  heap_snapshot_worker \
  inspector \
  js_app \
  node_app \
  shell \
  toolbox \
  worker_app \
  --input_path "$WORK_DIR" \
  --output_path "$RELEASE_BUILD_DEVTOOLS_FRONTEND" \
  --debug 0

echo "Copying devtools modules..."

# DANGER! this list of applications must be the same as specified in resources/unpacked/devtools/BUILD.gn (see all_devtools_modules list)
mkdir -p "$RELEASE_BUILD_DEVTOOLS_FRONTEND/ui"
mkdir -p "$RELEASE_BUILD_DEVTOOLS_FRONTEND/common"
./scripts/build/copy_devtools_modules.py \
    front_end/console_counters/console_counters.js \
    front_end/console_counters/WarningErrorCounter.js \
    front_end/extensions/extensions.js \
    front_end/extensions/ExtensionAPI.js \
    front_end/extensions/ExtensionPanel.js \
    front_end/extensions/ExtensionServer.js \
    front_end/extensions/ExtensionTraceProvider.js \
    front_end/extensions/ExtensionView.js \
    front_end/browser_sdk/browser_sdk.js \
    front_end/browser_sdk/LogManager.js \
    front_end/persistence/persistence.js \
    front_end/persistence/WorkspaceSettingsTab.js \
    front_end/persistence/PlatformFileSystem.js \
    front_end/persistence/PersistenceUtils.js \
    front_end/persistence/PersistenceImpl.js \
    front_end/persistence/PersistenceActions.js \
    front_end/persistence/NetworkPersistenceManager.js \
    front_end/persistence/IsolatedFileSystemManager.js \
    front_end/persistence/IsolatedFileSystem.js \
    front_end/persistence/FileSystemWorkspaceBinding.js \
    front_end/persistence/EditFileSystemView.js \
    front_end/persistence/Automapping.js \
    front_end/components/components.js \
    front_end/components/TargetDetachedDialog.js \
    front_end/components/Reload.js \
    front_end/components/Linkifier.js \
    front_end/components/JSPresentationUtils.js \
    front_end/components/ImagePreview.js \
    front_end/components/DockController.js \
    front_end/bindings/bindings.js \
    front_end/bindings/TempFile.js \
    front_end/bindings/StylesSourceMapping.js \
    front_end/bindings/SASSSourceMapping.js \
    front_end/bindings/ResourceUtils.js \
    front_end/bindings/ResourceScriptMapping.js \
    front_end/bindings/ResourceMapping.js \
    front_end/bindings/PresentationConsoleMessageHelper.js \
    front_end/bindings/NetworkProject.js \
    front_end/bindings/LiveLocation.js \
    front_end/bindings/FileUtils.js \
    front_end/bindings/DefaultScriptMapping.js \
    front_end/bindings/DebuggerWorkspaceBinding.js \
    front_end/bindings/CSSWorkspaceBinding.js \
    front_end/bindings/ContentProviderBasedProject.js \
    front_end/bindings/CompilerScriptMapping.js \
    front_end/bindings/BreakpointManager.js \
    front_end/bindings/BlackboxManager.js \
    front_end/workspace/workspace.js \
    front_end/workspace/WorkspaceImpl.js \
    front_end/workspace/UISourceCode.js \
    front_end/workspace/FileManager.js \
    front_end/services/services.js \
    front_end/services/ServiceManager.js \
    front_end/sdk/sdk.js \
    front_end/sdk/TracingModel.js \
    front_end/sdk/TracingManager.js \
    front_end/sdk/TargetManager.js \
    front_end/sdk/Target.js \
    front_end/sdk/SourceMapManager.js \
    front_end/sdk/SourceMap.js \
    front_end/sdk/ServiceWorkerManager.js \
    front_end/sdk/ServiceWorkerCacheModel.js \
    front_end/sdk/ServerTiming.js \
    front_end/sdk/SecurityOriginManager.js \
    front_end/sdk/SDKModel.js \
    front_end/sdk/Script.js \
    front_end/sdk/ScreenCaptureModel.js \
    front_end/sdk/RuntimeModel.js \
    front_end/sdk/ResourceTreeModel.js \
    front_end/sdk/Resource.js \
    front_end/sdk/RemoteObject.js \
    front_end/sdk/ProfileTreeModel.js \
    front_end/sdk/PerformanceMetricsModel.js \
    front_end/sdk/PaintProfiler.js \
    front_end/sdk/OverlayModel.js \
    front_end/sdk/NetworkRequest.js \
    front_end/sdk/NetworkManager.js \
    front_end/sdk/NetworkLog.js \
    front_end/sdk/LogModel.js \
    front_end/sdk/LayerTreeBase.js \
    front_end/sdk/IsolateManager.js \
    front_end/sdk/HeapProfilerModel.js \
    front_end/sdk/HARLog.js \
    front_end/sdk/FilmStripModel.js \
    front_end/sdk/EmulationModel.js \
    front_end/sdk/DOMModel.js \
    front_end/sdk/DOMDebuggerModel.js \
    front_end/sdk/DebuggerModel.js \
    front_end/sdk/CSSStyleSheetHeader.js \
    front_end/sdk/CSSStyleDeclaration.js \
    front_end/sdk/CSSRule.js \
    front_end/sdk/CSSProperty.js \
    front_end/sdk/CSSModel.js \
    front_end/sdk/CSSMetadata.js \
    front_end/sdk/CSSMedia.js \
    front_end/sdk/CSSMatchedStyles.js \
    front_end/sdk/CPUProfilerModel.js \
    front_end/sdk/CPUProfileDataModel.js \
    front_end/sdk/CookieParser.js \
    front_end/sdk/CookieModel.js \
    front_end/sdk/CompilerSourceMappingContentProvider.js \
    front_end/sdk/ConsoleModel.js \
    front_end/sdk/Connections.js \
    front_end/sdk/ChildTargetManager.js \
    front_end/protocol/protocol.js \
    front_end/protocol/NodeURL.js \
    front_end/protocol/InspectorBackend.js \
    front_end/host/host.js \
    front_end/host/UserMetrics.js \
    front_end/host/ResourceLoader.js \
    front_end/host/Platform.js \
    front_end/host/InspectorFrontendHost.js \
    front_end/host/InspectorFrontendHostAPI.js \
    front_end/dom_extension/DOMExtension.js \
    front_end/root.js \
    front_end/Runtime.js \
    front_end/platform/utilities.js \
    front_end/ui/ARIAUtils.js \
    front_end/ui/ZoomManager.js \
    front_end/ui/XWidget.js \
    front_end/ui/XLink.js \
    front_end/ui/XElement.js \
    front_end/ui/Widget.js \
    front_end/ui/View.js \
    front_end/ui/ViewManager.js \
    front_end/ui/UIUtils.js \
    front_end/ui/ui.js \
    front_end/ui/Treeoutline.js \
    front_end/ui/Tooltip.js \
    front_end/ui/Toolbar.js \
    front_end/ui/ThrottledWidget.js \
    front_end/ui/TextPrompt.js \
    front_end/ui/TextEditor.js \
    front_end/ui/TargetCrashedScreen.js \
    front_end/ui/TabbedPane.js \
    front_end/ui/SyntaxHighlighter.js \
    front_end/ui/SuggestBox.js \
    front_end/ui/SplitWidget.js \
    front_end/ui/SoftDropDown.js \
    front_end/ui/SoftContextMenu.js \
    front_end/ui/ShortcutsScreen.js \
    front_end/ui/ShortcutRegistry.js \
    front_end/ui/SettingsUI.js \
    front_end/ui/SegmentedButton.js \
    front_end/ui/SearchableView.js \
    front_end/ui/RootView.js \
    front_end/ui/ResizerWidget.js \
    front_end/ui/ReportView.js \
    front_end/ui/RemoteDebuggingTerminatedScreen.js \
    front_end/ui/ProgressIndicator.js \
    front_end/ui/PopoverHelper.js \
    front_end/ui/Panel.js \
    front_end/ui/ListWidget.js \
    front_end/ui/ListModel.js \
    front_end/ui/ListControl.js \
    front_end/ui/KeyboardShortcut.js \
    front_end/ui/InspectorView.js \
    front_end/ui/InplaceEditor.js \
    front_end/ui/Infobar.js \
    front_end/ui/Icon.js \
    front_end/ui/HistoryInput.js \
    front_end/ui/GlassPane.js \
    front_end/ui/Geometry.js \
    front_end/ui/Fragment.js \
    front_end/ui/ForwardedInputEventHandler.js \
    front_end/ui/FilterSuggestionBuilder.js \
    front_end/ui/FilterBar.js \
    front_end/ui/EmptyWidget.js \
    front_end/ui/DropTarget.js \
    front_end/ui/Dialog.js \
    front_end/ui/ContextMenu.js \
    front_end/ui/Context.js \
    front_end/ui/ARIAUtils.js \
    front_end/ui/ActionRegistry.js \
    front_end/ui/Action.js \
    front_end/ui/ActionDelegate.js \
    front_end/ui/ContextFlavorListener.js \
    front_end/root.js \
    front_end/common/common.js \
    front_end/common/App.js \
    front_end/common/AppProvider.js \
    front_end/common/CharacterIdMap.js \
    front_end/common/Color.js \
    front_end/common/ContentProvider.js \
    front_end/common/EventTarget.js \
    front_end/common/JavaScriptMetaData.js \
    front_end/common/Linkifier.js \
    front_end/common/Object.js \
    front_end/common/Console.js \
    front_end/common/ParsedURL.js \
    front_end/common/Progress.js \
    front_end/common/QueryParamHandler.js \
    front_end/common/ResourceType.js \
    front_end/common/Revealer.js \
    front_end/common/Runnable.js \
    front_end/common/SegmentedRange.js \
    front_end/common/Settings.js \
    front_end/common/StaticContentProvider.js \
    front_end/common/StringOutputStream.js \
    front_end/common/TextDictionary.js \
    front_end/common/Throttler.js \
    front_end/common/Trie.js \
    front_end/common/UIString.js \
    front_end/common/Worker.js \
  --input_path "$WORK_DIR/.." \
  --output_path "$RELEASE_BUILD_DEVTOOLS_FRONTEND"

cd "$ROOT"

# copy generated protocol files
cp "$FRONTEND/InspectorBackendCommands.js" "$RELEASE_BUILD_DEVTOOLS_FRONTEND"
cp "$FRONTEND/SupportedCSSProperties.js" "$RELEASE_BUILD_DEVTOOLS_FRONTEND"

# copy our custom sources
cp "$FRONTEND/protocol/InspectorBackendExtensionMode.js" "$RELEASE_BUILD_DEVTOOLS_FRONTEND/protocol"
cp "$FRONTEND/sdk/SupportedCSSPropertiesExtensionMode.js" "$RELEASE_BUILD_DEVTOOLS_FRONTEND/sdk"

# copy handshake files
cp "$FRONTEND/handshake.html" "$RELEASE_BUILD_DEVTOOLS_FRONTEND"
cp "$FRONTEND/handshake.js" "$RELEASE_BUILD_DEVTOOLS_FRONTEND"

# copy static resources
# this should be kept in sync with devtools_frontend_resources target of devtools.gyp
cp -r "$FRONTEND/Images" "$RELEASE_BUILD_DEVTOOLS_FRONTEND"
cp -r "$FRONTEND/emulated_devices" "$RELEASE_BUILD_DEVTOOLS_FRONTEND"
cp "$FRONTEND/devtools_compatibility.js" "$RELEASE_BUILD_DEVTOOLS_FRONTEND"

# copy compiled extension code (produced by `lein compile-dirac`)
cp "$ROOT/target/resources/release/.compiled/background.js" "$RELEASE_BUILD/background.js"
cp "$ROOT/target/resources/release/.compiled/options.js" "$RELEASE_BUILD/options.js"

# ad-hoc cleanup
rm -rf "$RELEASE_BUILD_DEVTOOLS_FRONTEND/dirac"
rm -rf "$RELEASE_BUILD_DEVTOOLS_FRONTEND/Images/src"
