import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="flex-1 lg:max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">Profile</h3>
        <p className="text-sm text-muted-foreground">
          This is how others will see you on the site.
        </p>
      </div>
      <Separator />
      <form className="space-y-6 mt-6">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input id="username" placeholder="shadcn" name="username" />
          <p className="text-[0.8rem] text-muted-foreground">
            This is your public display name. It can be your real name or a
            pseudonym. You can only change this once every 30 days.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            placeholder="Select a verified email to display"
            disabled
          />
          <p className="text-[0.8rem] text-muted-foreground">
            You can manage verified email addresses in your{' '}
            <a href="/examples/forms" className="underline">
              email settings
            </a>
            .
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            placeholder="Tell us a little bit about yourself"
            name="bio"
          />
          <p className="text-[0.8rem] text-muted-foreground">
            You can <span className="font-bold">@mention</span> other users and
            organizations to link to them.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="urls">URLs</Label>
          <Input
            id="urls"
            placeholder="https://shadcn.com"
            name="urls.0.value"
          />
          <Input placeholder="http://twitter.com/shadcn" name="urls.1.value" />
          <Button variant="outline" className="mt-2">
            Add URL
          </Button>
        </div>
        <Button type="submit">Update profile</Button>
      </form>
    </div>
  );
}
