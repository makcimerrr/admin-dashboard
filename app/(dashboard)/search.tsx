'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/icons';
import { Search } from 'lucide-react';

export function SearchInput() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Fonction pour récupérer les paramètres existants dans l'URL (promo)
  const getPromoFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('promo') || ''; // Retourne la promo existante ou une chaîne vide si aucune promo n'est sélectionnée
  };

  function searchAction(formData: FormData) {
    let value = formData.get('q') as string;
    let promo = getPromoFromUrl();  // Récupérer la promo actuelle depuis l'URL
    let params = new URLSearchParams({ q: value });

    // Si une promo est sélectionnée, l'ajouter aux paramètres
    if (promo) {
      params.set('promo', promo);
    }

    startTransition(() => {
      router.replace(`/students/?${params.toString()}`);
    });
  }

  return (
    <form action={searchAction} className="relative ml-auto flex-1 md:grow-0">
      <Search className="absolute left-2.5 top-[.75rem] h-4 w-4 text-muted-foreground" />
      <Input
        name="q"
        type="search"
        placeholder="Search..."
        className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
      />
      {isPending && <Spinner />}
    </form>
  );
}