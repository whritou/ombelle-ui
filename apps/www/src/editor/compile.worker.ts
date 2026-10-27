import { handleCompileMessage } from './compile-protocol.js'

self.onmessage = async (event: MessageEvent<unknown>) => {
  self.postMessage(await handleCompileMessage(event.data))
}
