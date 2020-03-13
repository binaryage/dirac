// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * This file is auto-generated, do not edit manually. *
 * Re-generate with: npm run generate-protocol-resources.
 */


/**
 * API generated from Protocol commands and events.
 */
declare namespace ProtocolProxyApi {
  declare interface ProtocolApi {
    Accessibility: AccessibilityApi;

    Animation: AnimationApi;

    ApplicationCache: ApplicationCacheApi;

    Audits: AuditsApi;

    BackgroundService: BackgroundServiceApi;

    Browser: BrowserApi;

    CSS: CSSApi;

    CacheStorage: CacheStorageApi;

    Cast: CastApi;

    DOM: DOMApi;

    DOMDebugger: DOMDebuggerApi;

    DOMSnapshot: DOMSnapshotApi;

    DOMStorage: DOMStorageApi;

    Database: DatabaseApi;

    DeviceOrientation: DeviceOrientationApi;

    Emulation: EmulationApi;

    HeadlessExperimental: HeadlessExperimentalApi;

    IO: IOApi;

    IndexedDB: IndexedDBApi;

    Input: InputApi;

    Inspector: InspectorApi;

    LayerTree: LayerTreeApi;

    Log: LogApi;

    Memory: MemoryApi;

    Network: NetworkApi;

    Overlay: OverlayApi;

    Page: PageApi;

    Performance: PerformanceApi;

    Security: SecurityApi;

    ServiceWorker: ServiceWorkerApi;

    Storage: StorageApi;

    SystemInfo: SystemInfoApi;

    Target: TargetApi;

    Tethering: TetheringApi;

    Tracing: TracingApi;

    Fetch: FetchApi;

    WebAudio: WebAudioApi;

    WebAuthn: WebAuthnApi;

    Media: MediaApi;

    Console: ConsoleApi;

    Debugger: DebuggerApi;

    HeapProfiler: HeapProfilerApi;

    Profiler: ProfilerApi;

    Runtime: RuntimeApi;

    Schema: SchemaApi;
  }


  export interface AccessibilityApi {
    /**
     * Disables the accessibility domain.
     */
    disable(): Promise<void>;

    /**
     * Enables the accessibility domain which causes `AXNodeId`s to remain consistent between method calls.
     * This turns on accessibility for the page, which can impact performance until accessibility is disabled.
     */
    enable(): Promise<void>;

    /**
     * Fetches the accessibility node and partial accessibility tree for this DOM node, if it exists.
     */
    getPartialAXTree(params: Protocol.Accessibility.GetPartialAXTreeRequest):
        Promise<Protocol.Accessibility.GetPartialAXTreeResponse>;

    /**
     * Fetches the entire accessibility tree
     */
    getFullAXTree(): Promise<Protocol.Accessibility.GetFullAXTreeResponse>;
  }

  export interface AnimationApi {
    /**
     * Disables animation domain notifications.
     */
    disable(): Promise<void>;

    /**
     * Enables animation domain notifications.
     */
    enable(): Promise<void>;

    /**
     * Returns the current time of the an animation.
     */
    getCurrentTime(params: Protocol.Animation.GetCurrentTimeRequest):
        Promise<Protocol.Animation.GetCurrentTimeResponse>;

    /**
     * Gets the playback rate of the document timeline.
     */
    getPlaybackRate(): Promise<Protocol.Animation.GetPlaybackRateResponse>;

    /**
     * Releases a set of animations to no longer be manipulated.
     */
    releaseAnimations(params: Protocol.Animation.ReleaseAnimationsRequest): Promise<void>;

    /**
     * Gets the remote object of the Animation.
     */
    resolveAnimation(params: Protocol.Animation.ResolveAnimationRequest):
        Promise<Protocol.Animation.ResolveAnimationResponse>;

    /**
     * Seek a set of animations to a particular time within each animation.
     */
    seekAnimations(params: Protocol.Animation.SeekAnimationsRequest): Promise<void>;

    /**
     * Sets the paused state of a set of animations.
     */
    setPaused(params: Protocol.Animation.SetPausedRequest): Promise<void>;

    /**
     * Sets the playback rate of the document timeline.
     */
    setPlaybackRate(params: Protocol.Animation.SetPlaybackRateRequest): Promise<void>;

    /**
     * Sets the timing of an animation node.
     */
    setTiming(params: Protocol.Animation.SetTimingRequest): Promise<void>;

    /**
     * Event for when an animation has been cancelled.
     */
    on(event: 'animationCanceled', listener: (params: Protocol.Animation.AnimationCanceledEvent) => void): void;

    /**
     * Event for each animation that has been created.
     */
    on(event: 'animationCreated', listener: (params: Protocol.Animation.AnimationCreatedEvent) => void): void;

    /**
     * Event for animation that has been started.
     */
    on(event: 'animationStarted', listener: (params: Protocol.Animation.AnimationStartedEvent) => void): void;
  }

  export interface ApplicationCacheApi {
    /**
     * Enables application cache domain notifications.
     */
    enable(): Promise<void>;

    /**
     * Returns relevant application cache data for the document in given frame.
     */
    getApplicationCacheForFrame(params: Protocol.ApplicationCache.GetApplicationCacheForFrameRequest):
        Promise<Protocol.ApplicationCache.GetApplicationCacheForFrameResponse>;

    /**
     * Returns array of frame identifiers with manifest urls for each frame containing a document
     * associated with some application cache.
     */
    getFramesWithManifests(): Promise<Protocol.ApplicationCache.GetFramesWithManifestsResponse>;

    /**
     * Returns manifest URL for document in the given frame.
     */
    getManifestForFrame(params: Protocol.ApplicationCache.GetManifestForFrameRequest):
        Promise<Protocol.ApplicationCache.GetManifestForFrameResponse>;

    on(event: 'applicationCacheStatusUpdated',
       listener: (params: Protocol.ApplicationCache.ApplicationCacheStatusUpdatedEvent) => void): void;

    on(event: 'networkStateUpdated',
       listener: (params: Protocol.ApplicationCache.NetworkStateUpdatedEvent) => void): void;
  }

  export interface AuditsApi {
    /**
     * Returns the response body and size if it were re-encoded with the specified settings. Only
     * applies to images.
     */
    getEncodedResponse(params: Protocol.Audits.GetEncodedResponseRequest):
        Promise<Protocol.Audits.GetEncodedResponseResponse>;

    /**
     * Disables issues domain, prevents further issues from being reported to the client.
     */
    disable(): Promise<void>;

    /**
     * Enables issues domain, sends the issues collected so far to the client by means of the
     * `issueAdded` event.
     */
    enable(): Promise<void>;

    on(event: 'issueAdded', listener: (params: Protocol.Audits.IssueAddedEvent) => void): void;
  }

  export interface BackgroundServiceApi {
    /**
     * Enables event updates for the service.
     */
    startObserving(params: Protocol.BackgroundService.StartObservingRequest): Promise<void>;

    /**
     * Disables event updates for the service.
     */
    stopObserving(params: Protocol.BackgroundService.StopObservingRequest): Promise<void>;

    /**
     * Set the recording state for the service.
     */
    setRecording(params: Protocol.BackgroundService.SetRecordingRequest): Promise<void>;

    /**
     * Clears all stored data for the service.
     */
    clearEvents(params: Protocol.BackgroundService.ClearEventsRequest): Promise<void>;

    /**
     * Called when the recording state for the service has been updated.
     */
    on(event: 'recordingStateChanged',
       listener: (params: Protocol.BackgroundService.RecordingStateChangedEvent) => void): void;

    /**
     * Called with all existing backgroundServiceEvents when enabled, and all new
     * events afterwards if enabled and recording.
     */
    on(event: 'backgroundServiceEventReceived',
       listener: (params: Protocol.BackgroundService.BackgroundServiceEventReceivedEvent) => void): void;
  }

  export interface BrowserApi {
    /**
     * Set permission settings for given origin.
     */
    setPermission(params: Protocol.Browser.SetPermissionRequest): Promise<void>;

    /**
     * Grant specific permissions to the given origin and reject all others.
     */
    grantPermissions(params: Protocol.Browser.GrantPermissionsRequest): Promise<void>;

    /**
     * Reset all permission management for all origins.
     */
    resetPermissions(params: Protocol.Browser.ResetPermissionsRequest): Promise<void>;

    /**
     * Close browser gracefully.
     */
    close(): Promise<void>;

    /**
     * Crashes browser on the main thread.
     */
    crash(): Promise<void>;

    /**
     * Crashes GPU process.
     */
    crashGpuProcess(): Promise<void>;

    /**
     * Returns version information.
     */
    getVersion(): Promise<Protocol.Browser.GetVersionResponse>;

    /**
     * Returns the command line switches for the browser process if, and only if
     * --enable-automation is on the commandline.
     */
    getBrowserCommandLine(): Promise<Protocol.Browser.GetBrowserCommandLineResponse>;

    /**
     * Get Chrome histograms.
     */
    getHistograms(params: Protocol.Browser.GetHistogramsRequest): Promise<Protocol.Browser.GetHistogramsResponse>;

    /**
     * Get a Chrome histogram by name.
     */
    getHistogram(params: Protocol.Browser.GetHistogramRequest): Promise<Protocol.Browser.GetHistogramResponse>;

    /**
     * Get position and size of the browser window.
     */
    getWindowBounds(params: Protocol.Browser.GetWindowBoundsRequest): Promise<Protocol.Browser.GetWindowBoundsResponse>;

    /**
     * Get the browser window that contains the devtools target.
     */
    getWindowForTarget(params: Protocol.Browser.GetWindowForTargetRequest):
        Promise<Protocol.Browser.GetWindowForTargetResponse>;

    /**
     * Set position and/or size of the browser window.
     */
    setWindowBounds(params: Protocol.Browser.SetWindowBoundsRequest): Promise<void>;

    /**
     * Set dock tile details, platform-specific.
     */
    setDockTile(params: Protocol.Browser.SetDockTileRequest): Promise<void>;
  }

  export interface CSSApi {
    /**
     * Inserts a new rule with the given `ruleText` in a stylesheet with given `styleSheetId`, at the
     * position specified by `location`.
     */
    addRule(params: Protocol.CSS.AddRuleRequest): Promise<Protocol.CSS.AddRuleResponse>;

    /**
     * Returns all class names from specified stylesheet.
     */
    collectClassNames(params: Protocol.CSS.CollectClassNamesRequest): Promise<Protocol.CSS.CollectClassNamesResponse>;

    /**
     * Creates a new special "via-inspector" stylesheet in the frame with given `frameId`.
     */
    createStyleSheet(params: Protocol.CSS.CreateStyleSheetRequest): Promise<Protocol.CSS.CreateStyleSheetResponse>;

    /**
     * Disables the CSS agent for the given page.
     */
    disable(): Promise<void>;

    /**
     * Enables the CSS agent for the given page. Clients should not assume that the CSS agent has been
     * enabled until the result of this command is received.
     */
    enable(): Promise<void>;

    /**
     * Ensures that the given node will have specified pseudo-classes whenever its style is computed by
     * the browser.
     */
    forcePseudoState(params: Protocol.CSS.ForcePseudoStateRequest): Promise<void>;

    getBackgroundColors(params: Protocol.CSS.GetBackgroundColorsRequest):
        Promise<Protocol.CSS.GetBackgroundColorsResponse>;

    /**
     * Returns the computed style for a DOM node identified by `nodeId`.
     */
    getComputedStyleForNode(params: Protocol.CSS.GetComputedStyleForNodeRequest):
        Promise<Protocol.CSS.GetComputedStyleForNodeResponse>;

    /**
     * Returns the styles defined inline (explicitly in the "style" attribute and implicitly, using DOM
     * attributes) for a DOM node identified by `nodeId`.
     */
    getInlineStylesForNode(params: Protocol.CSS.GetInlineStylesForNodeRequest):
        Promise<Protocol.CSS.GetInlineStylesForNodeResponse>;

    /**
     * Returns requested styles for a DOM node identified by `nodeId`.
     */
    getMatchedStylesForNode(params: Protocol.CSS.GetMatchedStylesForNodeRequest):
        Promise<Protocol.CSS.GetMatchedStylesForNodeResponse>;

    /**
     * Returns all media queries parsed by the rendering engine.
     */
    getMediaQueries(): Promise<Protocol.CSS.GetMediaQueriesResponse>;

    /**
     * Requests information about platform fonts which we used to render child TextNodes in the given
     * node.
     */
    getPlatformFontsForNode(params: Protocol.CSS.GetPlatformFontsForNodeRequest):
        Promise<Protocol.CSS.GetPlatformFontsForNodeResponse>;

    /**
     * Returns the current textual content for a stylesheet.
     */
    getStyleSheetText(params: Protocol.CSS.GetStyleSheetTextRequest): Promise<Protocol.CSS.GetStyleSheetTextResponse>;

    /**
     * Find a rule with the given active property for the given node and set the new value for this
     * property
     */
    setEffectivePropertyValueForNode(params: Protocol.CSS.SetEffectivePropertyValueForNodeRequest): Promise<void>;

    /**
     * Modifies the keyframe rule key text.
     */
    setKeyframeKey(params: Protocol.CSS.SetKeyframeKeyRequest): Promise<Protocol.CSS.SetKeyframeKeyResponse>;

    /**
     * Modifies the rule selector.
     */
    setMediaText(params: Protocol.CSS.SetMediaTextRequest): Promise<Protocol.CSS.SetMediaTextResponse>;

    /**
     * Modifies the rule selector.
     */
    setRuleSelector(params: Protocol.CSS.SetRuleSelectorRequest): Promise<Protocol.CSS.SetRuleSelectorResponse>;

    /**
     * Sets the new stylesheet text.
     */
    setStyleSheetText(params: Protocol.CSS.SetStyleSheetTextRequest): Promise<Protocol.CSS.SetStyleSheetTextResponse>;

    /**
     * Applies specified style edits one after another in the given order.
     */
    setStyleTexts(params: Protocol.CSS.SetStyleTextsRequest): Promise<Protocol.CSS.SetStyleTextsResponse>;

    /**
     * Enables the selector recording.
     */
    startRuleUsageTracking(): Promise<void>;

    /**
     * Stop tracking rule usage and return the list of rules that were used since last call to
     * `takeCoverageDelta` (or since start of coverage instrumentation)
     */
    stopRuleUsageTracking(): Promise<Protocol.CSS.StopRuleUsageTrackingResponse>;

    /**
     * Obtain list of rules that became used since last call to this method (or since start of coverage
     * instrumentation)
     */
    takeCoverageDelta(): Promise<Protocol.CSS.TakeCoverageDeltaResponse>;

    /**
     * Fires whenever a web font is updated.  A non-empty font parameter indicates a successfully loaded
     * web font
     */
    on(event: 'fontsUpdated', listener: (params: Protocol.CSS.FontsUpdatedEvent) => void): void;

    /**
     * Fires whenever a MediaQuery result changes (for example, after a browser window has been
     * resized.) The current implementation considers only viewport-dependent media features.
     */
    on(event: 'mediaQueryResultChanged', listener: () => void): void;

    /**
     * Fired whenever an active document stylesheet is added.
     */
    on(event: 'styleSheetAdded', listener: (params: Protocol.CSS.StyleSheetAddedEvent) => void): void;

    /**
     * Fired whenever a stylesheet is changed as a result of the client operation.
     */
    on(event: 'styleSheetChanged', listener: (params: Protocol.CSS.StyleSheetChangedEvent) => void): void;

    /**
     * Fired whenever an active document stylesheet is removed.
     */
    on(event: 'styleSheetRemoved', listener: (params: Protocol.CSS.StyleSheetRemovedEvent) => void): void;
  }

  export interface CacheStorageApi {
    /**
     * Deletes a cache.
     */
    deleteCache(params: Protocol.CacheStorage.DeleteCacheRequest): Promise<void>;

    /**
     * Deletes a cache entry.
     */
    deleteEntry(params: Protocol.CacheStorage.DeleteEntryRequest): Promise<void>;

    /**
     * Requests cache names.
     */
    requestCacheNames(params: Protocol.CacheStorage.RequestCacheNamesRequest):
        Promise<Protocol.CacheStorage.RequestCacheNamesResponse>;

    /**
     * Fetches cache entry.
     */
    requestCachedResponse(params: Protocol.CacheStorage.RequestCachedResponseRequest):
        Promise<Protocol.CacheStorage.RequestCachedResponseResponse>;

    /**
     * Requests data from cache.
     */
    requestEntries(params: Protocol.CacheStorage.RequestEntriesRequest):
        Promise<Protocol.CacheStorage.RequestEntriesResponse>;
  }

  export interface CastApi {
    /**
     * Starts observing for sinks that can be used for tab mirroring, and if set,
     * sinks compatible with |presentationUrl| as well. When sinks are found, a
     * |sinksUpdated| event is fired.
     * Also starts observing for issue messages. When an issue is added or removed,
     * an |issueUpdated| event is fired.
     */
    enable(params: Protocol.Cast.EnableRequest): Promise<void>;

    /**
     * Stops observing for sinks and issues.
     */
    disable(): Promise<void>;

    /**
     * Sets a sink to be used when the web page requests the browser to choose a
     * sink via Presentation API, Remote Playback API, or Cast SDK.
     */
    setSinkToUse(params: Protocol.Cast.SetSinkToUseRequest): Promise<void>;

    /**
     * Starts mirroring the tab to the sink.
     */
    startTabMirroring(params: Protocol.Cast.StartTabMirroringRequest): Promise<void>;

    /**
     * Stops the active Cast session on the sink.
     */
    stopCasting(params: Protocol.Cast.StopCastingRequest): Promise<void>;

    /**
     * This is fired whenever the list of available sinks changes. A sink is a
     * device or a software surface that you can cast to.
     */
    on(event: 'sinksUpdated', listener: (params: Protocol.Cast.SinksUpdatedEvent) => void): void;

    /**
     * This is fired whenever the outstanding issue/error message changes.
     * |issueMessage| is empty if there is no issue.
     */
    on(event: 'issueUpdated', listener: (params: Protocol.Cast.IssueUpdatedEvent) => void): void;
  }

  export interface DOMApi {
    /**
     * Collects class names for the node with given id and all of it's child nodes.
     */
    collectClassNamesFromSubtree(params: Protocol.DOM.CollectClassNamesFromSubtreeRequest):
        Promise<Protocol.DOM.CollectClassNamesFromSubtreeResponse>;

    /**
     * Creates a deep copy of the specified node and places it into the target container before the
     * given anchor.
     */
    copyTo(params: Protocol.DOM.CopyToRequest): Promise<Protocol.DOM.CopyToResponse>;

    /**
     * Describes node given its id, does not require domain to be enabled. Does not start tracking any
     * objects, can be used for automation.
     */
    describeNode(params: Protocol.DOM.DescribeNodeRequest): Promise<Protocol.DOM.DescribeNodeResponse>;

    /**
     * Scrolls the specified rect of the given node into view if not already visible.
     * Note: exactly one between nodeId, backendNodeId and objectId should be passed
     * to identify the node.
     */
    scrollIntoViewIfNeeded(params: Protocol.DOM.ScrollIntoViewIfNeededRequest): Promise<void>;

    /**
     * Disables DOM agent for the given page.
     */
    disable(): Promise<void>;

    /**
     * Discards search results from the session with the given id. `getSearchResults` should no longer
     * be called for that search.
     */
    discardSearchResults(params: Protocol.DOM.DiscardSearchResultsRequest): Promise<void>;

    /**
     * Enables DOM agent for the given page.
     */
    enable(): Promise<void>;

    /**
     * Focuses the given element.
     */
    focus(params: Protocol.DOM.FocusRequest): Promise<void>;

    /**
     * Returns attributes for the specified node.
     */
    getAttributes(params: Protocol.DOM.GetAttributesRequest): Promise<Protocol.DOM.GetAttributesResponse>;

    /**
     * Returns boxes for the given node.
     */
    getBoxModel(params: Protocol.DOM.GetBoxModelRequest): Promise<Protocol.DOM.GetBoxModelResponse>;

    /**
     * Returns quads that describe node position on the page. This method
     * might return multiple quads for inline nodes.
     */
    getContentQuads(params: Protocol.DOM.GetContentQuadsRequest): Promise<Protocol.DOM.GetContentQuadsResponse>;

    /**
     * Returns the root DOM node (and optionally the subtree) to the caller.
     */
    getDocument(params: Protocol.DOM.GetDocumentRequest): Promise<Protocol.DOM.GetDocumentResponse>;

    /**
     * Returns the root DOM node (and optionally the subtree) to the caller.
     */
    getFlattenedDocument(params: Protocol.DOM.GetFlattenedDocumentRequest):
        Promise<Protocol.DOM.GetFlattenedDocumentResponse>;

    /**
     * Returns node id at given location. Depending on whether DOM domain is enabled, nodeId is
     * either returned or not.
     */
    getNodeForLocation(params: Protocol.DOM.GetNodeForLocationRequest):
        Promise<Protocol.DOM.GetNodeForLocationResponse>;

    /**
     * Returns node's HTML markup.
     */
    getOuterHTML(params: Protocol.DOM.GetOuterHTMLRequest): Promise<Protocol.DOM.GetOuterHTMLResponse>;

    /**
     * Returns the id of the nearest ancestor that is a relayout boundary.
     */
    getRelayoutBoundary(params: Protocol.DOM.GetRelayoutBoundaryRequest):
        Promise<Protocol.DOM.GetRelayoutBoundaryResponse>;

    /**
     * Returns search results from given `fromIndex` to given `toIndex` from the search with the given
     * identifier.
     */
    getSearchResults(params: Protocol.DOM.GetSearchResultsRequest): Promise<Protocol.DOM.GetSearchResultsResponse>;

    /**
     * Hides any highlight.
     */
    hideHighlight(): Promise<void>;

    /**
     * Highlights DOM node.
     */
    highlightNode(): Promise<void>;

    /**
     * Highlights given rectangle.
     */
    highlightRect(): Promise<void>;

    /**
     * Marks last undoable state.
     */
    markUndoableState(): Promise<void>;

    /**
     * Moves node into the new container, places it before the given anchor.
     */
    moveTo(params: Protocol.DOM.MoveToRequest): Promise<Protocol.DOM.MoveToResponse>;

    /**
     * Searches for a given string in the DOM tree. Use `getSearchResults` to access search results or
     * `cancelSearch` to end this search session.
     */
    performSearch(params: Protocol.DOM.PerformSearchRequest): Promise<Protocol.DOM.PerformSearchResponse>;

    /**
     * Requests that the node is sent to the caller given its path. // FIXME, use XPath
     */
    pushNodeByPathToFrontend(params: Protocol.DOM.PushNodeByPathToFrontendRequest):
        Promise<Protocol.DOM.PushNodeByPathToFrontendResponse>;

    /**
     * Requests that a batch of nodes is sent to the caller given their backend node ids.
     */
    pushNodesByBackendIdsToFrontend(params: Protocol.DOM.PushNodesByBackendIdsToFrontendRequest):
        Promise<Protocol.DOM.PushNodesByBackendIdsToFrontendResponse>;

    /**
     * Executes `querySelector` on a given node.
     */
    querySelector(params: Protocol.DOM.QuerySelectorRequest): Promise<Protocol.DOM.QuerySelectorResponse>;

    /**
     * Executes `querySelectorAll` on a given node.
     */
    querySelectorAll(params: Protocol.DOM.QuerySelectorAllRequest): Promise<Protocol.DOM.QuerySelectorAllResponse>;

    /**
     * Re-does the last undone action.
     */
    redo(): Promise<void>;

    /**
     * Removes attribute with given name from an element with given id.
     */
    removeAttribute(params: Protocol.DOM.RemoveAttributeRequest): Promise<void>;

    /**
     * Removes node with given id.
     */
    removeNode(params: Protocol.DOM.RemoveNodeRequest): Promise<void>;

    /**
     * Requests that children of the node with given id are returned to the caller in form of
     * `setChildNodes` events where not only immediate children are retrieved, but all children down to
     * the specified depth.
     */
    requestChildNodes(params: Protocol.DOM.RequestChildNodesRequest): Promise<void>;

    /**
     * Requests that the node is sent to the caller given the JavaScript node object reference. All
     * nodes that form the path from the node to the root are also sent to the client as a series of
     * `setChildNodes` notifications.
     */
    requestNode(params: Protocol.DOM.RequestNodeRequest): Promise<Protocol.DOM.RequestNodeResponse>;

    /**
     * Resolves the JavaScript node object for a given NodeId or BackendNodeId.
     */
    resolveNode(params: Protocol.DOM.ResolveNodeRequest): Promise<Protocol.DOM.ResolveNodeResponse>;

    /**
     * Sets attribute for an element with given id.
     */
    setAttributeValue(params: Protocol.DOM.SetAttributeValueRequest): Promise<void>;

    /**
     * Sets attributes on element with given id. This method is useful when user edits some existing
     * attribute value and types in several attribute name/value pairs.
     */
    setAttributesAsText(params: Protocol.DOM.SetAttributesAsTextRequest): Promise<void>;

    /**
     * Sets files for the given file input element.
     */
    setFileInputFiles(params: Protocol.DOM.SetFileInputFilesRequest): Promise<void>;

    /**
     * Sets if stack traces should be captured for Nodes. See `Node.getNodeStackTraces`. Default is disabled.
     */
    setNodeStackTracesEnabled(params: Protocol.DOM.SetNodeStackTracesEnabledRequest): Promise<void>;

    /**
     * Gets stack traces associated with a Node. As of now, only provides stack trace for Node creation.
     */
    getNodeStackTraces(params: Protocol.DOM.GetNodeStackTracesRequest):
        Promise<Protocol.DOM.GetNodeStackTracesResponse>;

    /**
     * Returns file information for the given
     * File wrapper.
     */
    getFileInfo(params: Protocol.DOM.GetFileInfoRequest): Promise<Protocol.DOM.GetFileInfoResponse>;

    /**
     * Enables console to refer to the node with given id via $x (see Command Line API for more details
     * $x functions).
     */
    setInspectedNode(params: Protocol.DOM.SetInspectedNodeRequest): Promise<void>;

    /**
     * Sets node name for a node with given id.
     */
    setNodeName(params: Protocol.DOM.SetNodeNameRequest): Promise<Protocol.DOM.SetNodeNameResponse>;

    /**
     * Sets node value for a node with given id.
     */
    setNodeValue(params: Protocol.DOM.SetNodeValueRequest): Promise<void>;

    /**
     * Sets node HTML markup, returns new node id.
     */
    setOuterHTML(params: Protocol.DOM.SetOuterHTMLRequest): Promise<void>;

    /**
     * Undoes the last performed action.
     */
    undo(): Promise<void>;

    /**
     * Returns iframe node that owns iframe with the given domain.
     */
    getFrameOwner(params: Protocol.DOM.GetFrameOwnerRequest): Promise<Protocol.DOM.GetFrameOwnerResponse>;

    /**
     * Fired when `Element`'s attribute is modified.
     */
    on(event: 'attributeModified', listener: (params: Protocol.DOM.AttributeModifiedEvent) => void): void;

    /**
     * Fired when `Element`'s attribute is removed.
     */
    on(event: 'attributeRemoved', listener: (params: Protocol.DOM.AttributeRemovedEvent) => void): void;

    /**
     * Mirrors `DOMCharacterDataModified` event.
     */
    on(event: 'characterDataModified', listener: (params: Protocol.DOM.CharacterDataModifiedEvent) => void): void;

    /**
     * Fired when `Container`'s child node count has changed.
     */
    on(event: 'childNodeCountUpdated', listener: (params: Protocol.DOM.ChildNodeCountUpdatedEvent) => void): void;

    /**
     * Mirrors `DOMNodeInserted` event.
     */
    on(event: 'childNodeInserted', listener: (params: Protocol.DOM.ChildNodeInsertedEvent) => void): void;

    /**
     * Mirrors `DOMNodeRemoved` event.
     */
    on(event: 'childNodeRemoved', listener: (params: Protocol.DOM.ChildNodeRemovedEvent) => void): void;

    /**
     * Called when distrubution is changed.
     */
    on(event: 'distributedNodesUpdated', listener: (params: Protocol.DOM.DistributedNodesUpdatedEvent) => void): void;

    /**
     * Fired when `Document` has been totally updated. Node ids are no longer valid.
     */
    on(event: 'documentUpdated', listener: () => void): void;

    /**
     * Fired when `Element`'s inline style is modified via a CSS property modification.
     */
    on(event: 'inlineStyleInvalidated', listener: (params: Protocol.DOM.InlineStyleInvalidatedEvent) => void): void;

    /**
     * Called when a pseudo element is added to an element.
     */
    on(event: 'pseudoElementAdded', listener: (params: Protocol.DOM.PseudoElementAddedEvent) => void): void;

    /**
     * Called when a pseudo element is removed from an element.
     */
    on(event: 'pseudoElementRemoved', listener: (params: Protocol.DOM.PseudoElementRemovedEvent) => void): void;

    /**
     * Fired when backend wants to provide client with the missing DOM structure. This happens upon
     * most of the calls requesting node ids.
     */
    on(event: 'setChildNodes', listener: (params: Protocol.DOM.SetChildNodesEvent) => void): void;

    /**
     * Called when shadow root is popped from the element.
     */
    on(event: 'shadowRootPopped', listener: (params: Protocol.DOM.ShadowRootPoppedEvent) => void): void;

    /**
     * Called when shadow root is pushed into the element.
     */
    on(event: 'shadowRootPushed', listener: (params: Protocol.DOM.ShadowRootPushedEvent) => void): void;
  }

  export interface DOMDebuggerApi {
    /**
     * Returns event listeners of the given object.
     */
    getEventListeners(params: Protocol.DOMDebugger.GetEventListenersRequest):
        Promise<Protocol.DOMDebugger.GetEventListenersResponse>;

    /**
     * Removes DOM breakpoint that was set using `setDOMBreakpoint`.
     */
    removeDOMBreakpoint(params: Protocol.DOMDebugger.RemoveDOMBreakpointRequest): Promise<void>;

    /**
     * Removes breakpoint on particular DOM event.
     */
    removeEventListenerBreakpoint(params: Protocol.DOMDebugger.RemoveEventListenerBreakpointRequest): Promise<void>;

    /**
     * Removes breakpoint on particular native event.
     */
    removeInstrumentationBreakpoint(params: Protocol.DOMDebugger.RemoveInstrumentationBreakpointRequest): Promise<void>;

    /**
     * Removes breakpoint from XMLHttpRequest.
     */
    removeXHRBreakpoint(params: Protocol.DOMDebugger.RemoveXHRBreakpointRequest): Promise<void>;

    /**
     * Sets breakpoint on particular operation with DOM.
     */
    setDOMBreakpoint(params: Protocol.DOMDebugger.SetDOMBreakpointRequest): Promise<void>;

    /**
     * Sets breakpoint on particular DOM event.
     */
    setEventListenerBreakpoint(params: Protocol.DOMDebugger.SetEventListenerBreakpointRequest): Promise<void>;

    /**
     * Sets breakpoint on particular native event.
     */
    setInstrumentationBreakpoint(params: Protocol.DOMDebugger.SetInstrumentationBreakpointRequest): Promise<void>;

    /**
     * Sets breakpoint on XMLHttpRequest.
     */
    setXHRBreakpoint(params: Protocol.DOMDebugger.SetXHRBreakpointRequest): Promise<void>;
  }

  export interface DOMSnapshotApi {
    /**
     * Disables DOM snapshot agent for the given page.
     */
    disable(): Promise<void>;

    /**
     * Enables DOM snapshot agent for the given page.
     */
    enable(): Promise<void>;

    /**
     * Returns a document snapshot, including the full DOM tree of the root node (including iframes,
     * template contents, and imported documents) in a flattened array, as well as layout and
     * white-listed computed style information for the nodes. Shadow DOM in the returned DOM tree is
     * flattened.
     */
    getSnapshot(params: Protocol.DOMSnapshot.GetSnapshotRequest): Promise<Protocol.DOMSnapshot.GetSnapshotResponse>;

    /**
     * Returns a document snapshot, including the full DOM tree of the root node (including iframes,
     * template contents, and imported documents) in a flattened array, as well as layout and
     * white-listed computed style information for the nodes. Shadow DOM in the returned DOM tree is
     * flattened.
     */
    captureSnapshot(params: Protocol.DOMSnapshot.CaptureSnapshotRequest):
        Promise<Protocol.DOMSnapshot.CaptureSnapshotResponse>;
  }

  export interface DOMStorageApi {
    clear(params: Protocol.DOMStorage.ClearRequest): Promise<void>;

    /**
     * Disables storage tracking, prevents storage events from being sent to the client.
     */
    disable(): Promise<void>;

    /**
     * Enables storage tracking, storage events will now be delivered to the client.
     */
    enable(): Promise<void>;

    getDOMStorageItems(params: Protocol.DOMStorage.GetDOMStorageItemsRequest):
        Promise<Protocol.DOMStorage.GetDOMStorageItemsResponse>;

    removeDOMStorageItem(params: Protocol.DOMStorage.RemoveDOMStorageItemRequest): Promise<void>;

    setDOMStorageItem(params: Protocol.DOMStorage.SetDOMStorageItemRequest): Promise<void>;

    on(event: 'domStorageItemAdded', listener: (params: Protocol.DOMStorage.DomStorageItemAddedEvent) => void): void;

    on(event: 'domStorageItemRemoved',
       listener: (params: Protocol.DOMStorage.DomStorageItemRemovedEvent) => void): void;

    on(event: 'domStorageItemUpdated',
       listener: (params: Protocol.DOMStorage.DomStorageItemUpdatedEvent) => void): void;

    on(event: 'domStorageItemsCleared',
       listener: (params: Protocol.DOMStorage.DomStorageItemsClearedEvent) => void): void;
  }

  export interface DatabaseApi {
    /**
     * Disables database tracking, prevents database events from being sent to the client.
     */
    disable(): Promise<void>;

    /**
     * Enables database tracking, database events will now be delivered to the client.
     */
    enable(): Promise<void>;

    executeSQL(params: Protocol.Database.ExecuteSQLRequest): Promise<Protocol.Database.ExecuteSQLResponse>;

    getDatabaseTableNames(params: Protocol.Database.GetDatabaseTableNamesRequest):
        Promise<Protocol.Database.GetDatabaseTableNamesResponse>;

    on(event: 'addDatabase', listener: (params: Protocol.Database.AddDatabaseEvent) => void): void;
  }

  export interface DeviceOrientationApi {
    /**
     * Clears the overridden Device Orientation.
     */
    clearDeviceOrientationOverride(): Promise<void>;

    /**
     * Overrides the Device Orientation.
     */
    setDeviceOrientationOverride(params: Protocol.DeviceOrientation.SetDeviceOrientationOverrideRequest): Promise<void>;
  }

  export interface EmulationApi {
    /**
     * Tells whether emulation is supported.
     */
    canEmulate(): Promise<Protocol.Emulation.CanEmulateResponse>;

    /**
     * Clears the overriden device metrics.
     */
    clearDeviceMetricsOverride(): Promise<void>;

    /**
     * Clears the overriden Geolocation Position and Error.
     */
    clearGeolocationOverride(): Promise<void>;

    /**
     * Requests that page scale factor is reset to initial values.
     */
    resetPageScaleFactor(): Promise<void>;

    /**
     * Enables or disables simulating a focused and active page.
     */
    setFocusEmulationEnabled(params: Protocol.Emulation.SetFocusEmulationEnabledRequest): Promise<void>;

    /**
     * Enables CPU throttling to emulate slow CPUs.
     */
    setCPUThrottlingRate(params: Protocol.Emulation.SetCPUThrottlingRateRequest): Promise<void>;

    /**
     * Sets or clears an override of the default background color of the frame. This override is used
     * if the content does not specify one.
     */
    setDefaultBackgroundColorOverride(params: Protocol.Emulation.SetDefaultBackgroundColorOverrideRequest):
        Promise<void>;

    /**
     * Overrides the values of device screen dimensions (window.screen.width, window.screen.height,
     * window.innerWidth, window.innerHeight, and "device-width"/"device-height"-related CSS media
     * query results).
     */
    setDeviceMetricsOverride(params: Protocol.Emulation.SetDeviceMetricsOverrideRequest): Promise<void>;

    setScrollbarsHidden(params: Protocol.Emulation.SetScrollbarsHiddenRequest): Promise<void>;

    setDocumentCookieDisabled(params: Protocol.Emulation.SetDocumentCookieDisabledRequest): Promise<void>;

    setEmitTouchEventsForMouse(params: Protocol.Emulation.SetEmitTouchEventsForMouseRequest): Promise<void>;

    /**
     * Emulates the given media type or media feature for CSS media queries.
     */
    setEmulatedMedia(params: Protocol.Emulation.SetEmulatedMediaRequest): Promise<void>;

    /**
     * Emulates the given vision deficiency.
     */
    setEmulatedVisionDeficiency(params: Protocol.Emulation.SetEmulatedVisionDeficiencyRequest): Promise<void>;

    /**
     * Overrides the Geolocation Position or Error. Omitting any of the parameters emulates position
     * unavailable.
     */
    setGeolocationOverride(params: Protocol.Emulation.SetGeolocationOverrideRequest): Promise<void>;

    /**
     * Overrides value returned by the javascript navigator object.
     */
    setNavigatorOverrides(params: Protocol.Emulation.SetNavigatorOverridesRequest): Promise<void>;

    /**
     * Sets a specified page scale factor.
     */
    setPageScaleFactor(params: Protocol.Emulation.SetPageScaleFactorRequest): Promise<void>;

    /**
     * Switches script execution in the page.
     */
    setScriptExecutionDisabled(params: Protocol.Emulation.SetScriptExecutionDisabledRequest): Promise<void>;

    /**
     * Enables touch on platforms which do not support them.
     */
    setTouchEmulationEnabled(params: Protocol.Emulation.SetTouchEmulationEnabledRequest): Promise<void>;

    /**
     * Turns on virtual time for all frames (replacing real-time with a synthetic time source) and sets
     * the current virtual time policy.  Note this supersedes any previous time budget.
     */
    setVirtualTimePolicy(params: Protocol.Emulation.SetVirtualTimePolicyRequest):
        Promise<Protocol.Emulation.SetVirtualTimePolicyResponse>;

    /**
     * Overrides default host system locale with the specified one.
     */
    setLocaleOverride(params: Protocol.Emulation.SetLocaleOverrideRequest): Promise<void>;

    /**
     * Overrides default host system timezone with the specified one.
     */
    setTimezoneOverride(params: Protocol.Emulation.SetTimezoneOverrideRequest): Promise<void>;

    /**
     * Resizes the frame/viewport of the page. Note that this does not affect the frame's container
     * (e.g. browser window). Can be used to produce screenshots of the specified size. Not supported
     * on Android.
     */
    setVisibleSize(params: Protocol.Emulation.SetVisibleSizeRequest): Promise<void>;

    /**
     * Allows overriding user agent with the given string.
     */
    setUserAgentOverride(params: Protocol.Emulation.SetUserAgentOverrideRequest): Promise<void>;

    /**
     * Notification sent after the virtual time budget for the current VirtualTimePolicy has run out.
     */
    on(event: 'virtualTimeBudgetExpired', listener: () => void): void;
  }

  export interface HeadlessExperimentalApi {
    /**
     * Sends a BeginFrame to the target and returns when the frame was completed. Optionally captures a
     * screenshot from the resulting frame. Requires that the target was created with enabled
     * BeginFrameControl. Designed for use with --run-all-compositor-stages-before-draw, see also
     * https://goo.gl/3zHXhB for more background.
     */
    beginFrame(params: Protocol.HeadlessExperimental.BeginFrameRequest):
        Promise<Protocol.HeadlessExperimental.BeginFrameResponse>;

    /**
     * Disables headless events for the target.
     */
    disable(): Promise<void>;

    /**
     * Enables headless events for the target.
     */
    enable(): Promise<void>;

    /**
     * Issued when the target starts or stops needing BeginFrames.
     * Deprecated. Issue beginFrame unconditionally instead and use result from
     * beginFrame to detect whether the frames were suppressed.
     */
    on(event: 'needsBeginFramesChanged',
       listener: (params: Protocol.HeadlessExperimental.NeedsBeginFramesChangedEvent) => void): void;
  }

  // eslint thinks this is us prefixing our interfaces but it's not!
  // eslint-disable-next-line @typescript-eslint/interface-name-prefix
  export interface IOApi {
    /**
     * Close the stream, discard any temporary backing storage.
     */
    close(params: Protocol.IO.CloseRequest): Promise<void>;

    /**
     * Read a chunk of the stream
     */
    read(params: Protocol.IO.ReadRequest): Promise<Protocol.IO.ReadResponse>;

    /**
     * Return UUID of Blob object specified by a remote object id.
     */
    resolveBlob(params: Protocol.IO.ResolveBlobRequest): Promise<Protocol.IO.ResolveBlobResponse>;
  }

  // eslint thinks this is us prefixing our interfaces but it's not!
  // eslint-disable-next-line @typescript-eslint/interface-name-prefix
  export interface IndexedDBApi {
    /**
     * Clears all entries from an object store.
     */
    clearObjectStore(params: Protocol.IndexedDB.ClearObjectStoreRequest): Promise<void>;

    /**
     * Deletes a database.
     */
    deleteDatabase(params: Protocol.IndexedDB.DeleteDatabaseRequest): Promise<void>;

    /**
     * Delete a range of entries from an object store
     */
    deleteObjectStoreEntries(params: Protocol.IndexedDB.DeleteObjectStoreEntriesRequest): Promise<void>;

    /**
     * Disables events from backend.
     */
    disable(): Promise<void>;

    /**
     * Enables events from backend.
     */
    enable(): Promise<void>;

    /**
     * Requests data from object store or index.
     */
    requestData(params: Protocol.IndexedDB.RequestDataRequest): Promise<Protocol.IndexedDB.RequestDataResponse>;

    /**
     * Gets metadata of an object store
     */
    getMetadata(params: Protocol.IndexedDB.GetMetadataRequest): Promise<Protocol.IndexedDB.GetMetadataResponse>;

    /**
     * Requests database with given name in given frame.
     */
    requestDatabase(params: Protocol.IndexedDB.RequestDatabaseRequest):
        Promise<Protocol.IndexedDB.RequestDatabaseResponse>;

    /**
     * Requests database names for given security origin.
     */
    requestDatabaseNames(params: Protocol.IndexedDB.RequestDatabaseNamesRequest):
        Promise<Protocol.IndexedDB.RequestDatabaseNamesResponse>;
  }

  // eslint thinks this is us prefixing our interfaces but it's not!
  // eslint-disable-next-line @typescript-eslint/interface-name-prefix
  export interface InputApi {
    /**
     * Dispatches a key event to the page.
     */
    dispatchKeyEvent(params: Protocol.Input.DispatchKeyEventRequest): Promise<void>;

    /**
     * This method emulates inserting text that doesn't come from a key press,
     * for example an emoji keyboard or an IME.
     */
    insertText(params: Protocol.Input.InsertTextRequest): Promise<void>;

    /**
     * Dispatches a mouse event to the page.
     */
    dispatchMouseEvent(params: Protocol.Input.DispatchMouseEventRequest): Promise<void>;

    /**
     * Dispatches a touch event to the page.
     */
    dispatchTouchEvent(params: Protocol.Input.DispatchTouchEventRequest): Promise<void>;

    /**
     * Emulates touch event from the mouse event parameters.
     */
    emulateTouchFromMouseEvent(params: Protocol.Input.EmulateTouchFromMouseEventRequest): Promise<void>;

    /**
     * Ignores input events (useful while auditing page).
     */
    setIgnoreInputEvents(params: Protocol.Input.SetIgnoreInputEventsRequest): Promise<void>;

    /**
     * Synthesizes a pinch gesture over a time period by issuing appropriate touch events.
     */
    synthesizePinchGesture(params: Protocol.Input.SynthesizePinchGestureRequest): Promise<void>;

    /**
     * Synthesizes a scroll gesture over a time period by issuing appropriate touch events.
     */
    synthesizeScrollGesture(params: Protocol.Input.SynthesizeScrollGestureRequest): Promise<void>;

    /**
     * Synthesizes a tap gesture over a time period by issuing appropriate touch events.
     */
    synthesizeTapGesture(params: Protocol.Input.SynthesizeTapGestureRequest): Promise<void>;
  }

  // eslint thinks this is us prefixing our interfaces but it's not!
  // eslint-disable-next-line @typescript-eslint/interface-name-prefix
  export interface InspectorApi {
    /**
     * Disables inspector domain notifications.
     */
    disable(): Promise<void>;

    /**
     * Enables inspector domain notifications.
     */
    enable(): Promise<void>;

    /**
     * Fired when remote debugging connection is about to be terminated. Contains detach reason.
     */
    on(event: 'detached', listener: (params: Protocol.Inspector.DetachedEvent) => void): void;

    /**
     * Fired when debugging target has crashed
     */
    on(event: 'targetCrashed', listener: () => void): void;

    /**
     * Fired when debugging target has reloaded after crash
     */
    on(event: 'targetReloadedAfterCrash', listener: () => void): void;
  }

  export interface LayerTreeApi {
    /**
     * Provides the reasons why the given layer was composited.
     */
    compositingReasons(params: Protocol.LayerTree.CompositingReasonsRequest):
        Promise<Protocol.LayerTree.CompositingReasonsResponse>;

    /**
     * Disables compositing tree inspection.
     */
    disable(): Promise<void>;

    /**
     * Enables compositing tree inspection.
     */
    enable(): Promise<void>;

    /**
     * Returns the snapshot identifier.
     */
    loadSnapshot(params: Protocol.LayerTree.LoadSnapshotRequest): Promise<Protocol.LayerTree.LoadSnapshotResponse>;

    /**
     * Returns the layer snapshot identifier.
     */
    makeSnapshot(params: Protocol.LayerTree.MakeSnapshotRequest): Promise<Protocol.LayerTree.MakeSnapshotResponse>;

    profileSnapshot(params: Protocol.LayerTree.ProfileSnapshotRequest):
        Promise<Protocol.LayerTree.ProfileSnapshotResponse>;

    /**
     * Releases layer snapshot captured by the back-end.
     */
    releaseSnapshot(params: Protocol.LayerTree.ReleaseSnapshotRequest): Promise<void>;

    /**
     * Replays the layer snapshot and returns the resulting bitmap.
     */
    replaySnapshot(params: Protocol.LayerTree.ReplaySnapshotRequest):
        Promise<Protocol.LayerTree.ReplaySnapshotResponse>;

    /**
     * Replays the layer snapshot and returns canvas log.
     */
    snapshotCommandLog(params: Protocol.LayerTree.SnapshotCommandLogRequest):
        Promise<Protocol.LayerTree.SnapshotCommandLogResponse>;

    on(event: 'layerPainted', listener: (params: Protocol.LayerTree.LayerPaintedEvent) => void): void;

    on(event: 'layerTreeDidChange', listener: (params: Protocol.LayerTree.LayerTreeDidChangeEvent) => void): void;
  }

  export interface LogApi {
    /**
     * Clears the log.
     */
    clear(): Promise<void>;

    /**
     * Disables log domain, prevents further log entries from being reported to the client.
     */
    disable(): Promise<void>;

    /**
     * Enables log domain, sends the entries collected so far to the client by means of the
     * `entryAdded` notification.
     */
    enable(): Promise<void>;

    /**
     * start violation reporting.
     */
    startViolationsReport(params: Protocol.Log.StartViolationsReportRequest): Promise<void>;

    /**
     * Stop violation reporting.
     */
    stopViolationsReport(): Promise<void>;

    /**
     * Issued when new message was logged.
     */
    on(event: 'entryAdded', listener: (params: Protocol.Log.EntryAddedEvent) => void): void;
  }

  export interface MemoryApi {
    getDOMCounters(): Promise<Protocol.Memory.GetDOMCountersResponse>;

    prepareForLeakDetection(): Promise<void>;

    /**
     * Simulate OomIntervention by purging V8 memory.
     */
    forciblyPurgeJavaScriptMemory(): Promise<void>;

    /**
     * Enable/disable suppressing memory pressure notifications in all processes.
     */
    setPressureNotificationsSuppressed(params: Protocol.Memory.SetPressureNotificationsSuppressedRequest):
        Promise<void>;

    /**
     * Simulate a memory pressure notification in all processes.
     */
    simulatePressureNotification(params: Protocol.Memory.SimulatePressureNotificationRequest): Promise<void>;

    /**
     * Start collecting native memory profile.
     */
    startSampling(params: Protocol.Memory.StartSamplingRequest): Promise<void>;

    /**
     * Stop collecting native memory profile.
     */
    stopSampling(): Promise<void>;

    /**
     * Retrieve native memory allocations profile
     * collected since renderer process startup.
     */
    getAllTimeSamplingProfile(): Promise<Protocol.Memory.GetAllTimeSamplingProfileResponse>;

    /**
     * Retrieve native memory allocations profile
     * collected since browser process startup.
     */
    getBrowserSamplingProfile(): Promise<Protocol.Memory.GetBrowserSamplingProfileResponse>;

    /**
     * Retrieve native memory allocations profile collected since last
     * `startSampling` call.
     */
    getSamplingProfile(): Promise<Protocol.Memory.GetSamplingProfileResponse>;
  }

  export interface NetworkApi {
    /**
     * Tells whether clearing browser cache is supported.
     */
    canClearBrowserCache(): Promise<Protocol.Network.CanClearBrowserCacheResponse>;

    /**
     * Tells whether clearing browser cookies is supported.
     */
    canClearBrowserCookies(): Promise<Protocol.Network.CanClearBrowserCookiesResponse>;

    /**
     * Tells whether emulation of network conditions is supported.
     */
    canEmulateNetworkConditions(): Promise<Protocol.Network.CanEmulateNetworkConditionsResponse>;

    /**
     * Clears browser cache.
     */
    clearBrowserCache(): Promise<void>;

    /**
     * Clears browser cookies.
     */
    clearBrowserCookies(): Promise<void>;

    /**
     * Response to Network.requestIntercepted which either modifies the request to continue with any
     * modifications, or blocks it, or completes it with the provided response bytes. If a network
     * fetch occurs as a result which encounters a redirect an additional Network.requestIntercepted
     * event will be sent with the same InterceptionId.
     * Deprecated, use Fetch.continueRequest, Fetch.fulfillRequest and Fetch.failRequest instead.
     */
    continueInterceptedRequest(params: Protocol.Network.ContinueInterceptedRequestRequest): Promise<void>;

    /**
     * Deletes browser cookies with matching name and url or domain/path pair.
     */
    deleteCookies(params: Protocol.Network.DeleteCookiesRequest): Promise<void>;

    /**
     * Disables network tracking, prevents network events from being sent to the client.
     */
    disable(): Promise<void>;

    /**
     * Activates emulation of network conditions.
     */
    emulateNetworkConditions(params: Protocol.Network.EmulateNetworkConditionsRequest): Promise<void>;

    /**
     * Enables network tracking, network events will now be delivered to the client.
     */
    enable(params: Protocol.Network.EnableRequest): Promise<void>;

    /**
     * Returns all browser cookies. Depending on the backend support, will return detailed cookie
     * information in the `cookies` field.
     */
    getAllCookies(): Promise<Protocol.Network.GetAllCookiesResponse>;

    /**
     * Returns the DER-encoded certificate.
     */
    getCertificate(params: Protocol.Network.GetCertificateRequest): Promise<Protocol.Network.GetCertificateResponse>;

    /**
     * Returns all browser cookies for the current URL. Depending on the backend support, will return
     * detailed cookie information in the `cookies` field.
     */
    getCookies(params: Protocol.Network.GetCookiesRequest): Promise<Protocol.Network.GetCookiesResponse>;

    /**
     * Returns content served for the given request.
     */
    getResponseBody(params: Protocol.Network.GetResponseBodyRequest): Promise<Protocol.Network.GetResponseBodyResponse>;

    /**
     * Returns post data sent with the request. Returns an error when no data was sent with the request.
     */
    getRequestPostData(params: Protocol.Network.GetRequestPostDataRequest):
        Promise<Protocol.Network.GetRequestPostDataResponse>;

    /**
     * Returns content served for the given currently intercepted request.
     */
    getResponseBodyForInterception(params: Protocol.Network.GetResponseBodyForInterceptionRequest):
        Promise<Protocol.Network.GetResponseBodyForInterceptionResponse>;

    /**
     * Returns a handle to the stream representing the response body. Note that after this command,
     * the intercepted request can't be continued as is -- you either need to cancel it or to provide
     * the response body. The stream only supports sequential read, IO.read will fail if the position
     * is specified.
     */
    takeResponseBodyForInterceptionAsStream(params: Protocol.Network.TakeResponseBodyForInterceptionAsStreamRequest):
        Promise<Protocol.Network.TakeResponseBodyForInterceptionAsStreamResponse>;

    /**
     * This method sends a new XMLHttpRequest which is identical to the original one. The following
     * parameters should be identical: method, url, async, request body, extra headers, withCredentials
     * attribute, user, password.
     */
    replayXHR(params: Protocol.Network.ReplayXHRRequest): Promise<void>;

    /**
     * Searches for given string in response content.
     */
    searchInResponseBody(params: Protocol.Network.SearchInResponseBodyRequest):
        Promise<Protocol.Network.SearchInResponseBodyResponse>;

    /**
     * Blocks URLs from loading.
     */
    setBlockedURLs(params: Protocol.Network.SetBlockedURLsRequest): Promise<void>;

    /**
     * Toggles ignoring of service worker for each request.
     */
    setBypassServiceWorker(params: Protocol.Network.SetBypassServiceWorkerRequest): Promise<void>;

    /**
     * Toggles ignoring cache for each request. If `true`, cache will not be used.
     */
    setCacheDisabled(params: Protocol.Network.SetCacheDisabledRequest): Promise<void>;

    /**
     * Sets a cookie with the given cookie data; may overwrite equivalent cookies if they exist.
     */
    setCookie(params: Protocol.Network.SetCookieRequest): Promise<Protocol.Network.SetCookieResponse>;

    /**
     * Sets given cookies.
     */
    setCookies(params: Protocol.Network.SetCookiesRequest): Promise<void>;

    /**
     * For testing.
     */
    setDataSizeLimitsForTest(params: Protocol.Network.SetDataSizeLimitsForTestRequest): Promise<void>;

    /**
     * Specifies whether to always send extra HTTP headers with the requests from this page.
     */
    setExtraHTTPHeaders(params: Protocol.Network.SetExtraHTTPHeadersRequest): Promise<void>;

    /**
     * Sets the requests to intercept that match the provided patterns and optionally resource types.
     * Deprecated, please use Fetch.enable instead.
     */
    setRequestInterception(params: Protocol.Network.SetRequestInterceptionRequest): Promise<void>;

    /**
     * Allows overriding user agent with the given string.
     */
    setUserAgentOverride(params: Protocol.Network.SetUserAgentOverrideRequest): Promise<void>;

    /**
     * Fired when data chunk was received over the network.
     */
    on(event: 'dataReceived', listener: (params: Protocol.Network.DataReceivedEvent) => void): void;

    /**
     * Fired when EventSource message is received.
     */
    on(event: 'eventSourceMessageReceived',
       listener: (params: Protocol.Network.EventSourceMessageReceivedEvent) => void): void;

    /**
     * Fired when HTTP request has failed to load.
     */
    on(event: 'loadingFailed', listener: (params: Protocol.Network.LoadingFailedEvent) => void): void;

    /**
     * Fired when HTTP request has finished loading.
     */
    on(event: 'loadingFinished', listener: (params: Protocol.Network.LoadingFinishedEvent) => void): void;

    /**
     * Details of an intercepted HTTP request, which must be either allowed, blocked, modified or
     * mocked.
     * Deprecated, use Fetch.requestPaused instead.
     */
    on(event: 'requestIntercepted', listener: (params: Protocol.Network.RequestInterceptedEvent) => void): void;

    /**
     * Fired if request ended up loading from cache.
     */
    on(event: 'requestServedFromCache', listener: (params: Protocol.Network.RequestServedFromCacheEvent) => void): void;

    /**
     * Fired when page is about to send HTTP request.
     */
    on(event: 'requestWillBeSent', listener: (params: Protocol.Network.RequestWillBeSentEvent) => void): void;

    /**
     * Fired when resource loading priority is changed
     */
    on(event: 'resourceChangedPriority',
       listener: (params: Protocol.Network.ResourceChangedPriorityEvent) => void): void;

    /**
     * Fired when a signed exchange was received over the network
     */
    on(event: 'signedExchangeReceived', listener: (params: Protocol.Network.SignedExchangeReceivedEvent) => void): void;

    /**
     * Fired when HTTP response is available.
     */
    on(event: 'responseReceived', listener: (params: Protocol.Network.ResponseReceivedEvent) => void): void;

    /**
     * Fired when WebSocket is closed.
     */
    on(event: 'webSocketClosed', listener: (params: Protocol.Network.WebSocketClosedEvent) => void): void;

    /**
     * Fired upon WebSocket creation.
     */
    on(event: 'webSocketCreated', listener: (params: Protocol.Network.WebSocketCreatedEvent) => void): void;

    /**
     * Fired when WebSocket message error occurs.
     */
    on(event: 'webSocketFrameError', listener: (params: Protocol.Network.WebSocketFrameErrorEvent) => void): void;

    /**
     * Fired when WebSocket message is received.
     */
    on(event: 'webSocketFrameReceived', listener: (params: Protocol.Network.WebSocketFrameReceivedEvent) => void): void;

    /**
     * Fired when WebSocket message is sent.
     */
    on(event: 'webSocketFrameSent', listener: (params: Protocol.Network.WebSocketFrameSentEvent) => void): void;

    /**
     * Fired when WebSocket handshake response becomes available.
     */
    on(event: 'webSocketHandshakeResponseReceived',
       listener: (params: Protocol.Network.WebSocketHandshakeResponseReceivedEvent) => void): void;

    /**
     * Fired when WebSocket is about to initiate handshake.
     */
    on(event: 'webSocketWillSendHandshakeRequest',
       listener: (params: Protocol.Network.WebSocketWillSendHandshakeRequestEvent) => void): void;

    /**
     * Fired when additional information about a requestWillBeSent event is available from the
     * network stack. Not every requestWillBeSent event will have an additional
     * requestWillBeSentExtraInfo fired for it, and there is no guarantee whether requestWillBeSent
     * or requestWillBeSentExtraInfo will be fired first for the same request.
     */
    on(event: 'requestWillBeSentExtraInfo',
       listener: (params: Protocol.Network.RequestWillBeSentExtraInfoEvent) => void): void;

    /**
     * Fired when additional information about a responseReceived event is available from the network
     * stack. Not every responseReceived event will have an additional responseReceivedExtraInfo for
     * it, and responseReceivedExtraInfo may be fired before or after responseReceived.
     */
    on(event: 'responseReceivedExtraInfo',
       listener: (params: Protocol.Network.ResponseReceivedExtraInfoEvent) => void): void;
  }

  export interface OverlayApi {
    /**
     * Disables domain notifications.
     */
    disable(): Promise<void>;

    /**
     * Enables domain notifications.
     */
    enable(): Promise<void>;

    /**
     * For testing.
     */
    getHighlightObjectForTest(params: Protocol.Overlay.GetHighlightObjectForTestRequest):
        Promise<Protocol.Overlay.GetHighlightObjectForTestResponse>;

    /**
     * Hides any highlight.
     */
    hideHighlight(): Promise<void>;

    /**
     * Highlights owner element of the frame with given id.
     */
    highlightFrame(params: Protocol.Overlay.HighlightFrameRequest): Promise<void>;

    /**
     * Highlights DOM node with given id or with the given JavaScript object wrapper. Either nodeId or
     * objectId must be specified.
     */
    highlightNode(params: Protocol.Overlay.HighlightNodeRequest): Promise<void>;

    /**
     * Highlights given quad. Coordinates are absolute with respect to the main frame viewport.
     */
    highlightQuad(params: Protocol.Overlay.HighlightQuadRequest): Promise<void>;

    /**
     * Highlights given rectangle. Coordinates are absolute with respect to the main frame viewport.
     */
    highlightRect(params: Protocol.Overlay.HighlightRectRequest): Promise<void>;

    /**
     * Enters the 'inspect' mode. In this mode, elements that user is hovering over are highlighted.
     * Backend then generates 'inspectNodeRequested' event upon element selection.
     */
    setInspectMode(params: Protocol.Overlay.SetInspectModeRequest): Promise<void>;

    /**
     * Highlights owner element of all frames detected to be ads.
     */
    setShowAdHighlights(params: Protocol.Overlay.SetShowAdHighlightsRequest): Promise<void>;

    setPausedInDebuggerMessage(params: Protocol.Overlay.SetPausedInDebuggerMessageRequest): Promise<void>;

    /**
     * Requests that backend shows debug borders on layers
     */
    setShowDebugBorders(params: Protocol.Overlay.SetShowDebugBordersRequest): Promise<void>;

    /**
     * Requests that backend shows the FPS counter
     */
    setShowFPSCounter(params: Protocol.Overlay.SetShowFPSCounterRequest): Promise<void>;

    /**
     * Requests that backend shows paint rectangles
     */
    setShowPaintRects(params: Protocol.Overlay.SetShowPaintRectsRequest): Promise<void>;

    /**
     * Requests that backend shows layout shift regions
     */
    setShowLayoutShiftRegions(params: Protocol.Overlay.SetShowLayoutShiftRegionsRequest): Promise<void>;

    /**
     * Requests that backend shows scroll bottleneck rects
     */
    setShowScrollBottleneckRects(params: Protocol.Overlay.SetShowScrollBottleneckRectsRequest): Promise<void>;

    /**
     * Requests that backend shows hit-test borders on layers
     */
    setShowHitTestBorders(params: Protocol.Overlay.SetShowHitTestBordersRequest): Promise<void>;

    /**
     * Paints viewport size upon main frame resize.
     */
    setShowViewportSizeOnResize(params: Protocol.Overlay.SetShowViewportSizeOnResizeRequest): Promise<void>;

    /**
     * Fired when the node should be inspected. This happens after call to `setInspectMode` or when
     * user manually inspects an element.
     */
    on(event: 'inspectNodeRequested', listener: (params: Protocol.Overlay.InspectNodeRequestedEvent) => void): void;

    /**
     * Fired when the node should be highlighted. This happens after call to `setInspectMode`.
     */
    on(event: 'nodeHighlightRequested', listener: (params: Protocol.Overlay.NodeHighlightRequestedEvent) => void): void;

    /**
     * Fired when user asks to capture screenshot of some area on the page.
     */
    on(event: 'screenshotRequested', listener: (params: Protocol.Overlay.ScreenshotRequestedEvent) => void): void;

    /**
     * Fired when user cancels the inspect mode.
     */
    on(event: 'inspectModeCanceled', listener: () => void): void;
  }

  export interface PageApi {
    /**
     * Deprecated, please use addScriptToEvaluateOnNewDocument instead.
     */
    addScriptToEvaluateOnLoad(params: Protocol.Page.AddScriptToEvaluateOnLoadRequest):
        Promise<Protocol.Page.AddScriptToEvaluateOnLoadResponse>;

    /**
     * Evaluates given script in every frame upon creation (before loading frame's scripts).
     */
    addScriptToEvaluateOnNewDocument(params: Protocol.Page.AddScriptToEvaluateOnNewDocumentRequest):
        Promise<Protocol.Page.AddScriptToEvaluateOnNewDocumentResponse>;

    /**
     * Brings page to front (activates tab).
     */
    bringToFront(): Promise<void>;

    /**
     * Capture page screenshot.
     */
    captureScreenshot(params: Protocol.Page.CaptureScreenshotRequest): Promise<Protocol.Page.CaptureScreenshotResponse>;

    /**
     * Returns a snapshot of the page as a string. For MHTML format, the serialization includes
     * iframes, shadow DOM, external resources, and element-inline styles.
     */
    captureSnapshot(params: Protocol.Page.CaptureSnapshotRequest): Promise<Protocol.Page.CaptureSnapshotResponse>;

    /**
     * Clears the overriden device metrics.
     */
    clearDeviceMetricsOverride(): Promise<void>;

    /**
     * Clears the overridden Device Orientation.
     */
    clearDeviceOrientationOverride(): Promise<void>;

    /**
     * Clears the overriden Geolocation Position and Error.
     */
    clearGeolocationOverride(): Promise<void>;

    /**
     * Creates an isolated world for the given frame.
     */
    createIsolatedWorld(params: Protocol.Page.CreateIsolatedWorldRequest):
        Promise<Protocol.Page.CreateIsolatedWorldResponse>;

    /**
     * Deletes browser cookie with given name, domain and path.
     */
    deleteCookie(params: Protocol.Page.DeleteCookieRequest): Promise<void>;

    /**
     * Disables page domain notifications.
     */
    disable(): Promise<void>;

    /**
     * Enables page domain notifications.
     */
    enable(): Promise<void>;

    getAppManifest(): Promise<Protocol.Page.GetAppManifestResponse>;

    getInstallabilityErrors(): Promise<Protocol.Page.GetInstallabilityErrorsResponse>;

    getManifestIcons(): Promise<Protocol.Page.GetManifestIconsResponse>;

    /**
     * Returns all browser cookies. Depending on the backend support, will return detailed cookie
     * information in the `cookies` field.
     */
    getCookies(): Promise<Protocol.Page.GetCookiesResponse>;

    /**
     * Returns present frame tree structure.
     */
    getFrameTree(): Promise<Protocol.Page.GetFrameTreeResponse>;

    /**
     * Returns metrics relating to the layouting of the page, such as viewport bounds/scale.
     */
    getLayoutMetrics(): Promise<Protocol.Page.GetLayoutMetricsResponse>;

    /**
     * Returns navigation history for the current page.
     */
    getNavigationHistory(): Promise<Protocol.Page.GetNavigationHistoryResponse>;

    /**
     * Resets navigation history for the current page.
     */
    resetNavigationHistory(): Promise<void>;

    /**
     * Returns content of the given resource.
     */
    getResourceContent(params: Protocol.Page.GetResourceContentRequest):
        Promise<Protocol.Page.GetResourceContentResponse>;

    /**
     * Returns present frame / resource tree structure.
     */
    getResourceTree(): Promise<Protocol.Page.GetResourceTreeResponse>;

    /**
     * Accepts or dismisses a JavaScript initiated dialog (alert, confirm, prompt, or onbeforeunload).
     */
    handleJavaScriptDialog(params: Protocol.Page.HandleJavaScriptDialogRequest): Promise<void>;

    /**
     * Navigates current page to the given URL.
     */
    navigate(params: Protocol.Page.NavigateRequest): Promise<Protocol.Page.NavigateResponse>;

    /**
     * Navigates current page to the given history entry.
     */
    navigateToHistoryEntry(params: Protocol.Page.NavigateToHistoryEntryRequest): Promise<void>;

    /**
     * Print page as PDF.
     */
    printToPDF(params: Protocol.Page.PrintToPDFRequest): Promise<Protocol.Page.PrintToPDFResponse>;

    /**
     * Reloads given page optionally ignoring the cache.
     */
    reload(params: Protocol.Page.ReloadRequest): Promise<void>;

    /**
     * Deprecated, please use removeScriptToEvaluateOnNewDocument instead.
     */
    removeScriptToEvaluateOnLoad(params: Protocol.Page.RemoveScriptToEvaluateOnLoadRequest): Promise<void>;

    /**
     * Removes given script from the list.
     */
    removeScriptToEvaluateOnNewDocument(params: Protocol.Page.RemoveScriptToEvaluateOnNewDocumentRequest):
        Promise<void>;

    /**
     * Acknowledges that a screencast frame has been received by the frontend.
     */
    screencastFrameAck(params: Protocol.Page.ScreencastFrameAckRequest): Promise<void>;

    /**
     * Searches for given string in resource content.
     */
    searchInResource(params: Protocol.Page.SearchInResourceRequest): Promise<Protocol.Page.SearchInResourceResponse>;

    /**
     * Enable Chrome's experimental ad filter on all sites.
     */
    setAdBlockingEnabled(params: Protocol.Page.SetAdBlockingEnabledRequest): Promise<void>;

    /**
     * Enable page Content Security Policy by-passing.
     */
    setBypassCSP(params: Protocol.Page.SetBypassCSPRequest): Promise<void>;

    /**
     * Overrides the values of device screen dimensions (window.screen.width, window.screen.height,
     * window.innerWidth, window.innerHeight, and "device-width"/"device-height"-related CSS media
     * query results).
     */
    setDeviceMetricsOverride(params: Protocol.Page.SetDeviceMetricsOverrideRequest): Promise<void>;

    /**
     * Overrides the Device Orientation.
     */
    setDeviceOrientationOverride(params: Protocol.Page.SetDeviceOrientationOverrideRequest): Promise<void>;

    /**
     * Set generic font families.
     */
    setFontFamilies(params: Protocol.Page.SetFontFamiliesRequest): Promise<void>;

    /**
     * Set default font sizes.
     */
    setFontSizes(params: Protocol.Page.SetFontSizesRequest): Promise<void>;

    /**
     * Sets given markup as the document's HTML.
     */
    setDocumentContent(params: Protocol.Page.SetDocumentContentRequest): Promise<void>;

    /**
     * Set the behavior when downloading a file.
     */
    setDownloadBehavior(params: Protocol.Page.SetDownloadBehaviorRequest): Promise<void>;

    /**
     * Overrides the Geolocation Position or Error. Omitting any of the parameters emulates position
     * unavailable.
     */
    setGeolocationOverride(params: Protocol.Page.SetGeolocationOverrideRequest): Promise<void>;

    /**
     * Controls whether page will emit lifecycle events.
     */
    setLifecycleEventsEnabled(params: Protocol.Page.SetLifecycleEventsEnabledRequest): Promise<void>;

    /**
     * Toggles mouse event-based touch event emulation.
     */
    setTouchEmulationEnabled(params: Protocol.Page.SetTouchEmulationEnabledRequest): Promise<void>;

    /**
     * Starts sending each frame using the `screencastFrame` event.
     */
    startScreencast(params: Protocol.Page.StartScreencastRequest): Promise<void>;

    /**
     * Force the page stop all navigations and pending resource fetches.
     */
    stopLoading(): Promise<void>;

    /**
     * Crashes renderer on the IO thread, generates minidumps.
     */
    crash(): Promise<void>;

    /**
     * Tries to close page, running its beforeunload hooks, if any.
     */
    close(): Promise<void>;

    /**
     * Tries to update the web lifecycle state of the page.
     * It will transition the page to the given state according to:
     * https://github.com/WICG/web-lifecycle/
     */
    setWebLifecycleState(params: Protocol.Page.SetWebLifecycleStateRequest): Promise<void>;

    /**
     * Stops sending each frame in the `screencastFrame`.
     */
    stopScreencast(): Promise<void>;

    /**
     * Forces compilation cache to be generated for every subresource script.
     */
    setProduceCompilationCache(params: Protocol.Page.SetProduceCompilationCacheRequest): Promise<void>;

    /**
     * Seeds compilation cache for given url. Compilation cache does not survive
     * cross-process navigation.
     */
    addCompilationCache(params: Protocol.Page.AddCompilationCacheRequest): Promise<void>;

    /**
     * Clears seeded compilation cache.
     */
    clearCompilationCache(): Promise<void>;

    /**
     * Generates a report for testing.
     */
    generateTestReport(params: Protocol.Page.GenerateTestReportRequest): Promise<void>;

    /**
     * Pauses page execution. Can be resumed using generic Runtime.runIfWaitingForDebugger.
     */
    waitForDebugger(): Promise<void>;

    /**
     * Intercept file chooser requests and transfer control to protocol clients.
     * When file chooser interception is enabled, native file chooser dialog is not shown.
     * Instead, a protocol event `Page.fileChooserOpened` is emitted.
     */
    setInterceptFileChooserDialog(params: Protocol.Page.SetInterceptFileChooserDialogRequest): Promise<void>;

    on(event: 'domContentEventFired', listener: (params: Protocol.Page.DomContentEventFiredEvent) => void): void;

    /**
     * Emitted only when `page.interceptFileChooser` is enabled.
     */
    on(event: 'fileChooserOpened', listener: (params: Protocol.Page.FileChooserOpenedEvent) => void): void;

    /**
     * Fired when frame has been attached to its parent.
     */
    on(event: 'frameAttached', listener: (params: Protocol.Page.FrameAttachedEvent) => void): void;

    /**
     * Fired when frame no longer has a scheduled navigation.
     */
    on(event: 'frameClearedScheduledNavigation',
       listener: (params: Protocol.Page.FrameClearedScheduledNavigationEvent) => void): void;

    /**
     * Fired when frame has been detached from its parent.
     */
    on(event: 'frameDetached', listener: (params: Protocol.Page.FrameDetachedEvent) => void): void;

    /**
     * Fired once navigation of the frame has completed. Frame is now associated with the new loader.
     */
    on(event: 'frameNavigated', listener: (params: Protocol.Page.FrameNavigatedEvent) => void): void;

    on(event: 'frameResized', listener: () => void): void;

    /**
     * Fired when a renderer-initiated navigation is requested.
     * Navigation may still be cancelled after the event is issued.
     */
    on(event: 'frameRequestedNavigation',
       listener: (params: Protocol.Page.FrameRequestedNavigationEvent) => void): void;

    /**
     * Fired when frame schedules a potential navigation.
     */
    on(event: 'frameScheduledNavigation',
       listener: (params: Protocol.Page.FrameScheduledNavigationEvent) => void): void;

    /**
     * Fired when frame has started loading.
     */
    on(event: 'frameStartedLoading', listener: (params: Protocol.Page.FrameStartedLoadingEvent) => void): void;

    /**
     * Fired when frame has stopped loading.
     */
    on(event: 'frameStoppedLoading', listener: (params: Protocol.Page.FrameStoppedLoadingEvent) => void): void;

    /**
     * Fired when page is about to start a download.
     */
    on(event: 'downloadWillBegin', listener: (params: Protocol.Page.DownloadWillBeginEvent) => void): void;

    /**
     * Fired when interstitial page was hidden
     */
    on(event: 'interstitialHidden', listener: () => void): void;

    /**
     * Fired when interstitial page was shown
     */
    on(event: 'interstitialShown', listener: () => void): void;

    /**
     * Fired when a JavaScript initiated dialog (alert, confirm, prompt, or onbeforeunload) has been
     * closed.
     */
    on(event: 'javascriptDialogClosed', listener: (params: Protocol.Page.JavascriptDialogClosedEvent) => void): void;

    /**
     * Fired when a JavaScript initiated dialog (alert, confirm, prompt, or onbeforeunload) is about to
     * open.
     */
    on(event: 'javascriptDialogOpening', listener: (params: Protocol.Page.JavascriptDialogOpeningEvent) => void): void;

    /**
     * Fired for top level page lifecycle events such as navigation, load, paint, etc.
     */
    on(event: 'lifecycleEvent', listener: (params: Protocol.Page.LifecycleEventEvent) => void): void;

    on(event: 'loadEventFired', listener: (params: Protocol.Page.LoadEventFiredEvent) => void): void;

    /**
     * Fired when same-document navigation happens, e.g. due to history API usage or anchor navigation.
     */
    on(event: 'navigatedWithinDocument', listener: (params: Protocol.Page.NavigatedWithinDocumentEvent) => void): void;

    /**
     * Compressed image data requested by the `startScreencast`.
     */
    on(event: 'screencastFrame', listener: (params: Protocol.Page.ScreencastFrameEvent) => void): void;

    /**
     * Fired when the page with currently enabled screencast was shown or hidden `.
     */
    on(event: 'screencastVisibilityChanged',
       listener: (params: Protocol.Page.ScreencastVisibilityChangedEvent) => void): void;

    /**
     * Fired when a new window is going to be opened, via window.open(), link click, form submission,
     * etc.
     */
    on(event: 'windowOpen', listener: (params: Protocol.Page.WindowOpenEvent) => void): void;

    /**
     * Issued for every compilation cache generated. Is only available
     * if Page.setGenerateCompilationCache is enabled.
     */
    on(event: 'compilationCacheProduced',
       listener: (params: Protocol.Page.CompilationCacheProducedEvent) => void): void;
  }

  export interface PerformanceApi {
    /**
     * Disable collecting and reporting metrics.
     */
    disable(): Promise<void>;

    /**
     * Enable collecting and reporting metrics.
     */
    enable(params: Protocol.Performance.EnableRequest): Promise<void>;

    /**
     * Sets time domain to use for collecting and reporting duration metrics.
     * Note that this must be called before enabling metrics collection. Calling
     * this method while metrics collection is enabled returns an error.
     */
    setTimeDomain(params: Protocol.Performance.SetTimeDomainRequest): Promise<void>;

    /**
     * Retrieve current values of run-time metrics.
     */
    getMetrics(): Promise<Protocol.Performance.GetMetricsResponse>;

    /**
     * Current values of the metrics.
     */
    on(event: 'metrics', listener: (params: Protocol.Performance.MetricsEvent) => void): void;
  }

  export interface SecurityApi {
    /**
     * Disables tracking security state changes.
     */
    disable(): Promise<void>;

    /**
     * Enables tracking security state changes.
     */
    enable(): Promise<void>;

    /**
     * Enable/disable whether all certificate errors should be ignored.
     */
    setIgnoreCertificateErrors(params: Protocol.Security.SetIgnoreCertificateErrorsRequest): Promise<void>;

    /**
     * Handles a certificate error that fired a certificateError event.
     */
    handleCertificateError(params: Protocol.Security.HandleCertificateErrorRequest): Promise<void>;

    /**
     * Enable/disable overriding certificate errors. If enabled, all certificate error events need to
     * be handled by the DevTools client and should be answered with `handleCertificateError` commands.
     */
    setOverrideCertificateErrors(params: Protocol.Security.SetOverrideCertificateErrorsRequest): Promise<void>;

    /**
     * There is a certificate error. If overriding certificate errors is enabled, then it should be
     * handled with the `handleCertificateError` command. Note: this event does not fire if the
     * certificate error has been allowed internally. Only one client per target should override
     * certificate errors at the same time.
     */
    on(event: 'certificateError', listener: (params: Protocol.Security.CertificateErrorEvent) => void): void;

    /**
     * The security state of the page changed.
     */
    on(event: 'visibleSecurityStateChanged',
       listener: (params: Protocol.Security.VisibleSecurityStateChangedEvent) => void): void;

    /**
     * The security state of the page changed.
     */
    on(event: 'securityStateChanged', listener: (params: Protocol.Security.SecurityStateChangedEvent) => void): void;
  }

  export interface ServiceWorkerApi {
    deliverPushMessage(params: Protocol.ServiceWorker.DeliverPushMessageRequest): Promise<void>;

    disable(): Promise<void>;

    dispatchSyncEvent(params: Protocol.ServiceWorker.DispatchSyncEventRequest): Promise<void>;

    dispatchPeriodicSyncEvent(params: Protocol.ServiceWorker.DispatchPeriodicSyncEventRequest): Promise<void>;

    enable(): Promise<void>;

    inspectWorker(params: Protocol.ServiceWorker.InspectWorkerRequest): Promise<void>;

    setForceUpdateOnPageLoad(params: Protocol.ServiceWorker.SetForceUpdateOnPageLoadRequest): Promise<void>;

    skipWaiting(params: Protocol.ServiceWorker.SkipWaitingRequest): Promise<void>;

    startWorker(params: Protocol.ServiceWorker.StartWorkerRequest): Promise<void>;

    stopAllWorkers(): Promise<void>;

    stopWorker(params: Protocol.ServiceWorker.StopWorkerRequest): Promise<void>;

    unregister(params: Protocol.ServiceWorker.UnregisterRequest): Promise<void>;

    updateRegistration(params: Protocol.ServiceWorker.UpdateRegistrationRequest): Promise<void>;

    on(event: 'workerErrorReported', listener: (params: Protocol.ServiceWorker.WorkerErrorReportedEvent) => void): void;

    on(event: 'workerRegistrationUpdated',
       listener: (params: Protocol.ServiceWorker.WorkerRegistrationUpdatedEvent) => void): void;

    on(event: 'workerVersionUpdated',
       listener: (params: Protocol.ServiceWorker.WorkerVersionUpdatedEvent) => void): void;
  }

  export interface StorageApi {
    /**
     * Clears storage for origin.
     */
    clearDataForOrigin(params: Protocol.Storage.ClearDataForOriginRequest): Promise<void>;

    /**
     * Returns all browser cookies.
     */
    getCookies(params: Protocol.Storage.GetCookiesRequest): Promise<Protocol.Storage.GetCookiesResponse>;

    /**
     * Sets given cookies.
     */
    setCookies(params: Protocol.Storage.SetCookiesRequest): Promise<void>;

    /**
     * Clears cookies.
     */
    clearCookies(params: Protocol.Storage.ClearCookiesRequest): Promise<void>;

    /**
     * Returns usage and quota in bytes.
     */
    getUsageAndQuota(params: Protocol.Storage.GetUsageAndQuotaRequest):
        Promise<Protocol.Storage.GetUsageAndQuotaResponse>;

    /**
     * Registers origin to be notified when an update occurs to its cache storage list.
     */
    trackCacheStorageForOrigin(params: Protocol.Storage.TrackCacheStorageForOriginRequest): Promise<void>;

    /**
     * Registers origin to be notified when an update occurs to its IndexedDB.
     */
    trackIndexedDBForOrigin(params: Protocol.Storage.TrackIndexedDBForOriginRequest): Promise<void>;

    /**
     * Unregisters origin from receiving notifications for cache storage.
     */
    untrackCacheStorageForOrigin(params: Protocol.Storage.UntrackCacheStorageForOriginRequest): Promise<void>;

    /**
     * Unregisters origin from receiving notifications for IndexedDB.
     */
    untrackIndexedDBForOrigin(params: Protocol.Storage.UntrackIndexedDBForOriginRequest): Promise<void>;

    /**
     * A cache's contents have been modified.
     */
    on(event: 'cacheStorageContentUpdated',
       listener: (params: Protocol.Storage.CacheStorageContentUpdatedEvent) => void): void;

    /**
     * A cache has been added/deleted.
     */
    on(event: 'cacheStorageListUpdated',
       listener: (params: Protocol.Storage.CacheStorageListUpdatedEvent) => void): void;

    /**
     * The origin's IndexedDB object store has been modified.
     */
    on(event: 'indexedDBContentUpdated',
       listener: (params: Protocol.Storage.IndexedDBContentUpdatedEvent) => void): void;

    /**
     * The origin's IndexedDB database list has been modified.
     */
    on(event: 'indexedDBListUpdated', listener: (params: Protocol.Storage.IndexedDBListUpdatedEvent) => void): void;
  }

  export interface SystemInfoApi {
    /**
     * Returns information about the system.
     */
    getInfo(): Promise<Protocol.SystemInfo.GetInfoResponse>;

    /**
     * Returns information about all running processes.
     */
    getProcessInfo(): Promise<Protocol.SystemInfo.GetProcessInfoResponse>;
  }

  export interface TargetApi {
    /**
     * Activates (focuses) the target.
     */
    activateTarget(params: Protocol.Target.ActivateTargetRequest): Promise<void>;

    /**
     * Attaches to the target with given id.
     */
    attachToTarget(params: Protocol.Target.AttachToTargetRequest): Promise<Protocol.Target.AttachToTargetResponse>;

    /**
     * Attaches to the browser target, only uses flat sessionId mode.
     */
    attachToBrowserTarget(): Promise<Protocol.Target.AttachToBrowserTargetResponse>;

    /**
     * Closes the target. If the target is a page that gets closed too.
     */
    closeTarget(params: Protocol.Target.CloseTargetRequest): Promise<Protocol.Target.CloseTargetResponse>;

    /**
     * Inject object to the target's main frame that provides a communication
     * channel with browser target.
     *
     * Injected object will be available as `window[bindingName]`.
     *
     * The object has the follwing API:
     * - `binding.send(json)` - a method to send messages over the remote debugging protocol
     * - `binding.onmessage = json => handleMessage(json)` - a callback that will be called for the protocol notifications and command responses.
     */
    exposeDevToolsProtocol(params: Protocol.Target.ExposeDevToolsProtocolRequest): Promise<void>;

    /**
     * Creates a new empty BrowserContext. Similar to an incognito profile but you can have more than
     * one.
     */
    createBrowserContext(params: Protocol.Target.CreateBrowserContextRequest):
        Promise<Protocol.Target.CreateBrowserContextResponse>;

    /**
     * Returns all browser contexts created with `Target.createBrowserContext` method.
     */
    getBrowserContexts(): Promise<Protocol.Target.GetBrowserContextsResponse>;

    /**
     * Creates a new page.
     */
    createTarget(params: Protocol.Target.CreateTargetRequest): Promise<Protocol.Target.CreateTargetResponse>;

    /**
     * Detaches session with given id.
     */
    detachFromTarget(params: Protocol.Target.DetachFromTargetRequest): Promise<void>;

    /**
     * Deletes a BrowserContext. All the belonging pages will be closed without calling their
     * beforeunload hooks.
     */
    disposeBrowserContext(params: Protocol.Target.DisposeBrowserContextRequest): Promise<void>;

    /**
     * Returns information about a target.
     */
    getTargetInfo(params: Protocol.Target.GetTargetInfoRequest): Promise<Protocol.Target.GetTargetInfoResponse>;

    /**
     * Retrieves a list of available targets.
     */
    getTargets(): Promise<Protocol.Target.GetTargetsResponse>;

    /**
     * Sends protocol message over session with given id.
     * Consider using flat mode instead; see commands attachToTarget, setAutoAttach,
     * and crbug.com/991325.
     */
    sendMessageToTarget(params: Protocol.Target.SendMessageToTargetRequest): Promise<void>;

    /**
     * Controls whether to automatically attach to new targets which are considered to be related to
     * this one. When turned on, attaches to all existing related targets as well. When turned off,
     * automatically detaches from all currently attached targets.
     */
    setAutoAttach(params: Protocol.Target.SetAutoAttachRequest): Promise<void>;

    /**
     * Controls whether to discover available targets and notify via
     * `targetCreated/targetInfoChanged/targetDestroyed` events.
     */
    setDiscoverTargets(params: Protocol.Target.SetDiscoverTargetsRequest): Promise<void>;

    /**
     * Enables target discovery for the specified locations, when `setDiscoverTargets` was set to
     * `true`.
     */
    setRemoteLocations(params: Protocol.Target.SetRemoteLocationsRequest): Promise<void>;

    /**
     * Issued when attached to target because of auto-attach or `attachToTarget` command.
     */
    on(event: 'attachedToTarget', listener: (params: Protocol.Target.AttachedToTargetEvent) => void): void;

    /**
     * Issued when detached from target for any reason (including `detachFromTarget` command). Can be
     * issued multiple times per target if multiple sessions have been attached to it.
     */
    on(event: 'detachedFromTarget', listener: (params: Protocol.Target.DetachedFromTargetEvent) => void): void;

    /**
     * Notifies about a new protocol message received from the session (as reported in
     * `attachedToTarget` event).
     */
    on(event: 'receivedMessageFromTarget',
       listener: (params: Protocol.Target.ReceivedMessageFromTargetEvent) => void): void;

    /**
     * Issued when a possible inspection target is created.
     */
    on(event: 'targetCreated', listener: (params: Protocol.Target.TargetCreatedEvent) => void): void;

    /**
     * Issued when a target is destroyed.
     */
    on(event: 'targetDestroyed', listener: (params: Protocol.Target.TargetDestroyedEvent) => void): void;

    /**
     * Issued when a target has crashed.
     */
    on(event: 'targetCrashed', listener: (params: Protocol.Target.TargetCrashedEvent) => void): void;

    /**
     * Issued when some information about a target has changed. This only happens between
     * `targetCreated` and `targetDestroyed`.
     */
    on(event: 'targetInfoChanged', listener: (params: Protocol.Target.TargetInfoChangedEvent) => void): void;
  }

  export interface TetheringApi {
    /**
     * Request browser port binding.
     */
    bind(params: Protocol.Tethering.BindRequest): Promise<void>;

    /**
     * Request browser port unbinding.
     */
    unbind(params: Protocol.Tethering.UnbindRequest): Promise<void>;

    /**
     * Informs that port was successfully bound and got a specified connection id.
     */
    on(event: 'accepted', listener: (params: Protocol.Tethering.AcceptedEvent) => void): void;
  }

  export interface TracingApi {
    /**
     * Stop trace events collection.
     */
    end(): Promise<void>;

    /**
     * Gets supported tracing categories.
     */
    getCategories(): Promise<Protocol.Tracing.GetCategoriesResponse>;

    /**
     * Record a clock sync marker in the trace.
     */
    recordClockSyncMarker(params: Protocol.Tracing.RecordClockSyncMarkerRequest): Promise<void>;

    /**
     * Request a global memory dump.
     */
    requestMemoryDump(params: Protocol.Tracing.RequestMemoryDumpRequest):
        Promise<Protocol.Tracing.RequestMemoryDumpResponse>;

    /**
     * Start trace events collection.
     */
    start(params: Protocol.Tracing.StartRequest): Promise<void>;

    on(event: 'bufferUsage', listener: (params: Protocol.Tracing.BufferUsageEvent) => void): void;

    /**
     * Contains an bucket of collected trace events. When tracing is stopped collected events will be
     * send as a sequence of dataCollected events followed by tracingComplete event.
     */
    on(event: 'dataCollected', listener: (params: Protocol.Tracing.DataCollectedEvent) => void): void;

    /**
     * Signals that tracing is stopped and there is no trace buffers pending flush, all data were
     * delivered via dataCollected events.
     */
    on(event: 'tracingComplete', listener: (params: Protocol.Tracing.TracingCompleteEvent) => void): void;
  }

  export interface FetchApi {
    /**
     * Disables the fetch domain.
     */
    disable(): Promise<void>;

    /**
     * Enables issuing of requestPaused events. A request will be paused until client
     * calls one of failRequest, fulfillRequest or continueRequest/continueWithAuth.
     */
    enable(params: Protocol.Fetch.EnableRequest): Promise<void>;

    /**
     * Causes the request to fail with specified reason.
     */
    failRequest(params: Protocol.Fetch.FailRequestRequest): Promise<void>;

    /**
     * Provides response to the request.
     */
    fulfillRequest(params: Protocol.Fetch.FulfillRequestRequest): Promise<void>;

    /**
     * Continues the request, optionally modifying some of its parameters.
     */
    continueRequest(params: Protocol.Fetch.ContinueRequestRequest): Promise<void>;

    /**
     * Continues a request supplying authChallengeResponse following authRequired event.
     */
    continueWithAuth(params: Protocol.Fetch.ContinueWithAuthRequest): Promise<void>;

    /**
     * Causes the body of the response to be received from the server and
     * returned as a single string. May only be issued for a request that
     * is paused in the Response stage and is mutually exclusive with
     * takeResponseBodyForInterceptionAsStream. Calling other methods that
     * affect the request or disabling fetch domain before body is received
     * results in an undefined behavior.
     */
    getResponseBody(params: Protocol.Fetch.GetResponseBodyRequest): Promise<Protocol.Fetch.GetResponseBodyResponse>;

    /**
     * Returns a handle to the stream representing the response body.
     * The request must be paused in the HeadersReceived stage.
     * Note that after this command the request can't be continued
     * as is -- client either needs to cancel it or to provide the
     * response body.
     * The stream only supports sequential read, IO.read will fail if the position
     * is specified.
     * This method is mutually exclusive with getResponseBody.
     * Calling other methods that affect the request or disabling fetch
     * domain before body is received results in an undefined behavior.
     */
    takeResponseBodyAsStream(params: Protocol.Fetch.TakeResponseBodyAsStreamRequest):
        Promise<Protocol.Fetch.TakeResponseBodyAsStreamResponse>;

    /**
     * Issued when the domain is enabled and the request URL matches the
     * specified filter. The request is paused until the client responds
     * with one of continueRequest, failRequest or fulfillRequest.
     * The stage of the request can be determined by presence of responseErrorReason
     * and responseStatusCode -- the request is at the response stage if either
     * of these fields is present and in the request stage otherwise.
     */
    on(event: 'requestPaused', listener: (params: Protocol.Fetch.RequestPausedEvent) => void): void;

    /**
     * Issued when the domain is enabled with handleAuthRequests set to true.
     * The request is paused until client responds with continueWithAuth.
     */
    on(event: 'authRequired', listener: (params: Protocol.Fetch.AuthRequiredEvent) => void): void;
  }

  export interface WebAudioApi {
    /**
     * Enables the WebAudio domain and starts sending context lifetime events.
     */
    enable(): Promise<void>;

    /**
     * Disables the WebAudio domain.
     */
    disable(): Promise<void>;

    /**
     * Fetch the realtime data from the registered contexts.
     */
    getRealtimeData(params: Protocol.WebAudio.GetRealtimeDataRequest):
        Promise<Protocol.WebAudio.GetRealtimeDataResponse>;

    /**
     * Notifies that a new BaseAudioContext has been created.
     */
    on(event: 'contextCreated', listener: (params: Protocol.WebAudio.ContextCreatedEvent) => void): void;

    /**
     * Notifies that an existing BaseAudioContext will be destroyed.
     */
    on(event: 'contextWillBeDestroyed',
       listener: (params: Protocol.WebAudio.ContextWillBeDestroyedEvent) => void): void;

    /**
     * Notifies that existing BaseAudioContext has changed some properties (id stays the same)..
     */
    on(event: 'contextChanged', listener: (params: Protocol.WebAudio.ContextChangedEvent) => void): void;

    /**
     * Notifies that the construction of an AudioListener has finished.
     */
    on(event: 'audioListenerCreated', listener: (params: Protocol.WebAudio.AudioListenerCreatedEvent) => void): void;

    /**
     * Notifies that a new AudioListener has been created.
     */
    on(event: 'audioListenerWillBeDestroyed',
       listener: (params: Protocol.WebAudio.AudioListenerWillBeDestroyedEvent) => void): void;

    /**
     * Notifies that a new AudioNode has been created.
     */
    on(event: 'audioNodeCreated', listener: (params: Protocol.WebAudio.AudioNodeCreatedEvent) => void): void;

    /**
     * Notifies that an existing AudioNode has been destroyed.
     */
    on(event: 'audioNodeWillBeDestroyed',
       listener: (params: Protocol.WebAudio.AudioNodeWillBeDestroyedEvent) => void): void;

    /**
     * Notifies that a new AudioParam has been created.
     */
    on(event: 'audioParamCreated', listener: (params: Protocol.WebAudio.AudioParamCreatedEvent) => void): void;

    /**
     * Notifies that an existing AudioParam has been destroyed.
     */
    on(event: 'audioParamWillBeDestroyed',
       listener: (params: Protocol.WebAudio.AudioParamWillBeDestroyedEvent) => void): void;

    /**
     * Notifies that two AudioNodes are connected.
     */
    on(event: 'nodesConnected', listener: (params: Protocol.WebAudio.NodesConnectedEvent) => void): void;

    /**
     * Notifies that AudioNodes are disconnected. The destination can be null, and it means all the outgoing connections from the source are disconnected.
     */
    on(event: 'nodesDisconnected', listener: (params: Protocol.WebAudio.NodesDisconnectedEvent) => void): void;

    /**
     * Notifies that an AudioNode is connected to an AudioParam.
     */
    on(event: 'nodeParamConnected', listener: (params: Protocol.WebAudio.NodeParamConnectedEvent) => void): void;

    /**
     * Notifies that an AudioNode is disconnected to an AudioParam.
     */
    on(event: 'nodeParamDisconnected', listener: (params: Protocol.WebAudio.NodeParamDisconnectedEvent) => void): void;
  }

  export interface WebAuthnApi {
    /**
     * Enable the WebAuthn domain and start intercepting credential storage and
     * retrieval with a virtual authenticator.
     */
    enable(): Promise<void>;

    /**
     * Disable the WebAuthn domain.
     */
    disable(): Promise<void>;

    /**
     * Creates and adds a virtual authenticator.
     */
    addVirtualAuthenticator(params: Protocol.WebAuthn.AddVirtualAuthenticatorRequest):
        Promise<Protocol.WebAuthn.AddVirtualAuthenticatorResponse>;

    /**
     * Removes the given authenticator.
     */
    removeVirtualAuthenticator(params: Protocol.WebAuthn.RemoveVirtualAuthenticatorRequest): Promise<void>;

    /**
     * Adds the credential to the specified authenticator.
     */
    addCredential(params: Protocol.WebAuthn.AddCredentialRequest): Promise<void>;

    /**
     * Returns a single credential stored in the given virtual authenticator that
     * matches the credential ID.
     */
    getCredential(params: Protocol.WebAuthn.GetCredentialRequest): Promise<Protocol.WebAuthn.GetCredentialResponse>;

    /**
     * Returns all the credentials stored in the given virtual authenticator.
     */
    getCredentials(params: Protocol.WebAuthn.GetCredentialsRequest): Promise<Protocol.WebAuthn.GetCredentialsResponse>;

    /**
     * Removes a credential from the authenticator.
     */
    removeCredential(params: Protocol.WebAuthn.RemoveCredentialRequest): Promise<void>;

    /**
     * Clears all the credentials from the specified device.
     */
    clearCredentials(params: Protocol.WebAuthn.ClearCredentialsRequest): Promise<void>;

    /**
     * Sets whether User Verification succeeds or fails for an authenticator.
     * The default is true.
     */
    setUserVerified(params: Protocol.WebAuthn.SetUserVerifiedRequest): Promise<void>;
  }

  export interface MediaApi {
    /**
     * Enables the Media domain
     */
    enable(): Promise<void>;

    /**
     * Disables the Media domain.
     */
    disable(): Promise<void>;

    /**
     * This can be called multiple times, and can be used to set / override /
     * remove player properties. A null propValue indicates removal.
     */
    on(event: 'playerPropertiesChanged', listener: (params: Protocol.Media.PlayerPropertiesChangedEvent) => void): void;

    /**
     * Send events as a list, allowing them to be batched on the browser for less
     * congestion. If batched, events must ALWAYS be in chronological order.
     */
    on(event: 'playerEventsAdded', listener: (params: Protocol.Media.PlayerEventsAddedEvent) => void): void;

    /**
     * Called whenever a player is created, or when a new agent joins and recieves
     * a list of active players. If an agent is restored, it will recieve the full
     * list of player ids and all events again.
     */
    on(event: 'playersCreated', listener: (params: Protocol.Media.PlayersCreatedEvent) => void): void;
  }

  export interface ConsoleApi {
    /**
     * Does nothing.
     */
    clearMessages(): Promise<void>;

    /**
     * Disables console domain, prevents further console messages from being reported to the client.
     */
    disable(): Promise<void>;

    /**
     * Enables console domain, sends the messages collected so far to the client by means of the
     * `messageAdded` notification.
     */
    enable(): Promise<void>;

    /**
     * Issued when new console message is added.
     */
    on(event: 'messageAdded', listener: (params: Protocol.Console.MessageAddedEvent) => void): void;
  }

  export interface DebuggerApi {
    /**
     * Continues execution until specific location is reached.
     */
    continueToLocation(params: Protocol.Debugger.ContinueToLocationRequest): Promise<void>;

    /**
     * Disables debugger for given page.
     */
    disable(): Promise<void>;

    /**
     * Enables debugger for the given page. Clients should not assume that the debugging has been
     * enabled until the result for this command is received.
     */
    enable(params: Protocol.Debugger.EnableRequest): Promise<Protocol.Debugger.EnableResponse>;

    /**
     * Evaluates expression on a given call frame.
     */
    evaluateOnCallFrame(params: Protocol.Debugger.EvaluateOnCallFrameRequest):
        Promise<Protocol.Debugger.EvaluateOnCallFrameResponse>;

    /**
     * Returns possible locations for breakpoint. scriptId in start and end range locations should be
     * the same.
     */
    getPossibleBreakpoints(params: Protocol.Debugger.GetPossibleBreakpointsRequest):
        Promise<Protocol.Debugger.GetPossibleBreakpointsResponse>;

    /**
     * Returns source for the script with given id.
     */
    getScriptSource(params: Protocol.Debugger.GetScriptSourceRequest):
        Promise<Protocol.Debugger.GetScriptSourceResponse>;

    /**
     * This command is deprecated. Use getScriptSource instead.
     */
    getWasmBytecode(params: Protocol.Debugger.GetWasmBytecodeRequest):
        Promise<Protocol.Debugger.GetWasmBytecodeResponse>;

    /**
     * Returns stack trace with given `stackTraceId`.
     */
    getStackTrace(params: Protocol.Debugger.GetStackTraceRequest): Promise<Protocol.Debugger.GetStackTraceResponse>;

    /**
     * Stops on the next JavaScript statement.
     */
    pause(): Promise<void>;

    pauseOnAsyncCall(params: Protocol.Debugger.PauseOnAsyncCallRequest): Promise<void>;

    /**
     * Removes JavaScript breakpoint.
     */
    removeBreakpoint(params: Protocol.Debugger.RemoveBreakpointRequest): Promise<void>;

    /**
     * Restarts particular call frame from the beginning.
     */
    restartFrame(params: Protocol.Debugger.RestartFrameRequest): Promise<Protocol.Debugger.RestartFrameResponse>;

    /**
     * Resumes JavaScript execution.
     */
    resume(params: Protocol.Debugger.ResumeRequest): Promise<void>;

    /**
     * Searches for given string in script content.
     */
    searchInContent(params: Protocol.Debugger.SearchInContentRequest):
        Promise<Protocol.Debugger.SearchInContentResponse>;

    /**
     * Enables or disables async call stacks tracking.
     */
    setAsyncCallStackDepth(params: Protocol.Debugger.SetAsyncCallStackDepthRequest): Promise<void>;

    /**
     * Replace previous blackbox patterns with passed ones. Forces backend to skip stepping/pausing in
     * scripts with url matching one of the patterns. VM will try to leave blackboxed script by
     * performing 'step in' several times, finally resorting to 'step out' if unsuccessful.
     */
    setBlackboxPatterns(params: Protocol.Debugger.SetBlackboxPatternsRequest): Promise<void>;

    /**
     * Makes backend skip steps in the script in blackboxed ranges. VM will try leave blacklisted
     * scripts by performing 'step in' several times, finally resorting to 'step out' if unsuccessful.
     * Positions array contains positions where blackbox state is changed. First interval isn't
     * blackboxed. Array should be sorted.
     */
    setBlackboxedRanges(params: Protocol.Debugger.SetBlackboxedRangesRequest): Promise<void>;

    /**
     * Sets JavaScript breakpoint at a given location.
     */
    setBreakpoint(params: Protocol.Debugger.SetBreakpointRequest): Promise<Protocol.Debugger.SetBreakpointResponse>;

    /**
     * Sets instrumentation breakpoint.
     */
    setInstrumentationBreakpoint(params: Protocol.Debugger.SetInstrumentationBreakpointRequest):
        Promise<Protocol.Debugger.SetInstrumentationBreakpointResponse>;

    /**
     * Sets JavaScript breakpoint at given location specified either by URL or URL regex. Once this
     * command is issued, all existing parsed scripts will have breakpoints resolved and returned in
     * `locations` property. Further matching script parsing will result in subsequent
     * `breakpointResolved` events issued. This logical breakpoint will survive page reloads.
     */
    setBreakpointByUrl(params: Protocol.Debugger.SetBreakpointByUrlRequest):
        Promise<Protocol.Debugger.SetBreakpointByUrlResponse>;

    /**
     * Sets JavaScript breakpoint before each call to the given function.
     * If another function was created from the same source as a given one,
     * calling it will also trigger the breakpoint.
     */
    setBreakpointOnFunctionCall(params: Protocol.Debugger.SetBreakpointOnFunctionCallRequest):
        Promise<Protocol.Debugger.SetBreakpointOnFunctionCallResponse>;

    /**
     * Activates / deactivates all breakpoints on the page.
     */
    setBreakpointsActive(params: Protocol.Debugger.SetBreakpointsActiveRequest): Promise<void>;

    /**
     * Defines pause on exceptions state. Can be set to stop on all exceptions, uncaught exceptions or
     * no exceptions. Initial pause on exceptions state is `none`.
     */
    setPauseOnExceptions(params: Protocol.Debugger.SetPauseOnExceptionsRequest): Promise<void>;

    /**
     * Changes return value in top frame. Available only at return break position.
     */
    setReturnValue(params: Protocol.Debugger.SetReturnValueRequest): Promise<void>;

    /**
     * Edits JavaScript source live.
     */
    setScriptSource(params: Protocol.Debugger.SetScriptSourceRequest):
        Promise<Protocol.Debugger.SetScriptSourceResponse>;

    /**
     * Makes page not interrupt on any pauses (breakpoint, exception, dom exception etc).
     */
    setSkipAllPauses(params: Protocol.Debugger.SetSkipAllPausesRequest): Promise<void>;

    /**
     * Changes value of variable in a callframe. Object-based scopes are not supported and must be
     * mutated manually.
     */
    setVariableValue(params: Protocol.Debugger.SetVariableValueRequest): Promise<void>;

    /**
     * Steps into the function call.
     */
    stepInto(params: Protocol.Debugger.StepIntoRequest): Promise<void>;

    /**
     * Steps out of the function call.
     */
    stepOut(): Promise<void>;

    /**
     * Steps over the statement.
     */
    stepOver(): Promise<void>;

    /**
     * Fired when breakpoint is resolved to an actual script and location.
     */
    on(event: 'breakpointResolved', listener: (params: Protocol.Debugger.BreakpointResolvedEvent) => void): void;

    /**
     * Fired when the virtual machine stopped on breakpoint or exception or any other stop criteria.
     */
    on(event: 'paused', listener: (params: Protocol.Debugger.PausedEvent) => void): void;

    /**
     * Fired when the virtual machine resumed execution.
     */
    on(event: 'resumed', listener: () => void): void;

    /**
     * Fired when virtual machine fails to parse the script.
     */
    on(event: 'scriptFailedToParse', listener: (params: Protocol.Debugger.ScriptFailedToParseEvent) => void): void;

    /**
     * Fired when virtual machine parses script. This event is also fired for all known and uncollected
     * scripts upon enabling debugger.
     */
    on(event: 'scriptParsed', listener: (params: Protocol.Debugger.ScriptParsedEvent) => void): void;
  }

  export interface HeapProfilerApi {
    /**
     * Enables console to refer to the node with given id via $x (see Command Line API for more details
     * $x functions).
     */
    addInspectedHeapObject(params: Protocol.HeapProfiler.AddInspectedHeapObjectRequest): Promise<void>;

    collectGarbage(): Promise<void>;

    disable(): Promise<void>;

    enable(): Promise<void>;

    getHeapObjectId(params: Protocol.HeapProfiler.GetHeapObjectIdRequest):
        Promise<Protocol.HeapProfiler.GetHeapObjectIdResponse>;

    getObjectByHeapObjectId(params: Protocol.HeapProfiler.GetObjectByHeapObjectIdRequest):
        Promise<Protocol.HeapProfiler.GetObjectByHeapObjectIdResponse>;

    getSamplingProfile(): Promise<Protocol.HeapProfiler.GetSamplingProfileResponse>;

    startSampling(params: Protocol.HeapProfiler.StartSamplingRequest): Promise<void>;

    startTrackingHeapObjects(params: Protocol.HeapProfiler.StartTrackingHeapObjectsRequest): Promise<void>;

    stopSampling(): Promise<Protocol.HeapProfiler.StopSamplingResponse>;

    stopTrackingHeapObjects(params: Protocol.HeapProfiler.StopTrackingHeapObjectsRequest): Promise<void>;

    takeHeapSnapshot(params: Protocol.HeapProfiler.TakeHeapSnapshotRequest): Promise<void>;

    on(event: 'addHeapSnapshotChunk',
       listener: (params: Protocol.HeapProfiler.AddHeapSnapshotChunkEvent) => void): void;

    /**
     * If heap objects tracking has been started then backend may send update for one or more fragments
     */
    on(event: 'heapStatsUpdate', listener: (params: Protocol.HeapProfiler.HeapStatsUpdateEvent) => void): void;

    /**
     * If heap objects tracking has been started then backend regularly sends a current value for last
     * seen object id and corresponding timestamp. If the were changes in the heap since last event
     * then one or more heapStatsUpdate events will be sent before a new lastSeenObjectId event.
     */
    on(event: 'lastSeenObjectId', listener: (params: Protocol.HeapProfiler.LastSeenObjectIdEvent) => void): void;

    on(event: 'reportHeapSnapshotProgress',
       listener: (params: Protocol.HeapProfiler.ReportHeapSnapshotProgressEvent) => void): void;

    on(event: 'resetProfiles', listener: () => void): void;
  }

  export interface ProfilerApi {
    disable(): Promise<void>;

    enable(): Promise<void>;

    /**
     * Collect coverage data for the current isolate. The coverage data may be incomplete due to
     * garbage collection.
     */
    getBestEffortCoverage(): Promise<Protocol.Profiler.GetBestEffortCoverageResponse>;

    /**
     * Changes CPU profiler sampling interval. Must be called before CPU profiles recording started.
     */
    setSamplingInterval(params: Protocol.Profiler.SetSamplingIntervalRequest): Promise<void>;

    start(): Promise<void>;

    /**
     * Enable precise code coverage. Coverage data for JavaScript executed before enabling precise code
     * coverage may be incomplete. Enabling prevents running optimized code and resets execution
     * counters.
     */
    startPreciseCoverage(params: Protocol.Profiler.StartPreciseCoverageRequest):
        Promise<Protocol.Profiler.StartPreciseCoverageResponse>;

    /**
     * Enable type profile.
     */
    startTypeProfile(): Promise<void>;

    stop(): Promise<Protocol.Profiler.StopResponse>;

    /**
     * Disable precise code coverage. Disabling releases unnecessary execution count records and allows
     * executing optimized code.
     */
    stopPreciseCoverage(): Promise<void>;

    /**
     * Disable type profile. Disabling releases type profile data collected so far.
     */
    stopTypeProfile(): Promise<void>;

    /**
     * Collect coverage data for the current isolate, and resets execution counters. Precise code
     * coverage needs to have started.
     */
    takePreciseCoverage(): Promise<Protocol.Profiler.TakePreciseCoverageResponse>;

    /**
     * Collect type profile.
     */
    takeTypeProfile(): Promise<Protocol.Profiler.TakeTypeProfileResponse>;

    /**
     * Enable run time call stats collection.
     */
    enableRuntimeCallStats(): Promise<void>;

    /**
     * Disable run time call stats collection.
     */
    disableRuntimeCallStats(): Promise<void>;

    /**
     * Retrieve run time call stats.
     */
    getRuntimeCallStats(): Promise<Protocol.Profiler.GetRuntimeCallStatsResponse>;

    on(event: 'consoleProfileFinished',
       listener: (params: Protocol.Profiler.ConsoleProfileFinishedEvent) => void): void;

    /**
     * Sent when new profile recording is started using console.profile() call.
     */
    on(event: 'consoleProfileStarted', listener: (params: Protocol.Profiler.ConsoleProfileStartedEvent) => void): void;

    /**
     * Reports coverage delta since the last poll (either from an event like this, or from
     * `takePreciseCoverage` for the current isolate. May only be sent if precise code
     * coverage has been started. This event can be trigged by the embedder to, for example,
     * trigger collection of coverage data immediatelly at a certain point in time.
     */
    on(event: 'preciseCoverageDeltaUpdate',
       listener: (params: Protocol.Profiler.PreciseCoverageDeltaUpdateEvent) => void): void;
  }

  export interface RuntimeApi {
    /**
     * Add handler to promise with given promise object id.
     */
    awaitPromise(params: Protocol.Runtime.AwaitPromiseRequest): Promise<Protocol.Runtime.AwaitPromiseResponse>;

    /**
     * Calls function with given declaration on the given object. Object group of the result is
     * inherited from the target object.
     */
    callFunctionOn(params: Protocol.Runtime.CallFunctionOnRequest): Promise<Protocol.Runtime.CallFunctionOnResponse>;

    /**
     * Compiles expression.
     */
    compileScript(params: Protocol.Runtime.CompileScriptRequest): Promise<Protocol.Runtime.CompileScriptResponse>;

    /**
     * Disables reporting of execution contexts creation.
     */
    disable(): Promise<void>;

    /**
     * Discards collected exceptions and console API calls.
     */
    discardConsoleEntries(): Promise<void>;

    /**
     * Enables reporting of execution contexts creation by means of `executionContextCreated` event.
     * When the reporting gets enabled the event will be sent immediately for each existing execution
     * context.
     */
    enable(): Promise<void>;

    /**
     * Evaluates expression on global object.
     */
    evaluate(params: Protocol.Runtime.EvaluateRequest): Promise<Protocol.Runtime.EvaluateResponse>;

    /**
     * Returns the isolate id.
     */
    getIsolateId(): Promise<Protocol.Runtime.GetIsolateIdResponse>;

    /**
     * Returns the JavaScript heap usage.
     * It is the total usage of the corresponding isolate not scoped to a particular Runtime.
     */
    getHeapUsage(): Promise<Protocol.Runtime.GetHeapUsageResponse>;

    /**
     * Returns properties of a given object. Object group of the result is inherited from the target
     * object.
     */
    getProperties(params: Protocol.Runtime.GetPropertiesRequest): Promise<Protocol.Runtime.GetPropertiesResponse>;

    /**
     * Returns all let, const and class variables from global scope.
     */
    globalLexicalScopeNames(params: Protocol.Runtime.GlobalLexicalScopeNamesRequest):
        Promise<Protocol.Runtime.GlobalLexicalScopeNamesResponse>;

    queryObjects(params: Protocol.Runtime.QueryObjectsRequest): Promise<Protocol.Runtime.QueryObjectsResponse>;

    /**
     * Releases remote object with given id.
     */
    releaseObject(params: Protocol.Runtime.ReleaseObjectRequest): Promise<void>;

    /**
     * Releases all remote objects that belong to a given group.
     */
    releaseObjectGroup(params: Protocol.Runtime.ReleaseObjectGroupRequest): Promise<void>;

    /**
     * Tells inspected instance to run if it was waiting for debugger to attach.
     */
    runIfWaitingForDebugger(): Promise<void>;

    /**
     * Runs script with given id in a given context.
     */
    runScript(params: Protocol.Runtime.RunScriptRequest): Promise<Protocol.Runtime.RunScriptResponse>;

    /**
     * Enables or disables async call stacks tracking.
     */
    setAsyncCallStackDepth(params: Protocol.Runtime.SetAsyncCallStackDepthRequest): Promise<void>;

    setCustomObjectFormatterEnabled(params: Protocol.Runtime.SetCustomObjectFormatterEnabledRequest): Promise<void>;

    setMaxCallStackSizeToCapture(params: Protocol.Runtime.SetMaxCallStackSizeToCaptureRequest): Promise<void>;

    /**
     * Terminate current or next JavaScript execution.
     * Will cancel the termination when the outer-most script execution ends.
     */
    terminateExecution(): Promise<void>;

    /**
     * If executionContextId is empty, adds binding with the given name on the
     * global objects of all inspected contexts, including those created later,
     * bindings survive reloads.
     * If executionContextId is specified, adds binding only on global object of
     * given execution context.
     * Binding function takes exactly one argument, this argument should be string,
     * in case of any other input, function throws an exception.
     * Each binding function call produces Runtime.bindingCalled notification.
     */
    addBinding(params: Protocol.Runtime.AddBindingRequest): Promise<void>;

    /**
     * This method does not remove binding function from global object but
     * unsubscribes current runtime agent from Runtime.bindingCalled notifications.
     */
    removeBinding(params: Protocol.Runtime.RemoveBindingRequest): Promise<void>;

    /**
     * Notification is issued every time when binding is called.
     */
    on(event: 'bindingCalled', listener: (params: Protocol.Runtime.BindingCalledEvent) => void): void;

    /**
     * Issued when console API was called.
     */
    on(event: 'consoleAPICalled', listener: (params: Protocol.Runtime.ConsoleAPICalledEvent) => void): void;

    /**
     * Issued when unhandled exception was revoked.
     */
    on(event: 'exceptionRevoked', listener: (params: Protocol.Runtime.ExceptionRevokedEvent) => void): void;

    /**
     * Issued when exception was thrown and unhandled.
     */
    on(event: 'exceptionThrown', listener: (params: Protocol.Runtime.ExceptionThrownEvent) => void): void;

    /**
     * Issued when new execution context is created.
     */
    on(event: 'executionContextCreated',
       listener: (params: Protocol.Runtime.ExecutionContextCreatedEvent) => void): void;

    /**
     * Issued when execution context is destroyed.
     */
    on(event: 'executionContextDestroyed',
       listener: (params: Protocol.Runtime.ExecutionContextDestroyedEvent) => void): void;

    /**
     * Issued when all executionContexts were cleared in browser
     */
    on(event: 'executionContextsCleared', listener: () => void): void;

    /**
     * Issued when object should be inspected (for example, as a result of inspect() command line API
     * call).
     */
    on(event: 'inspectRequested', listener: (params: Protocol.Runtime.InspectRequestedEvent) => void): void;
  }

  export interface SchemaApi {
    /**
     * Returns supported domains.
     */
    getDomains(): Promise<Protocol.Schema.GetDomainsResponse>;
  }
}
