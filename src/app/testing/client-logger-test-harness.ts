// Keep real logger hooks observable while preventing timers and console patches from leaking.
export class ClientLoggerTestHarness {
  private readonly originalWarn = console.warn;
  private readonly originalError = console.error;
  private readonly sessionId = localStorage.getItem('client_session_id');
  private readonly intervals = new Map<number, () => void>();
  private nextIntervalId = 1;
  readonly warn = spyOn(console, 'warn').and.stub();
  readonly error = spyOn(console, 'error').and.stub();
  private readonly windowAdd = spyOn(window, 'addEventListener').and.callThrough();
  private readonly windowRemove = spyOn(window, 'removeEventListener').and.callThrough();
  private readonly documentAdd = spyOn(document, 'addEventListener').and.callThrough();
  private readonly documentRemove = spyOn(document, 'removeEventListener').and.callThrough();

  constructor() {
    spyOn(window, 'setInterval').and.callFake((handler: TimerHandler) => {
      if (typeof handler !== 'function') throw new Error('Expected a timer callback');
      const id = this.nextIntervalId++;
      this.intervals.set(id, () => handler());
      return id;
    });
    spyOn(window, 'clearInterval').and.callFake((id?: number) => {
      if (id !== undefined) this.intervals.delete(id);
    });
  }

  // Run one scheduled flush cycle explicitly; no wall-clock waiting or private service calls.
  flushInterval(): void {
    for (const callback of [...this.intervals.values()]) callback();
  }

  activeListeners(type: 'error' | 'unhandledrejection' | 'visibilitychange'): number {
    const adds = type === 'visibilitychange' ? this.documentAdd : this.windowAdd;
    const removes = type === 'visibilitychange' ? this.documentRemove : this.windowRemove;
    return adds.calls.allArgs().filter(([event, listener]) => event === type
      && !removes.calls.allArgs().some(([removedEvent, removedListener]) =>
        removedEvent === event && removedListener === listener)).length;
  }

  deliverWindowEvent(event: Event): void {
    for (const [type, listener] of this.windowAdd.calls.allArgs()) {
      if (type !== event.type) continue;
      if (typeof listener === 'function') listener.call(window, event);
      else listener.handleEvent(event);
    }
  }

  restore(): void {
    for (const [type, listener, options] of this.windowAdd.calls.allArgs()) {
      window.removeEventListener(type, listener, options);
    }
    for (const [type, listener, options] of this.documentAdd.calls.allArgs()) {
      document.removeEventListener(type, listener, options);
    }
    this.intervals.clear();
    console.warn = this.originalWarn;
    console.error = this.originalError;
    if (this.sessionId === null) localStorage.removeItem('client_session_id');
    else localStorage.setItem('client_session_id', this.sessionId);
  }
}
