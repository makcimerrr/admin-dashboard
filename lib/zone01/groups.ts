/**
 * /lib/zone01/groups.ts
 * Service pour récupérer les groupes depuis Zone01
 */

export type Zone01Group = {
    id: string;
    name?: string;
};

export async function fetchZone01GroupsByPromoAndProject(
    promoId: string,
    projectName: string
): Promise<Zone01Group[]> {
    // TODO: remplacer par appel réel à l'API Zone01
    // Exemple avec fetch
    /*
    const res = await fetch(`https://zone01.org/api/groups?promo=${promoId}&project=${projectName}`);
    if (!res.ok) throw new Error('Impossible de récupérer les groupes Zone01');
    return res.json();
    */

    // Mock pour le développement
    return [
        { id: 'alpha', name: 'Groupe Alpha' },
        { id: 'beta', name: 'Groupe Beta' },
        { id: 'gamma', name: 'Groupe Gamma' },
        { id: 'delta', name: 'Groupe Delta' },
    ];
}