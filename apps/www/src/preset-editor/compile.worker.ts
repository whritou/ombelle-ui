import { handlePresetCompileMessage } from './compile-protocol'
self.onmessage = async (event: MessageEvent<unknown>) => { self.postMessage(await handlePresetCompileMessage(event.data)) }
