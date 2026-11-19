'use client'
import { Button } from '@/components/ui/button'
import { CodeBlock, CodeBlockCommand } from '@/components/ui/code-block'

export function Specimen() {
  return (
    <section aria-label="Code Block" data-component="code-block">
      <h2>Code Block</h2>
      <div className="preset-column">
        <CodeBlockCommand args="@ombelle-ui/cli add button" />
        <CodeBlock title="save.tsx" language="tsx"
          code={"import { Button } from '@/components/ui/button'\n\n// Saves the draft.\nexport function Save() {\n  return <Button variant=\"outline\" size=\"sm\">Save</Button>\n}\n"} />
        <div data-component="code-block~diff"><CodeBlock title="ui-style.css" language="css" diff
          code={" :root {\n-  --radius: 0.5rem;\n+  --radius: 0.75rem;\n+  --shadow-offset: 3px;\n }\n"} /></div>
      </div>
    </section>
  )
}
