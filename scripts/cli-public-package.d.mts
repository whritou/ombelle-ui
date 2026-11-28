export declare const siteOrigin: string
export declare const skillsSource: string
export declare const cliKeywords: string[]
export declare function cliPublicManifest(name: string, version: string): {
  name: string
  version: string
  description: string
  keywords: string[]
  repository: { type: string; url: string; directory: string }
  homepage: string
  bugs: { url: string }
  type: 'module'
  license: string
  bin: Record<string, string>
  engines: { node: string }
  files: string[]
  publishConfig: { access: string }
}
export declare function cliPublicReadme(name: string, version: string): string
