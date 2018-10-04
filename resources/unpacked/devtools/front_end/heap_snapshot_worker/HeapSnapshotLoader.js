/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @unrestricted
 */
HeapSnapshotWorker.HeapSnapshotLoader = class {
  /**
   * @param {!HeapSnapshotWorker.HeapSnapshotWorkerDispatcher} dispatcher
   */
  constructor(dispatcher) {
    this._reset();
    this._progress = new HeapSnapshotWorker.HeapSnapshotProgress(dispatcher);
  }

  dispose() {
    this._reset();
  }

  _reset() {
    this._json = '';
    this._state = 'find-snapshot-info';
    this._snapshot = {};
  }

  close() {
    if (this._json)
      this._parseStringsArray();
  }

  /**
   * @return {!HeapSnapshotWorker.JSHeapSnapshot}
   */
  buildSnapshot() {
    this._progress.updateStatus('Processing snapshot\u2026');
    const result = new HeapSnapshotWorker.JSHeapSnapshot(this._snapshot, this._progress);
    this._reset();
    return result;
  }

  _parseUintArray() {
    let index = 0;
    const char0 = '0'.charCodeAt(0);
    const char9 = '9'.charCodeAt(0);
    const closingBracket = ']'.charCodeAt(0);
    const length = this._json.length;
    while (true) {
      while (index < length) {
        const code = this._json.charCodeAt(index);
        if (char0 <= code && code <= char9) {
          break;
        } else if (code === closingBracket) {
          this._json = this._json.slice(index + 1);
          return false;
        }
        ++index;
      }
      if (index === length) {
        this._json = '';
        return true;
      }
      let nextNumber = 0;
      const startIndex = index;
      while (index < length) {
        const code = this._json.charCodeAt(index);
        if (char0 > code || code > char9)
          break;
        nextNumber *= 10;
        nextNumber += (code - char0);
        ++index;
      }
      if (index === length) {
        this._json = this._json.slice(startIndex);
        return true;
      }
      this._array[this._arrayIndex++] = nextNumber;
    }
  }

  _parseStringsArray() {
    this._progress.updateStatus('Parsing strings\u2026');
    const closingBracketIndex = this._json.lastIndexOf(']');
    if (closingBracketIndex === -1 || this._state !== 'accumulate-strings')
      throw new Error('Incomplete JSON');
    this._json = this._json.slice(0, closingBracketIndex + 1);
    this._snapshot.strings = JSON.parse(this._json);
  }

  /**
   * @param {string} chunk
   */
  write(chunk) {
    if (this._json !== null)
      this._json += chunk;
    while (true) {
      switch (this._state) {
        case 'find-snapshot-info': {
          const snapshotToken = '"snapshot"';
          const snapshotTokenIndex = this._json.indexOf(snapshotToken);
          if (snapshotTokenIndex === -1)
            throw new Error('Snapshot token not found');

          const json = this._json.slice(snapshotTokenIndex + snapshotToken.length + 1);
          this._state = 'parse-snapshot-info';
          this._progress.updateStatus('Loading snapshot info\u2026');
          this._json = null;  // tokenizer takes over input.
          this._jsonTokenizer = new TextUtils.TextUtils.BalancedJSONTokenizer(this._writeBalancedJSON.bind(this));
          // Fall through with adjusted payload.
          chunk = json;
        }
        case 'parse-snapshot-info': {
          this._jsonTokenizer.write(chunk);
          if (this._jsonTokenizer)
            return;  // no remainder to process.
          break;
        }
        case 'find-nodes': {
          const nodesToken = '"nodes"';
          const nodesTokenIndex = this._json.indexOf(nodesToken);
          if (nodesTokenIndex === -1)
            return;
          const bracketIndex = this._json.indexOf('[', nodesTokenIndex);
          if (bracketIndex === -1)
            return;
          this._json = this._json.slice(bracketIndex + 1);
          const node_fields_count = this._snapshot.snapshot.meta.node_fields.length;
          const nodes_length = this._snapshot.snapshot.node_count * node_fields_count;
          this._array = new Uint32Array(nodes_length);
          this._arrayIndex = 0;
          this._state = 'parse-nodes';
          break;
        }
        case 'parse-nodes': {
          const hasMoreData = this._parseUintArray();
          this._progress.updateProgress('Loading nodes\u2026 %d%%', this._arrayIndex, this._array.length);
          if (hasMoreData)
            return;
          this._snapshot.nodes = this._array;
          this._state = 'find-edges';
          this._array = null;
          break;
        }
        case 'find-edges': {
          const edgesToken = '"edges"';
          const edgesTokenIndex = this._json.indexOf(edgesToken);
          if (edgesTokenIndex === -1)
            return;
          const bracketIndex = this._json.indexOf('[', edgesTokenIndex);
          if (bracketIndex === -1)
            return;
          this._json = this._json.slice(bracketIndex + 1);
          const edge_fields_count = this._snapshot.snapshot.meta.edge_fields.length;
          const edges_length = this._snapshot.snapshot.edge_count * edge_fields_count;
          this._array = new Uint32Array(edges_length);
          this._arrayIndex = 0;
          this._state = 'parse-edges';
          break;
        }
        case 'parse-edges': {
          const hasMoreData = this._parseUintArray();
          this._progress.updateProgress('Loading edges\u2026 %d%%', this._arrayIndex, this._array.length);
          if (hasMoreData)
            return;
          this._snapshot.edges = this._array;
          this._array = null;
          // If there is allocation info parse it, otherwise jump straight to strings.
          if (this._snapshot.snapshot.trace_function_count) {
            this._state = 'find-trace-function-infos';
            this._progress.updateStatus('Loading allocation traces\u2026');
          } else if (this._snapshot.snapshot.meta.sample_fields) {
            this._state = 'find-samples';
            this._progress.updateStatus('Loading samples\u2026');
          } else {
            this._state = 'find-locations';
          }
          break;
        }
        case 'find-trace-function-infos': {
          const tracesToken = '"trace_function_infos"';
          const tracesTokenIndex = this._json.indexOf(tracesToken);
          if (tracesTokenIndex === -1)
            return;
          const bracketIndex = this._json.indexOf('[', tracesTokenIndex);
          if (bracketIndex === -1)
            return;
          this._json = this._json.slice(bracketIndex + 1);

          const trace_function_info_field_count = this._snapshot.snapshot.meta.trace_function_info_fields.length;
          const trace_function_info_length =
              this._snapshot.snapshot.trace_function_count * trace_function_info_field_count;
          this._array = new Uint32Array(trace_function_info_length);
          this._arrayIndex = 0;
          this._state = 'parse-trace-function-infos';
          break;
        }
        case 'parse-trace-function-infos': {
          if (this._parseUintArray())
            return;
          this._snapshot.trace_function_infos = this._array;
          this._array = null;
          this._state = 'find-trace-tree';
          break;
        }
        case 'find-trace-tree': {
          const tracesToken = '"trace_tree"';
          const tracesTokenIndex = this._json.indexOf(tracesToken);
          if (tracesTokenIndex === -1)
            return;
          const bracketIndex = this._json.indexOf('[', tracesTokenIndex);
          if (bracketIndex === -1)
            return;
          this._json = this._json.slice(bracketIndex);
          this._state = 'parse-trace-tree';
          break;
        }
        case 'parse-trace-tree': {
          // If there is samples array parse it, otherwise jump straight to strings.
          const nextToken = this._snapshot.snapshot.meta.sample_fields ? '"samples"' : '"strings"';
          const nextTokenIndex = this._json.indexOf(nextToken);
          if (nextTokenIndex === -1)
            return;
          const bracketIndex = this._json.lastIndexOf(']', nextTokenIndex);
          this._snapshot.trace_tree = JSON.parse(this._json.substring(0, bracketIndex + 1));
          this._json = this._json.slice(bracketIndex + 1);
          if (this._snapshot.snapshot.meta.sample_fields) {
            this._state = 'find-samples';
            this._progress.updateStatus('Loading samples\u2026');
          } else {
            this._state = 'find-strings';
            this._progress.updateStatus('Loading strings\u2026');
          }
          break;
        }
        case 'find-samples': {
          const samplesToken = '"samples"';
          const samplesTokenIndex = this._json.indexOf(samplesToken);
          if (samplesTokenIndex === -1)
            return;
          const bracketIndex = this._json.indexOf('[', samplesTokenIndex);
          if (bracketIndex === -1)
            return;
          this._json = this._json.slice(bracketIndex + 1);
          this._array = [];
          this._arrayIndex = 0;
          this._state = 'parse-samples';
          break;
        }
        case 'parse-samples': {
          if (this._parseUintArray())
            return;
          this._snapshot.samples = this._array;
          this._array = null;
          this._state = 'find-locations';
          this._progress.updateStatus('Loading locations\u2026');
          break;
        }
        case 'find-locations': {
          if (!this._snapshot.snapshot.meta.location_fields) {
            // The property `locations` was added retroactively, so older
            // snapshots might not contain it. In this case just expect `strings`
            // as next property.
            this._snapshot.locations = [];
            this._array = null;
            this._state = 'find-strings';
            break;
          }

          const locationsToken = '"locations"';
          const locationsTokenIndex = this._json.indexOf(locationsToken);
          if (locationsTokenIndex === -1)
            return;
          const bracketIndex = this._json.indexOf('[', locationsTokenIndex);
          if (bracketIndex === -1)
            return;
          this._json = this._json.slice(bracketIndex + 1);
          this._array = [];
          this._arrayIndex = 0;
          this._state = 'parse-locations';
          break;
        }
        case 'parse-locations': {
          if (this._parseUintArray())
            return;
          this._snapshot.locations = this._array;
          this._array = null;
          this._state = 'find-strings';
          this._progress.updateStatus('Loading strings\u2026');
          break;
        }
        case 'find-strings': {
          const stringsToken = '"strings"';
          const stringsTokenIndex = this._json.indexOf(stringsToken);
          if (stringsTokenIndex === -1)
            return;
          const bracketIndex = this._json.indexOf('[', stringsTokenIndex);
          if (bracketIndex === -1)
            return;
          this._json = this._json.slice(bracketIndex);
          this._state = 'accumulate-strings';
          break;
        }
        case 'accumulate-strings':
          return;
      }
    }
  }

  /**
   * @param {string} data
   */
  _writeBalancedJSON(data) {
    this._json = this._jsonTokenizer.remainder();  // tokenizer releases input.
    this._jsonTokenizer = null;
    this._state = 'find-nodes';
    this._snapshot.snapshot = /** @type {!HeapSnapshotHeader} */ (JSON.parse(data));
  }
};
