import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { FullExportData, PromoExport, TrackExport, AuditExport } from '@/lib/db/services/auditsExport';

// ─── Palette ─────────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#1e293b',
  secondary: '#475569',
  muted: '#94a3b8',
  border: '#e2e8f0',
  bgLight: '#f8fafc',
  bgCard: '#f1f5f9',
  green: '#16a34a',
  greenLight: '#dcfce7',
  red: '#dc2626',
  redLight: '#fee2e2',
  amber: '#d97706',
  amberLight: '#fef3c7',
  golang: '#ec4899',
  javascript: '#eab308',
  rust: '#f97316',
  java: '#3b82f6',
};

const TRACK_COLORS: Record<string, string> = {
  Golang: COLORS.golang,
  Javascript: COLORS.javascript,
  Rust: COLORS.rust,
  Java: COLORS.java,
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: COLORS.primary,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
  },
  coverPage: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: COLORS.primary,
    paddingTop: 80,
    paddingBottom: 50,
    paddingHorizontal: 50,
    backgroundColor: COLORS.primary,
  },
  coverTitle: { fontSize: 28, fontFamily: 'Helvetica-Bold', color: '#ffffff', marginBottom: 8 },
  coverSubtitle: { fontSize: 13, color: '#94a3b8', marginBottom: 48 },
  coverDivider: { height: 2, backgroundColor: '#334155', marginBottom: 32 },
  coverStatRow: { flexDirection: 'row', gap: 16, marginBottom: 48 },
  coverStatBox: {
    flex: 1, backgroundColor: '#1e293b', borderRadius: 8, padding: 20,
    borderWidth: 1, borderColor: '#334155',
  },
  coverStatValue: { fontSize: 28, fontFamily: 'Helvetica-Bold', color: '#ffffff', marginBottom: 4 },
  coverStatLabel: { fontSize: 10, color: '#94a3b8' },
  coverFooter: { marginTop: 'auto', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  coverFooterText: { fontSize: 9, color: '#64748b' },
  coverPromoList: { marginBottom: 32 },
  coverPromoItem: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  coverPromoName: { fontSize: 11, color: '#cbd5e1' },
  coverPromoStats: { fontSize: 10, color: '#64748b' },

  pageHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  pageHeaderTitle: { fontSize: 10, color: COLORS.muted },
  pageHeaderPromo: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: COLORS.primary },
  pageFooter: {
    position: 'absolute', bottom: 24, left: 40, right: 40,
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8,
  },
  pageFooterText: { fontSize: 8, color: COLORS.muted },

  promoTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  promoTitleBar: { width: 4, height: 24, backgroundColor: COLORS.primary, borderRadius: 2 },
  promoTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: COLORS.primary },
  promoSubtitle: { fontSize: 10, color: COLORS.muted, marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: {
    flex: 1, backgroundColor: COLORS.bgCard, borderRadius: 6, padding: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  statValue: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: COLORS.primary, marginBottom: 2 },
  statLabel: { fontSize: 8, color: COLORS.muted, textTransform: 'uppercase' },

  trackHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 8 },
  trackDot: { width: 8, height: 8, borderRadius: 4 },
  trackTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: COLORS.primary },
  trackStats: { fontSize: 9, color: COLORS.muted, marginLeft: 'auto' },

  table: { marginBottom: 8 },
  tableHead: {
    flexDirection: 'row', backgroundColor: COLORS.bgCard,
    borderRadius: 4, paddingVertical: 6, paddingHorizontal: 8, marginBottom: 2,
  },
  tableHeadCell: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: COLORS.muted, textTransform: 'uppercase' },
  tableRow: {
    flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tableRowAlt: { backgroundColor: COLORS.bgLight },
  tableCell: { fontSize: 8, color: COLORS.primary },
  tableCellMuted: { fontSize: 8, color: COLORS.muted },

  // Overview table columns
  colProject: { width: '22%' },
  colGroup: { width: '12%' },
  colDate: { width: '13%' },
  colAuditor: { width: '17%' },
  colMembers: { width: '18%' },
  colValidated: { width: '10%' },
  colRate: { width: '8%' },

  summaryBox: {
    backgroundColor: COLORS.bgCard, borderRadius: 6, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  summaryTitle: {
    fontSize: 9, fontFamily: 'Helvetica-Bold', color: COLORS.secondary,
    marginBottom: 8, textTransform: 'uppercase',
  },
  auditorRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  auditorName: { fontSize: 9, color: COLORS.primary },
  auditorCount: { fontSize: 9, color: COLORS.muted },

  progressBar: { height: 4, borderRadius: 2, backgroundColor: COLORS.border, marginTop: 4 },
  progressFill: { height: 4, borderRadius: 2 },

  // Audit detail card styles
  auditCard: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    marginBottom: 16, overflow: 'hidden',
  },
  auditCardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 14,
    backgroundColor: COLORS.bgCard,
  },
  auditCardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  auditCardTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: COLORS.primary },
  auditCardMeta: { fontSize: 8, color: COLORS.muted, marginTop: 2 },
  auditCardBadge: {
    borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3,
    flexDirection: 'row', alignItems: 'center',
  },
  auditCardBadgeText: { fontSize: 8, fontFamily: 'Helvetica-Bold' },

  auditCardBody: { padding: 14 },

  // Summary block
  summarySection: { marginBottom: 12 },
  summarySectionTitle: {
    fontSize: 8, fontFamily: 'Helvetica-Bold', color: COLORS.muted,
    textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5,
  },
  summaryText: {
    fontSize: 8.5, color: COLORS.primary, lineHeight: 1.6,
  },
  summaryBullet: { flexDirection: 'row', marginBottom: 4, gap: 4 },
  summaryBulletDot: { fontSize: 9, color: COLORS.secondary, marginTop: 1 },
  summaryBulletText: { fontSize: 8.5, color: COLORS.primary, lineHeight: 1.5, flex: 1 },
  summaryBold: { fontFamily: 'Helvetica-Bold' },

  // Students table
  studentsTable: { marginTop: 4 },
  studentRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 6, paddingHorizontal: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  studentRowAlt: { backgroundColor: COLORS.bgLight },
  studentLogin: { width: '20%', fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: COLORS.primary },
  studentStatus: { width: '14%' },
  studentFeedback: { width: '66%', fontSize: 8, color: COLORS.secondary, lineHeight: 1.5 },
  statusBadge: {
    borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  statusText: { fontSize: 7, fontFamily: 'Helvetica-Bold' },

  // Warnings
  warningsList: { marginTop: 4 },
  warningItem: {
    flexDirection: 'row', gap: 4, marginBottom: 3,
    paddingLeft: 8, paddingRight: 8, paddingTop: 5, paddingBottom: 5,
    backgroundColor: COLORS.amberLight, borderRadius: 4,
    borderLeftWidth: 3, borderLeftColor: COLORS.amber,
  },
  warningText: { fontSize: 8, color: '#92400e', flex: 1, lineHeight: 1.5 },

  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },

  // Markdown table
  mdTable: { marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4 },
  mdTableHeadRow: { flexDirection: 'row', backgroundColor: COLORS.bgCard },
  mdTableRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border },
  mdTableRowAlt: { backgroundColor: COLORS.bgLight },
  mdTableCell: { flex: 1, paddingHorizontal: 7, paddingVertical: 5, fontSize: 8, color: COLORS.primary },
  mdTableHeadCell: { flex: 1, paddingHorizontal: 7, paddingVertical: 5, fontSize: 8, fontFamily: 'Helvetica-Bold', color: COLORS.secondary },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function shortGroupId(id: string): string {
  return id.length > 8 ? `#${id.slice(-6)}` : `#${id}`;
}

function rateColor(rate: number): string {
  if (rate >= 80) return COLORS.green;
  if (rate >= 50) return COLORS.amber;
  return COLORS.red;
}

/** Remplace les emojis non supportés par Helvetica par des équivalents texte */
function stripUnsupportedChars(text: string): string {
  return text
    .replace(/👉\s*/g, '> ')
    .replace(/✅\s*/g, '')
    .replace(/⚠️\s*/g, '[!] ')
    .replace(/⚠\s*/g, '[!] ')
    .replace(/👏\s*/g, '')
    .replace(/[^\x00-\x7FÀ-ÿœŒæÆ€«»°²³]/g, ''); // strip remaining non-latin
}

type SummarySegment =
  | { type: 'heading'; content: string }
  | { type: 'bullet'; content: string }
  | { type: 'bold'; content: string }
  | { type: 'text'; content: string }
  | { type: 'table'; headers: string[]; rows: string[][] };

function parseTableRow(line: string): string[] {
  return line
    .split('|')
    .map((c) => stripUnsupportedChars(c.replace(/\*\*(.*?)\*\*/g, '$1').trim()))
    .filter((c) => c.length > 0);
}

function isTableSeparator(line: string): boolean {
  return /^\|[\s\-|:]+\|$/.test(line) || /^[\-|: ]+$/.test(line);
}

function isTableRow(line: string): boolean {
  return line.startsWith('|') && line.endsWith('|') && line.includes('|', 1);
}

/**
 * Parse le texte de résumé (markdown-like) en segments pour l'affichage PDF.
 * Gère : headers, bullets, **gras**, tableaux markdown, texte normal.
 * Supprime les emojis non supportés par Helvetica.
 */
function parseSummaryLines(text: string): SummarySegment[] {
  if (!text) return [];

  const rawLines = text.split('\n').map((l) => l.trim());
  const segments: SummarySegment[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];
    if (!line) { i++; continue; }

    // Markdown table: collect header + separator + rows
    if (isTableRow(line)) {
      const headers = parseTableRow(line);
      i++;
      // Skip separator line
      if (i < rawLines.length && isTableSeparator(rawLines[i])) i++;
      const rows: string[][] = [];
      while (i < rawLines.length && isTableRow(rawLines[i])) {
        rows.push(parseTableRow(rawLines[i]));
        i++;
      }
      if (headers.length > 0 && rows.length > 0) {
        segments.push({ type: 'table', headers, rows });
      }
      continue;
    }

    // Markdown headers
    if (/^#{1,4}\s+/.test(line)) {
      const content = stripUnsupportedChars(line.replace(/^#{1,4}\s+/, '').replace(/\*\*(.*?)\*\*/g, '$1'));
      if (content) segments.push({ type: 'heading', content });
      i++; continue;
    }

    // Separator lines (---, ***)
    if (/^[-*_]{3,}$/.test(line)) { i++; continue; }

    // Bullets
    if (line.startsWith('- ') || line.startsWith('• ') || /^\*\s+/.test(line)) {
      const content = stripUnsupportedChars(line.replace(/^[-•*]\s+/, '').replace(/\*\*(.*?)\*\*/g, '$1'));
      if (content) segments.push({ type: 'bullet', content });
      i++; continue;
    }

    // Entirely bold line
    if (line.startsWith('**') && line.endsWith('**')) {
      const content = stripUnsupportedChars(line.replace(/\*\*/g, ''));
      if (content) segments.push({ type: 'bold', content });
      i++; continue;
    }

    // Mixed / plain text (strip bold markers and emojis)
    const content = stripUnsupportedChars(line.replace(/\*\*(.*?)\*\*/g, '$1'));
    if (content) segments.push({ type: 'text', content });
    i++;
  }

  return segments;
}

// ─── Page footer ──────────────────────────────────────────────────────────────

function PageFooter({ promoTitle }: { promoTitle: string }) {
  return (
    <View style={styles.pageFooter} fixed>
      <Text style={styles.pageFooterText}>Zone01 Normandie — {promoTitle}</Text>
      <Text
        style={styles.pageFooterText}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

// ─── Cover page ───────────────────────────────────────────────────────────────

function CoverPage({ data }: { data: FullExportData }) {
  const { globalStats, promos, generatedAt } = data;
  return (
    <Page size="A4" style={styles.coverPage}>
      <Text style={styles.coverTitle}>Rapport des Audits</Text>
      <Text style={styles.coverSubtitle}>Zone01 Normandie — Export complet</Text>
      <View style={styles.coverDivider} />
      <View style={styles.coverStatRow}>
        <View style={styles.coverStatBox}>
          <Text style={styles.coverStatValue}>{globalStats.totalAudits}</Text>
          <Text style={styles.coverStatLabel}>Audits réalisés</Text>
        </View>
        <View style={styles.coverStatBox}>
          <Text style={styles.coverStatValue}>{globalStats.totalPromos}</Text>
          <Text style={styles.coverStatLabel}>Promotions</Text>
        </View>
        <View style={styles.coverStatBox}>
          <Text style={styles.coverStatValue}>{globalStats.totalStudents}</Text>
          <Text style={styles.coverStatLabel}>Étudiants évalués</Text>
        </View>
        <View style={[styles.coverStatBox, { borderColor: COLORS.green }]}>
          <Text style={[styles.coverStatValue, { color: COLORS.green }]}>
            {globalStats.validationRate}%
          </Text>
          <Text style={styles.coverStatLabel}>Taux de validation</Text>
        </View>
      </View>
      <Text style={{ fontSize: 10, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' }}>
        Promotions incluses
      </Text>
      <View style={styles.coverPromoList}>
        {promos.map((p) => (
          <View key={p.promoId} style={styles.coverPromoItem}>
            <Text style={styles.coverPromoName}>{p.promoTitle}</Text>
            <Text style={styles.coverPromoStats}>
              {p.totalAudits} audits · {p.validationRate}% validés
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.coverFooter}>
        <Text style={styles.coverFooterText}>Généré le {formatDate(generatedAt)}</Text>
        <Text style={styles.coverFooterText}>Confidentiel — Usage interne</Text>
      </View>
    </Page>
  );
}

// ─── Promo summary page ────────────────────────────────────────────────────────

function PromoSummaryPage({ promo }: { promo: PromoExport }) {
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageHeaderPromo}>{promo.promoTitle}</Text>
        <Text style={styles.pageHeaderTitle}>Récapitulatif de la promotion</Text>
      </View>
      <View style={styles.promoTitleRow}>
        <View style={styles.promoTitleBar} />
        <View>
          <Text style={styles.promoTitle}>{promo.promoTitle}</Text>
          <Text style={styles.promoSubtitle}>Promotion #{promo.promoId}</Text>
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{promo.totalAudits}</Text>
          <Text style={styles.statLabel}>Audits</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{promo.totalStudents}</Text>
          <Text style={styles.statLabel}>Évaluations</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: rateColor(promo.validationRate) }]}>
            {promo.validationRate}%
          </Text>
          <Text style={styles.statLabel}>Validés</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{promo.tracks.length}</Text>
          <Text style={styles.statLabel}>Troncs</Text>
        </View>
      </View>
      <View style={styles.summaryBox}>
        <Text style={styles.summaryTitle}>Détail par tronc</Text>
        {promo.tracks.map((track) => (
          <View key={track.track} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={[styles.trackDot, { backgroundColor: TRACK_COLORS[track.track] ?? COLORS.muted }]} />
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: COLORS.primary }}>
                  {track.track}
                </Text>
              </View>
              <Text style={{ fontSize: 9, color: COLORS.muted }}>
                {track.totalAudits} audits · {track.totalStudents} éval. · {track.validationRate}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${track.validationRate}%`, backgroundColor: rateColor(track.validationRate) }]} />
            </View>
          </View>
        ))}
      </View>
      {promo.topAuditors.length > 0 && (
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Auditeurs ({promo.topAuditors.length})</Text>
          {promo.topAuditors.map((a) => (
            <View key={a.name} style={styles.auditorRow}>
              <Text style={styles.auditorName}>{a.name}</Text>
              <Text style={styles.auditorCount}>{a.count} audit{a.count > 1 ? 's' : ''}</Text>
            </View>
          ))}
        </View>
      )}
      <PageFooter promoTitle={promo.promoTitle} />
    </Page>
  );
}

// ─── Track overview page (table) ─────────────────────────────────────────────

function TrackOverviewPage({ promo, track }: { promo: PromoExport; track: TrackExport }) {
  const trackColor = TRACK_COLORS[track.track] ?? COLORS.muted;
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageHeaderPromo}>{promo.promoTitle}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={[styles.trackDot, { backgroundColor: trackColor, width: 7, height: 7 }]} />
          <Text style={styles.pageHeaderTitle}>{track.track} — Vue d'ensemble</Text>
        </View>
      </View>
      <View style={styles.trackHeader}>
        <View style={[styles.trackDot, { backgroundColor: trackColor, width: 12, height: 12 }]} />
        <Text style={styles.trackTitle}>{track.track}</Text>
        <Text style={styles.trackStats}>
          {track.totalAudits} audits · {track.totalStudents} étudiants · {track.validationRate}% validés
        </Text>
      </View>
      <View style={styles.table}>
        <View style={styles.tableHead}>
          <Text style={[styles.tableHeadCell, styles.colProject]}>Projet</Text>
          <Text style={[styles.tableHeadCell, styles.colGroup]}>Groupe</Text>
          <Text style={[styles.tableHeadCell, styles.colDate]}>Date</Text>
          <Text style={[styles.tableHeadCell, styles.colAuditor]}>Auditeur</Text>
          <Text style={[styles.tableHeadCell, styles.colMembers]}>Membres</Text>
          <Text style={[styles.tableHeadCell, styles.colValidated]}>Validés</Text>
          <Text style={[styles.tableHeadCell, styles.colRate]}>%</Text>
        </View>
        {track.audits.map((audit, i) => {
          const rate = audit.totalMembers > 0
            ? Math.round((audit.validatedCount / audit.totalMembers) * 100) : 0;
          return (
            <View key={audit.id} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.tableCell, styles.colProject]}>{audit.projectName}</Text>
              <Text style={[styles.tableCellMuted, styles.colGroup]}>{shortGroupId(audit.groupId)}</Text>
              <Text style={[styles.tableCellMuted, styles.colDate]}>{formatDate(audit.createdAt)}</Text>
              <Text style={[styles.tableCell, styles.colAuditor]}>{audit.auditorName}</Text>
              <Text style={[styles.tableCellMuted, styles.colMembers]}>
                {audit.results.map((r) => r.studentLogin).join(', ')}
              </Text>
              <Text style={[styles.tableCell, styles.colValidated]}>
                {audit.validatedCount}/{audit.totalMembers}
              </Text>
              <Text style={[styles.tableCell, styles.colRate, { color: rateColor(rate), fontFamily: 'Helvetica-Bold' }]}>
                {rate}%
              </Text>
            </View>
          );
        })}
      </View>
      <PageFooter promoTitle={promo.promoTitle} />
    </Page>
  );
}

// ─── Audit detail card ────────────────────────────────────────────────────────

function AuditDetailCard({ audit, trackColor }: { audit: AuditExport; trackColor: string }) {
  const rate = audit.totalMembers > 0
    ? Math.round((audit.validatedCount / audit.totalMembers) * 100) : 0;
  const summaryLines = parseSummaryLines(audit.summary);
  const globalWarnings = audit.results.flatMap((r) => r.warnings.map((w) => ({ w, login: r.studentLogin })));

  return (
    <View style={styles.auditCard}>
      {/* Header — stays together, small enough to never overflow alone */}
      <View style={styles.auditCardHeader} wrap={false}>
        <View style={styles.auditCardHeaderLeft}>
          <View style={[styles.trackDot, { backgroundColor: trackColor, width: 10, height: 10 }]} />
          <View>
            <Text style={styles.auditCardTitle}>{audit.projectName}</Text>
            <Text style={styles.auditCardMeta}>
              {shortGroupId(audit.groupId)} · {formatDate(audit.createdAt)} · {audit.auditorName}
            </Text>
          </View>
        </View>
        <View style={[styles.auditCardBadge, { backgroundColor: rateColor(rate) + '22' }]}>
          <Text style={[styles.auditCardBadgeText, { color: rateColor(rate) }]}>
            {audit.validatedCount}/{audit.totalMembers} validés ({rate}%)
          </Text>
        </View>
      </View>

      <View style={styles.auditCardBody}>
        {/* Summary */}
        {summaryLines.length > 0 && (
          <View style={styles.summarySection}>
            <Text style={styles.summarySectionTitle}>Résumé de l'audit</Text>
            {summaryLines.map((line, i) => {
              if (line.type === 'heading') {
                return (
                  <Text key={i} style={[styles.summaryText, styles.summaryBold, { fontSize: 9.5, marginTop: 6, marginBottom: 3, color: COLORS.secondary }]}>
                    {line.content}
                  </Text>
                );
              }
              if (line.type === 'bullet') {
                return (
                  <View key={i} style={styles.summaryBullet}>
                    <Text style={styles.summaryBulletDot}>•</Text>
                    <Text style={styles.summaryBulletText}>{line.content}</Text>
                  </View>
                );
              }
              if (line.type === 'bold') {
                return (
                  <Text key={i} style={[styles.summaryText, styles.summaryBold, { marginTop: 4 }]}>
                    {line.content}
                  </Text>
                );
              }
              if (line.type === 'table') {
                return (
                  <View key={i} style={styles.mdTable}>
                    <View style={styles.mdTableHeadRow}>
                      {line.headers.map((h, j) => (
                        <Text key={j} style={styles.mdTableHeadCell}>{h}</Text>
                      ))}
                    </View>
                    {line.rows.map((row, ri) => (
                      <View key={ri} style={[styles.mdTableRow, ri % 2 === 1 ? styles.mdTableRowAlt : {}]}>
                        {row.map((cell, ci) => (
                          <Text key={ci} style={styles.mdTableCell}>{cell}</Text>
                        ))}
                      </View>
                    ))}
                  </View>
                );
              }
              return (
                <Text key={i} style={[styles.summaryText, { marginBottom: 2 }]}>
                  {line.content}
                </Text>
              );
            })}
          </View>
        )}

        {/* Global warnings */}
        {globalWarnings.length > 0 && (
          <View style={[styles.summarySection, { marginBottom: 10 }]}>
            <Text style={styles.summarySectionTitle}>Avertissements</Text>
            <View style={styles.warningsList}>
              {globalWarnings.map((item, i) => (
                <View key={i} style={styles.warningItem}>
                  <Text style={styles.warningText}>[!] [{item.login}] {stripUnsupportedChars(item.w)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Students */}
        <View style={styles.summarySection}>
          <Text style={styles.summarySectionTitle}>Résultats par étudiant</Text>
          <View style={styles.studentsTable}>
            {audit.results.map((student, i) => {
              const isAbsent = student.absent;
              const isValidated = student.validated && !isAbsent;
              const statusBg = isAbsent ? COLORS.amberLight
                : isValidated ? COLORS.greenLight : COLORS.redLight;
              const statusColor = isAbsent ? COLORS.amber
                : isValidated ? COLORS.green : COLORS.red;
              const statusLabel = isAbsent ? 'Absent' : isValidated ? 'Validé' : 'Non validé';

              return (
                <View key={student.studentLogin} style={[styles.studentRow, i % 2 === 1 ? styles.studentRowAlt : {}]}>
                  <Text style={styles.studentLogin}>{student.studentLogin}</Text>
                  <View style={styles.studentStatus}>
                    <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                      <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                    </View>
                  </View>
                  <Text style={styles.studentFeedback}>
                    {student.feedback ? stripUnsupportedChars(student.feedback) : '—'}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Track detail pages ───────────────────────────────────────────────────────

function TrackDetailPages({ promo, track }: { promo: PromoExport; track: TrackExport }) {
  const trackColor = TRACK_COLORS[track.track] ?? COLORS.muted;

  // Group audits by project, preserving order
  const auditsByProject = new Map<string, AuditExport[]>();
  for (const audit of track.audits) {
    if (!auditsByProject.has(audit.projectName)) auditsByProject.set(audit.projectName, []);
    auditsByProject.get(audit.projectName)!.push(audit);
  }

  return (
    // Single page for the entire track — react-pdf paginates automatically
    <Page size="A4" style={styles.page}>
      {/* Fixed header repeated on every page */}
      <View style={styles.pageHeader} fixed>
        <Text style={styles.pageHeaderPromo}>{promo.promoTitle}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={[styles.trackDot, { backgroundColor: trackColor, width: 7, height: 7 }]} />
          <Text style={styles.pageHeaderTitle}>{track.track} — Détails des audits</Text>
        </View>
      </View>

      {[...auditsByProject.entries()].map(([projectName, projectAudits]) => (
        <View key={projectName}>
          {/* Project section header — kept together, small enough */}
          <View wrap={false} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 10, paddingBottom: 6, borderBottomWidth: 2, borderBottomColor: trackColor }}>
            <View style={[styles.trackDot, { backgroundColor: trackColor, width: 10, height: 10 }]} />
            <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: COLORS.primary }}>
              {projectName}
            </Text>
            <Text style={{ fontSize: 9, color: COLORS.muted }}>
              — {projectAudits.length} audit{projectAudits.length > 1 ? 's' : ''}
            </Text>
          </View>

          {projectAudits.map((audit) => (
            <AuditDetailCard key={audit.id} audit={audit} trackColor={trackColor} />
          ))}
        </View>
      ))}

      <PageFooter promoTitle={promo.promoTitle} />
    </Page>
  );
}

// ─── Main document ────────────────────────────────────────────────────────────

export function AuditReportDocument({ data }: { data: FullExportData }) {
  return (
    <Document
      title="Rapport des Audits — Zone01 Normandie"
      author="Zone01 Admin Dashboard"
      subject="Export des code-reviews avec résumés et feedbacks"
    >
      <CoverPage data={data} />

      {data.promos.map((promo) => (
        <React.Fragment key={promo.promoId}>
          <PromoSummaryPage promo={promo} />
          {promo.tracks.map((track) => (
            <React.Fragment key={track.track}>
              <TrackOverviewPage promo={promo} track={track} />
              <TrackDetailPages promo={promo} track={track} />
            </React.Fragment>
          ))}
        </React.Fragment>
      ))}
    </Document>
  );
}
