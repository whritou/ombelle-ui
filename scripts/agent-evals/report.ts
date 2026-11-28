export type EvalSurface = 'baseline' | 'phase-1' | 'phase-2' | 'phase-3'

export type EvalResult = {
  surface: EvalSurface
  model: string
  date: string
  runsPerTask: number
  /**
   * Per task: `passed` of `runs` scored runs. `infra` runs failed before they could be scored (the agent did not
   * start, timed out or exited without a result, or the project could not be prepared); they are excluded from
   * `runs` and from every rate. `infraErrors` keeps their messages.
   */
  tasks: { id: string; passed: number; runs: number; infra: number; infraErrors: string[]; failures: string[] }[]
  /** Set when the eval stopped early; the tasks above are what completed. */
  aborted?: string
}

const pct = (passed: number, runs: number) => (runs === 0 ? 0 : Math.round((passed / runs) * 100))

export function renderReport(result: EvalResult): string {
  const passed = result.tasks.reduce((n, t) => n + t.passed, 0)
  const runs = result.tasks.reduce((n, t) => n + t.runs, 0)
  const infra = result.tasks.reduce((n, t) => n + t.infra, 0)
  const rows = result.tasks.map((t) => {
    const failing = [...new Set(t.failures)].join(', ') || '-'
    const rate = t.runs === 0 ? '-' : `${pct(t.passed, t.runs)}%`
    return `| ${t.id} | ${t.passed}/${t.runs} | ${rate} | ${t.infra} | ${failing} |`
  })
  return (
    [
      `# Agent evals: ${result.surface}`,
      '',
      `- Model: ${result.model}`,
      `- Date: ${result.date}`,
      `- Runs per task: ${result.runsPerTask}`,
      `- Overall: ${passed}/${runs} (${pct(passed, runs)}%)`,
      `- Infra failures: ${infra} (not scored, excluded from the rates)`,
      ...(result.aborted ? [`- Aborted: ${result.aborted}. These are partial results.`] : []),
      '',
      '| Task | Passed | Rate | Infra | Failing checks |',
      '| --- | --- | --- | --- | --- |',
      ...rows,
      '',
      'Rates are over a small number of runs per task and vary between runs; treat them as a trend, not a guarantee.',
    ].join('\n') + '\n'
  )
}
