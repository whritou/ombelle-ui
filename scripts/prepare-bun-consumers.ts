import fs from 'node:fs/promises'
import path from 'node:path'
import type { CompileResult, StyleFamily } from '@ombelle/contracts'
import { sha256 } from '@ombelle/compiler'
import {
  createBunProject,
  auditBunFixture,
} from '../tests/helpers/bun-project.js'
import { runBuiltCli, jsonRecord } from '../tests/helpers/cli-runtime.js'
import { assertBunOwnership } from '../packages/cli/src/apply/bun.js'
import { prepareRecipeConsumer } from './prepare-recipe-consumer.js'
import { recipeReferenceBank } from '../tests/helpers/recipe-fixture.js'
import { writeScenarioFixture } from '../tests/helpers/scenario-fixture.js'
import { prepareComponentPresetConsumer } from './prepare-component-preset-consumer.js'
import { componentPresetReferenceBank } from '../tests/helpers/component-preset-fixture.js'

export async function prepareBunConsumer(
  framework: 'vite' | 'next',
  format: 'text' | 'binary',
  runtime: 'node' | 'bun',
  family: StyleFamily = 'flat',
) {
  const fixture = await createBunProject(framework, format, family),
    repo = process.cwd()
  try {
    await fs.writeFile(
      path.join(fixture.root, '.ombelle-fixture.json'),
      JSON.stringify({ owner: repo, framework, family }),
    )
    await writeScenarioFixture(fixture.root, family, {
      recipes: true,
      badges: true,
      cards: true,
      forms: true,
      checkboxes: true,
      switches: true,
      tabs: true,
      tooltips: true,
    })
    await fs.appendFile(
      path.join(fixture.root, 'src/index.css'),
      '\n.user-bun-style {color:hotpink;}\n',
    )
    const preset = path.join(
      repo,
      'packages/catalog/src/presets',
      family + '.json',
    )
    const init = await runBuiltCli(
      runtime,
      ['init', '--preset', preset, '--yes', '--json'],
      fixture.root,
    )
    if (init.code !== 0) throw new Error(init.output)
    for (const args of [
      ['add', 'button', 'dialog', '--yes', '--json'],
      ['add', 'input', '--yes', '--json'],
      ['add', 'badge', '--yes', '--json'],
      ['add', 'card', '--yes', '--json'],
      ['add', 'label', 'textarea', 'native-select', '--yes', '--json'],
      ['add', 'checkbox', 'switch', 'tabs', 'tooltip', '--yes', '--json'],
    ]) {
      const result = await runBuiltCli(runtime, args, fixture.root)
      if (
        result.code !== 0 ||
        jsonRecord(result.data).presetHash !== jsonRecord(init.data).presetHash
      )
        throw new Error(result.output)
    }
    if (
      !(
        await fs.readFile(path.join(fixture.root, 'src/index.css'), 'utf8')
      ).includes('.user-bun-style')
    )
      throw new Error('Bun lost unrelated CSS')
    const recipeEvidence = await prepareRecipeConsumer({
        root: fixture.root,
        cliRuntime: runtime,
        family,
      }),
      recipeBank = await recipeReferenceBank()
    const componentPresetEvidence = await prepareComponentPresetConsumer({
        root: fixture.root,
        cliRuntime: runtime,
        manager: 'bun',
        managerVersion: fixture.version,
        bunFormat: format,
      }),
      componentPresetBank = await componentPresetReferenceBank()
    const canonical = JSON.parse(
      await fs.readFile(
        'apps/preview/src/generated/' + family + '/manifest.json',
        'utf8',
      ),
    ) as CompileResult
    const lock = jsonRecord(
      JSON.parse(
        await fs.readFile(
          path.join(fixture.root, 'ui-library.lock.json'),
          'utf8',
        ),
      ),
    )
    const sourceHashes: Record<string, string> = {},
      artifacts = []
    const installedArtifacts = { ...jsonRecord(lock.artifacts) }
    for (const preset of Object.values(componentPresetEvidence.presets))
      for (const [file, record] of Object.entries(
        jsonRecord(jsonRecord(jsonRecord(preset).installed).artifacts),
      )) {
        if (
          installedArtifacts[file] &&
          JSON.stringify(installedArtifacts[file]) !== JSON.stringify(record)
        )
          throw Error('Conflicting scoped artifact ownership: ' + file)
        installedArtifacts[file] = record
      }
    for (const [file, record] of Object.entries(installedArtifacts)) {
      const meta = jsonRecord(record),
        source = await fs.readFile(path.join(fixture.root, file), 'utf8'),
        reference =
          canonical.artifacts.find((a) => a.logicalPath === meta.logicalPath) ??
          recipeBank.get(String(meta.logicalPath)) ??
          componentPresetBank.get(String(meta.logicalPath))
      const hash = await sha256(source)
      if (
        !reference ||
        source !== reference.content ||
        hash !== meta.sha256 ||
        source.includes('@ombelle/')
      )
        throw new Error(
          'Bun installed source differs from canonical artifact: ' + file,
        )
      sourceHashes[file] = hash
      artifacts.push({
        path: file,
        logicalPath: reference.logicalPath,
        sha256: hash,
      })
    }
    await assertBunOwnership(fixture.root, fixture.lockfile)
    const audit = await auditBunFixture(fixture)
    if (audit.code !== 0) throw Error('Bun audit failed: ' + audit.output)
    return {
      fixture,
      cliRuntime: init.runtime,
      sourceHashes,
      artifacts,
      recipeEvidence,
      componentPresetEvidence,
      audit,
    }
  } catch (e) {
    await fs.rm(fixture.root, { recursive: true, force: true })
    throw e
  }
}
