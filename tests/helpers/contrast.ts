export function contrastRatio(foreground:readonly [number,number,number],background:readonly [number,number,number]):number {
 for(const sample of [foreground,background])if(sample.length!==3||sample.some(channel=>!Number.isFinite(channel)||channel<0||channel>255))throw new Error('Expected three opaque sRGB channels in 0..255')
 const luminance=(sample:readonly number[])=>{
  const linear=sample.map(value=>{const c=value/255;return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4})
  return linear[0]*0.2126+linear[1]*0.7152+linear[2]*0.0722
 }
 const a=luminance(foreground),b=luminance(background)
 return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)
}
