'use client';

import React, { useState, useEffect } from 'react';
import { notif } from 'react-hot-toast';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  setDoc,
  doc
} from 'firebase/firestore';
import { firebaseApp } from 'firebase-config'; // Votre configuration Firebase
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from "@/components/hooks/use-toast"

const AdminScreen: React.FC = () => {
  const db = getFirestore(firebaseApp); // Firestore Initialization
  const auth = getAuth(firebaseApp);
  const provider = new GoogleAuthProvider();

  const [user, setUser] = useState<any>(null);
  const [nextId, setNextId] = useState<number>(1);
  const [selectedType, setSelectedType] = useState<string>('complement');
  const [selectedCategory, setSelectedCategory] =
    useState<string>('Conception');
  const [formData, setFormData] = useState({
    name: '',
    definition: '',
    answer: '',
    hints: '',
    options: '',
    correctOptionIndex: '',
    explanation: '',
    imageUrl: '',
    sentence: '',
    answers: ''
  });

  // Suivre l'état de l'authentification
  const [isNotified, setIsNotified] = useState(false);

  const { toast } = useToast()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (currentUser && !isNotified) {
        notif.success(`Bienvenue, ${currentUser.displayName}!`);
        toast({
          title: "Scheduled: Catch up",
          description: "Friday, February 10, 2023 at 5:57 PM",
        })
        setIsNotified(true); // Marque la notification comme affichée
      }
    });

    return () => unsubscribe(); // Nettoyage à la fin
  }, [auth, isNotified]);

  // Fonction pour se connecter avec Google
  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      notif.error('Erreur lors de la connexion : ' + error.message);
    }
  };

  // Fonction pour se déconnecter
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      notif.success('Vous êtes déconnecté !');
    } catch (error: any) {
      notif.error('Erreur lors de la déconnexion : ' + error.message);
    }
  };

  useEffect(() => {
    if (user) fetchNextId().then((r) => r);
  }, [user]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Récupérer le prochain ID
  const fetchNextId = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'cards'));
      const newId = querySnapshot.size + 1;
      setNextId(newId); // Met à jour le prochain ID
    } catch (error) {
      notif.error("Erreur lors de la récupération de l'ID.");
    }
  };

  // Fonction pour formater l'ID de manière consistante ("card_001", "card_002", ...)
  const formatCardId = (id: number) => {
    return `card_${id.toString().padStart(3, '0')}`; // Assure que l'ID a toujours 3 chiffres
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      notif.error('Vous devez être connecté pour créer une carte.');
      return;
    }

    // Vérification des champs requis
    const isCardValid = () => {
      if (!formData.name.trim()) return false;

      switch (selectedType) {
        case 'complement':
          return (
            formData.definition.trim() &&
            formData.answer.trim() &&
            formData.hints.trim()
          );
        case 'definition':
          return (
            formData.options.trim() &&
            formData.explanation.trim() &&
            !isNaN(parseInt(formData.correctOptionIndex))
          );
        case 'graphique':
          return (
            formData.options.trim() &&
            formData.correctOptionIndex &&
            !isNaN(parseInt(formData.correctOptionIndex)) &&
            formData.explanation.trim()
          );
        case 'trou':
          return (
            formData.sentence.trim() &&
            formData.answers.trim() &&
            formData.hints.trim()
          );
        default:
          return false;
      }
    };

    if (!isCardValid()) {
      notif.error(
        'Veuillez remplir tous les champs requis avant de soumettre.'
      );
      return;
    }

    try {
      const cardId = formatCardId(nextId); // Format l'ID en "card_001", "card_002", ...

      const cardData = {
        ...formData,
        id: cardId, // Gardez l'ID dans les données
        type: selectedType,
        category: selectedCategory,
        hints: formData.hints.split(',').map((hint) => hint.trim()),
        options: formData.options.split(';').map((option) => option.trim()),
        correctOptionIndex: parseInt(formData.correctOptionIndex) || null,
        answers: formData.answers.split(',').map((answer) => answer.trim())
      };

      await setDoc(doc(db, 'cards', cardId), cardData);
      notif.success('Carte créée avec succès ! 🎉');

      // Réinitialisation du formulaire
      setFormData({
        name: '',
        definition: '',
        answer: '',
        hints: '',
        options: '',
        correctOptionIndex: '',
        explanation: '',
        imageUrl: '',
        sentence: '',
        answers: ''
      });
      fetchNextId(); // Récupère l'ID suivant pour la prochaine carte
    } catch (error: any) {
      notif.error('Erreur lors de la création : ' + error.message);
    }
  };

  const renderFields = () => {
    switch (selectedType) {
      case 'complement':
        return (
          <>
            <Label className="">Définition</Label>
            <Textarea
              name="definition"
              value={formData.definition}
              onChange={handleInputChange}
              className="w-full p-2 border  rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-black-500"
              placeholder="Entrez la définition..."
            />
            <Label className="">Réponse</Label>
            <Input
              name="answer"
              value={formData.answer}
              onChange={handleInputChange}
              className="w-full p-2 border  rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-black-500"
              placeholder="Entrez la réponse..."
            />
            <Label className="">Indices (séparés par des virgules)</Label>
            <Input
              name="hints"
              value={formData.hints}
              onChange={handleInputChange}
              className="w-full p-2 border  rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-black-500"
              placeholder="Exemple : indice1, indice2"
            />
          </>
        );
      case 'definition':
      case 'graphique':
        return (
          <>
            <Label className="block  font-bold">
              Options (séparées par des ;)
            </Label>
            <Textarea
              name="options"
              value={formData.options}
              onChange={handleInputChange}
              className="w-full p-2 border rounded mb-4"
              placeholder="Exemple : option1;option2"
            />

            <Label className="block  font-bold">
              Index de la bonne réponse
            </Label>
            <Input
              type="number"
              name="correctOptionIndex"
              value={formData.correctOptionIndex}
              onChange={handleInputChange}
              className="w-full p-2 border rounded mb-4"
              placeholder="Index de 0 à N"
            />

            <Label className="block  font-bold">Explication</Label>
            <Textarea
              name="explanation"
              value={formData.explanation}
              onChange={handleInputChange}
              className="w-full p-2 border rounded mb-4"
              placeholder="Entrez l'explication..."
            />

            {selectedType === 'graphique' && (
              <>
                <Label className="block  font-bold">URL de l'image</Label>
                <Input
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded mb-4"
                  placeholder="Entrez l'URL de l'image..."
                />
              </>
            )}
          </>
        );
      case 'trou':
        return (
          <>
            <Label className="">
              Phrase avec des trous (indiquez {`{}`} pour les trous)
            </Label>
            <Textarea
              name="sentence"
              value={formData.sentence}
              onChange={handleInputChange}
              className="w-full p-2 border  rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-black-500"
              placeholder="Entrez la phrase contenant des trous..."
            />
            <Label className="">Réponses (séparées par des virgules)</Label>
            <Input
              name="answers"
              value={formData.answers}
              onChange={handleInputChange}
              className="w-full p-2 border  rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-black-500"
              placeholder="Exemple : reponse1, reponse2"
            />
            <Label className="">Indices (séparés par des virgules)</Label>
            <Input
              name="hints"
              value={formData.hints}
              onChange={handleInputChange}
              className="w-full p-2 border  rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-black-500"
              placeholder="Exemple : indice1, indice2"
            />
          </>
        );
      default:
        return null;
    }
  };

  const renderCardPreview = () => {
    return (
      <Card className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mt-8 shadow-lg w-full">
        <CardTitle className="text-xl font-semibold mb-2">
          {formData.name || 'Nom de la carte'}
        </CardTitle>

        {/* Complément */}
        {selectedType === 'complement' && (
          <CardContent>
            <p className="text-sm ">
              <strong>Définition:</strong>{' '}
              {formData.definition || 'Aucune définition'}
            </p>
            <p className="text-sm ">
              <strong>Réponse:</strong> {formData.answer || 'Aucune réponse'}
            </p>
            <p className="text-sm ">
              <strong>Indices:</strong>{' '}
              {formData.hints
                ? formData.hints.split(',').join(', ')
                : 'Aucun indice'}
            </p>
          </CardContent>
        )}

        {/* Définition */}
        {selectedType === 'definition' && (
          <CardContent>
            <p className="text-sm">
              <strong>Options:</strong>{' '}
              {formData.options
                ? formData.options.split(';').join(', ')
                : 'Aucune option'}
            </p>
            <p className="text-sm">
              <strong>Index de la bonne réponse:</strong>{' '}
              {formData.correctOptionIndex || 'Pas de réponse spécifiée'}
            </p>
            <p className="text-sm">
              <strong>Explication:</strong>{' '}
              {formData.explanation || 'Aucune explication'}
            </p>
          </CardContent>
        )}

        {/* Graphique */}
        {selectedType === 'graphique' && (
          <CardContent>
            <p className="text-sm text-gray-600">
              <strong>Options:</strong>{' '}
              {formData.options
                ? formData.options.split(';').join(', ')
                : 'Aucune option'}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Index de la bonne réponse:</strong>{' '}
              {formData.correctOptionIndex || 'Pas de réponse spécifiée'}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Explication:</strong>{' '}
              {formData.explanation || 'Aucune explication'}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Image:</strong>
              {formData.imageUrl ? (
                <img
                  src={formData.imageUrl}
                  alt="Image de la carte"
                  className="w-full h-48 object-cover mt-2"
                />
              ) : (
                'Aucune image'
              )}
            </p>
          </CardContent>
        )}

        {/* Trou */}
        {selectedType === 'trou' && (
          <CardContent>
            <p className="text-sm text-gray-600">
              <strong>Phrase avec des trous:</strong>{' '}
              {formData.sentence || 'Aucune phrase définie'}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Réponses attendues:</strong>{' '}
              {formData.answers
                ? formData.answers.split(',').join(', ')
                : 'Aucune réponse attendue'}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Indices:</strong>{' '}
              {formData.hints
                ? formData.hints.split(',').join(', ')
                : 'Aucun indice'}
            </p>
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>01Deck</CardTitle>
        <CardDescription>Create educational cards for the mobile app.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col justify-center items-center p-6">
          {!user ? (
            <>
              <Button variant="default" onClick={handleGoogleSignIn}>
                Connexion avec Google
              </Button>
            </>
          ) : (
            <>
              <div className="flex justify-between w-full max-w-3xl mb-6">
                <h1 className="text-2xl font-semibold">
                  Bienvenue, {user.displayName}
                </h1>
                <Button onClick={handleSignOut} variant="destructive">
                  Déconnexion
                </Button>
              </div>
              <div className="bg-white dark:bg-gray-900 shadow-xl rounded-lg p-8 max-w-3xl w-full">
                <h2 className="text-2xl font-semibold mb-4">Créer une carte</h2>
                <form onSubmit={handleSubmit}>
                  <Label>Type de carte</Label>
                  <Select
                    value={selectedType}
                    onValueChange={(e) => setSelectedType(e)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="complement">Complément</SelectItem>
                      <SelectItem value="definition">Définition</SelectItem>
                      <SelectItem value="graphique">Graphique</SelectItem>
                      <SelectItem value="trou">Trou</SelectItem>
                    </SelectContent>
                  </Select>
                  <Label>Catégorie</Label>
                  <Select
                    value={selectedCategory}
                    onValueChange={(e) => setSelectedCategory(e)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Conception">Conception</SelectItem>
                      <SelectItem value="Maquettage">Maquettage</SelectItem>
                      <SelectItem value="Développement">
                        Développement
                      </SelectItem>
                      <SelectItem value="Versionning et Travail en Groupe">
                        Versionning et Travail en Groupe
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Label>Nom de la carte</Label>
                  <Input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Entrez le nom de la carte..."
                  />
                  {renderFields()}
                  <div className="flex justify-center mt-4">
                    <Button type="submit" variant="outline">
                      Enregistrer
                    </Button>
                  </div>
                </form>
                {renderCardPreview()}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminScreen;
