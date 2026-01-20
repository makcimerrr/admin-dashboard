"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";

const errorMessages: Record<string, { title: string; description: string }> = {
  Configuration: {
    title: "Erreur de configuration",
    description: "Le serveur d'authentification n'est pas correctement configuré.",
  },
  AccessDenied: {
    title: "Accès refusé",
    description: "Vous n'avez pas les permissions nécessaires pour accéder à cette ressource.",
  },
  Verification: {
    title: "Erreur de vérification",
    description: "Le lien de vérification a expiré ou a déjà été utilisé.",
  },
  OAuthSignin: {
    title: "Erreur OAuth",
    description: "Impossible d'initier la connexion avec le fournisseur d'identité.",
  },
  OAuthCallback: {
    title: "Erreur de callback",
    description: "Une erreur s'est produite lors du retour du fournisseur d'identité.",
  },
  OAuthCreateAccount: {
    title: "Erreur de création de compte",
    description: "Impossible de créer un compte avec les informations fournies.",
  },
  EmailCreateAccount: {
    title: "Erreur de création de compte",
    description: "Impossible de créer un compte avec cette adresse email.",
  },
  Callback: {
    title: "Erreur de callback",
    description: "Une erreur s'est produite lors du traitement de la réponse.",
  },
  OAuthAccountNotLinked: {
    title: "Compte non lié",
    description: "Cette adresse email est déjà associée à un autre compte.",
  },
  SessionRequired: {
    title: "Session requise",
    description: "Vous devez être connecté pour accéder à cette page.",
  },
  Default: {
    title: "Erreur d'authentification",
    description: "Une erreur inattendue s'est produite lors de l'authentification.",
  },
};

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "Default";
  const errorInfo = errorMessages[error] || errorMessages.Default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md border-2 border-destructive/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-destructive/10 rounded-full w-fit">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl text-destructive">{errorInfo.title}</CardTitle>
          <CardDescription>{errorInfo.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <Button asChild variant="default" className="w-full">
              <Link href="/auth/signin">
                <RefreshCw className="h-4 w-4 mr-2" />
                Réessayer
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour à l&apos;accueil
              </Link>
            </Button>
          </div>

          {process.env.NODE_ENV === "development" && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-xs font-mono text-muted-foreground">
                Error code: {error}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
