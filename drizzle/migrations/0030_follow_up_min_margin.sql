-- Marge minimale entre un jalon de suivi et la fin du contrat.
--
-- Un point « 12 mois » qui tombe 3 jours avant le départ de l'apprenant n'est
-- pas organisable : personne ne planifie une visite en entreprise pour
-- quelqu'un qui s'en va. La valeur est en base, pas dans le code : c'est un
-- arbitrage pédagogique, susceptible d'évoluer.

ALTER TABLE "follow_up_settings"
    ADD COLUMN IF NOT EXISTS "min_days_before_contract_end" INTEGER NOT NULL DEFAULT 30;
