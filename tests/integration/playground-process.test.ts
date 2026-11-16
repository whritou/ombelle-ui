import {it,expect} from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'
import {execute} from '../../scripts/playground/process.js'
import {assertPortFree,stopServer} from '../../scripts/playground/servers.js'
it('transports literal arguments, records failures and times out',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'ombelle-process-'))
 try{
  const request={executable:process.execPath,args:['-e','console.log(process.argv[1]);console.error("err")','space & | < > argument'],cwd:dir,log:path.join(dir,'out'),timeoutMs:2000}
  const result=await execute(request)
  expect(result.output.trim()).toBe('space & | < > argument')
  expect(await fs.readFile(request.log+'.stderr.log','utf8')).toContain('err')
  await expect(execute({...request,args:['-e','process.exit(4)']})).rejects.toThrow('exit 4')
  await expect(execute({...request,args:['-e','setInterval(()=>{},1000)'],timeoutMs:100})).rejects.toThrow('timeout')
  await expect(execute({...request,executable:path.join(dir,'missing')})).rejects.toThrow()
 }finally{await fs.rm(dir,{recursive:true,force:true})}
})
it('refuses occupied ports and stale server records',async()=>{
 const server=net.createServer()
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve))
 try{
  const port=(server.address() as net.AddressInfo).port
  await expect(assertPortFree(port)).rejects.toThrow()
  await expect(stopServer({controlPort:1,token:'stale',url:'http://127.0.0.1:1'})).rejects.toThrow()
  expect(server.listening).toBe(true)
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()))}
})
