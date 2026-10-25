import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'

export function CardFixture() {
  return (
    <section
      data-testid="card-fixture"
      aria-label="Card examples"
      style={{
        width: 440,
        maxWidth: '100%',
        marginTop: 24,
        display: 'grid',
        gap: 24,
      }}
    >
      <Card
        data-testid="card-default"
        className="consumer-card"
        aria-labelledby="card-default-title"
      >
        <CardHeader>
          <CardTitle level={2} id="card-default-title">
            Project overview
          </CardTitle>
          <CardDescription>
            Shared components, ready for your project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Review your project details before sharing them with your team.</p>
          <p>abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz</p>
        </CardContent>
        <CardFooter>
          <span>Updated today</span>
          <span>All changes saved</span>
        </CardFooter>
      </Card>
      <Card
        data-testid="card-dense"
        density="dense"
        aria-labelledby="card-dense-title"
      >
        <CardHeader>
          <CardTitle level={2} id="card-dense-title">
            Recent activity
          </CardTitle>
          <CardDescription>
            A compact summary of your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>{'Label <script> & text'}</p>
        </CardContent>
        <CardFooter>
          <span>3 updates</span>
          <span>Ready to review</span>
        </CardFooter>
      </Card>
    </section>
  )
}
