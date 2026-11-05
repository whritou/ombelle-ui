import {
  FoundationError,
  type ComponentId,
  type CompileResult,
  type Artifact,
  type ThemeData,
  assertStyleAvailable,
  isStyleFamily,
} from '@ombelle/contracts'
import { getCatalog, getTemplate } from '@ombelle/catalog'
import { format } from 'prettier/standalone'
import typescript from 'prettier/plugins/typescript'
import estree from 'prettier/plugins/estree'
import postcss from 'prettier/plugins/postcss'
import { resolvePreset } from './resolve.js'
import { sha256 } from './hash.js'
import { assertGlassContrast, glassTokens } from './glass.js'
import { glassMaterialActive } from './glass-contrast.js'
const variable = (key: string) =>
  '--' + key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())
// Usage examples emitted as examples/<id>.tsx; Input uses the fallback.
const usageExamples: Partial<Record<ComponentId, string>> = {
  tooltip:
    'import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent, TooltipArrow } from \'@/components/ui/tooltip\'\nexport function Example(){return <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger type="button">Project details</TooltipTrigger><TooltipContent>View the project summary.<TooltipArrow /></TooltipContent></Tooltip></TooltipProvider>}',
  tabs:
    'import { Tabs, TabsList, TabsTrigger, TabsContent } from \'@/components/ui/tabs\'\nexport function Example(){return <Tabs defaultValue="overview"><TabsList aria-label="Project sections"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="activity">Activity</TabsTrigger><TabsTrigger value="settings" disabled>Settings</TabsTrigger></TabsList><TabsContent value="overview">Project overview.</TabsContent><TabsContent value="activity">Recent activity.</TabsContent></Tabs>}',
  switch:
    'import { Switch, SwitchThumb } from \'@/components/ui/switch\'\nexport function Example(){return <><label htmlFor="notifications">Enable notifications</label><Switch id="notifications" name="notifications" value="enabled"><SwitchThumb /></Switch></>}',
  checkbox:
    'import { Checkbox } from \'@/components/ui/checkbox\'\nexport function Example(){return <><label htmlFor="terms">Accept terms</label><Checkbox id="terms" name="terms" value="accepted" required aria-invalid="true" aria-describedby="terms-error" /><p id="terms-error">Accept the terms to continue.</p><label htmlFor="selection">Select all items</label><Checkbox id="selection" defaultChecked="indeterminate" /></>}',
  dialog:
    "import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'\nexport function Example(){return <Dialog><DialogTrigger>Open dialog</DialogTrigger><DialogContent><DialogTitle>Example dialog</DialogTitle><DialogDescription>Review this example.</DialogDescription></DialogContent></Dialog>}",
  button:
    "import { Button } from '@/components/ui/button'\nexport function Example(){return <Button>Save</Button>}",
  badge:
    'import { Badge } from \'@/components/ui/badge\'\nexport function Example(){return <><Badge>Synced</Badge><Badge variant="destructive">Needs attention</Badge></>}',
  card:
    'import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from \'@/components/ui/card\'\nexport function Example(){return <><Card><CardHeader><CardTitle>Project overview</CardTitle><CardDescription>A summary of your current work.</CardDescription></CardHeader><CardContent><p>Your project is ready to review.</p></CardContent><CardFooter>Updated today</CardFooter></Card><Card density="dense"><CardHeader><CardTitle>Recent activity</CardTitle><CardDescription>A compact summary.</CardDescription></CardHeader><CardContent><p>No new updates.</p></CardContent><CardFooter>All caught up</CardFooter></Card></>}',
  label:
    'import { Label } from \'@/components/ui/label\'\nexport function Example(){return <><Label htmlFor="project-name">Project name <span aria-hidden="true">*</span></Label><input id="project-name" required /></>}',
  textarea:
    'import { Textarea } from \'@/components/ui/textarea\'\nexport function Example(){return <><label htmlFor="notes">Notes</label><Textarea id="notes" /><label htmlFor="summary">Summary</label><Textarea id="summary" aria-invalid="true" aria-describedby="summary-error" /><p id="summary-error">Enter a summary.</p></>}',
  'native-select':
    'import { NativeSelect, NativeSelectOption } from \'@/components/ui/native-select\'\nexport function Example(){return <><label htmlFor="region">Region</label><NativeSelect id="region" defaultValue="eu"><NativeSelectOption value="eu">Europe</NativeSelectOption><NativeSelectOption value="us">United States</NativeSelectOption></NativeSelect><label htmlFor="size">Size</label><NativeSelect id="size" size="sm" aria-invalid="true" aria-describedby="region-error"><NativeSelectOption value="">Choose a size</NativeSelectOption></NativeSelect><p id="region-error">Choose a size.</p></>}',
}
usageExamples.select = `import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
export function Example(){return <><label id="role-label">Role</label><Select defaultValue="designer"><SelectTrigger aria-labelledby="role-label"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="designer">Designer</SelectItem><SelectItem value="engineer">Engineer</SelectItem><SelectItem value="researcher" disabled hint="Seat limit">Researcher</SelectItem></SelectContent></Select></>}`
usageExamples['radio-group'] = `import { RadioGroup, RadioGroupItem, RadioGroupOption, RadioGroupOptionLabel, RadioGroupOptionDescription } from '@/components/ui/radio-group'
export function Example(){return <><p id="plan-label">Plan</p><RadioGroup defaultValue="team" aria-labelledby="plan-label"><RadioGroupOption><RadioGroupItem value="starter" /><span><RadioGroupOptionLabel>Starter</RadioGroupOptionLabel><RadioGroupOptionDescription>One project</RadioGroupOptionDescription></span></RadioGroupOption><RadioGroupOption><RadioGroupItem value="team" /><span><RadioGroupOptionLabel>Team</RadioGroupOptionLabel><RadioGroupOptionDescription>Unlimited projects</RadioGroupOptionDescription></span></RadioGroupOption><RadioGroupOption><RadioGroupItem value="enterprise" disabled /><span><RadioGroupOptionLabel>Enterprise</RadioGroupOptionLabel><RadioGroupOptionDescription>Contact sales to enable</RadioGroupOptionDescription></span></RadioGroupOption></RadioGroup></>}`
usageExamples['dropdown-menu'] = `import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem, DropdownMenuShortcut, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
export function Example(){return <DropdownMenu><DropdownMenuTrigger>Project actions</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuLabel>Project</DropdownMenuLabel><DropdownMenuItem>Rename<DropdownMenuShortcut>F2</DropdownMenuShortcut></DropdownMenuItem><DropdownMenuItem>Duplicate</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive">Archive</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}`
usageExamples.alert = `import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
export function Example(){return <><Alert><AlertTitle>Preset saved</AlertTitle><AlertDescription>New components now install with this preset.</AlertDescription></Alert><Alert variant="destructive"><AlertTitle>Install blocked</AlertTitle><AlertDescription>Review the local change before replacing it.</AlertDescription></Alert></>}`
usageExamples.popover = `import { Popover, PopoverTrigger, PopoverContent, PopoverTitle, PopoverDescription } from '@/components/ui/popover'
export function Example(){return <Popover><PopoverTrigger>Share preset</PopoverTrigger><PopoverContent aria-labelledby="share-title"><PopoverTitle id="share-title">Share preset</PopoverTitle><PopoverDescription>Anyone with the link can install this preset.</PopoverDescription></PopoverContent></Popover>}`
usageExamples.avatar = `import { Avatar, AvatarImage, AvatarFallback, AvatarStatus, AvatarGroup } from '@/components/ui/avatar'
export function Example(){return <><Avatar size="lg" variant="primary" role="img" aria-label="Ada Lovelace, online"><AvatarImage src="/ada.png" alt="" /><AvatarFallback>AL</AvatarFallback><AvatarStatus /></Avatar><AvatarGroup aria-label="Reviewers"><Avatar role="img" aria-label="Grace Hopper"><AvatarFallback>GH</AvatarFallback></Avatar><Avatar variant="secondary" role="img" aria-label="3 more reviewers"><AvatarFallback>+3</AvatarFallback></Avatar></AvatarGroup></>}`
usageExamples.separator = `import { Separator } from '@/components/ui/separator'
export function Example(){return <><Separator>or</Separator><nav aria-label="Footer"><a href="/docs">Docs</a><Separator orientation="vertical" /><a href="/changelog">Changelog</a></nav></>}`
usageExamples.table = `import { Table, TableCaption, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
export function Example(){return <Table><TableCaption>Projects and their owners.</TableCaption><TableHeader><TableRow><TableHead>Project</TableHead><TableHead>Owner</TableHead><TableHead numeric>Components</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Website refresh</TableCell><TableCell>Ada L.</TableCell><TableCell numeric>12</TableCell></TableRow><TableRow selected><TableCell>Billing migration</TableCell><TableCell>Margaret K.</TableCell><TableCell numeric>5</TableCell></TableRow></TableBody></Table>}`
usageExamples.accordion = `import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
export function Example(){return <Accordion type="single" collapsible defaultValue="preset"><AccordionItem value="preset"><AccordionTrigger>What does a preset change?</AccordionTrigger><AccordionContent>Colors, radius, borders, shadows and type.</AccordionContent></AccordionItem><AccordionItem value="edit"><AccordionTrigger>Can I edit installed components?</AccordionTrigger><AccordionContent>Yes. Installed source stays yours to edit.</AccordionContent></AccordionItem></Accordion>}`
usageExamples.progress = `import { Progress } from '@/components/ui/progress'
export function Example(){return <><p id="install-label">Installing components</p><Progress value={64} aria-labelledby="install-label" /><Progress aria-label="Checking contrast" /></>}`
usageExamples.skeleton = `import { Skeleton } from '@/components/ui/skeleton'
export function Example(){return <div aria-busy="true" aria-label="Loading project"><Skeleton shape="circle" /><Skeleton style={{ inlineSize: '60%' }} /><Skeleton /></div>}`
const defaultUsage =
  'import { Input } from \'@/components/ui/input\'\nexport function Example(){return <label>Email<Input id="email" type="email" /></label>}'
export async function compile(input: {
  preset: unknown
  componentIds: readonly ComponentId[]
  catalogRelease: string
  compilerVersion: string
  /**
   * 'enforce' (default) rejects a glass preset below the contrast bound.
   * 'report' compiles it anyway so an editor can preview the draft while it
   * shows the failing bound; installers and publication always enforce.
   */
  glassContrast?: 'enforce' | 'report'
}): Promise<CompileResult> {
  if (input.compilerVersion !== '0.1.0')
    throw new FoundationError(
      'UNSUPPORTED_RELEASE',
      'Unsupported compiler version',
      '/compilerVersion',
    )
  const catalog = getCatalog(input.catalogRelease),
    preset = await resolvePreset(input.preset, catalog)
  const family = preset.data.styleFamily
  if (!isStyleFamily(family))
    throw new FoundationError(
      'INVALID_DATA',
      'Style family is not available in the foundation',
      '/styleFamily',
    )
  const ids = [...new Set(input.componentIds)].sort()
  assertStyleAvailable(ids, family)
  if (family === 'liquid-glass' && input.glassContrast !== 'report')
    assertGlassContrast(preset.data)
  const theme: ThemeData = { light: {}, dark: {}, theme: {} }
  for (const mode of ['light', 'dark'] as const)
    for (const [key, value] of Object.entries(preset.data.modes[mode]))
      theme[mode][variable(key)] = value
  const d = preset.data.design
  Object.assign(theme.light, {
    '--radius': d.radiusRem + 'rem',
    '--border-width': d.borderWidthPx + 'px',
    '--shadow-x': d.shadowOffsetXPx + 'px',
    '--shadow-y': d.shadowOffsetYPx + 'px',
    '--control-height': d.density === 'compact' ? '2.25rem' : '2.5rem',
    '--font-family':
      d.fontFamilyId === 'system-serif'
        ? 'Georgia, serif'
        : d.fontFamilyId === 'system-mono'
          ? 'monospace'
          : "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    '--motion-duration': d.motion === 'reduced' ? '0ms' : '150ms',
  })
  if (family === 'liquid-glass') {
    const glass = glassTokens(preset.data)
    Object.assign(theme.light, glass.light)
    Object.assign(theme.dark, glass.dark)
  }
  for (const key of Object.keys(preset.data.modes.light))
    theme.theme['--color-' + variable(key).slice(2)] =
      'var(' + variable(key) + ')'
  const block = (selector: string, values: Record<string, string>) =>
    selector +
    '{' +
    Object.keys(values)
      .sort()
      .map((k) => k + ':' + values[k] + ';')
      .join('') +
    '}'
  const drafts: {
    logicalPath: string
    kind: Artifact['kind']
    content: string
  }[] = [
    {
      logicalPath: 'styles/ui-tokens.css',
      kind: 'style',
      content:
        block(':root', theme.light) +
        block('.dark', theme.dark) +
        block('@theme inline', theme.theme),
    },
    {
      logicalPath: 'styles/ui-style.css',
      kind: 'style',
      content: catalog.styles[family] + (family === 'liquid-glass' && glassMaterialActive(d) ? catalog.glassLabStyle : ''),
    },
  ]
  const dependencies = new Map<string, string>()
  for (const id of ids) {
    const template = getTemplate(catalog, id)
    let content = template.content.replaceAll("'./utils.js'", "'@/lib/utils'")
    if (id === 'button')
      content = content
        .replace(
          "variant = 'default'",
          "variant = '" + preset.data.componentDefaults!.button!.variant + "'",
        )
        .replace(
          "size = 'default'",
          "size = '" + preset.data.componentDefaults!.button!.size + "'",
        )
    drafts.push({
      logicalPath: template.logicalPath,
      kind: 'component',
      content,
    })
    if (template.styles)
      drafts.push({
        logicalPath: template.logicalPath.replace(/\.tsx$/, '.css'),
        kind: 'style',
        content: template.styles[family]!,
      })
    const usage = usageExamples[id] ?? defaultUsage
    drafts.push({
      logicalPath: 'examples/' + id + '.tsx',
      kind: 'usage',
      content: usage,
    })
    for (const dep of template.dependencies)
      dependencies.set(dep.name, dep.version)
  }
  // Glass surfaces refract in Chromium once this filter is mounted.
  if (family === 'liquid-glass' && ids.length)
    drafts.push({
      logicalPath: 'components/ui/liquid-glass-filter.tsx',
      kind: 'component',
      content: catalog.glassFilter,
    })
  if (ids.length)
    drafts.push({
      logicalPath: 'lib/utils.ts',
      kind: 'utility',
      content: catalog.utility,
    })
  const artifacts: Artifact[] = []
  for (const draft of drafts.sort((a, b) =>
    a.logicalPath < b.logicalPath ? -1 : 1,
  )) {
    const content = await format(draft.content, {
      parser: draft.logicalPath.endsWith('.css') ? 'css' : 'typescript',
      plugins: [typescript, estree, postcss],
      endOfLine: 'lf',
      singleQuote: true,
      semi: false,
    })
    artifacts.push({ ...draft, content, sha256: await sha256(content) })
  }
  return {
    artifacts,
    dependencies: [...dependencies]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([name, version]) => ({ name, version })),
    preset,
    theme,
    provenance: {
      catalogRelease: input.catalogRelease,
      compilerVersion: input.compilerVersion,
    },
  }
}
