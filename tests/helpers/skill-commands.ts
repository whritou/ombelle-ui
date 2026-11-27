const runner =
  /(?:npx|pnpm dlx|yarn dlx(?: --quiet)?|bunx) @ombelle-ui\/cli@<version> (.+)$/

/** Argument strings of every Ombelle CLI command shown inside a code fence. */
export function extractSkillCommands(markdown: string): string[] {
  const commands: string[] = []
  let fence: string | undefined
  for (const line of markdown.split(/\r?\n/)) {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line)
    if (marker) {
      const mark = marker[1]!
      if (!fence) fence = mark
      else if (mark[0] === fence[0] && mark.length >= fence.length)
        fence = undefined
      continue
    }
    if (!fence) continue
    const match = runner.exec(line.trim())
    if (match) commands.push(match[1]!.trim())
  }
  return commands
}
