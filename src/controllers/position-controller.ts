import type { ReactiveController, ReactiveControllerHost } from 'lit';

export class PositionController implements ReactiveController {
  readonly host: ReactiveControllerHost;

  constructor(host: ReactiveControllerHost) {
    (this.host = host).addController(this);
  }

  hostConnected(): void {}

  update(source: HTMLElement, target: HTMLElement): void {
    const { clientHeight } = document.documentElement;
    const { y, height } = source.getBoundingClientRect();
    const currentPosition = y + height / 2;
    const locatedAtBottom = clientHeight / 2 < currentPosition;
    if (locatedAtBottom !== target.hasAttribute('data-top')) {
      target.toggleAttribute('data-top');
    }
  }
}
