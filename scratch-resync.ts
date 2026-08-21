import 'dotenv/config';
import { syncPiscines, getSessionExams, getSessionCandidates, getSessionStats } from '@/lib/db/services/piscines';
async function main() {
  const r = await syncPiscines();
  console.log('resynchro :', { sessions: r.sessions, candidats: r.candidates, résultats: r.results });
  const exams = await getSessionExams(1022);
  const st = await getSessionStats(1022);
  const cands = (await getSessionCandidates(1022)).filter((c) => c.examTotal);
  console.log(`\nmoyenne absolue de la session : ${Math.round((st.averageExam ?? 0) * 100)} %`);
  console.log('\n8 meilleurs — Avril 2026 :');
  console.log('  login        ' + exams.map((e) => e.padStart(6)).join(' ') + '   total   %   décision');
  for (const c of cands.slice(0, 8)) {
    const cells = exams.map((e) => { const s = c.examScores[e]; return (s ? `${s.passed}/${s.max}` : '—').padStart(6); }).join(' ');
    console.log(`  ${c.login.padEnd(12)} ${cells}  ${String(c.examPassed)}/${c.examTotal}  ${String(Math.round((c.examAverage ?? 0) * 100)).padStart(3)}%  ${c.admission}`);
  }
  process.exit(0);
}
main().catch((e) => { console.error('ÉCHEC :', e); process.exit(1); });
