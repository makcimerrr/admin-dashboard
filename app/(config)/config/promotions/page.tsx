'use client';

import {useRouter} from "next/navigation";

export default function ConfigPage() {
    const router = useRouter()
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Configuration</h1>
            <p className="text-gray-600">Bienvenue dans la section de configuration. Sélectionnez une option pour modifier les paramètres.</p>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg shadow-sm hover:shadow-md cursor-pointer" onClick={() => router.push('/config/promotions/list')}>
                    <h2 className="text-lg font-semibold">Liste des promotions</h2>
                    <p className="text-sm text-gray-500">Retrouvez les informations sur les promotions.</p>
                </div>
                <div className="p-4 border rounded-lg shadow-sm hover:shadow-md cursor-pointer" onClick={() => router.push('/config/promotions/timeline')}>
                    <h2 className="text-lg font-semibold">Timeline</h2>
                    <p className="text-sm text-gray-500">Analysez l'avancement des promotions.</p>
                </div>
            </div>
        </div>
    );
}