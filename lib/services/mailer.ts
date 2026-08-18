import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';
import { makeLog } from '@/lib/log';

const log = makeLog('mailer');

/**
 * Envoi de mails sortants via SMTP (Google Workspace).
 *
 * Config (env) :
 *   SMTP_HOST      — ex. smtp.gmail.com
 *   SMTP_PORT      — 587 (STARTTLS) ou 465 (SSL)
 *   SMTP_USER      — adresse de la boîte émettrice
 *   SMTP_PASSWORD  — mot de passe d'application (PAS le mot de passe du compte)
 *   SMTP_FROM      — optionnel, « Nom <adresse> » par défaut = SMTP_USER
 *
 * Même contrat que les autres intégrations du hub (`isTeamsConfigured()`) :
 * si l'env est absent, `isMailerConfigured()` renvoie false et l'appelant
 * dégrade proprement au lieu de planter.
 */

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_FROM = process.env.SMTP_FROM;

export function isMailerConfigured(): boolean {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASSWORD);
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    });
  }
  return transporter;
}

export interface SendMailInput {
  to: string;
  subject: string;
  /** Corps texte brut — toujours fourni (clients sans HTML, délivrabilité). */
  text: string;
  html?: string;
  cc?: string;
  replyTo?: string;
  /** Surcharge l'expéditeur (« Nom <adresse> »). */
  from?: string;
}

export interface SendMailResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  if (!isMailerConfigured()) {
    return { ok: false, error: 'SMTP non configuré (SMTP_HOST / SMTP_USER / SMTP_PASSWORD)' };
  }
  try {
    const info = await getTransporter().sendMail({
      from: input.from ?? SMTP_FROM ?? SMTP_USER,
      to: input.to,
      cc: input.cc,
      replyTo: input.replyTo,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    log.info(`mail envoyé à ${input.to} (${info.messageId})`);
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    log.error(`échec d'envoi à ${input.to} : ${error}`);
    return { ok: false, error };
  }
}

/** Vérifie la connexion SMTP (bouton « Tester la configuration »). */
export async function verifyMailer(): Promise<SendMailResult> {
  if (!isMailerConfigured()) {
    return { ok: false, error: 'SMTP non configuré' };
  }
  try {
    await getTransporter().verify();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
