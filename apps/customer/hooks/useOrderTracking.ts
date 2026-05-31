import { useState, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import type { OrderStatus } from '@halalgo/types';

interface DriverLocation {
  latitude: number;
  longitude: number;
  updatedAt: string;
}

interface OrderTrackingState {
  status:         OrderStatus;
  driverLocation: DriverLocation | null;
  eta:            string | null;
}

export function useOrderTracking(
  orderId: string,
  driverId: string | null,
  initialStatus: OrderStatus,
): OrderTrackingState {
  const [state, setState] = useState<OrderTrackingState>({
    status:         initialStatus,
    driverLocation: null,
    eta:            null,
  });

  useWebSocket(`order:${orderId}`, useCallback((data) => {
    const msg = data as { type?: string; status?: OrderStatus; eta?: string };
    if (msg.status) setState((s) => ({ ...s, status: msg.status! }));
    if (msg.eta)    setState((s) => ({ ...s, eta: msg.eta! }));
  }, [orderId]));

  useWebSocket(driverId ? `driver:${driverId}` : '', useCallback((data) => {
    if (!driverId) return;
    const loc = data as { latitude: number; longitude: number; updatedAt: string };
    if (loc.latitude) setState((s) => ({ ...s, driverLocation: loc }));
  }, [driverId]));

  return state;
}
