import { db } from '@/lib/db/config';
import { students, studentProjects, studentCurrentProjects, studentSpecialtyProgress } from '@/lib/db/schema';
import { eq, ilike, or, count, sql } from 'drizzle-orm';
import type { AnalyzedMessage } from './intent-analyzer';

export interface ChatResponse {
  text: string;
  data?: any;
  suggestions?: string[];
  studentIds?: number[];
}

export async function generateResponse(analysis: AnalyzedMessage, originalMessage: string): Promise<ChatResponse> {
  switch (analysis.intent) {
    case 'greeting':
      return {
        text: "👋 Bonjour ! Je suis l'assistant virtuel pour le suivi des étudiants de Zone01 Normandie.\n\nJe peux vous aider à :\n• Rechercher des étudiants\n• Consulter les statistiques\n• Vérifier la progression des étudiants\n• Identifier les étudiants en retard ou validés\n\nQue puis-je faire pour vous ?",
        suggestions: [
          "Combien d'étudiants sont en formation ?",
          "Montre-moi les étudiants en retard",
          "Quelles sont les statistiques globales ?",
        ],
      };

    case 'help':
      return {
        text: "💡 Voici ce que je peux faire pour vous :\n\n📊 **Statistiques**\n• \"Combien d'étudiants sont en formation ?\"\n• \"Donne-moi les statistiques globales\"\n• \"Quel est le taux de réussite ?\"\n\n🔍 **Recherche d'étudiants**\n• \"Recherche l'étudiant maxime dubois\"\n• \"Trouve l'étudiant avec l'ID 42\"\n\n📈 **Progression**\n• \"Quelle est la progression de maxime dubois ?\"\n• \"Montre-moi les étudiants en retard\"\n• \"Liste les étudiants validés\"",
        suggestions: [
          "Combien d'étudiants sont en retard ?",
          "Recherche un étudiant",
          "Statistiques globales",
        ],
      };

    case 'get_stats':
      return await getGlobalStats();

    case 'search_student':
      if (analysis.entities.studentName) {
        return await searchStudents(analysis.entities.studentName);
      } else if (analysis.entities.studentId) {
        return await getStudentDetails(analysis.entities.studentId);
      }
      return {
        text: "❓ Veuillez préciser le nom ou l'ID de l'étudiant que vous recherchez.",
        suggestions: ["Recherche maxime dubois", "Trouve l'étudiant #42"],
      };

    case 'get_student_details':
    case 'track_progress':
      if (analysis.entities.studentId) {
        return await getStudentDetails(analysis.entities.studentId);
      } else if (analysis.entities.studentName) {
        return await searchStudents(analysis.entities.studentName);
      }
      return {
        text: "❓ Veuillez préciser l'étudiant dont vous souhaitez voir la progression.",
        suggestions: ["Progression de maxime dubois", "Détails de l'étudiant #42"],
      };

    case 'list_late_students':
      return await listLateStudents();

    case 'list_validated_students':
      return await listValidatedStudents();

    default:
      return {
        text: "🤔 Je n'ai pas bien compris votre question. Pourriez-vous reformuler ?\n\nVoici quelques exemples de questions que je comprends :\n• \"Combien d'étudiants sont en formation ?\"\n• \"Recherche l'étudiant maxime dubois\"\n• \"Montre-moi les étudiants en retard\"\n• \"Donne-moi les statistiques globales\"",
        suggestions: [
          "Aide",
          "Statistiques globales",
          "Étudiants en retard",
        ],
      };
  }
}

async function getGlobalStats(): Promise<ChatResponse> {
  const totalStudentsResult = await db.select({ count: count() }).from(students).execute();
  const totalStudents = totalStudentsResult[0]?.count || 0;

  const lateStudentsResult = await db
    .select({ count: count() })
    .from(studentProjects)
    .where(sql`${studentProjects.delay_level} = 'en retard'`)
    .execute();
  const lateStudents = lateStudentsResult[0]?.count || 0;

  const validatedResult = await db
    .select({ count: count() })
    .from(studentProjects)
    .where(sql`${studentProjects.delay_level} = 'Validé'`)
    .execute();
  const validated = validatedResult[0]?.count || 0;

  const goodProgressResult = await db
    .select({ count: count() })
    .from(studentProjects)
    .where(sql`${studentProjects.delay_level} = 'bien'`)
    .execute();
  const goodProgress = goodProgressResult[0]?.count || 0;

  const successRate = totalStudents > 0 ? Math.round((validated / totalStudents) * 100) : 0;

  return {
    text: `📊 **Statistiques globales de Zone01 Normandie**\n\n👥 **Total d'étudiants** : ${totalStudents}\n✅ **Étudiants validés** : ${validated}\n📈 **En bonne progression** : ${goodProgress}\n⚠️ **Étudiants en retard** : ${lateStudents}\n\n🎯 **Taux de réussite** : ${successRate}%`,
    data: {
      totalStudents,
      lateStudents,
      validated,
      goodProgress,
      successRate,
    },
    suggestions: [
      "Montre-moi les étudiants en retard",
      "Liste les étudiants validés",
    ],
  };
}

async function searchStudents(query: string): Promise<ChatResponse> {
  const searchQuery = `%${query}%`;
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
    .where(
      or(
        ilike(students.first_name, searchQuery),
        ilike(students.last_name, searchQuery),
        ilike(students.login, searchQuery)
      )
    )
    .limit(10)
    .execute();

  if (results.length === 0) {
    return {
      text: `😕 Aucun étudiant trouvé pour "${query}".\n\nVérifiez l'orthographe ou essayez avec le login de l'étudiant.`,
      suggestions: ["Aide", "Statistiques globales"],
    };
  }

  const studentsList = results
    .map((s, i) => {
      const status = s.delay_level === 'bien' ? '✅' : s.delay_level === 'en retard' ? '⚠️' : s.delay_level === 'Validé' ? '🎓' : '📝';
      return `${i + 1}. ${status} **${s.firstName} ${s.lastName}** (@${s.login}) - ${s.promoName} - ${s.delay_level || 'N/A'} (ID: ${s.id})`;
    })
    .join('\n');

  const studentIds = results.map((s) => s.id);

  return {
    text: `🔍 **${results.length} étudiant(s) trouvé(s) pour "${query}"**\n\n${studentsList}\n\n💡 Cliquez sur "Voir l'étudiant" pour plus de détails.`,
    data: results,
    studentIds,
    suggestions: results.slice(0, 3).map((s) => `Détails de ${s.firstName} ${s.lastName}`),
  };
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
      text: `😕 Aucun étudiant trouvé avec l'ID ${id}.`,
      suggestions: ["Recherche un étudiant", "Statistiques globales"],
    };
  }

  const student = result[0];
  const completedTracks = [
    student.golang_completed,
    student.javascript_completed,
    student.rust_completed || student.java_completed,
  ].filter(Boolean).length;

  const tracks = [
    { name: 'Golang', project: student.golang_project, completed: student.golang_completed },
    { name: 'Javascript', project: student.javascript_project, completed: student.javascript_completed },
    { name: student.rust_project ? 'Rust' : 'Java', project: student.rust_project || student.java_project, completed: student.rust_completed || student.java_completed },
  ];

  const tracksList = tracks
    .map((t) => `  ${t.completed ? '✅' : '⏳'} **${t.name}** : ${t.project || 'Aucun projet'} ${t.completed ? '(Complété)' : ''}`)
    .join('\n');

  const statusEmoji = student.delay_level === 'bien' ? '✅' : student.delay_level === 'en retard' ? '⚠️' : student.delay_level === 'Validé' ? '🎓' : '📝';

  return {
    text: `👤 **${student.firstName} ${student.lastName}** (@${student.login})\n\n📚 **Promotion** : ${student.promoName}\n${statusEmoji} **Statut** : ${student.delay_level || 'N/A'}\n🎯 **Projet actuel** : ${student.project_name || 'N/A'}\n\n📈 **Progression des troncs** (${completedTracks}/3) :\n${tracksList}`,
    data: student,
    studentIds: [id],
    suggestions: [
      "Statistiques globales",
      "Étudiants en retard",
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
    .limit(20)
    .execute();

  if (results.length === 0) {
    return {
      text: "✅ Excellente nouvelle ! Aucun étudiant n'est actuellement en retard.",
      suggestions: ["Statistiques globales", "Étudiants validés"],
    };
  }

  const studentsList = results
    .map((s, i) => `${i + 1}. ⚠️ **${s.firstName} ${s.lastName}** (@${s.login}) - ${s.promoName} - ${s.project_name || 'N/A'} (ID: ${s.id})`)
    .join('\n');

  const studentIds = results.map((s) => s.id);

  return {
    text: `⚠️ **${results.length} étudiant(s) en retard**\n\n${studentsList}\n\n💡 Cliquez sur "Voir l'étudiant" pour contacter ou voir plus de détails.`,
    data: results,
    studentIds,
    suggestions: [
      "Statistiques globales",
      "Étudiants validés",
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

  if (results.length === 0) {
    return {
      text: "📝 Aucun étudiant n'a encore validé sa formation.",
      suggestions: ["Statistiques globales", "Étudiants en retard"],
    };
  }

  const studentsList = results
    .map((s, i) => `${i + 1}. 🎓 **${s.firstName} ${s.lastName}** (@${s.login}) - ${s.promoName} (ID: ${s.id})`)
    .join('\n');

  const studentIds = results.map((s) => s.id);

  return {
    text: `🎓 **${results.length} étudiant(s) validé(s)**\n\n${studentsList}\n\n✨ Félicitations à eux !`,
    data: results,
    studentIds,
    suggestions: [
      "Statistiques globales",
      "Étudiants en retard",
    ],
  };
}
