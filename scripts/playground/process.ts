import fs from 'node:fs/promises'
import {spawn,type ChildProcess} from 'node:child_process'
export type CommandRequest={executable:string;args:string[];cwd:string;log:string;timeoutMs:number}
export async function killOwned(child:ChildProcess){
 if(child.exitCode!==null||child.signalCode!==null||!child.pid)return
 if(process.platform==='win32')await new Promise<void>(resolve=>{
  const killer=spawn('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'})
  killer.once('error',()=>resolve());killer.once('close',()=>resolve())
 })
 else {try{process.kill(-child.pid,'SIGKILL')}catch{child.kill('SIGKILL')}}
}
export async function execute(r:CommandRequest){
 await fs.writeFile(r.log+'.command.json',JSON.stringify({...r,node:process.version},null,2))
 const out=await fs.open(r.log+'.stdout.log','w'),err=await fs.open(r.log+'.stderr.log','w')
 let timedOut=false,interrupted=false
 try{
  const child=spawn(r.executable,r.args,{cwd:r.cwd,shell:false,windowsHide:true,detached:process.platform!=='win32',stdio:['ignore',out.fd,err.fd],env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',CI:'true'}})
  const cancel=()=>{interrupted=true;void killOwned(child)}
  process.once('SIGINT',cancel);process.once('SIGTERM',cancel)
  const timer=setTimeout(()=>{timedOut=true;void killOwned(child)},r.timeoutMs)
  const result=await new Promise<{code:number|null;signal:string|null}>((resolve,reject)=>{
   child.once('error',reject);child.once('close',(code,signal)=>resolve({code,signal}))
  }).finally(()=>{clearTimeout(timer);process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel)})
  await fs.writeFile(r.log+'.result.json',JSON.stringify({...result,timedOut,interrupted},null,2))
  if(result.code!==0||timedOut||interrupted){
   const tail=(await fs.readFile(r.log+'.stderr.log','utf8')).slice(-3500)
   throw Error((timedOut?'Command timeout':interrupted?'Command interrupted':'Command exit '+result.code)+'\n'+tail+'\nLogs: '+r.log)
  }
  return {...result,output:await fs.readFile(r.log+'.stdout.log','utf8')}
 }finally{await out.close();await err.close()}
}
