'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast'; // Importer react-hot-toast

const ClientExport = () => {
    const [isInMaintenance, setIsInMaintenance] = useState(false);

    const handleClick = () => {
        setIsInMaintenance(true); // Le bouton devient inactif pendant la maintenance
        toast.error('Cette fonctionnalité est en maintenance.', { duration: 3000 }); // Message d'erreur qui reste affiché 3 secondes

        // Optionnellement, tu pourrais réactiver le bouton après un délai si nécessaire
        setTimeout(() => {
            setIsInMaintenance(false); // Réactive le bouton si nécessaire
        }, 3000);
    };

    return (
        <div className="relative">
            <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1 export-button relative hover:cursor-not-allowed"
                onClick={handleClick}
                disabled={isInMaintenance} // Désactiver le bouton pendant la maintenance
            >
                {isInMaintenance ? 'En maintenance' : 'Exporter'}
            </Button>
        </div>
    );
};

export default ClientExport;