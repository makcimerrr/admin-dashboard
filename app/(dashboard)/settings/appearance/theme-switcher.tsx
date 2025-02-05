'use client';

import { useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card } from '@/components/ui/card';

export default function ThemeToggle() {
  const [theme, setTheme] = useState('light');

  return (
    <RadioGroup
      value={theme}
      onValueChange={setTheme}
      className="grid max-w-md grid-cols-2 gap-8 pt-2"
    >
      <label className="space-y-2">
        <RadioGroupItem value="light" className="sr-only" />
        <Card
          className={`items-center rounded-md border-2 p-1 ${theme === 'light' ? 'border-primary' : 'border-muted'} hover:border-primary`}
        >
          <div className="space-y-2 rounded-sm bg-[#ecedef] p-2">
            <div className="space-y-2 rounded-md bg-white p-2 shadow-sm">
              <div className="h-2 w-[80px] rounded-lg bg-[#ecedef]"></div>
              <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]"></div>
            </div>
            <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
              <div className="h-4 w-4 rounded-full bg-[#ecedef]"></div>
              <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]"></div>
            </div>
            <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
              <div className="h-4 w-4 rounded-full bg-[#ecedef]"></div>
              <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]"></div>
            </div>
          </div>
        </Card>
        <span className="block w-full p-2 text-center font-normal">Light</span>
      </label>

      <label className="space-y-2">
        <RadioGroupItem value="dark" className="sr-only" />
        <Card
          className={`items-center rounded-md border-2 p-1 ${theme === 'dark' ? 'border-primary' : 'border-muted'} hover:border-primary`}
        >
          <div className="space-y-2 rounded-sm bg-slate-950 p-2">
            <div className="space-y-2 rounded-md bg-slate-800 p-2 shadow-sm">
              <div className="h-2 w-[80px] rounded-lg bg-slate-400"></div>
              <div className="h-2 w-[100px] rounded-lg bg-slate-400"></div>
            </div>
            <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
              <div className="h-4 w-4 rounded-full bg-slate-400"></div>
              <div className="h-2 w-[100px] rounded-lg bg-slate-400"></div>
            </div>
            <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
              <div className="h-4 w-4 rounded-full bg-slate-400"></div>
              <div className="h-2 w-[100px] rounded-lg bg-slate-400"></div>
            </div>
          </div>
        </Card>
        <span className="block w-full p-2 text-center font-normal">Dark</span>
      </label>
    </RadioGroup>
  );
}
