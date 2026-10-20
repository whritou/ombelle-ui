// Proposed usage after a real component and recipe have been generated.
// This documentation package does not include that implementation.
import { Button } from "@/components/ui/button"
import "@/styles/ui-recipes/rc_primary-button.css"

export function CreateProjectAction() {
  return (
    <Button
      type="button"
      variant="default"
      size="lg"
      className="ui-recipe-rc_primary-button"
    >
      Create project
    </Button>
  )
}
