import type { Serializable } from '@/interfaces/serializable';
import type { ReactiveController, ReactiveControllerHost } from 'lit';

const getKey = (origin: HTMLElement) => {
  return origin.id ? `${origin.localName}#${origin.id}` : origin.localName;
};

export interface StorageContainer
  extends ReactiveControllerHost, HTMLElement, Serializable<any> {}

export class StorageController implements ReactiveController {
  #host: StorageContainer;

  #timers: Record<string, ReturnType<typeof setTimeout>> = {};

  constructor(host: StorageContainer) {
    (this.#host = host).addController(this);
  }

  hostConnected() {
    this.#host.addEventListener('request-save', this.#handleSave as EventListener);
  }

  hostDisconnected() {
    this.#host.removeEventListener('request-save', this.#handleSave as EventListener);
    Object.values(this.#timers).forEach(clearTimeout);
    this.#timers = {};
  }

  #handleSave = (e: RequestSaveEvent) => {
    e.stopPropagation();

    const { immediate } = e.detail;

    if (immediate) this.save();
    else this.requestSave();
  };

  #clearTimer(): string {
    const key = getKey(this.#host);
    if (this.#timers[key]) {
      clearTimeout(this.#timers[key]);
      delete this.#timers[key];
    }
    return key;
  }

  requestSave(): void {
    const key = this.#clearTimer();
    this.#timers[key] = setTimeout(() => this.save(), 200);
  }

  save(): void {
    const key = this.#clearTimer();
    const data = this.#host.serialize();

    if (data !== null) {
      try {
        const serializedData = JSON.stringify(data);
        localStorage.setItem(key, serializedData);
      } catch (error) {
        console.error('[StorageController] 保存に失敗しました:', error);
      }
    } else {
      localStorage.removeItem(key);
    }
  }

  load(): void {
    const key = getKey(this.#host);

    try {
      const data = localStorage.getItem(key);
      if (data) this.#host.unserialize(JSON.parse(data));
    } catch (error) {
      console.error('[StorageController] 復元に失敗しました:', error);
    }
  }
}

type RequestSaveDetail = {
  immediate?: boolean;
};

export class RequestSaveEvent extends CustomEvent<RequestSaveDetail> {
  constructor(detail: RequestSaveDetail) {
    super('request-save', { bubbles: true, composed: true, detail });
  }
}

export const requestSave = (origin: HTMLElement, immediate = false) => {
  origin.dispatchEvent(new RequestSaveEvent({ immediate }));
};
