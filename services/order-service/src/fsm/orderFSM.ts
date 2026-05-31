import { ORDER_TRANSITIONS } from '@halalgo/types';
import type { OrderStatus } from '@halalgo/types';

export class InvalidTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Cannot transition from ${from} to ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

export class OrderFSM {
  private current: OrderStatus;

  constructor(initialStatus: OrderStatus) {
    this.current = initialStatus;
  }

  get status(): OrderStatus {
    return this.current;
  }

  canTransition(to: OrderStatus): boolean {
    return ORDER_TRANSITIONS[this.current]?.includes(to) ?? false;
  }

  transition(to: OrderStatus): OrderStatus {
    if (!this.canTransition(to)) {
      throw new InvalidTransitionError(this.current, to);
    }
    this.current = to;
    return this.current;
  }
}
