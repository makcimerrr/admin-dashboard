'use client';

import React, { useEffect, useState } from 'react';
import { Toggle } from '@/components/ui/toggle'; // Assurez-vous que votre toggle est déjà configuré
import { Sun, Moon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

const DarkModeToggle = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Vérification du mode sombre dans le localStorage côté client
    const storedDarkMode = localStorage.getItem('darkMode');
    if (storedDarkMode === 'true') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []); // S'exécute une seule fois après le rendu initial

  const toggleDarkMode = () => {
    setIsDarkMode((prevMode) => !prevMode);
  };

  useEffect(() => {
    // Sauvegarder la préférence de l'utilisateur dans le localStorage
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));

    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle onClick={toggleDarkMode} className="p-2">
          {isDarkMode ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
          <span className="sr-only">Dark Mode</span>
        </Toggle>
      </TooltipTrigger>
      <TooltipContent side="right">Dark Mode</TooltipContent>
    </Tooltip>
  );
};

export default DarkModeToggle;
