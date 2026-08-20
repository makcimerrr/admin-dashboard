-- Le récapitulatif interne passe de Teams au DM Discord.
--
-- Le destinataire est un ID Discord saisi dans l'interface du hub, et non une
-- variable d'environnement : la personne qui suit les alternants peut changer,
-- et ce changement ne doit pas demander un redéploiement.

ALTER TABLE "follow_up_settings"
    ADD COLUMN IF NOT EXISTS "digest_discord_user_id" TEXT;

ALTER TABLE "follow_up_settings"
    ADD COLUMN IF NOT EXISTS "digest_enabled" BOOLEAN NOT NULL DEFAULT TRUE;

-- Reprend l'état de l'ancien réglage Teams avant de le retirer.
UPDATE "follow_up_settings"
SET "digest_enabled" = "teams_alerts_enabled"
WHERE EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'follow_up_settings' AND column_name = 'teams_alerts_enabled'
);

ALTER TABLE "follow_up_settings" DROP COLUMN IF EXISTS "teams_alerts_enabled";
