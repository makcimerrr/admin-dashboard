import { promises as fs } from 'fs';
// @ts-ignore
import Papa from 'papaparse';
import { db, students } from '@/lib/db';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    // Lire le fichier CSV
    const csvFile = await fs.readFile('/Users/maximedubois/Downloads/Promo 2022/Promo 2022 bae7836236b54ce380a9f87ce4e265e9/Sans titre f2f20e7bf14a40af849836b6b3996e19.csv', 'utf8');

    // Parser le contenu CSV
    const parsedData = Papa.parse(csvFile, {
      header: true, // Utiliser la première ligne comme noms de colonnes
      skipEmptyLines: true
    });

    if (parsedData.errors.length > 0) {
      throw new Error(`Erreur lors du parsing CSV : ${parsedData.errors[0].message}`);
    }

    // Récupérer le dernier ID existant dans la table
    // @ts-ignore
    const lastRecord = await db.select().from(students).orderBy('id', 'desc').limit(1);
    const maxId = lastRecord.length > 0 ? lastRecord[0].id : 0; // Récupère l'ID maximum ou 0 si la table est vide

    // Transformer les données
    const records = parsedData.data.map(
      (row: { Photo: any; Nom: any; Prénom: any; Login: any }) => ({
        imageUrl: row.Photo, // Correspond à la colonne "Photo"
        last_name: row.Nom, // Correspond à la colonne "Nom"
        first_name: row.Prénom, // Correspond à la colonne "Prénom"
        login: row.Login, // Correspond à la colonne "Login"
        promos: 'P1 2022', // Valeur statique ou dynamique
        availableAt: new Date() // Date actuelle
      })
    );

    // Insérer les nouveaux enregistrements dans la base de données
    await db.insert(students).values(records);

    return Response.json({
      message: 'Données insérées avec succès !'
    });
  } catch (error) {
    console.error('Erreur:', error);
    return Response.json(
      { message: 'Une erreur est survenue lors de l\'insertion.' },
      { status: 500 }
    );
  }
}
/*
export async function GET() {
  // return Response.json({
  //   message: 'Uncomment to seed data after DB is set up.'
  // });

  await db.insert(products).values([
    {
      id: 1,
      imageUrl:
        'https://uwja77bygk2kgfqe.public.blob.vercel-storage.com/smartphone-gaPvyZW6aww0IhD3dOpaU6gBGILtcJ.webp',
      name: 'Smartphone X Pro',
      status: 'active',
      price: '999.00',
      stock: 150,
      availableAt: new Date()
    },
    {
      id: 2,
      imageUrl:
        'https://uwja77bygk2kgfqe.public.blob.vercel-storage.com/earbuds-3rew4JGdIK81KNlR8Edr8NBBhFTOtX.webp',
      name: 'Wireless Earbuds Ultra',
      status: 'active',
      price: '199.00',
      stock: 300,
      availableAt: new Date()
    },
    {
      id: 3,
      imageUrl:
        'https://uwja77bygk2kgfqe.public.blob.vercel-storage.com/home-iTeNnmKSMnrykOS9IYyJvnLFgap7Vw.webp',
      name: 'Smart Home Hub',
      status: 'active',
      price: '149.00',
      stock: 200,
      availableAt: new Date()
    },
    {
      id: 4,
      imageUrl:
        'https://uwja77bygk2kgfqe.public.blob.vercel-storage.com/tv-H4l26crxtm9EQHLWc0ddrsXZ0V0Ofw.webp',
      name: '4K Ultra HD Smart TV',
      status: 'active',
      price: '799.00',
      stock: 50,
      availableAt: new Date()
    },
    {
      id: 5,
      imageUrl:
        'https://uwja77bygk2kgfqe.public.blob.vercel-storage.com/laptop-9bgUhjY491hkxiMDeSgqb9R5I3lHNL.webp',
      name: 'Gaming Laptop Pro',
      status: 'active',
      price: '1299.00',
      stock: 75,
      availableAt: new Date()
    },
    {
      id: 6,
      imageUrl:
        'https://uwja77bygk2kgfqe.public.blob.vercel-storage.com/headset-lYnRnpjDbZkB78lS7nnqEJFYFAUDg6.webp',
      name: 'VR Headset Plus',
      status: 'active',
      price: '349.00',
      stock: 120,
      availableAt: new Date()
    },
    {
      id: 7,
      imageUrl:
        'https://uwja77bygk2kgfqe.public.blob.vercel-storage.com/watch-S2VeARK6sEM9QFg4yNQNjHFaHc3sXv.webp',
      name: 'Smartwatch Elite',
      status: 'active',
      price: '249.00',
      stock: 250,
      availableAt: new Date()
    },
    {
      id: 8,
      imageUrl:
        'https://uwja77bygk2kgfqe.public.blob.vercel-storage.com/speaker-4Zk0Ctx5AvxnwNNTFWVK4Gtpru4YEf.webp',
      name: 'Bluetooth Speaker Max',
      status: 'active',
      price: '99.00',
      stock: 400,
      availableAt: new Date()
    },
    {
      id: 9,
      imageUrl:
        'https://uwja77bygk2kgfqe.public.blob.vercel-storage.com/charger-GzRr0NSkCj0ZYWkTMvxXGZQu47w9r5.webp',
      name: 'Portable Charger Super',
      status: 'active',
      price: '59.00',
      stock: 500,
      availableAt: new Date()
    },
    {
      id: 10,
      imageUrl:
        'https://uwja77bygk2kgfqe.public.blob.vercel-storage.com/thermostat-8GnK2LDE3lZAjUVtiBk61RrSuqSTF7.webp',
      name: 'Smart Thermostat Pro',
      status: 'active',
      price: '199.00',
      stock: 175,
      availableAt: new Date()
    }
  ]);
}
*/
