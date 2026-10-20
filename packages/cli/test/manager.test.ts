import {it,expect,vi} from 'vitest'
import {runDependencies} from '../src/apply/manager.js'
it('does nothing for an empty dependency plan',async()=>{await expect(runDependencies('.',[])).resolves.toBeUndefined()})
it('rejects command-like dependency names before starting a process',async()=>{await expect(runDependencies('.',[{name:'evil;echo bad',version:'1.0.0'}])).rejects.toMatchObject({code:'INVALID_DATA'})})
