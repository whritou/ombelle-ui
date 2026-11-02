export const metadata = {
  title: 'Privacy and data retention · Ombelle',
  description: 'What the Ombelle publication service stores and for how long.',
}

const repository = 'https://github.com/whritou/ombelle-ui'

export default function PrivacyPage() {
  return (
    <main>
      <h1>Privacy and data retention</h1>
      <p>Last updated: 2 November 2026.</p>

      <h2>Operator</h2>
      <p>
        Ombelle and its publication service at https://ombelle-ui.vercel.app are
        operated by Arthur Thomas. Contact details are on the{' '}
        <a href="/security">support and security page</a>.
      </p>

      <h2>What you publish</h2>
      <p>
        When you publish a preset or a Button recipe, the service stores the
        normalized JSON you submitted, its content hash and the publication
        time. It does not store your name, account, email address or IP address
        with the publication. Ombelle has no accounts.
      </p>
      <p>
        Anyone who has a publication code can read the published content.
        Publications have no automatic expiry and cannot be edited or deleted
        anonymously. The operator may withdraw a code for abuse, security or an
        operator request; withdrawal stops the service from returning it but
        cannot recall copies that were already downloaded, cached or installed.
        Do not put personal data in preset names or recipe content.
      </p>

      <h2>Abuse protection</h2>
      <p>
        To enforce publication limits, the service derives a keyed hash (HMAC)
        from the IP address that Vercel reports for the request. Only that hash
        is stored, in per-minute and per-day counters. Counters are deleted
        after their window ends, during later publication requests. Retry keys
        sent with a publication are kept for 24 hours so a repeated request
        returns the same code.
      </p>

      <h2>In your browser</h2>
      <p>
        The editors keep drafts, history and pending publication state in your
        browser&apos;s local storage. They are not sent anywhere unless you
        publish. Pending publication state expires after 24 hours. The site sets
        no cookies and uses no analytics or advertising.
      </p>

      <h2>The command-line installer</h2>
      <p>
        <code>@ombelle-ui/cli</code> requests the codes you give it from the
        service and caches verified copies on your machine. It sends no
        telemetry.
      </p>

      <h2>Service providers</h2>
      <ul>
        <li>
          Vercel hosts the site and its functions (region fra1, Frankfurt) and
          processes request metadata, including IP addresses, under its own
          privacy policy and log retention.
        </li>
        <li>
          Neon hosts the Postgres database (AWS eu-central-1, Frankfurt).
        </li>
        <li>GitHub hosts the source code, issues and security reports.</li>
      </ul>
      <p>
        The operator keeps database backups on private storage. Backups contain
        the same data as the database, including withdrawn publications.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask for access to, correction of or erasure of personal data,
        or ask for a code you published to be withdrawn. Because publications
        are not linked to a person, include the publication code. Open an issue
        on <a href={`${repository}/issues`}>GitHub</a> asking for a private
        channel, without personal details in the issue. You may also complain
        to your data protection authority, in France the CNIL.
      </p>
    </main>
  )
}
