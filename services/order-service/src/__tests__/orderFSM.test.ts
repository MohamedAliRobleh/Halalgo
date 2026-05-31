import { describe, it, expect } from 'vitest';
import { OrderFSM, InvalidTransitionError } from '../fsm/orderFSM.js';

describe('OrderFSM — valid transitions', () => {
  it('pending → confirmed', () => {
    const fsm = new OrderFSM('pending');
    expect(fsm.transition('confirmed')).toBe('confirmed');
  });

  it('pending → cancelled', () => {
    const fsm = new OrderFSM('pending');
    expect(fsm.transition('cancelled')).toBe('cancelled');
  });

  it('confirmed → preparing', () => {
    const fsm = new OrderFSM('confirmed');
    expect(fsm.transition('preparing')).toBe('preparing');
  });

  it('confirmed → cancelled', () => {
    const fsm = new OrderFSM('confirmed');
    expect(fsm.transition('cancelled')).toBe('cancelled');
  });

  it('preparing → ready', () => {
    const fsm = new OrderFSM('preparing');
    expect(fsm.transition('ready')).toBe('ready');
  });

  it('ready → picked_up', () => {
    const fsm = new OrderFSM('ready');
    expect(fsm.transition('picked_up')).toBe('picked_up');
  });

  it('picked_up → delivered', () => {
    const fsm = new OrderFSM('picked_up');
    expect(fsm.transition('delivered')).toBe('delivered');
  });
});

describe('OrderFSM — invalid transitions', () => {
  it('throws on delivered → preparing', () => {
    const fsm = new OrderFSM('delivered');
    expect(() => fsm.transition('preparing')).toThrow(InvalidTransitionError);
  });

  it('throws on cancelled → confirmed', () => {
    const fsm = new OrderFSM('cancelled');
    expect(() => fsm.transition('confirmed')).toThrow(InvalidTransitionError);
  });

  it('throws on pending → delivered', () => {
    const fsm = new OrderFSM('pending');
    expect(() => fsm.transition('delivered')).toThrow(InvalidTransitionError);
  });

  it('throws on preparing → cancelled', () => {
    const fsm = new OrderFSM('preparing');
    expect(() => fsm.transition('cancelled')).toThrow(InvalidTransitionError);
  });

  it('error message includes current and target status', () => {
    const fsm = new OrderFSM('delivered');
    expect(() => fsm.transition('preparing')).toThrow(
      'Cannot transition from delivered to preparing',
    );
  });
});

describe('OrderFSM — canTransition', () => {
  it('returns true for valid transition', () => {
    const fsm = new OrderFSM('pending');
    expect(fsm.canTransition('confirmed')).toBe(true);
  });

  it('returns false for invalid transition', () => {
    const fsm = new OrderFSM('delivered');
    expect(fsm.canTransition('preparing')).toBe(false);
  });
});
