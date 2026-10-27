import Link from 'next/link'
import { SiteHeader } from '../../site-shell'
export default function PresetEditorPage(){return <><SiteHeader/><main className="inner"><div className="page-intro"><p className="eyebrow pink">Preset editor</p><h1>Make the baseline<br/><i>yours.</i></h1><p>The global preset editor is the place to tune project-wide tokens before exporting your local JSON.</p><Link className="button button-pink" href="/presets">Back to presets ↗</Link></div></main></>}
