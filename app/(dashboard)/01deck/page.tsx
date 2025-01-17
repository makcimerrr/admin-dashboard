'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (currentUser && !isNotified) {
        toast.success(`Bienvenue, ${currentUser.displayName}!`);
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
      toast.error('Erreur lors de la connexion : ' + error.message);
    }
  };

  // Fonction pour se déconnecter
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success('Vous êtes déconnecté !');
    } catch (error: any) {
      toast.error('Erreur lors de la déconnexion : ' + error.message);
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
      toast.error("Erreur lors de la récupération de l'ID.");
    }
  };

  // Fonction pour formater l'ID de manière consistante ("card_001", "card_002", ...)
  const formatCardId = (id: number) => {
    return `card_${id.toString().padStart(3, '0')}`; // Assure que l'ID a toujours 3 chiffres
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Vous devez être connecté pour créer une carte.');
      return;
    }

    // Vérification des champs requis
    const isCardValid = () => {
      if (!formData.name.trim()) return false;

      switch (selectedType) {
        case 'complement':
          return formData.definition.trim() && formData.answer.trim();
        case 'definition':
          return formData.answer.trim() && formData.explanation.trim();
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
            formData.answers.trim()
          );
        default:
          return false;
      }
    };

    if (!isCardValid()) {
      toast.error('Veuillez remplir tous les champs requis avant de soumettre.');
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
        answers: formData.answers.split(',').map((answer) => answer.trim()),
      };

      await setDoc(doc(db, 'cards', cardId), cardData);
      toast.success('Carte créée avec succès ! 🎉');

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
        answers: '',
      });
      fetchNextId(); // Récupère l'ID suivant pour la prochaine carte
    } catch (error: any) {
      toast.error('Erreur lors de la création : ' + error.message);
    }
  };

  const renderFields = () => {
    switch (selectedType) {
      case 'complement':
        return (
          <>
            <label className="text-gray-700">Définition</label>
            <textarea
              name="definition"
              value={formData.definition}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-black-500"
              placeholder="Entrez la définition..."
            />
            <label className="text-gray-700">Réponse</label>
            <input
              name="answer"
              value={formData.answer}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-black-500"
              placeholder="Entrez la réponse..."
            />
            <label className="text-gray-700">
              Indices (séparés par des virgules)
            </label>
            <input
              name="hints"
              value={formData.hints}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-black-500"
              placeholder="Exemple : indice1, indice2"
            />
          </>
        );
      case 'definition':
      case 'graphique':
        return (
          <>
            <label className="block text-gray-700 font-bold">
              Options (séparées par des ;)
            </label>
            <textarea
              name="options"
              value={formData.options}
              onChange={handleInputChange}
              className="w-full p-2 border rounded mb-4"
              placeholder="Exemple : option1;option2"
            />

            <label className="block text-gray-700 font-bold">
              Index de la bonne réponse
            </label>
            <input
              type="number"
              name="correctOptionIndex"
              value={formData.correctOptionIndex}
              onChange={handleInputChange}
              className="w-full p-2 border rounded mb-4"
              placeholder="Index de 0 à N"
            />

            <label className="block text-gray-700 font-bold">Explication</label>
            <textarea
              name="explanation"
              value={formData.explanation}
              onChange={handleInputChange}
              className="w-full p-2 border rounded mb-4"
              placeholder="Entrez l'explication..."
            />

            {selectedType === 'graphique' && (
              <>
                <label className="block text-gray-700 font-bold">
                  URL de l'image
                </label>
                <input
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
            <label className="text-gray-700">
              Phrase avec des trous (indiquez {`{}`} pour les trous)
            </label>
            <textarea
              name="sentence"
              value={formData.sentence}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-black-500"
              placeholder="Entrez la phrase contenant des trous..."
            />
            <label className="text-gray-700">
              Réponses (séparées par des virgules)
            </label>
            <input
              name="answers"
              value={formData.answers}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-black-500"
              placeholder="Exemple : reponse1, reponse2"
            />
            <label className="text-gray-700">
              Indices (séparés par des virgules)
            </label>
            <input
              name="hints"
              value={formData.hints}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-black-500"
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
      <div className="bg-gray-100 p-4 rounded-lg mt-8 shadow-lg w-full">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          {formData.name || 'Nom de la carte'}
        </h3>

        {/* Complément */}
        {selectedType === 'complement' && (
          <div>
            <p className="text-sm text-gray-600">
              <strong>Définition:</strong>{' '}
              {formData.definition || 'Aucune définition'}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Réponse:</strong> {formData.answer || 'Aucune réponse'}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Indices:</strong>{' '}
              {formData.hints
                ? formData.hints.split(',').join(', ')
                : 'Aucun indice'}
            </p>
          </div>
        )}

        {/* Définition */}
        {selectedType === 'definition' && (
          <div>
            <p className="text-sm text-gray-600">
              <strong>Réponse:</strong> {formData.answer || 'Aucune réponse'}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Explication:</strong>{' '}
              {formData.explanation || 'Aucune explication'}
            </p>
          </div>
        )}

        {/* Graphique */}
        {selectedType === 'graphique' && (
          <div>
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
              { formData.imageUrl ? (
                <img
                  src={formData.imageUrl}
                  alt="Image de la carte"
                  className="w-full h-48 object-cover mt-2"
                />
              ) : (
                'Aucune image'
              )}
            </p>
          </div>
        )}

        {/* Trou */}
        {selectedType === 'trou' && (
          <div>
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
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col justify-center items-center p-6">
      {!user ? (
        <>
          <button
            onClick={handleGoogleSignIn}
            className="bg-black text-white py-3 px-6 rounded-full text-lg shadow-lg hover:bg-gray-900 transition duration-300"
          >
            Connexion avec Google
          </button>
        </>
      ) : (
        <>
          <div className="flex justify-between w-full max-w-3xl mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">
              Bienvenue, {user.displayName}
            </h1>
            <button
              onClick={handleSignOut}
              className="text-red-500 underline hover:text-red-700"
            >
              Déconnexion
            </button>
          </div>
          <div className="bg-white shadow-xl rounded-lg p-8 max-w-3xl w-full">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Créer une carte
            </h2>
            <form onSubmit={handleSubmit}>
              <label className="text-gray-700">Type de carte</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-black-500"
              >
                <option value="complement">Complément</option>
                <option value="definition">Définition</option>
                <option value="graphique">Graphique</option>
                <option value="trou">Trou</option>
              </select>
              <label className="text-gray-700">Catégorie</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-black-500"
              >
                <option value="Gestion de Projet Agile">Gestion de Projet Agile</option>
                <option value="Conception">Conception</option>
                <option value="Maquettage">Maquettage</option>
                <option value="Développement">Développement</option>
              </select>
              <label className="text-gray-700">Nom de la carte</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-black-500"
                placeholder="Entrez le nom de la carte..."
              />
              {renderFields()}
              <div className="flex justify-center mt-4">
                <button
                  type="submit"
                  className="bg-black text-white py-2 px-6 rounded-lg hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-black-500 transition duration-300"
                >
                  Enregistrer
                </button>
              </div>
            </form>
            {renderCardPreview()}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminScreen;
