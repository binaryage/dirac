// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../host/host.js';

import {WebVitalsEventLane, WebVitalsTimeboxLane} from './WebVitalsLane.js';

declare global {
  interface HTMLElementTagNameMap {
    'devtools-timeline-webvitals': WebVitalsTimeline;
  }
}

export interface Event {
  timestamp: number
}

export interface Timebox {
  start: number;
  duration: number;
}

export interface WebVitalsFCPEvent {
  timestamp: number;
}

export interface WebVitalsLCPEvent {
  timestamp: number;
}

export interface WebVitalsLayoutShiftEvent {
  timestamp: number;
}

interface WebVitalsTimelineTask {
  start: number;
  duration: number;
}

interface WebVitalsTimelineData {
  startTime: number;
  duration: number;
  fcps: WebVitalsFCPEvent[];
  lcps: WebVitalsLCPEvent[];
  layoutShifts: WebVitalsLayoutShiftEvent[];
  longTasks: WebVitalsTimelineTask[];
  mainFrameNavigations: number[];
  maxDuration: number;
}

export interface Marker {
  type: MarkerType;
  timestamp: number;
  timestampLabel: string;
  timestampMetrics: TextMetrics
  widthIncludingLabel: number
  widthIncludingTimestamp: number
}

export const enum MarkerType {
  Good = 'Good',
  Medium = 'Medium',
  Bad = 'Bad'
}

export const LINE_HEIGHT = 24;
const NUMBER_OF_LANES = 5;
const FCP_GOOD_TIMING = 2000;
const FCP_MEDIUM_TIMING = 4000;
const LCP_GOOD_TIMING = 2500;
const LCP_MEDIUM_TIMING = 4000;

export const enum Colors {
  Good = '#0cce6b',
  Medium = '#ffa400',
  Bad = '#ff4e42',
}

type Constructor<T> = {
  new (...args: unknown[]): T
};

//  eslint-disable-next-line
export function assertInstanceOf<T>(instance: any, constructor: Constructor<T>): asserts instance is T {
  if (!(instance instanceof constructor)) {
    throw new TypeError(`Instance expected to be of type ${constructor.name} but got ${instance.constructor.name}`);
  }
}

export class WebVitalsTimeline extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private mainFrameNavigations: ReadonlyArray<number> = [];
  private startTime = 0;
  private duration = 1000;
  private maxDuration = 1000;
  private width = 0;
  private height = 0;
  private canvas: HTMLCanvasElement;
  private hoverLane: number|null = null;

  private fcpLane: WebVitalsEventLane;
  private lcpLane: WebVitalsEventLane;
  private layoutShiftsLane: WebVitalsEventLane;
  private longTasksLane: WebVitalsTimeboxLane;

  private context: CanvasRenderingContext2D;
  private animationFrame: number|null = null;

  constructor() {
    super();


    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = LINE_HEIGHT * NUMBER_OF_LANES + 'px';
    this.shadow.appendChild(this.canvas);
    this.canvas.addEventListener('pointermove', this.handlePointerMove.bind(this));
    this.canvas.addEventListener('pointerout', this.handlePointerOut.bind(this));
    this.canvas.addEventListener('click', this.handleClick.bind(this));

    const context = this.canvas.getContext('2d');

    assertInstanceOf(context, CanvasRenderingContext2D);

    this.context = context;

    this.fcpLane = new WebVitalsEventLane(this, 'FCP', e => this.getMarkerTypeForFCPEvent(e));
    this.lcpLane = new WebVitalsEventLane(this, 'LCP', e => this.getMarkerTypeForLCPEvent(e));
    this.layoutShiftsLane = new WebVitalsEventLane(this, 'LS', _ => MarkerType.Bad);
    this.longTasksLane = new WebVitalsTimeboxLane(this, 'Long Tasks');
  }

  set data(data: WebVitalsTimelineData) {
    this.startTime = data.startTime || this.startTime;
    this.duration = data.duration || this.duration;
    this.maxDuration = data.maxDuration || this.maxDuration;
    this.mainFrameNavigations = data.mainFrameNavigations || this.mainFrameNavigations;

    if (data.fcps) {
      this.fcpLane.setEvents(data.fcps);
    }

    if (data.lcps) {
      this.lcpLane.setEvents(data.lcps);
    }

    if (data.layoutShifts) {
      this.layoutShiftsLane.setEvents(data.layoutShifts);
    }

    if (data.longTasks) {
      this.longTasksLane.setTimeboxes(data.longTasks);
    }

    this.scheduleRender();
  }

  getContext(): CanvasRenderingContext2D {
    return this.context;
  }

  getLineHeight(): number {
    return LINE_HEIGHT;
  }

  private handlePointerMove(e: MouseEvent) {
    const x = e.offsetX, y = e.offsetY;
    const lane = Math.floor(y / LINE_HEIGHT);

    this.hoverLane = lane;
    this.fcpLane.handlePointerMove(this.hoverLane === 1 ? x : null);
    this.lcpLane.handlePointerMove(this.hoverLane === 2 ? x : null);
    this.layoutShiftsLane.handlePointerMove(this.hoverLane === 3 ? x : null);
    this.longTasksLane.handlePointerMove(this.hoverLane === 4 ? x : null);

    this.scheduleRender();
  }

  private handlePointerOut(_: MouseEvent) {
    this.fcpLane.handlePointerMove(null);
    this.lcpLane.handlePointerMove(null);
    this.layoutShiftsLane.handlePointerMove(null);
    this.longTasksLane.handlePointerMove(null);

    this.scheduleRender();
  }

  private handleClick(e: MouseEvent) {
    const x = e.offsetX;

    this.focus();
    this.fcpLane.handleClick(this.hoverLane === 1 ? x : null);
    this.lcpLane.handleClick(this.hoverLane === 2 ? x : null);
    this.layoutShiftsLane.handleClick(this.hoverLane === 3 ? x : null);
    this.longTasksLane.handleClick(this.hoverLane === 4 ? x : null);

    this.scheduleRender();
  }

  /**
   * Transform from time to pixel offset
   * @param x
   */
  tX(x: number): number {
    return (x - this.startTime) / this.duration * this.width;
  }

  /**
   * Transform from duration to pixels
   * @param duration
   */
  tD(duration: number): number {
    return duration / this.duration * this.width;
  }

  setSize(width: number, height: number): void {
    const scale = window.devicePixelRatio;

    this.width = width;
    this.height = height;
    this.canvas.width = Math.floor(this.width * scale);
    this.canvas.height = Math.floor(this.height * scale);
    this.context.scale(scale, scale);

    this.style.width = this.width + 'px';
    this.style.height = this.height + 'px';
    this.render();
  }

  connectedCallback() {
    this.style.display = 'block';
    this.tabIndex = 0;

    const boundingClientRect = this.canvas.getBoundingClientRect();
    const width = boundingClientRect.width;
    const height = boundingClientRect.height;

    this.setSize(width, height);
    this.render();
  }

  private getMarkerTypeForFCPEvent(event: WebVitalsFCPEvent) {
    const t = this.getTimeSinceLastMainFrameNavigation(event.timestamp);
    if (t <= FCP_GOOD_TIMING) {
      return MarkerType.Good;
    }
    if (t <= FCP_MEDIUM_TIMING) {
      return MarkerType.Medium;
    }
    return MarkerType.Bad;
  }

  private getMarkerTypeForLCPEvent(event: WebVitalsLCPEvent) {
    const t = this.getTimeSinceLastMainFrameNavigation(event.timestamp);
    if (t <= LCP_GOOD_TIMING) {
      return MarkerType.Good;
    }
    if (t <= LCP_MEDIUM_TIMING) {
      return MarkerType.Medium;
    }
    return MarkerType.Bad;
  }

  private renderMainFrameNavigations(markers: ReadonlyArray<number>) {
    this.context.save();
    this.context.strokeStyle = 'blue';
    this.context.beginPath();
    for (const marker of markers) {
      this.context.moveTo(this.tX(marker), 0);
      this.context.lineTo(this.tX(marker), this.height);
    }
    this.context.stroke();
    this.context.restore();
  }

  getTimeSinceLastMainFrameNavigation(time: number): number {
    let i = 0, prev = 0;
    while (i < this.mainFrameNavigations.length && this.mainFrameNavigations[i] <= time) {
      prev = this.mainFrameNavigations[i];
      i++;
    }
    return time - prev;
  }

  render(): void {
    this.context.save();
    this.context.clearRect(0, 0, this.width, this.height);

    this.context.strokeStyle = '#dadce0';

    // Render the grid in the background.
    this.context.beginPath();
    for (let i = 0; i < NUMBER_OF_LANES; i++) {
      this.context.moveTo(0, (i * LINE_HEIGHT) + 0.5);
      this.context.lineTo(this.width, (i * LINE_HEIGHT) + 0.5);
    }
    this.context.moveTo(0, NUMBER_OF_LANES * LINE_HEIGHT - 0.5);
    this.context.lineTo(this.width, NUMBER_OF_LANES * LINE_HEIGHT - 0.5);
    this.context.stroke();
    this.context.restore();

    // Render the WebVitals label.
    this.context.save();
    this.context.font = '11px ' + Host.Platform.fontFamily();
    const text = this.context.measureText('WebVitals');
    const height = text.actualBoundingBoxAscent - text.actualBoundingBoxDescent;
    this.context.fillStyle = '#202124';
    this.context.fillText('WebVitals', 6, 4 + height);
    this.context.restore();

    // Render all the lanes.
    this.context.save();
    this.context.translate(0, LINE_HEIGHT * 1);
    this.fcpLane.render();
    this.context.translate(0, LINE_HEIGHT * 1);
    this.lcpLane.render();
    this.context.translate(0, LINE_HEIGHT * 1);
    this.layoutShiftsLane.render();
    this.context.translate(0, LINE_HEIGHT * 1);
    this.longTasksLane.render();
    this.context.restore();

    this.renderMainFrameNavigations(this.mainFrameNavigations);
  }

  private scheduleRender() {
    if (this.animationFrame) {
      return;
    }

    this.animationFrame = window.requestAnimationFrame(() => {
      this.animationFrame = null;
      this.render();
    });
  }
}

customElements.define('devtools-timeline-webvitals', WebVitalsTimeline);
