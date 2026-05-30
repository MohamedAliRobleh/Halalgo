export interface ETAComponents {
  prepTimeMin: number;
  driveTimeMin: number;
  bufferMin?: number;
}

export function calculateETA(components: ETAComponents): Date {
  const buffer = components.bufferMin ?? 5;
  const totalMin = components.prepTimeMin + components.driveTimeMin + buffer;
  const eta = new Date();
  eta.setMinutes(eta.getMinutes() + totalMin);
  return eta;
}

export function minutesUntil(target: Date): number {
  return Math.max(0, Math.round((target.getTime() - Date.now()) / 60_000));
}
