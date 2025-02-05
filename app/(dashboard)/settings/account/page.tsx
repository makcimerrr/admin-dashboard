import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/datepicker';
import SelectLanguage from "./select-language";

export default function AccountSettingsPage() {
  return (
      <div className="flex-1 lg:max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">Account</h3>
        <p className="text-sm text-muted-foreground">
          Update your account settings. Set your preferred language and
          timezone.
        </p>
      </div>
      <Separator />
      <form className="space-y-8">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            placeholder="Your name"
            aria-describedby="name-description"
          />
          <p
            id="name-description"
            className="text-[0.8rem] text-muted-foreground"
          >
            This is the name that will be displayed on your profile and in
            emails.
          </p>
        </div>
        <div className="space-y-2 flex flex-col">
          <Label htmlFor="birthdate">Date of birth</Label>
          <DatePicker
            aria-describedby="birthdate-description"
            aria-invalid="false"
          />
          <p
            id="birthdate-description"
            className="text-[0.8rem] text-muted-foreground"
          >
            Your date of birth is used to calculate your age.
          </p>
        </div>
        <div className="space-y-2 flex flex-col">
          <Label htmlFor="language">Language</Label>
          <SelectLanguage/>
          <p
            id="language-description"
            className="text-[0.8rem] text-muted-foreground"
          >
            This is the language that will be used in the dashboard.
          </p>
        </div>
        <Button
          type="submit"
          variant={'default'}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
        >
          Update account
        </Button>
      </form>
    </div>
  );
}
