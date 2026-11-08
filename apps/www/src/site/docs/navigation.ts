export const documentationGuides = [
  { slug: 'getting-started', title: 'Getting started', description: 'Install your first components in a Vite or Next.js app.' },
  { slug: 'installation', title: 'Installation and CLI', description: 'Commands, package managers, editions, and safe updates.' },
  { slug: 'style-families', title: 'Style families', description: 'Choose a visual family and understand Liquid Glass.' },
  { slug: 'presets', title: 'Global presets', description: 'Understand project defaults, tokens, and component scope.' },
  { slug: 'preset-editor', title: 'Preset editor', description: 'Create, preview, check, and export a project theme.' },
  { slug: 'component-editor', title: 'Component editor and recipes', description: 'Customize any catalog component and install its scoped recipe.' },
  { slug: 'exports-and-sharing', title: 'Exports and sharing', description: 'Use local JSON, generated source, and immutable public codes.' },
  { slug: 'troubleshooting', title: 'Troubleshooting', description: 'Resolve installation conflicts, draft recovery, and preview problems.' },
] as const

export type GuideSlug = typeof documentationGuides[number]['slug']
