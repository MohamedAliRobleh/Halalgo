import { describe, it, expect, vi } from 'vitest';
import { selectNearestDrivers } from '../dispatch/dispatcher.js';

vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { clerkUserId: 'driver_1', latitude: '45.4220', longitude: '-75.6950', isAvailable: true },
          { clerkUserId: 'driver_2', latitude: '45.4300', longitude: '-75.6900', isAvailable: true },
          { clerkUserId: 'driver_3', latitude: '45.4400', longitude: '-75.6800', isAvailable: true },
        ]),
      }),
    }),
  },
  driverProfiles: {},
}));

describe('selectNearestDrivers', () => {
  it('returns drivers sorted by distance ascending', async () => {
    const drivers = await selectNearestDrivers(45.4215, -75.6972, 5);
    expect(drivers.length).toBeGreaterThan(0);
    // First driver should be closest (smallest distanceM)
    if (drivers.length > 1) {
      expect(drivers[0]!.distanceM).toBeLessThanOrEqual(drivers[1]!.distanceM);
    }
  });

  it('returns max 10 drivers', async () => {
    const drivers = await selectNearestDrivers(45.4215, -75.6972, 5);
    expect(drivers.length).toBeLessThanOrEqual(10);
  });

  it('returns empty array when no drivers nearby', async () => {
    const { db } = await import('../db/index.js');
    (db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });
    const drivers = await selectNearestDrivers(45.4215, -75.6972, 5);
    expect(drivers).toEqual([]);
  });
});
