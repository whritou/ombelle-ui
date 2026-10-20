import type { InstallPlan } from '@ombelle/contracts'
export function planOutput(command: string, status: string, plan: InstallPlan) {
  return {
    command,
    status,
    projectRoot: plan.projectRoot,
    packageManager: plan.packageManager,
    ...(plan.bunLockfile ? { bunLockfile: plan.bunLockfile } : {}),
    ...(plan.managerWarning ? { managerWarning: plan.managerWarning } : {}),
    presetHash: plan.preset.hash,
    ...plan.provenance,
    changes: plan.changes,
    dependencyPlan: plan.dependencyPlan,
    warnings: plan.diagnostics,
    networkAccess: plan.networkAccess,
  }
}
export function formatPlan(
  command: string,
  status: string,
  plan: InstallPlan,
): string {
  return (
    command +
    ': ' +
    status +
    '\n' +
    plan.changes.map((c) => c.action + ' ' + c.path).join('\n') +
    (plan.managerWarning ? '\nWarning: ' + plan.managerWarning : '') +
    (plan.dependencyPlan.length
      ? '\nDependencies: ' +
        plan.dependencyPlan.map((d) => d.name + '@' + d.version).join(', ')
      : '')
  )
}
