import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/config';
import { students } from '@/lib/db/schema/students';
import { eq } from 'drizzle-orm';
import { fetchPromotionProgressions, buildProjectGroups } from '@/lib/services/zone01';
import { getAuditedStudentsByPromoAndTrack } from '@/lib/db/services/audits';
import { getProjectNamesByTrack } from '@/lib/config/projects';
import promoConfig from 'config/promoConfig.json';
import type { Track } from '@/lib/db/schema/audits';

/**
 * GET /api/student/[id]/pending-audits
 *
 * Récupère les projets terminés en attente d'audit pour un étudiant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const studentIdNum = parseInt(id, 10);

    if (isNaN(studentIdNum)) {
      return NextResponse.json(
        { error: 'ID étudiant invalide' },
        { status: 400 }
      );
    }

    // Récupérer l'étudiant
    const student = await db.query.students.findFirst({
      where: eq(students.id, studentIdNum)
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Étudiant introuvable' },
        { status: 404 }
      );
    }

    // Trouver la promo de l'étudiant
    const promo = (promoConfig as any[]).find(p => p.key === student.promoName);
    if (!promo) {
      return NextResponse.json({ success: true, pendingAudits: [] });
    }

    // Récupérer toutes les progressions de la promo
    const progressions = await fetchPromotionProgressions(String(promo.eventId));

    console.log(`[Pending Audits] Student: ${student.login}, Promo: ${promo.key}`);

    // Récupérer les groupes déjà audités par track
    const TRACKS: Track[] = ['Golang', 'Javascript', 'Rust', 'Java'];
    const auditedByTrack = new Map<string, Map<string, Set<string>>>();

    for (const track of TRACKS) {
      const audited = await getAuditedStudentsByPromoAndTrack(String(promo.eventId), track);
      auditedByTrack.set(track, audited);
    }

    // Identifier les projets terminés non audités où l'étudiant est membre
    const pendingAudits: {
      projectName: string;
      track: string;
      groupId: string;
      status: string;
      promoId: string;
      promoName: string;
      members: { login: string; firstName?: string; lastName?: string }[];
    }[] = [];

    // Pour chaque track, construire les groupes "finished" et vérifier si l'étudiant y est
    for (const track of TRACKS) {
      const projectNames = getProjectNamesByTrack(track);

      for (const projectName of projectNames) {
        // Construire tous les groupes pour ce projet
        const groups = buildProjectGroups(progressions, projectName);

        // Filtrer uniquement les groupes "finished"
        const finishedGroups = groups.filter(g => g.status === 'finished');

        for (const group of finishedGroups) {
          // Vérifier si l'étudiant est membre de ce groupe
          const isMember = group.members.some(
            m => m.login.toLowerCase() === student.login.toLowerCase()
          );

          if (!isMember) continue;

          // Vérifier si l'étudiant a déjà été audité pour ce groupe
          const auditedGroups = auditedByTrack.get(track);
          const studentsInGroup = auditedGroups?.get(group.groupId);
          const isStudentAudited = studentsInGroup && studentsInGroup.has(student.login.toLowerCase());

          console.log(`[Pending Audits] ${student.login} - ${projectName} (${track}) - Groupe ${group.groupId}:`, {
            isMember: true,
            groupAudited: !!studentsInGroup,
            studentAudited: isStudentAudited,
            auditedStudents: studentsInGroup ? Array.from(studentsInGroup) : []
          });

          if (!isStudentAudited) {
            pendingAudits.push({
              projectName,
              track,
              groupId: group.groupId,
              status: group.status,
              promoId: String(promo.eventId),
              promoName: promo.key,
              members: group.members.map(m => ({
                login: m.login,
                firstName: m.firstName,
                lastName: m.lastName,
              })),
            });
          }
        }
      }
    }

    console.log(`[Pending Audits] Total pending audits for ${student.login}: ${pendingAudits.length}`);

    return NextResponse.json({
      success: true,
      pendingAudits,
      studentLogin: student.login
    });
  } catch (error) {
    console.error('Error fetching pending audits:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des audits en attente' },
      { status: 500 }
    );
  }
}
