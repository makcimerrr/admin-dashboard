'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import ThemeSwitcher from './theme-switcher';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useTheme } from 'next-themes';

export default function AppearanceSettingsPage() {
  const [font, setFont] = useState('inter');
  const [theme, setTheme] = useState('system');
  const { setTheme: applyTheme } = useTheme();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFont = localStorage.getItem('font');
      const savedTheme = localStorage.getItem('theme');
      if (savedFont) setFont(savedFont);
      if (savedTheme) setTheme(savedTheme);
    }
  }, []);

  const handleSubmit = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('font', font);
      localStorage.setItem('theme', theme);
    }
    applyTheme(theme);
    toast.success('Preferences updated successfully');
  };

  return (
    <div className="flex-1 lg:max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">Appearance</h3>
        <p className="text-sm text-muted-foreground">
          Customize the appearance of the app. Automatically switch between day
          and night themes.
        </p>
      </div>
      <Separator />
      <form className="space-y-8" onSubmit={handleSubmit}>
        {/* Font Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Font</label>
          <Select value={font} onValueChange={setFont}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a font" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inter">Inter</SelectItem>
              <SelectItem value="manrope">Manrope</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[0.8rem] text-muted-foreground">
            Set the font you want to use in the dashboard.
          </p>
        </div>

        {/* Theme Selection */}
        <div className="space-y-2">
          <Label>Theme</Label>
          <p className="text-[0.8rem] text-muted-foreground">
            Select the theme for the dashboard.
          </p>
          <ThemeSwitcher value={theme} onValueChange={setTheme} />
        </div>

        <Button type="submit">Update preferences</Button>
      </form>
    </div>
  );
}
