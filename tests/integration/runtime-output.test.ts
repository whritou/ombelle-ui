import { afterEach, expect, it, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import { spawn } from 'node:child_process'
import { resolveNodeExecutable } from '../../packages/cli/src/apply/executable.js'
vi.mock('node:child_process', () => ({ spawn: vi.fn() }))
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks() })
it('waits for version output to drain after process exit', async () => {
 vi.stubEnv('OMBELLE_NODE_EXECUTABLE', process.execPath)
 const child=Object.assign(new EventEmitter(), {stdout:new EventEmitter(),stderr:new EventEmitter()})
 vi.mocked(spawn).mockImplementation((()=>{
  setImmediate(()=>{
   child.emit('exit',0)
   setImmediate(()=>{ child.stdout.emit('data',Buffer.from('v24.21.0\n'));child.emit('close',0) })
  })
  return child
 }) as unknown as typeof spawn)
 await expect(resolveNodeExecutable()).resolves.toBe(process.execPath)
})
