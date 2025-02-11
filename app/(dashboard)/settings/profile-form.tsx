'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface UserSettings {
  username: string;
  email: string;
  bio: string;
  urls: string[];
}

export default function SettingsForm() {
  const { data: session, status } = useSession();
  const [formData, setFormData] = useState<UserSettings>({
    username: '',
    email: '',
    bio: '',
    urls: ['']
  });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!session?.user?.name) return;
    fetch(`/api/user?name=${session.user.name}`)
      .then((res) => res.json())
      .then((data) => {
        setFormData({
          username: data.username || '',
          email: data.email || '',
          bio: data.bio || '',
          urls: data.urls?.length ? data.urls : ['']
        });
      })
      .catch((err) => {
        console.error('Error loading settings:', err);
      });
  }, [session]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleUrlChange = (index: number, value: string) => {
    setFormData((prev) => {
      const newUrls = [...prev.urls];
      newUrls[index] = value;
      return { ...prev, urls: newUrls };
    });
  };

  const handleAddUrl = () => {
    setFormData((prev) => ({
      ...prev,
      urls: [...prev.urls, '']
    }));
  };

  const handleRemoveUrl = (index: number) => {
    setFormData((prev) => {
      const newUrls = prev.urls.filter((_, i) => i !== index);
      return { ...prev, urls: newUrls.length ? newUrls : [''] };
    });
  };

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
        <h3 className="text-lg font-medium">Profile</h3>
        <p className="text-sm text-muted-foreground">
          This is how others will see you on the site.
        </p>
      </div>
      <Separator />
      <form onSubmit={handleSubmit} className="space-y-6 mt-6">
        {/* Username */}
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            placeholder="shadcn"
            value={formData.username}
            disabled
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            placeholder="Select a verified email to display"
            value={formData.email}
            disabled
          />
          <p className="text-[0.8rem] text-muted-foreground">
            You can manage verified email addresses in your{' '}
            <a href="/settings/email" className="underline">
              email settings
            </a>
            .
          </p>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            placeholder="Tell us a little bit about yourself"
          />
        </div>

        {/* URLs */}
        <div className="space-y-2">
          <Label>URLs</Label>
          {formData.urls.map((url, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder={`URL ${index + 1}`}
                value={url}
                onChange={(e) => handleUrlChange(index, e.target.value)}
              />
              <Button
                variant="destructive"
                type="button"
                onClick={() => handleRemoveUrl(index)}
              >
                ✕
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            type="button"
            className="mt-2"
            onClick={handleAddUrl}
          >
            Add URL
          </Button>
        </div>

        {/* Submit Button */}
        <Button type="submit" disabled={updating}>
          {updating ? 'Updating...' : 'Update profile'}
        </Button>
      </form>
    </div>
  );
}
