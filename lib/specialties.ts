/**
 * Définition des spécialités et de leurs projets (dans l'ordre Zone01).
 */
export const SPECIALTIES: Record<string, { label: string; projects: string[] }> = {
  cybersecurity: {
    label: 'Cybersecurity',
    projects: [
      'Passive', 'Inspector-Image', 'Active', 'Injector', 'Mal-Track',
      'Hack-The-VM', 'Obfuscator', 'Inspector-Container', 'Forensic',
      'Reverse-Me', 'Malware',
    ],
  },
  ai: {
    label: 'AI',
    projects: [
      'Kaggle-Titanic', 'Movie-Recommendation', 'Chatbot',
      'Image-Classification', 'Credit-Scoring',
    ],
  },
  blockchain: {
    label: 'Blockchain',
    projects: [
      'NFT-Marketplace', 'Decentralized-Voting',
      'Supply-Chain-Tracker', 'Financial-Instruments',
    ],
  },
  devops: {
    label: 'DevOps',
    projects: [
      'Deep-In-Net', 'Born2beRoot', 'Cloud-Design',
      'Orchestrator', 'Git-Signed', 'CI-Action', 'Code-Keeper',
    ],
  },
  game: {
    label: 'Game',
    projects: [
      'Firing-Range', 'Shoot-Em-Up', 'The-Musical-Platformer',
      'Dungeon-Escape', 'Galactic-Shooter', 'NPC-Forge',
      'Multiplayer-FPS', 'Racing-Madness', 'Stealth-Boom',
    ],
  },
};

export type SpecialtyKey = keyof typeof SPECIALTIES;
