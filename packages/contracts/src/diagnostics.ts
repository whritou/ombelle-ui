export class FoundationError extends Error {
 recovery?: { sourceRestored: boolean; unrestoredPaths: string[]; transactionPath: string; packageStateMayHaveChanged: boolean }
 constructor(public code: string, message: string, public path?: string, public nextAction = 'Review the reported input and retry.') { super(message); this.name = 'FoundationError' }
}
