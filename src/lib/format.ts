import { SPEED } from "../store/sim";

/** Demo milliseconds → real-life minutes (the demo runs SPEED× faster) */
export const realMinutes = (ms: number) => Math.max(0, Math.round((ms * SPEED) / 60000));

export const etaLabel = (etaAt: number, now: number) => {
  const m = realMinutes(etaAt - now);
  return m <= 1 ? "any moment" : `${m} min`;
};
