// Keep the original 50 K per unit so saved temperatures retain their colour.
export const lampWarmthRange={min:-90,max:120};
export function lampTemperature(warmth: number) {
  const value=Number.isFinite(warmth)?warmth:100;
  return Math.round(7500 - 50 * Math.max(lampWarmthRange.min, Math.min(lampWarmthRange.max, value)));
}
// Display-balanced colour stops extend both ends while retaining the original
// warm, neutral and cold colours throughout the previous temperature range.
const temperatureColours:[number,[number,number,number]][]=[
  [1500,[255,113,35]], [2500,[255,174,101]], [4200,[238,230,212]],
  [7500,[191,217,255]], [12000,[160,196,255]],
];
export function lampTint(warmth: number): [number, number, number] {
  const kelvin = lampTemperature(warmth);
  for(let i=1;i<temperatureColours.length;i++){
    const [high,b]=temperatureColours[i];
    if(kelvin>high)continue;
    const [low,a]=temperatureColours[i-1],t=(kelvin-low)/(high-low);
    return a.map((v,c)=>Math.round(v+(b[c]-v)*t)) as [number,number,number];
  }
  return [...temperatureColours[temperatureColours.length-1][1]];
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

