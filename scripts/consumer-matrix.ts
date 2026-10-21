import { supportedStyleFamilies, type StyleFamily } from '@ombelle/contracts'
import type { YarnFixtureId } from '../tests/helpers/yarn-project.js'
export type ConsumerCase={id:string;family:StyleFamily;framework:'vite'|'next';manager:'npm'|'pnpm'|'yarn'|'bun';cliRuntime:'node'|'bun';yarnFixtureId?:YarnFixtureId;bunFormat?:'text'|'binary'}
export function consumerCases():readonly ConsumerCase[]{
 const rows:ConsumerCase[]=[]
 for(const manager of ['pnpm','npm'] as const)for(const framework of ['vite','next'] as const)for(const family of supportedStyleFamilies)rows.push({id:(manager==='npm'?'npm-':'')+framework+'-'+family,family,framework,manager,cliRuntime:'node'})
 for(const family of ['flat','minimalist'] as const){
  const suffix=family==='flat'?'':'-minimalist'
  for(const id of ['classic-vite','modern-next','pnp-vite'] as const)rows.push({id:'yarn-'+id+suffix,family,framework:id==='modern-next'?'next':'vite',manager:'yarn',cliRuntime:'node',yarnFixtureId:id})
  for(const framework of ['vite','next'] as const)for(const format of ['text','binary'] as const)for(const runtime of ['node','bun'] as const)rows.push({id:'bun-'+format+'-'+framework+'-'+runtime+suffix,family,framework,manager:'bun',cliRuntime:runtime,bunFormat:format})
 }
 return rows
}
export function assignConsumerPorts(cases:readonly ConsumerCase[],start=4174):Record<string,number>{
 if(!Number.isInteger(start)||start<1024)throw new Error('Invalid consumer port start')
 const ports:Record<string,number>={};let port=start
 for(const spec of cases){
  if(Object.hasOwn(ports,spec.id))throw new Error('Duplicate consumer ID')
  if(port===4173)port++
  if(port>65535)throw new Error('Consumer port range exhausted')
  ports[spec.id]=port++
 }
 return ports
}
