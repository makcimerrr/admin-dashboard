"use client";

import React, { useEffect, useState } from "react";
import { Toggle } from "@/components/ui/toggle"; // Assurez-vous que votre toggle est déjà configuré
import {Sun, Moon} from "lucide-react";

const DarkModeToggle = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Charger la préférence de mode sombre depuis le localStorage lors du premier rendu
  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode") === "true";
    setIsDarkMode(savedMode);
    if (savedMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Fonction pour basculer entre mode clair et sombre
  const handleToggle = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem("darkMode", newMode.toString());
    if (newMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <Toggle
      onPressedChange={handleToggle}
      pressed={isDarkMode}
      className="w-9 h-9 flex items-center justify-center rounded-lg"
    >
      {isDarkMode ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </Toggle>
  );
};

export default DarkModeToggle;