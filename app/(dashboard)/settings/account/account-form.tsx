'use client';

import { useEffect, useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SelectLanguage from './select-language';
import { DatePicker } from '@/components/ui/datepicker';
import { signIn, useSession } from 'next-auth/react';

interface UserSettings {
  username: string;
  name: string;
  birthdate: Date;
  language: string;
}

export default function AccountSettingsPage() {
  const { data: session, status } = useSession();
  const [formData, setFormData] = useState<UserSettings>({
    username: '',
    name: '',
    birthdate: new Date(),
    language: ''
  });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!session?.user?.name) return;
    fetch(`/api/user?name=${session.user.name}`)
      .then((res) => res.json())
      .then((data) => {
        setFormData({
          username: data.username || '',
          name: data.name || '',
          birthdate: data.birthdate || '',
          language: data.language || ''
        });
      })
      .catch((err) => {
        console.error('Error loading settings:', err);
      });
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    await fetch('/api/user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    setUpdating(false);
  };

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
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            placeholder="Your name"
            value={formData.name}
            disabled
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
            value={formData.birthdate}
            onChange={(value) => setFormData({ ...formData, birthdate: value })}
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
          <SelectLanguage
            value={formData.language}
            onChange={(value) => setFormData({ ...formData, language: value })}
          />
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
          disabled={updating}
        >
          {updating ? 'Updating...' : 'Update account'}
        </Button>
      </form>
    </div>
  );
}
