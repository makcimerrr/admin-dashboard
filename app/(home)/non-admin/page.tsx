'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import {
  Card, CardContent,
  CardDescription, CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';

const NonAdminPage = () => {
  const router = useRouter();

  const handleRedirect = () => {
    router.push('/contact');
  };

  return (
    <div className="flex items-center justify-center h-screen">
      <Card className="w-full max-w-md p-6 shadow-md">
        <CardHeader>
          <CardTitle className="text-red-600 text-center">
            Accès Restreint
          </CardTitle>
          <CardDescription className="text-center">
            Désolé, cette page est réservée aux administrateurs.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-center">
          <p className="mb-4">Si tu penses qu'il s'agit d'une erreur, contacte nous !</p>
        </CardContent>

        <CardFooter>
          <Button
            onClick={handleRedirect}
            className="w-full hover:bg-gray-900 hover:text-white"
          >
            Aller à la page Contact
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default NonAdminPage;
