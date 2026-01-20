import { db } from '@/lib/db/config';
import { students, studentProjects, studentCurrentProjects, studentSpecialtyProgress } from '@/lib/db/schema';
import { eq, ilike, or, and, count, sql } from 'drizzle-orm';
import type { AnalyzedMessage } from './intent-analyzer';
import { getSearchVariants, normalizeSearchQuery } from './intent-analyzer';

export interface ChatResponse {
  text: string;
  data?: any;
  suggestions?: string[];
  studentIds?: number[];
}

// Normalise un texte pour la comparaison (retire accents, minuscules)
function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export async function generateResponse(analysis: AnalyzedMessage, originalMessage: string): Promise<ChatResponse> {
  switch (analysis.intent) {
    case 'greeting':
      return {
        text: "👋 Bonjour ! Je suis **Nova**, l'assistant intelligent pour le suivi des étudiants de Zone01 Normandie.\n\nJe peux vous aider à :\n• 🔍 **Rechercher** des étudiants (par prénom, nom, ou login)\n• 📊 **Consulter** les statistiques globales\n• 📈 **Suivre** la progression des étudiants\n• 👥 **Lister** les étudiants par statut ou promo\n\n💡 **Astuce** : Tapez simplement un prénom ou nom pour rechercher directement !\n\nQue puis-je faire pour vous ?",
        suggestions: [
          "Statistiques globales",
          "Étudiants en retard",
          "Étudiants validés",
        ],
      };

    case 'help':
      return getHelpResponse();

    case 'get_stats':
      return await getGlobalStats();

    case 'search_student':
      if (analysis.entities.studentId) {
        return await getStudentDetails(analysis.entities.studentId);
      } else if (analysis.entities.studentName || analysis.entities.searchTerms) {
        const searchQuery = analysis.entities.studentName || analysis.entities.searchTerms?.join(' ') || '';
        return await searchStudents(searchQuery, analysis.entities.searchTerms);
      }
      return {
        text: "❓ Veuillez préciser le nom, prénom ou login de l'étudiant que vous recherchez.\n\n💡 Vous pouvez simplement taper un prénom comme \"Maxime\" ou un nom comme \"Dubois\".",
        suggestions: ["Maxime Dubois", "@mdubois", "Aide"],
      };

    case 'get_student_details':
      if (analysis.entities.studentId) {
        return await getStudentDetails(analysis.entities.studentId);
      } else if (analysis.entities.studentName) {
        return await searchStudents(analysis.entities.studentName, analysis.entities.searchTerms);
      }
      return {
        text: "❓ Veuillez préciser l'ID de l'étudiant (ex: #42 ou id 42).",
        suggestions: ["#42", "Recherche un étudiant", "Aide"],
      };

    case 'track_progress':
      if (analysis.entities.studentId) {
        return await getStudentDetails(analysis.entities.studentId);
      } else if (analysis.entities.studentName) {
        return await searchStudents(analysis.entities.studentName, analysis.entities.searchTerms);
      }
      return {
        text: "❓ Veuillez préciser l'étudiant dont vous souhaitez voir la progression.",
        suggestions: ["Progression de Maxime", "Détails #42"],
      };

    case 'list_late_students':
      return await listLateStudents();

    case 'list_validated_students':
      return await listValidatedStudents();

    case 'list_ahead_students':
      return await listAheadStudents();

    case 'list_by_promo':
      if (analysis.entities.promo) {
        return await listByPromo(analysis.entities.promo);
      }
      return await listAllPromos();

    case 'list_by_specialty':
      if (analysis.entities.track) {
        return await listBySpecialty(analysis.entities.track);
      }
      return {
        text: "❓ Quelle spécialité souhaitez-vous consulter ?",
        suggestions: ["Spécialité Golang", "Spécialité JavaScript", "Spécialité Rust"],
      };

    default:
      return {
        text: "🤔 Je n'ai pas bien compris votre question. Essayez l'une de ces approches :\n\n• Tapez directement un **prénom** ou **nom** pour rechercher\n• Utilisez **@login** pour rechercher par login\n• Demandez les **statistiques** ou les **étudiants en retard**\n\n💡 Tapez \"aide\" pour voir toutes mes capacités.",
        suggestions: [
          "Aide",
          "Statistiques globales",
          "Étudiants en retard",
        ],
      };
  }
}

function getHelpResponse(): ChatResponse {
  return {
    text: `💡 **Guide complet de Nova - Assistant Zone01**

🔍 **Recherche d'étudiants**
Vous pouvez rechercher de plusieurs façons :
• Tapez simplement un prénom : \`Maxime\`
• Tapez un nom de famille : \`Dubois\`
• Tapez prénom + nom : \`Maxime Dubois\`
• Recherchez par login : \`@mdubois\` ou \`login mdubois\`
• Recherchez par ID : \`#42\` ou \`id 42\`

📊 **Statistiques**
• "Statistiques globales" ou "Stats"
• "Combien d'étudiants ?"
• "Taux de réussite"

👥 **Listes d'étudiants**
• "Étudiants en retard" - ceux qui ont du retard
• "Étudiants validés" - ceux qui ont terminé
• "Étudiants en avance" - les meilleurs progressions
• "Promo Rouen 2024" - par promotion

🎯 **Spécialités**
• "Étudiants en Golang"
• "Qui fait JavaScript ?"
• "Spécialité Rust"

📈 **Progression**
• "Progression de Maxime"
• "Où en est Dubois ?"
• "Comment va l'étudiant #42 ?"`,
    suggestions: [
      "Statistiques globales",
      "Étudiants en retard",
      "Étudiants validés",
    ],
  };
}

async function getGlobalStats(): Promise<ChatResponse> {
  const totalStudentsResult = await db.select({ count: count() }).from(students).execute();
  const totalStudents = totalStudentsResult[0]?.count || 0;

  // Compter par statut en joignant correctement
  const lateStudentsResult = await db
    .select({ count: sql<number>`count(DISTINCT ${students.id})` })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
    .where(sql`${studentProjects.delay_level} = 'en retard'`)
    .execute();
  const lateStudents = Number(lateStudentsResult[0]?.count) || 0;

  const validatedResult = await db
    .select({ count: sql<number>`count(DISTINCT ${students.id})` })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
    .where(sql`${studentProjects.delay_level} = 'Validé'`)
    .execute();
  const validated = Number(validatedResult[0]?.count) || 0;

  const goodProgressResult = await db
    .select({ count: sql<number>`count(DISTINCT ${students.id})` })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
    .where(
      or(
        sql`${studentProjects.delay_level} = 'bien'`,
        sql`${studentProjects.delay_level} = 'en avance'`
      )
    )
    .execute();
  const goodProgress = Number(goodProgressResult[0]?.count) || 0;

  const specialtyResult = await db
    .select({ count: sql<number>`count(DISTINCT ${students.id})` })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
    .where(sql`${studentProjects.delay_level} = 'spécialité'`)
    .execute();
  const inSpecialty = Number(specialtyResult[0]?.count) || 0;

  // Compter les promos
  const promosResult = await db
    .select({ promoName: students.promoName })
    .from(students)
    .groupBy(students.promoName)
    .execute();
  const totalPromos = promosResult.length;

  const successRate = totalStudents > 0 ? Math.round((validated / totalStudents) * 100) : 0;
  const lateRate = totalStudents > 0 ? Math.round((lateStudents / totalStudents) * 100) : 0;

  // Créer une barre de progression visuelle pour le taux de réussite
  const progressBarLength = 10;
  const filledBars = Math.round((successRate / 100) * progressBarLength);
  const progressBar = '█'.repeat(filledBars) + '░'.repeat(progressBarLength - filledBars);

  return {
    text: `📊 **Statistiques Zone01 Normandie**
━━━━━━━━━━━━━━━━━━━━━━━━

👥 **Total d'étudiants** : ${totalStudents}
📚 **Promotions** : ${totalPromos}

**Répartition par statut :**
🎓 Validés : ${validated} (${successRate}%)
✅ Bonne progression : ${goodProgress}
🎯 En spécialité : ${inSpecialty}
⚠️ En retard : ${lateStudents} (${lateRate}%)

**Taux de réussite** [${progressBar}] ${successRate}%`,
    data: {
      totalStudents,
      totalPromos,
      lateStudents,
      validated,
      goodProgress,
      inSpecialty,
      successRate,
      lateRate,
    },
    suggestions: [
      "Étudiants en retard",
      "Étudiants validés",
      "Étudiants en avance",
      "Liste des promos",
    ],
  };
}

async function searchStudents(query: string, searchTerms?: string[]): Promise<ChatResponse> {
  // Normaliser la requête pour la recherche
  const normalizedQuery = normalizeForSearch(query);
  const terms = searchTerms || [normalizedQuery];

  // Construire les conditions de recherche
  // On cherche sur chaque terme individuellement pour plus de flexibilité
  const searchConditions = terms.flatMap(term => {
    const searchPattern = `%${term}%`;
    return [
      ilike(students.first_name, searchPattern),
      ilike(students.last_name, searchPattern),
      ilike(students.login, searchPattern),
    ];
  });

  // Première recherche : correspondance directe
  let results = await db
    .select({
      id: students.id,
      firstName: students.first_name,
      lastName: students.last_name,
      login: students.login,
      promoName: students.promoName,
      delay_level: studentProjects.delay_level,
    })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
    .where(or(...searchConditions))
    .limit(15)
    .execute();

  // Si pas de résultats, essayer avec la recherche normalisée (sans accents)
  if (results.length === 0 && normalizedQuery !== query.toLowerCase()) {
    const normalizedPattern = `%${normalizedQuery}%`;
    results = await db
      .select({
        id: students.id,
        firstName: students.first_name,
        lastName: students.last_name,
        login: students.login,
        promoName: students.promoName,
        delay_level: studentProjects.delay_level,
      })
      .from(students)
      .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
      .where(
        or(
          sql`unaccent(lower(${students.first_name})) LIKE unaccent(${normalizedPattern})`,
          sql`unaccent(lower(${students.last_name})) LIKE unaccent(${normalizedPattern})`,
          sql`lower(${students.login}) LIKE ${normalizedPattern}`
        )
      )
      .limit(15)
      .execute();
  }

  // Dédupliquer les résultats (un étudiant peut apparaître plusieurs fois s'il a plusieurs projets)
  const uniqueResults = Array.from(
    new Map(results.map(r => [r.id, r])).values()
  );

  // Trier les résultats par pertinence
  const sortedResults = sortByRelevance(uniqueResults, terms);

  if (sortedResults.length === 0) {
    return {
      text: `😕 Aucun étudiant trouvé pour "${query}".\n\n**Suggestions :**\n• Vérifiez l'orthographe\n• Essayez avec juste le prénom ou le nom\n• Utilisez le login avec @login\n• Les accents sont optionnels (Maxime = maxime)`,
      suggestions: ["Aide", "Statistiques globales", "Liste des promos"],
    };
  }

  // Si un seul résultat avec correspondance exacte, afficher directement les détails
  if (sortedResults.length === 1) {
    const student = sortedResults[0];
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const queryLower = query.toLowerCase();

    // Vérifier si c'est une correspondance proche
    if (
      fullName.includes(queryLower) ||
      queryLower.includes(student.firstName.toLowerCase()) ||
      queryLower.includes(student.lastName.toLowerCase())
    ) {
      return await getStudentDetails(student.id);
    }
  }

  const studentsList = sortedResults
    .slice(0, 10)
    .map((s, i) => {
      const status = getStatusEmoji(s.delay_level);
      return `${i + 1}. ${status} **${s.firstName} ${s.lastName}** (@${s.login}) - ${s.promoName} - ${s.delay_level || 'N/A'}`;
    })
    .join('\n');

  const studentIds = sortedResults.slice(0, 10).map((s) => s.id);
  const totalFound = sortedResults.length;
  const showing = Math.min(10, totalFound);

  return {
    text: `🔍 **${totalFound} étudiant(s) trouvé(s) pour "${query}"**${totalFound > 10 ? ` (affichage des ${showing} premiers)` : ''}\n\n${studentsList}\n\n💡 Cliquez sur un étudiant ou tapez son nom complet pour voir les détails.`,
    data: sortedResults.slice(0, 10),
    studentIds,
    suggestions: sortedResults.slice(0, 3).map((s) => `${s.firstName} ${s.lastName}`),
  };
}

// Trie les résultats par pertinence
function sortByRelevance(results: any[], searchTerms: string[]): any[] {
  return results.sort((a, b) => {
    const scoreA = calculateRelevanceScore(a, searchTerms);
    const scoreB = calculateRelevanceScore(b, searchTerms);
    return scoreB - scoreA;
  });
}

// Calcule un score de pertinence pour un résultat
function calculateRelevanceScore(student: any, searchTerms: string[]): number {
  let score = 0;
  const firstName = normalizeForSearch(student.firstName);
  const lastName = normalizeForSearch(student.lastName);
  const login = student.login.toLowerCase();

  for (const term of searchTerms) {
    const normalizedTerm = normalizeForSearch(term);

    // Correspondance exacte (score élevé)
    if (firstName === normalizedTerm || lastName === normalizedTerm) {
      score += 100;
    }
    // Commence par le terme (score moyen-élevé)
    else if (firstName.startsWith(normalizedTerm) || lastName.startsWith(normalizedTerm)) {
      score += 50;
    }
    // Login exact
    else if (login === normalizedTerm) {
      score += 80;
    }
    // Login commence par
    else if (login.startsWith(normalizedTerm)) {
      score += 40;
    }
    // Contient le terme
    else if (firstName.includes(normalizedTerm) || lastName.includes(normalizedTerm)) {
      score += 20;
    }
    else if (login.includes(normalizedTerm)) {
      score += 15;
    }
  }

  return score;
}

// Retourne l'emoji de statut approprié
function getStatusEmoji(delayLevel: string | null): string {
  switch (delayLevel) {
    case 'bien':
      return '✅';
    case 'en retard':
      return '⚠️';
    case 'en avance':
      return '🚀';
    case 'Validé':
      return '🎓';
    case 'spécialité':
      return '🎯';
    default:
      return '📝';
  }
}

async function getStudentDetails(id: number): Promise<ChatResponse> {
  const result = await db
    .select({
      id: students.id,
      firstName: students.first_name,
      lastName: students.last_name,
      login: students.login,
      promoName: students.promoName,
      delay_level: studentProjects.delay_level,
      project_name: studentProjects.project_name,
      golang_project: studentCurrentProjects.golang_project,
      golang_completed: studentSpecialtyProgress.golang_completed,
      javascript_project: studentCurrentProjects.javascript_project,
      javascript_completed: studentSpecialtyProgress.javascript_completed,
      rust_project: studentCurrentProjects.rust_project,
      rust_completed: studentSpecialtyProgress.rust_completed,
      java_project: studentCurrentProjects.java_project,
      java_completed: studentSpecialtyProgress.java_completed,
    })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
    .leftJoin(studentCurrentProjects, eq(students.id, studentCurrentProjects.student_id))
    .leftJoin(studentSpecialtyProgress, eq(students.id, studentSpecialtyProgress.student_id))
    .where(eq(students.id, id))
    .execute();

  if (result.length === 0) {
    return {
      text: `😕 Aucun étudiant trouvé avec l'ID **#${id}**.\n\n💡 Essayez de rechercher par nom ou prénom à la place.`,
      suggestions: ["Recherche un étudiant", "Statistiques globales", "Aide"],
    };
  }

  const student = result[0];

  // Construire la liste des troncs avec plus de détails
  const tracks = [
    { name: 'Golang', project: student.golang_project, completed: student.golang_completed },
    { name: 'JavaScript', project: student.javascript_project, completed: student.javascript_completed },
  ];

  // Ajouter Rust ou Java selon ce qui est présent
  if (student.rust_project || student.rust_completed) {
    tracks.push({ name: 'Rust', project: student.rust_project, completed: student.rust_completed });
  } else if (student.java_project || student.java_completed) {
    tracks.push({ name: 'Java', project: student.java_project, completed: student.java_completed });
  }

  const completedTracks = tracks.filter(t => t.completed).length;
  const totalTracks = tracks.length;

  const tracksList = tracks
    .map((t) => {
      const status = t.completed ? '✅' : t.project ? '⏳' : '⬜';
      const projectInfo = t.project || 'Non commencé';
      return `  ${status} **${t.name}** : ${projectInfo}`;
    })
    .join('\n');

  const statusEmoji = getStatusEmoji(student.delay_level);

  // Calculer une barre de progression visuelle
  const progressBar = '█'.repeat(completedTracks) + '░'.repeat(totalTracks - completedTracks);

  return {
    text: `👤 **${student.firstName} ${student.lastName}**
━━━━━━━━━━━━━━━━━━━━━━━━

📧 **Login** : @${student.login}
📚 **Promotion** : ${student.promoName}
${statusEmoji} **Statut** : ${student.delay_level || 'Non défini'}
🎯 **Projet actuel** : ${student.project_name || 'Aucun'}

📈 **Progression des troncs** [${progressBar}] ${completedTracks}/${totalTracks}
${tracksList}

💡 ID: #${id}`,
    data: student,
    studentIds: [id],
    suggestions: [
      `Promo ${student.promoName}`,
      "Étudiants en retard",
      "Statistiques globales",
    ],
  };
}

async function listLateStudents(): Promise<ChatResponse> {
  const results = await db
    .select({
      id: students.id,
      firstName: students.first_name,
      lastName: students.last_name,
      login: students.login,
      promoName: students.promoName,
      project_name: studentProjects.project_name,
    })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
    .where(sql`${studentProjects.delay_level} = 'en retard'`)
    .limit(30)
    .execute();

  // Dédupliquer
  const uniqueResults = Array.from(new Map(results.map(r => [r.id, r])).values());

  if (uniqueResults.length === 0) {
    return {
      text: "✅ Excellente nouvelle ! Aucun étudiant n'est actuellement en retard.",
      suggestions: ["Statistiques globales", "Étudiants validés", "Étudiants en avance"],
    };
  }

  // Grouper par promo pour analyse
  const byPromo: Record<string, number> = {};
  uniqueResults.forEach(s => {
    byPromo[s.promoName] = (byPromo[s.promoName] || 0) + 1;
  });

  const promoSummary = Object.entries(byPromo)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([promo, count]) => `${promo}: ${count}`)
    .join(', ');

  const studentsList = uniqueResults
    .slice(0, 15)
    .map((s, i) => `${i + 1}. ⚠️ **${s.firstName} ${s.lastName}** (@${s.login}) - ${s.promoName} - ${s.project_name || 'N/A'}`)
    .join('\n');

  const studentIds = uniqueResults.slice(0, 15).map((s) => s.id);

  return {
    text: `⚠️ **${uniqueResults.length} étudiant(s) en retard**\n\n📊 **Par promo :** ${promoSummary}\n\n${studentsList}${uniqueResults.length > 15 ? `\n\n... et ${uniqueResults.length - 15} autres` : ''}\n\n💡 Cliquez sur un étudiant pour voir les détails et le contacter.`,
    data: uniqueResults.slice(0, 15),
    studentIds,
    suggestions: [
      "Statistiques globales",
      "Étudiants validés",
      "Étudiants en avance",
    ],
  };
}

async function listValidatedStudents(): Promise<ChatResponse> {
  const results = await db
    .select({
      id: students.id,
      firstName: students.first_name,
      lastName: students.last_name,
      login: students.login,
      promoName: students.promoName,
    })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
    .where(sql`${studentProjects.delay_level} = 'Validé'`)
    .limit(20)
    .execute();

  // Dédupliquer
  const uniqueResults = Array.from(new Map(results.map(r => [r.id, r])).values());

  if (uniqueResults.length === 0) {
    return {
      text: "📝 Aucun étudiant n'a encore validé sa formation.",
      suggestions: ["Statistiques globales", "Étudiants en retard"],
    };
  }

  const studentsList = uniqueResults
    .map((s, i) => `${i + 1}. 🎓 **${s.firstName} ${s.lastName}** (@${s.login}) - ${s.promoName}`)
    .join('\n');

  const studentIds = uniqueResults.map((s) => s.id);

  return {
    text: `🎓 **${uniqueResults.length} étudiant(s) validé(s)**\n\n${studentsList}\n\n✨ Félicitations à eux !`,
    data: uniqueResults,
    studentIds,
    suggestions: [
      "Statistiques globales",
      "Étudiants en retard",
      "Étudiants en avance",
    ],
  };
}

async function listAheadStudents(): Promise<ChatResponse> {
  const results = await db
    .select({
      id: students.id,
      firstName: students.first_name,
      lastName: students.last_name,
      login: students.login,
      promoName: students.promoName,
      project_name: studentProjects.project_name,
    })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
    .where(
      or(
        sql`${studentProjects.delay_level} = 'en avance'`,
        sql`${studentProjects.delay_level} = 'bien'`
      )
    )
    .limit(25)
    .execute();

  // Dédupliquer
  const uniqueResults = Array.from(new Map(results.map(r => [r.id, r])).values());

  if (uniqueResults.length === 0) {
    return {
      text: "📝 Aucun étudiant n'est actuellement en avance ou en bonne progression.",
      suggestions: ["Statistiques globales", "Étudiants en retard"],
    };
  }

  const studentsList = uniqueResults
    .slice(0, 15)
    .map((s, i) => `${i + 1}. 🚀 **${s.firstName} ${s.lastName}** (@${s.login}) - ${s.promoName} - ${s.project_name || 'N/A'}`)
    .join('\n');

  const studentIds = uniqueResults.slice(0, 15).map((s) => s.id);

  return {
    text: `🚀 **${uniqueResults.length} étudiant(s) en bonne progression**\n\n${studentsList}${uniqueResults.length > 15 ? `\n\n... et ${uniqueResults.length - 15} autres` : ''}\n\n🌟 Ces étudiants sont sur la bonne voie !`,
    data: uniqueResults.slice(0, 15),
    studentIds,
    suggestions: [
      "Statistiques globales",
      "Étudiants validés",
      "Étudiants en retard",
    ],
  };
}

async function listByPromo(promoName: string): Promise<ChatResponse> {
  const searchPattern = `%${promoName}%`;

  const results = await db
    .select({
      id: students.id,
      firstName: students.first_name,
      lastName: students.last_name,
      login: students.login,
      promoName: students.promoName,
      delay_level: studentProjects.delay_level,
    })
    .from(students)
    .leftJoin(studentProjects, eq(students.id, studentProjects.student_id))
    .where(ilike(students.promoName, searchPattern))
    .limit(50)
    .execute();

  // Dédupliquer
  const uniqueResults = Array.from(new Map(results.map(r => [r.id, r])).values());

  if (uniqueResults.length === 0) {
    return await listAllPromos();
  }

  // Compter les statuts
  const stats = {
    total: uniqueResults.length,
    validated: uniqueResults.filter(s => s.delay_level === 'Validé').length,
    late: uniqueResults.filter(s => s.delay_level === 'en retard').length,
    good: uniqueResults.filter(s => s.delay_level === 'bien' || s.delay_level === 'en avance').length,
  };

  const studentsList = uniqueResults
    .slice(0, 15)
    .map((s, i) => {
      const status = getStatusEmoji(s.delay_level);
      return `${i + 1}. ${status} **${s.firstName} ${s.lastName}** (@${s.login}) - ${s.delay_level || 'N/A'}`;
    })
    .join('\n');

  const studentIds = uniqueResults.slice(0, 15).map((s) => s.id);
  const actualPromoName = uniqueResults[0]?.promoName || promoName;

  return {
    text: `👥 **Promo ${actualPromoName}** - ${stats.total} étudiant(s)\n\n📊 **Répartition :**\n• 🎓 Validés : ${stats.validated}\n• ✅ Bonne progression : ${stats.good}\n• ⚠️ En retard : ${stats.late}\n\n**Étudiants :**\n${studentsList}${uniqueResults.length > 15 ? `\n\n... et ${uniqueResults.length - 15} autres` : ''}`,
    data: uniqueResults.slice(0, 15),
    studentIds,
    suggestions: [
      "Statistiques globales",
      "Étudiants en retard",
      "Autres promos",
    ],
  };
}

async function listAllPromos(): Promise<ChatResponse> {
  const results = await db
    .select({
      promoName: students.promoName,
    })
    .from(students)
    .groupBy(students.promoName)
    .execute();

  const promoNames = results.map(r => r.promoName).filter(Boolean);

  if (promoNames.length === 0) {
    return {
      text: "📝 Aucune promotion trouvée dans la base de données.",
      suggestions: ["Statistiques globales", "Aide"],
    };
  }

  // Compter les étudiants par promo
  const promoCounts: Record<string, number> = {};
  for (const promo of promoNames) {
    const countResult = await db
      .select({ count: count() })
      .from(students)
      .where(eq(students.promoName, promo))
      .execute();
    promoCounts[promo] = countResult[0]?.count || 0;
  }

  const promoList = promoNames
    .sort((a, b) => promoCounts[b] - promoCounts[a])
    .map((promo, i) => `${i + 1}. 📚 **${promo}** - ${promoCounts[promo]} étudiant(s)`)
    .join('\n');

  return {
    text: `📚 **${promoNames.length} promotion(s) disponibles**\n\n${promoList}\n\n💡 Tapez "promo [nom]" pour voir les détails d'une promotion.`,
    suggestions: promoNames.slice(0, 3).map(p => `Promo ${p}`),
  };
}

async function listBySpecialty(track: 'golang' | 'javascript' | 'rust' | 'java'): Promise<ChatResponse> {
  const trackNames: Record<string, string> = {
    golang: 'Golang',
    javascript: 'JavaScript',
    rust: 'Rust',
    java: 'Java',
  };

  const trackColumn = {
    golang: studentCurrentProjects.golang_project,
    javascript: studentCurrentProjects.javascript_project,
    rust: studentCurrentProjects.rust_project,
    java: studentCurrentProjects.java_project,
  }[track];

  const completedColumn = {
    golang: studentSpecialtyProgress.golang_completed,
    javascript: studentSpecialtyProgress.javascript_completed,
    rust: studentSpecialtyProgress.rust_completed,
    java: studentSpecialtyProgress.java_completed,
  }[track];

  const results = await db
    .select({
      id: students.id,
      firstName: students.first_name,
      lastName: students.last_name,
      login: students.login,
      promoName: students.promoName,
      currentProject: trackColumn,
      completed: completedColumn,
    })
    .from(students)
    .leftJoin(studentCurrentProjects, eq(students.id, studentCurrentProjects.student_id))
    .leftJoin(studentSpecialtyProgress, eq(students.id, studentSpecialtyProgress.student_id))
    .where(sql`${trackColumn} IS NOT NULL`)
    .limit(30)
    .execute();

  // Dédupliquer
  const uniqueResults = Array.from(new Map(results.map(r => [r.id, r])).values());

  if (uniqueResults.length === 0) {
    return {
      text: `📝 Aucun étudiant n'est actuellement sur la spécialité **${trackNames[track]}**.`,
      suggestions: ["Spécialité Golang", "Spécialité JavaScript", "Statistiques globales"],
    };
  }

  const completedCount = uniqueResults.filter(s => s.completed).length;
  const inProgressCount = uniqueResults.length - completedCount;

  const studentsList = uniqueResults
    .slice(0, 15)
    .map((s, i) => {
      const status = s.completed ? '✅' : '⏳';
      return `${i + 1}. ${status} **${s.firstName} ${s.lastName}** - ${s.currentProject || 'N/A'} ${s.completed ? '(Terminé)' : ''}`;
    })
    .join('\n');

  const studentIds = uniqueResults.slice(0, 15).map((s) => s.id);

  return {
    text: `🎯 **Spécialité ${trackNames[track]}** - ${uniqueResults.length} étudiant(s)\n\n📊 **Statut :**\n• ✅ Terminé : ${completedCount}\n• ⏳ En cours : ${inProgressCount}\n\n**Étudiants :**\n${studentsList}${uniqueResults.length > 15 ? `\n\n... et ${uniqueResults.length - 15} autres` : ''}`,
    data: uniqueResults.slice(0, 15),
    studentIds,
    suggestions: [
      "Statistiques globales",
      track !== 'golang' ? "Spécialité Golang" : "Spécialité JavaScript",
      track !== 'rust' ? "Spécialité Rust" : "Spécialité Java",
    ],
  };
}
