import type { Page } from '@playwright/test'
export async function enlargeFixtureText(page:Page,factor:number):Promise<{selector:string;before:number;after:number}[]> {
 if(!Number.isFinite(factor)||factor<=0)throw new Error('Invalid enlargement factor')
 return page.evaluate(scale=>{
  const candidates=Array.from(new Set(document.querySelectorAll<HTMLElement>('main,main *,[role="dialog"],[role="dialog"] *')))
  const samples=candidates.filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'&&(el instanceof HTMLInputElement||el instanceof HTMLTextAreaElement||Array.from(el.childNodes).some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent?.trim()))).map((el,index)=>{
   const style=getComputedStyle(el),before=parseFloat(style.fontSize),line=parseFloat(style.lineHeight)
   if(!Number.isFinite(before)||before<=0)throw new Error('Cannot measure fixture text')
   el.dataset.textSample='sample-'+index
   const selector=(el.closest('[role="dialog"]')?'[role="dialog"] ':'')+el.tagName.toLowerCase()+'[data-text-sample="sample-'+index+'"]'
   return {el,selector,before,line:Number.isFinite(line)?line:before*1.5}
  })
  for(const sample of samples){sample.el.style.setProperty('font-size',sample.before*scale+'px','important');sample.el.style.setProperty('line-height',sample.line*scale+'px','important')}
  return samples.map(({el,selector,before})=>({selector,before,after:parseFloat(getComputedStyle(el).fontSize)}))
 },factor)
}
