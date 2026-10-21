import { test, expect, type Page, type Locator } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs/promises'
import { contrastRatio } from '../helpers/contrast.js'
import { enlargeFixtureText } from '../helpers/text-enlargement.js'
const map=JSON.parse(await fs.readFile('.artifacts/consumers.json','utf8'))
const apps=['preview','vite','next','npm-vite','npm-next']
const measurements:unknown[]=[]
test.afterAll(async()=>{await fs.writeFile('.artifacts/minimalist-measurements.json',JSON.stringify(measurements,null,2))})
function url(app:string,mode:string){return(app==='preview'?'http://127.0.0.1:4173/minimalist/':'http://127.0.0.1:'+map[app+'-minimalist'].port+'/')+'?mode='+mode+'&states=1'}
async function load(page:Page,app:string,mode:string){
 await page.goto(url(app,mode));await expect(page.locator('main')).toHaveAttribute('data-ready','true');await expect(page.locator('main')).toHaveAttribute('data-style','minimalist');await expect(page.getByTestId('state-fixture')).toBeVisible();await page.evaluate(()=>document.fonts.ready)
}
async function colors(locator:Locator){
 return locator.evaluate(el=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1
  const ctx=canvas.getContext('2d')!
  const rgba=(color:string)=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return Array.from(ctx.getImageData(0,0,1,1).data)}
  const over=(a:number[],b:number[])=>[0,1,2].map(i=>a[i]*(a[3]/255)+b[i]*(1-a[3]/255)).concat(255)
  const behind=(element:Element|null):number[]=>{if(!element)return rgba('Canvas');return over(rgba(getComputedStyle(element).backgroundColor),behind(element.parentElement))}
  const style=getComputedStyle(el),background=behind(el)
  return {foreground:over(rgba(style.color),background).slice(0,3),background:background.slice(0,3),border:over(rgba(style.borderTopColor),background).slice(0,3),outside:behind(el.parentElement).slice(0,3),outline:over(rgba(style.outlineColor),behind(el.parentElement)).slice(0,3),outlineWidth:parseFloat(style.outlineWidth),outlineOffset:parseFloat(style.outlineOffset),bgRaw:rgba(style.backgroundColor),transform:style.transform}
 })
}
const pair=(a:number[],b:number[])=>contrastRatio(a as [number,number,number],b as [number,number,number])
async function textContrast(locator:Locator){const c=await colors(locator),ratio=pair(c.foreground,c.background);expect(ratio).toBeGreaterThanOrEqual(4.5);return ratio}
async function boundaryContrast(locator:Locator,variant:string){
 if(variant==='ghost'||variant==='link')return undefined
 const c=await colors(locator),ratio=pair(variant==='outline'||variant==='secondary'?c.border:c.background,c.outside)
 expect(ratio).toBeGreaterThanOrEqual(3);return ratio
}
async function unclipped(locator:Locator){
 expect(await locator.evaluate(el=>{
  const s=getComputedStyle(el),margin=parseFloat(s.outlineWidth)+parseFloat(s.outlineOffset),r=el.getBoundingClientRect()
  if(r.left-margin<0||r.top-margin<0||r.right+margin>innerWidth||r.bottom+margin>innerHeight)return false
  for(let p=el.parentElement;p&&p!==document.body;p=p.parentElement){const ps=getComputedStyle(p),pr=p.getBoundingClientRect();if(/hidden|auto|scroll|clip/.test(ps.overflowX)&& (r.left-margin<pr.left||r.right+margin>pr.right))return false;if(/hidden|auto|scroll|clip/.test(ps.overflowY)&&(r.top-margin<pr.top||r.bottom+margin>pr.bottom))return false}
  return true
 })).toBe(true)
}
async function noOverflow(page:Page){
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 const clipped=await page.locator('.state-fixture button,.state-fixture label,.state-fixture p,.state-dialog button,.state-dialog h2,.state-dialog p').evaluateAll(elements=>elements.filter(el=>{const e=el as HTMLElement;return e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+1}).map(el=>el.textContent))
 expect(clipped).toEqual([])
}
for(const mode of ['light','dark']){
 test('minimalist '+mode+' state parity across installed apps',async({page})=>{
  let reference:Buffer|undefined,dialogReference:Buffer|undefined,dom:string|undefined,overlayStyle:unknown
  for(const app of apps){
   await load(page,app,mode);await page.mouse.move(0,0)
   const state=page.getByTestId('state-fixture'),image=await state.screenshot({animations:'disabled'})
   const normalized=(await state.innerHTML()).replace(/radix-[^" ]+/g,'radix-ID')
   if(!reference){reference=image;dom=normalized;await test.info().attach('minimalist-'+mode+'-states',{body:image,contentType:'image/png'})}else{expect(image.equals(reference)).toBe(true);expect(normalized).toBe(dom)}
   await page.getByTestId('state-dialog-trigger').click();const dialog=page.getByRole('dialog')
   await expect(page.getByTestId('state-dialog-accept')).toBeFocused()
   const overlay=await page.locator('[data-slot="dialog-overlay"]').evaluate(el=>{const s=getComputedStyle(el);return {background:s.backgroundColor,opacity:s.opacity}})
   if(!overlayStyle)overlayStyle=overlay;else expect(overlay).toEqual(overlayStyle)
   // Isolate rounded Dialog edges from compositor rounding through the translucent backdrop.
   const popup=await dialog.screenshot({animations:'disabled',style:'[data-slot="dialog-overlay"] { background: #000 !important; }'})
   if(!dialogReference){dialogReference=popup;await test.info().attach('minimalist-'+mode+'-dialog',{body:popup,contentType:'image/png'})}else expect(popup.equals(dialogReference)).toBe(true)
   await page.keyboard.press('Escape')
  }
 })
 for(const app of apps)test(app+' '+mode+' minimalist rendered states and resizing',async({page})=>{
  await load(page,app,mode)
  const ratios:Record<string,number>={}
  for(const variant of ['default','secondary','outline','ghost','link','destructive']){
   const button=page.getByTestId('variant-'+variant)
   await expect(button).toBeVisible();ratios[variant]=await textContrast(button);const boundary=await boundaryContrast(button,variant);if(boundary!==undefined)ratios[variant+'Boundary']=boundary
   await button.scrollIntoViewIfNeeded();const box=await button.boundingBox(),before=await colors(button)
   await button.hover();ratios[variant+'Hover']=await textContrast(button);const hoverBoundary=await boundaryContrast(button,variant);if(hoverBoundary!==undefined)ratios[variant+'HoverBoundary']=hoverBoundary;const hover=await colors(button)
   if(variant!=='link')expect(hover.background).not.toEqual(before.background)
   else await expect(button).toHaveCSS('text-decoration-thickness','2px')
   await page.mouse.down();ratios[variant+'Pressed']=await textContrast(button);const pressedBoundary=await boundaryContrast(button,variant);if(pressedBoundary!==undefined)ratios[variant+'PressedBoundary']=pressedBoundary;expect((await colors(button)).background).not.toEqual(hover.background)
   expect(await button.boundingBox()).toEqual(box);expect((await colors(button)).transform).toBe('none');await page.mouse.up();await page.mouse.move(0,0)
  }
  for(const size of ['sm','default','lg','icon'])await expect(page.getByTestId('size-'+size)).toBeVisible()
  expect((await page.getByTestId('size-lg').boundingBox())!.height).toBeGreaterThan((await page.getByTestId('size-sm').boundingBox())!.height)
  await expect(page.getByTestId('disabled-button')).toBeDisabled();await page.getByTestId('disabled-button').click({force:true});await expect(page.getByTestId('activation-count')).toHaveText('Activations: 0')
  await expect(page.getByTestId('disabled-input')).toBeDisabled()
  await expect(page.getByTestId('invalid-input')).toHaveAttribute('aria-describedby','invalid-input-error');await expect(page.locator('#invalid-input-error')).toBeVisible()
  ratios.error=await textContrast(page.locator('#invalid-input-error'))
  const input=page.getByTestId('empty-input');await input.scrollIntoViewIfNeeded();await input.focus()
  const c=await colors(input);ratios.inputBoundary=Math.min(pair(c.border,c.background),pair(c.border,c.outside));ratios.focus=pair(c.outline,c.outside)
  expect(ratios.inputBoundary).toBeGreaterThanOrEqual(3);expect(ratios.focus).toBeGreaterThanOrEqual(3);expect(c.outlineWidth).toBeGreaterThanOrEqual(3);await unclipped(input)
  ratios.muted=await textContrast(page.locator('.note'))
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([])
  await page.getByTestId('state-dialog-trigger').focus();await page.getByTestId('state-dialog-trigger').press('Enter');await expect(page.getByTestId('state-dialog-accept')).toBeFocused();expect((await colors(page.getByRole('dialog'))).bgRaw[3]).toBe(255)
  ratios.dialogText=await textContrast(page.getByRole('dialog').locator('h2'));const dialogFocus=await colors(page.getByTestId('state-dialog-accept'));ratios.dialogFocus=pair(dialogFocus.outline,dialogFocus.outside);expect(ratios.dialogFocus).toBeGreaterThanOrEqual(3)
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Review component states');await expect(page.getByRole('dialog')).toHaveAccessibleDescription('Read the details and confirm your choice.')
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([])
  await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Close',exact:true})).toBeFocused();await unclipped(page.getByRole('button',{name:'Close',exact:true}))
  await page.keyboard.press('Tab');await expect(page.getByTestId('state-dialog-accept')).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(page.getByRole('button',{name:'Close',exact:true})).toBeFocused()
  await page.keyboard.press('Escape');await expect(page.getByTestId('state-dialog-trigger')).toBeFocused()
  await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>document.documentElement.style.setProperty('--motion-duration','150ms'))
  await expect(input).toHaveCSS('transition-duration','0.15s, 0.15s');await page.emulateMedia({reducedMotion:'reduce'});await expect(input).toHaveCSS('transition-duration','0s')
  await page.emulateMedia({forcedColors:'active'});await input.focus();const forced=await colors(input);expect(forced.outlineWidth).toBeGreaterThanOrEqual(3);expect(pair(forced.outline,forced.outside)).toBeGreaterThanOrEqual(3);expect(pair(forced.border,forced.background)).toBeGreaterThanOrEqual(3)
  await page.emulateMedia({forcedColors:'none',reducedMotion:'reduce'})
  const textEvidence:unknown[]=[]
  for(const width of [1100,320])for(const open of [false,true]){
   await page.setViewportSize({width,height:800});await load(page,app,mode)
   if(open){await page.getByTestId('state-dialog-trigger').focus();await page.getByTestId('state-dialog-trigger').press('Enter')}
   const samples=await enlargeFixtureText(page,2)
   expect(samples.length).toBeGreaterThan(15);expect(samples.every(s=>Math.abs(s.after/s.before-2)<0.02)).toBe(true)
   expect(samples.some(s=>s.selector.includes('input'))).toBe(true)
   if(open){expect(samples.some(s=>s.selector.includes('dialog'))).toBe(true);await unclipped(page.getByTestId('state-dialog-accept'));await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Close',exact:true})).toBeFocused();await unclipped(page.getByRole('button',{name:'Close',exact:true}))}
   await noOverflow(page)
   if(open){await page.keyboard.press('Escape');await expect(page.getByTestId('state-dialog-trigger')).toBeFocused()}
   textEvidence.push({width,dialogOpen:open,samples})
  }
  measurements.push({app,mode,ratios,disabledContrast:'exempt',textMethod:'synthetic font enlargement (not native browser zoom)',textEvidence,forcedColors:'active',motionPositiveControlMs:150})
 })
}
