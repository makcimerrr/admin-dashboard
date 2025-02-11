'use client';

import * as React from 'react';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

interface SelectLanguageProps {
  value?: string;
  onChange?: (value: any) => void;
}

export default function SelectLanguage({
  value,
  onChange
}: SelectLanguageProps) {
  const setValue = (value: any) => {
    onChange?.(value);
  };

  return (
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select a language">
          {value
            ? {
                en: 'English',
                fr: 'French',
                es: 'Spanish',
                ge: 'German',
                ch: 'Chinese'
              }[value] || 'Select a language'
            : 'Select a language'}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Languages</SelectLabel>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="fr">French</SelectItem>
          <SelectItem value="es">Spanish</SelectItem>
          <SelectItem value="ge">German</SelectItem>
          <SelectItem value="ch">Chinese</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
