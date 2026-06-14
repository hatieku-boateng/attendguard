import { createFacultyAction } from "@/app/admin/actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireRole } from "@/lib/auth";

export default async function NewFacultyPage() {
  await requireRole("administrator");

  return (
    <>
      <PageHeader
        title="Add faculty"
        description="Create a faculty that can own departments, students, and catalogue entries."
      />
      <Card className="mx-auto max-w-2xl">
        <CardContent className="pt-6">
          <form action={createFacultyAction} className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Faculty name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Faculty code</Label>
              <Input className="uppercase-input" id="code" name="code" required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={4} />
            </div>
            <Button className="sm:col-span-2" type="submit">
              Create faculty
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
