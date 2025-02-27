'use client';

import {useRouter} from "next/navigation";

export default function ConfigPage() {
  return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Configuration</h1>
        <p className="text-gray-600">Bienvenue dans la section de configuration. Sélectionnez une option pour modifier les paramètres.</p>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg shadow-sm hover:shadow-md cursor-pointer">
            <h2 className="text-lg font-semibold">Général</h2>
            <p className="text-sm text-gray-500">Modifier les paramètres généraux de l'application.</p>
          </div>
          <div className="p-4 border rounded-lg shadow-sm hover:shadow-md cursor-pointer">
            <h2 className="text-lg font-semibold">Utilisateurs</h2>
            <p className="text-sm text-gray-500">Gérer les utilisateurs et leurs permissions.</p>
          </div>
          <div className="p-4 border rounded-lg shadow-sm hover:shadow-md cursor-pointer">
            <h2 className="text-lg font-semibold">Sécurité</h2>
            <p className="text-sm text-gray-500">Configurer les options de sécurité et d'accès.</p>
          </div>
          <div className="p-4 border rounded-lg shadow-sm hover:shadow-md cursor-pointer">
            <h2 className="text-lg font-semibold">Intégrations</h2>
            <p className="text-sm text-gray-500">Gérer les services et API connectés.</p>
          </div>
        </div>
      </div>
  );
}