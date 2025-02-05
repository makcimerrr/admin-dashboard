import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';

export default function NotificationsSettingsPage() {
  return (
    <div className="flex-1 lg:max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">Notifications</h3>
        <p className="text-sm text-muted-foreground">
          Configure how you receive notifications.
        </p>
      </div>
      <Separator />
      <form className="space-y-8">
        <div className="space-y-3">
          <Label>Notify me about...</Label>
          <RadioGroup>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="all" id="all" />
              <Label htmlFor="all">All new messages</Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="mentions" id="mentions" />
              <Label htmlFor="mentions">Direct messages and mentions</Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="none" id="none" />
              <Label htmlFor="none">Nothing</Label>
            </div>
          </RadioGroup>
        </div>
        <h3 className="mb-4 text-lg font-medium">Email Notifications</h3>
        <div className="space-y-6">
          {[
            {
              id: 'communication',
              label: 'Communication emails',
              description: 'Receive emails about your account activity.'
            },
            {
              id: 'marketing',
              label: 'Marketing emails',
              description:
                'Receive emails about new products, features, and more.'
            },
            {
              id: 'social',
              label: 'Social emails',
              description:
                'Receive emails for friend requests, follows, and more.',
              checked: true
            },
            {
              id: 'security',
              label: 'Security emails',
              description:
                'Receive emails about your account activity and security.'
            }
          ].map((item) => (
            <Card key={item.id} className="p-4">
              <CardContent className="flex flex-row items-center justify-between">
                <div>
                  <Label htmlFor={item.id} className="font-medium">
                    {item.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <Switch id={item.id} defaultChecked={item.checked} />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex items-start space-x-2">
          <Checkbox id="mobile-settings" />
          <div className="space-y-1 leading-none">
            <Label htmlFor="mobile-settings">
              Use different settings for my mobile devices
            </Label>
            <p className="text-sm text-muted-foreground">
              You can manage your mobile notifications in the{' '}
              <a href="/settings" className="underline">
                mobile settings
              </a>{' '}
              page.
            </p>
          </div>
        </div>
        <Button variant={'default'} type={'submit'}>
          Update notifications
        </Button>
      </form>
    </div>
  );
}
