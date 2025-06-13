import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { SelectStudent } from '@/lib/db/schema/students';
import { deleteStudent } from './actions';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const getProgressStatusClass = (status: string | null) => {
  switch (status) {
    case 'audit':
      return 'bg-orange-500 text-white'; // Couleur orange pour 'audit'
    case 'setup':
      return 'bg-purple-500 text-white'; // Couleur violet pour 'setup'
    case 'working':
      return 'bg-blue-500 text-white'; // Couleur bleue pour 'working'
    case 'finished':
      return 'bg-green-500 text-white'; // Couleur verte pour 'finished'
    case 'without group':
      return 'bg-red-500 text-white'; // Couleur rouge pour 'without group'
    default:
      return 'bg-gray-300 text-black'; // Valeur par défaut pour un statut inconnu
  }
};

const getDelayLevelClass = (level: string | null) => {
  switch (level) {
    case 'bien':
      return 'bg-green-500 text-white'; // Couleur verte pour 'bien'
    case 'en retard':
      return 'bg-red-500 text-white'; // Couleur rouge pour 'en retard'
    case 'en avance':
      return 'bg-blue-500 text-white'; // Couleur bleue pour 'en avance'
    case 'spécialité':
      return 'bg-yellow-500 text-white'; // Couleur jaune pour 'spécialité'
    default:
      return 'bg-gray-300 text-black'; // Valeur par défaut pour un niveau inconnu
  }
};

interface currentUser {
  id: number;
  login: string;
  firstName: string;
  lastName: string;
  auditRatio: number;
  auditsAssigned: number;
  campus: string;
  email: string;
  githubId: string;
  discordId: string;
  discordDMChannelId: string;
  last_login: string;
  last_contribution: string;
}

export function Student({ student }: { student: SelectStudent }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [userData, setUserData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const fetchGiteaAndUserFind = async () => {
    toast.promise(
      (async () => {
        try {
          const giteaResponse = await fetch(
            `https://api-zone01-rouen.deno.dev/api/v1/gitea-info/${student.login}`,
            /*`http://localhost:8000/api/v1/gitea-info/${student.login}`,*/  /*For development*/ {
              headers: {
                Authorization: `Bearer ${process.env.NEXT_PUBLIC_ACCESS_TOKEN}`
              }
            }
          );
          const userFindResponse = await fetch(
            `https://api-zone01-rouen.deno.dev/api/v1/user-info/${student.login}`,
            /*`http://localhost:8000/api/v1/user-info/${student.login}`,*/ /*For development*/ {
              headers: {
                Authorization: `Bearer ${process.env.NEXT_PUBLIC_ACCESS_TOKEN}`
              }
            }
          );

          if (!giteaResponse.ok) {
            throw new Error(`Gitea fetch failed: ${giteaResponse.statusText}`);
          }

          if (!userFindResponse.ok) {
            throw new Error(
              `User find fetch failed: ${userFindResponse.statusText}`
            );
          }

          const giteaFindData = await giteaResponse.json();

          const latestDate = giteaFindData.heatmap.reduce(
            (latest: { timestamp: number }, current: { timestamp: number }) => {
              return current.timestamp > latest.timestamp ? current : latest;
            }
          );

          const timeMessage = formatDistanceToNow(
            new Date(latestDate.timestamp * 1000),
            {
              locale: fr
            }
          );

          // console.log('GITEA', giteaFindData);
          const giteaData = {
            last_login: giteaFindData.user.last_login,
            last_contribution: timeMessage
          };

          const userFindData = await userFindResponse.json();
          // console.log(userFindData.user);
          const userData = userFindData.user.map((user: any) => ({
            id: user.id,
            login: user.login,
            firstName: user.firstName,
            lastName: user.lastName,
            auditRatio: user.auditRatio,
            auditsAssigned: user.auditsAssigned,
            campus: user.campus,
            email: user.email,
            githubId: user.githubId,
            discordId: user.discordId,
            discordDMChannelId: user.discordDMChannelId,
            last_login: giteaData.last_login,
            last_contribution: giteaData.last_contribution
          }));
          setUserData(userData);
          setIsDrawerOpen(true);
          return { giteaFindData, userFindData };
        } catch (error) {
          console.error('Error fetching data:', error);
          throw error;
        }
      })(),
      {
        loading: 'Fetching data...',
        success: <b>{student.login} has been fetched successfully</b>,
        error: <b>Could not fetch data.</b>
      }
    );
  };

  const handleClick = async () => {
    await fetchGiteaAndUserFind();
  };

  const handleClose = () => {
    setUserData([]);
    setIsDrawerOpen(false);
  };

  const handleNext = () => {
    if (currentIndex < 10) {
      // Limiter à 4 informations (nom, email, ratio, etc.)
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const currentUser: currentUser = userData[0] || ({} as currentUser);
  const ratio = currentUser?.auditRatio ?? 0;
  const infoList = [
    {
      label: 'Name',
      value: `${currentUser.firstName} ${currentUser.lastName}`
    },
    { label: 'Email', value: currentUser.email || 'N/A' },
    { label: 'Campus', value: currentUser.campus || 'N/A' },
    {
      label: 'Dernière contribution',
      value: currentUser.last_contribution || 'N/A'
    },
    { label: 'Audit Ratio', value: ratio.toFixed(1) ?? 'N/A' },
    { label: 'Audits Assigned', value: currentUser.auditsAssigned || '0' },
    {
      label: 'Last Login',
      value: currentUser.last_login
        ? new Date(currentUser.last_login).toLocaleDateString('fr-FR')
        : 'N/A'
    },
    { label: 'Github ID', value: currentUser.githubId || 'N/A' }
    /*{ label: 'Discord ID', value: currentUser.discordId || 'N/A' },
                        { label: 'Discord DM Channel ID', value: currentUser.discordDMChannelId || 'N/A' },*/
  ];

  const currentInfo = infoList[currentIndex] || {};

  return (
    <>
      <TableRow onClick={handleClick} className="cursor-pointer">
        <TableCell className="font-medium">{student.first_name}</TableCell>
        <TableCell>{student.last_name}</TableCell>
        <TableCell>{student.login}</TableCell>
        <TableCell>
          <Badge variant="outline" className="capitalize">
            {student.promos}
          </Badge>
        </TableCell>
        <TableCell>
          {student.golang_project} {student.golang_completed ? '✅' : '❌'}
        </TableCell>
        <TableCell>
          {student.javascript_project} {student.javascript_completed ? '✅' : '❌'}
        </TableCell>
        <TableCell>
          {student.rust_project} {student.rust_completed ? '✅' : '❌'}
        </TableCell>
        {/* Ajout des nouvelles colonnes */}
        <TableCell>
          <Badge variant="outline" className="capitalize">
            {student.actual_project_name || 'N/A'}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge
            variant="outline"
            className={`capitalize ${getProgressStatusClass(student.progress_status)}`}
          >
            {student.progress_status || 'N/A'}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge
            variant="outline"
            className={`capitalize ${getDelayLevelClass(student.delay_level)}`}
          >
            {student.delay_level || 'N/A'}
          </Badge>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          {new Date(student.availableAt).toLocaleDateString('en-US')}
        </TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-haspopup="true" size="icon" variant="ghost">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem>
                <form action={deleteStudent}>
                  <button type="submit">Delete</button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      <Drawer open={isDrawerOpen} onClose={handleClose}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader>
              <DrawerTitle>User Data ({currentUser.login})</DrawerTitle>
              <DrawerDescription>
                Navigate through the user's data.
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-4">
              <div className="flex items-center justify-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-full"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft />
                  <span className="sr-only">Previous</span>
                </Button>
                <div className="flex-1 text-center">
                  <div className="text-lg font-bold tracking-tighter">
                    {currentInfo.label}
                  </div>
                  <div className="mt-4 text-3xl font-extrabold">
                    {currentInfo.value}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-full"
                  onClick={handleNext}
                  disabled={currentIndex === infoList.length - 1}
                >
                  <ChevronRight />
                  <span className="sr-only">Next</span>
                </Button>
              </div>
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
