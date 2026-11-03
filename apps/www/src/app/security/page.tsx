import { DocPage } from '../../site/doc-page'
import { repository } from '../../site/links'
import { installerRunner, publishedInstaller } from '../../snapshots/install-command'

export const metadata = {
  title: 'Support and security · Ombelle',
  description: 'How to get help with Ombelle and report security issues.',
}

export default function SecurityPage() {
  return (
    <DocPage eyebrow="Help" title="Support and security">

      <h2>Support</h2>
      <p>
        For questions, bugs and feature requests, open an issue on{' '}
        <a href={`${repository}/issues`}>GitHub</a>. Include the command you ran,
        the CLI version (<code>{installerRunner(publishedInstaller)} --help</code> prints
        usage) and the JSON output of a <code>--dry-run --json</code> plan when
        relevant. Do not paste secrets or personal data in issues.
      </p>

      <h2>Report a vulnerability</h2>
      <p>
        Report security issues privately through{' '}
        <a href={`${repository}/security/advisories/new`}>
          GitHub private vulnerability reporting
        </a>
        , not in a public issue. In scope: the publication service at
        https://ombelle-ui.vercel.app, the <code>@ombelle-ui/cli</code>{' '}
        installer and the generated component source. Please include steps to
        reproduce and the affected code or version. There is no bug bounty.
      </p>

      <h2>Abusive or unsafe publications</h2>
      <p>
        To ask for a publication to be withdrawn, report its code through the
        same private channel and say why. Withdrawal stops the service from
        returning the code; it cannot recall copies already downloaded.
      </p>

      <p>
        See also <a href="/privacy">privacy and data retention</a>.
      </p>
    </DocPage>
  )
}
