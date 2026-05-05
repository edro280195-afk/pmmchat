import { Injectable, ElementRef, OnDestroy } from '@angular/core';
import { computePosition, autoUpdate, offset, flip, shift, Placement } from '@floating-ui/dom';

@Injectable({
  providedIn: 'root'
})
export class FloatingUiService implements OnDestroy {
  private cleanups = new Map<HTMLElement, () => void>();

  positionElement(
    reference: HTMLElement,
    floating: HTMLElement,
    options?: {
      placement?: Placement;
      offset?: number;
      strategy?: 'absolute' | 'fixed';
      flip?: boolean;
    }
  ): void {
    const placement = options?.placement ?? 'bottom-start';
    const offsetValue = options?.offset ?? 8;
    const strategy = options?.strategy ?? 'absolute';

    this.cleanup(floating);

    const cleanup = autoUpdate(reference, floating, () => {
      computePosition(reference, floating, {
        placement,
        strategy,
        middleware: [
          offset(offsetValue),
          flip(),
          shift({ padding: 8 })
        ],
      }).then(({ x, y }) => {
        floating.style.position = strategy;
        floating.style.left = `${x}px`;
        floating.style.top = `${y}px`;
      });
    });

    this.cleanups.set(floating, cleanup);
  }

  cleanup(floating: HTMLElement): void {
    const cleanup = this.cleanups.get(floating);
    if (cleanup) {
      cleanup();
      this.cleanups.delete(floating);
    }
  }

  ngOnDestroy(): void {
    this.cleanups.forEach(cleanup => cleanup());
    this.cleanups.clear();
  }
}
