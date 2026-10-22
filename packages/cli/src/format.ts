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
    ...(plan.recipe
      ? { recipe: { ...plan.recipe, scopeType: 'component' } }
      : {}),
    ...(plan.componentPreset
      ? {
          componentPreset: {
            ...plan.componentPreset,
            scopeType: 'component-only',
          },
        }
      : {}),
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
    (plan.recipe
      ? '\nRecipe ' +
        plan.recipe.recipe.data.id +
        '@' +
        plan.recipe.recipe.data.revision +
        ' (component only)\nImport: ' +
        plan.recipe.importPath +
        '\nUsage: ' +
        plan.recipe.examplePath +
        '\nRecipe hash: ' +
        plan.recipe.recipe.hash +
        '\nPreset hash: ' +
        plan.recipe.preset.hash +
        '\nCatalog release: ' +
        plan.recipe.provenance.catalogRelease +
        '\nCompiler version: ' +
        plan.recipe.provenance.compilerVersion +
        '\nScope: ' +
        plan.recipe.scope +
        '\nDark selector: ' +
        plan.recipe.darkSelector
      : '') +
    (plan.componentPreset
      ? '\nComponent preset ' +
        plan.componentPreset.preset.data.id +
        '@' +
        plan.componentPreset.preset.data.revision +
        ' (component only)\nImport: ' +
        plan.componentPreset.importPath +
        '\nUsage: ' +
        plan.componentPreset.examplePath +
        '\nScope: ' +
        plan.componentPreset.scope
      : '') +
    plan.diagnostics
      .map(
        (d) =>
          '\n' +
          d.code +
          (d.path ? ' (' + d.path + ')' : '') +
          ': ' +
          d.message,
      )
      .join('') +
    (plan.managerWarning ? '\nWarning: ' + plan.managerWarning : '') +
    (plan.dependencyPlan.length
      ? '\nDependencies: ' +
        plan.dependencyPlan.map((d) => d.name + '@' + d.version).join(', ')
      : '')
  )
}
