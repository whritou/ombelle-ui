import { handlePresetCompileMessage } from './compile-protocol.js'
self.onmessage = async (event: MessageEvent<unknown>) => { self.postMessage(await handlePresetCompileMessage(event.data)) }
