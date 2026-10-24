// Display-balanced lamp colours: retain the reference's cream default while
// making both ends of the temperature control visibly distinct on the paper.
export function lampTemperature(warmth: number) {
  return Math.round(7500 - 5000 * Math.max(0, Math.min(100, warmth)) / 100);
}
export function lampTint(warmth: number): [number, number, number] {
  const kelvin = lampTemperature(warmth);
  const cold = [191, 217, 255], neutral = [238, 230, 212], warm = [255, 174, 101];
  const a = kelvin >= 4200 ? neutral : warm, b = kelvin >= 4200 ? cold : neutral;
  const t = kelvin >= 4200 ? (kelvin - 4200) / 3300 : (kelvin - 2500) / 1700;
  return a.map((v, i) => Math.round(v + (b[i] - v) * t)) as [number, number, number];
}
// Opal softens the emitter without washing away its temperature. A mostly
// white mixture made the cold end indistinguishable from a fixed white strip.
export function lampLensTint(warmth:number): [number,number,number] {
  return lampTint(warmth).map((v,i)=>Math.round(v*.85+[255,249,239][i]*.15)) as [number,number,number];
}
// Logical dimensions on the 430px sheet. The lens forms the shell's top
// edge; thickness grows down into the shell while its top and light origin
// stay fixed. The paper field and CSS fallback use this same finite source.
export const lampAperture = { length: 20, thickness: 1.56, shellTop: 21.5, origin: -10.5 };

