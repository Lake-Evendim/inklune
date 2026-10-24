export const lampTiming = { scene: 600, darkPause: 180, ignition: 140, lens: 24, offPause: 60 };
export type LampFrame = { sceneNight: boolean; amount: number; projection: number; phase: 'off' | 'waiting' | 'projecting' | 'on' };
const smooth = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };

// One clock owns the scene and aperture so day cannot appear before lamp-off.
export function createLampIgnition(initialNight = false) {
  let target: boolean | null = null, visible = false, scene = initialNight, reduced = false;
  let starts = Infinity, duration = 0, fromAmount = 0, fromProjection = 0;
  const sample = (now: number): LampFrame => {
    if (target === null) return {sceneNight: scene, amount:0, projection:0, phase:'off'};
    if (!target || !visible) {
      return { sceneNight: target === true || (scene && now < starts + lampTiming.offPause),
        amount: 0, projection: 0, phase: 'off' };
    }
    if (now < starts) return { sceneNight: true, amount: fromAmount, projection: fromProjection, phase: 'waiting' };
    const elapsed = now - starts, progress = duration ? Math.min(1, elapsed / duration) : 1;
    const energy = reduced ? 1 : 1 - Math.pow(1 - Math.min(1, elapsed / lampTiming.lens), 3);
    return { sceneNight: true, amount: fromAmount + (1 - fromAmount) * energy,
      projection: fromProjection + (1 - fromProjection) * smooth(progress), phase: progress < 1 ? 'projecting' : 'on' };
  };
  return {
    request(nextNight: boolean, nextVisible: boolean, now: number, reduce = false) {
      if (target === nextNight && visible === nextVisible && reduced === reduce) return;
      const current = sample(now);
      target = nextNight; visible = nextVisible; reduced = reduce; scene = current.sceneNight;
      fromAmount = current.amount; fromProjection = current.projection;
      if (target && visible) {
        starts = now + (scene || reduced ? 0 : lampTiming.scene) + (fromProjection > 0 ? 0 : lampTiming.darkPause);
        duration = reduced ? 0 : lampTiming.ignition * (1 - fromProjection); scene = true;
      } else if (target) {
        scene = true; fromAmount = fromProjection = 0; starts = Infinity; duration = 0;
      } else {
        starts = now; duration = 0; fromAmount = fromProjection = 0;
        if (!visible) scene = false;
      }
    }, sample,
  };
}
