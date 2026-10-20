export class FoundationError extends Error {
 constructor(public code: string, message: string, public path?: string, public nextAction = 'Review the reported input and retry.') { super(message); this.name = 'FoundationError' }
}
