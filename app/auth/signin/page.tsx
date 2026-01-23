"use client";

import { signIn, getProviders } from "next-auth/react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ArrowRight } from "lucide-react";

type Providers = Awaited<ReturnType<typeof getProviders>>;

export default function SignInPage() {
  const [providers, setProviders] = useState<Providers>(null);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const error = searchParams.get("error");

  useEffect(() => {
    getProviders().then(setProviders);
  }, []);

  const handleSignIn = async (providerId: string) => {
    setLoading(true);
    await signIn(providerId, { callbackUrl });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md border-2">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Connexion SSO</CardTitle>
          <CardDescription>
            Connectez-vous avec votre compte Zone01
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              {error === "OAuthSignin" && "Erreur lors de la connexion OAuth."}
              {error === "OAuthCallback" && "Erreur lors du callback OAuth."}
              {error === "OAuthCreateAccount" && "Impossible de créer le compte."}
              {error === "Callback" && "Erreur de callback."}
              {error === "AccessDenied" && "Accès refusé."}
              {!["OAuthSignin", "OAuthCallback", "OAuthCreateAccount", "Callback", "AccessDenied"].includes(error) &&
                "Une erreur est survenue lors de la connexion."}
            </div>
          )}

          {providers ? (
            Object.values(providers).map((provider) => (
              <Button
                key={provider.id}
                onClick={() => handleSignIn(provider.id)}
                disabled={loading}
                className="w-full h-12 text-base"
                size="lg"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Connexion en cours...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Se connecter avec {provider.name}
                    <ArrowRight className="h-4 w-4 ml-auto" />
                  </span>
                )}
              </Button>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-4">
              Chargement des providers...
            </div>
          )}

          <p className="text-xs text-center text-muted-foreground pt-4">
            En vous connectant, vous acceptez les conditions d&apos;utilisation
            et la politique de confidentialité de Zone01 Normandie.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
