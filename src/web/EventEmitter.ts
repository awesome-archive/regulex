import {Subtract} from 'utility-types';

export class SyntheticEvent {
  public readonly defaultPrevented: boolean = false;
  constructor(public readonly type: string) {}
  preventDefault() {
    (this as any).defaultPrevented = true;
  }

  static create<T>(type: string): SyntheticEvent;
  static create<T>(type: string, data: T): SyntheticEvent & T;
  static create<T>(type: string, data?: T): SyntheticEvent {
    let e = new SyntheticEvent(type);
    return data ? Object.assign(e, data) : e;
  }
}

export type SingleEventMap = {[k: string]: SyntheticEvent};
export type Events = string | SingleEventMap;

type UKeyOf<T> = T extends any ? Extract<keyof T, string> : never;

export type EventsMap<E extends Events> = {[K1 in Extract<E, string>]: SyntheticEvent} &
  {
    [K2 in UKeyOf<Extract<E, SingleEventMap>>]: E extends {[_ in K2]: SyntheticEvent} ? E[K2] : never;
  };

export type EventTypes<E extends Events> = keyof EventsMap<E>;

export type EventOfType<E extends Events, T extends EventTypes<E>> = EventsMap<E>[T];

export class EventEmitter<E extends Events> {
  private _eventListenerPool: {
    [K in EventTypes<E>]: Set<(e: EventOfType<E, K>) => void>;
  } = Object.create(null);

  on<T extends EventTypes<E>>(eventType: T, listener: (e: EventOfType<E, T>) => void): this;
  on<T extends EventTypes<E>>(eventType: T, listener: (e: any) => void): this {
    let pool = this._eventListenerPool;
    let fnSet = pool[eventType];
    if (!fnSet) {
      fnSet = new Set();
      pool[eventType] = fnSet;
    }
    fnSet.add(listener);
    return this;
  }

  un<T extends EventTypes<E>>(eventType: T, listener: (e: EventOfType<E, T>) => void): this;
  un<T extends EventTypes<E>>(eventType: T, listener: (e: any) => void): this {
    let pool = this._eventListenerPool;
    let fnSet = pool[eventType];
    if (fnSet) {
      fnSet.delete(listener);
    }
    return this;
  }

  emit<T extends UKeyOf<Extract<E, SingleEventMap>>>(
    eventType: T,
    data: Subtract<EventOfType<E, T>, SyntheticEvent>
  ): boolean;
  emit<T extends Extract<E, string>>(eventType: T): boolean;
  emit<T extends EventTypes<E>>(eventType: T, data?: any): boolean {
    let pool = this._eventListenerPool;
    let fnSet = pool[eventType];
    if (!fnSet) {
      return true;
    }
    let event = SyntheticEvent.create(eventType, data);
    for (let f of fnSet) {
      f(event);
    }

    return !event.defaultPrevented;
  }

  clear<T extends EventTypes<E>>(eventType: T): this {
    delete this._eventListenerPool[eventType];
    return this;
  }
}
