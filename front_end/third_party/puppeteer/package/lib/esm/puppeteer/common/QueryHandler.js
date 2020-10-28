/**
 * Copyright 2020 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const _customQueryHandlers = new Map();
export function registerCustomQueryHandler(name, handler) {
    if (_customQueryHandlers.get(name))
        throw new Error(`A custom query handler named "${name}" already exists`);
    const isValidName = /^[a-zA-Z]+$/.test(name);
    if (!isValidName)
        throw new Error(`Custom query handler names may only contain [a-zA-Z]`);
    _customQueryHandlers.set(name, handler);
}
/**
 * @param {string} name
 */
export function unregisterCustomQueryHandler(name) {
    _customQueryHandlers.delete(name);
}
export function customQueryHandlers() {
    return _customQueryHandlers;
}
export function clearQueryHandlers() {
    _customQueryHandlers.clear();
}
export function getQueryHandlerAndSelector(selector) {
    const defaultHandler = {
        queryOne: (element, selector) => element.querySelector(selector),
        queryAll: (element, selector) => element.querySelectorAll(selector),
    };
    const hasCustomQueryHandler = /^[a-zA-Z]+\//.test(selector);
    if (!hasCustomQueryHandler)
        return { updatedSelector: selector, queryHandler: defaultHandler };
    const index = selector.indexOf('/');
    const name = selector.slice(0, index);
    const updatedSelector = selector.slice(index + 1);
    const queryHandler = customQueryHandlers().get(name);
    if (!queryHandler)
        throw new Error(`Query set to use "${name}", but no query handler of that name was found`);
    return {
        updatedSelector,
        queryHandler,
    };
}
