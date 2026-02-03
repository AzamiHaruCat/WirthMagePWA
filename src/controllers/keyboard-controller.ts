import type { ReactiveController, ReactiveControllerHost } from 'lit';

type Callback = (e: KeyboardEvent) => any;

export class KeyboardController implements ReactiveController {
  readonly host: ReactiveControllerHost & HTMLElement;

  onEnter?: Callback;
  onSpace?: Callback;
  onEscape?: Callback;
  onTab?: Callback;
  onArrowUp?: Callback;
  onArrowDown?: Callback;
  onArrowLeft?: Callback;
  onArrowRight?: Callback;

  constructor(host: ReactiveControllerHost & HTMLElement) {
    (this.host = host).addController(this);
  }

  hostConnected(): void {
    this.host.addEventListener('keydown', this.#handleKeyDown);
  }

  hostDisconnected(): void {
    this.host.removeEventListener('keydown', this.#handleKeyDown);
  }

  #handleKeyDown = (e: KeyboardEvent): void => {
    switch (e.key) {
      case 'Enter':
        this.onEnter?.(e);
        break;
      case ' ':
        this.onSpace?.(e);
        break;
      case 'Escape':
        this.onEscape?.(e);
        break;
      case 'Tab':
        this.onTab?.(e);
        break;
      case 'ArrowUp':
        this.onArrowUp?.(e);
        break;
      case 'ArrowDown':
        this.onArrowDown?.(e);
        break;
      case 'ArrowLeft':
        this.onArrowLeft?.(e);
        break;
      case 'ArrowRight':
        this.onArrowRight?.(e);
        break;
    }
  };
}
