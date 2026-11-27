export type EvalSurface = 'baseline' | 'phase-1' | 'phase-2' | 'phase-3'

export type EvalResult = {
  surface: EvalSurface
  model: string
  date: string
  runsPerTask: number
  tasks: { id: string; passed: number; runs: number; failures: string[] }[]
}

const pct = (passed: number, runs: number) => (runs === 0 ? 0 : Math.round((passed / runs) * 100))

export function renderReport(result: EvalResult): string {
  const passed = result.tasks.reduce((n, t) => n + t.passed, 0)
  const runs = result.tasks.reduce((n, t) => n + t.runs, 0)
  const rows = result.tasks.map((t) => {
    const failing = [...new Set(t.failures)].join(', ') || '-'
    return `| ${t.id} | ${t.passed}/${t.runs} | ${pct(t.passed, t.runs)}% | ${failing} |`
  })
  return (
    [
      `# Agent evals: ${result.surface}`,
      '',
      `- Model: ${result.model}`,
      `- Date: ${result.date}`,
      `- Runs per task: ${result.runsPerTask}`,
      `- Overall: ${passed}/${runs} (${pct(passed, runs)}%)`,
      '',
      '| Task | Passed | Rate | Failing checks |',
      '| --- | --- | --- | --- |',
      ...rows,
      '',
      'Rates are over a small number of runs per task and vary between runs; treat them as a trend, not a guarantee.',
    ].join('\n') + '\n'
  )
}
