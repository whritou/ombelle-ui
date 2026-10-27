export function StatusAnnouncer({ message }: { message: string }) {
  return <p role="status" aria-live="polite" aria-atomic="true">{message}</p>
}
