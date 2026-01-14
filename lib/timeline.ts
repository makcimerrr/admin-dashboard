import fs from 'fs';
import path from 'path';

// Fonction pour mettre à jour le fichier JSON avec le projet et la promotion
export async function updateEnv(projectName: string, promotionKey: string) {
  // Obtenir le répertoire courant du fichier
  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const rootDir = path.join(__dirname, '../'); // En remontant jusqu'à la racine du projet
  const jsonFilePath = path.join(rootDir, 'config', 'promoStatus.json'); // Chemin vers config/promoStatus.json

  try {
    // Vérifier si le fichier existe déjà, sinon le créer avec un objet vide
    if (!fs.existsSync(jsonFilePath)) {
      fs.writeFileSync(jsonFilePath, JSON.stringify({}, null, 2), 'utf8');
    }

    // Lire le contenu actuel du fichier JSON
    let data = fs.readFileSync(jsonFilePath, 'utf8');
    let jsonData = JSON.parse(data);

    // Mettre à jour la promotion avec le nom du projet
    jsonData[promotionKey] = projectName;

    // Sauvegarder le fichier JSON mis à jour
    fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2), 'utf8');
    return {
      success: true,
      message: `La variable ${promotionKey} a été mise à jour avec le projet: ${projectName}`
    };
  } catch (err) {
    return { success: false, message: `Erreur: ${err}` };
  }
}

// Fonction pour mettre à jour le fichier JSON avec plusieurs tracks (rust/java)
export async function updateEnvMultiTrack(
  tracks: { rust?: string; java?: string },
  promotionKey: string
) {
  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const rootDir = path.join(__dirname, '../');
  const jsonFilePath = path.join(rootDir, 'config', 'promoStatus.json');

  try {
    if (!fs.existsSync(jsonFilePath)) {
      fs.writeFileSync(jsonFilePath, JSON.stringify({}, null, 2), 'utf8');
    }

    let data = fs.readFileSync(jsonFilePath, 'utf8');
    let jsonData = JSON.parse(data);

    // Mettre à jour la promotion avec les tracks
    jsonData[promotionKey] = tracks;

    fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2), 'utf8');
    return {
      success: true,
      message: `La variable ${promotionKey} a été mise à jour avec les tracks: ${JSON.stringify(tracks)}`
    };
  } catch (err) {
    return { success: false, message: `Erreur: ${err}` };
  }
}

type Project = {
  id: number;
  name: string;
  project_time_week: number;
};

type PromotionDates = {
  start: string;
  'piscine-js-start': string;
  'piscine-js-end': string;
  'piscine-rust-java-start': string;
  'piscine-rust-java-end': string;
  end: string;
};

type Promotion = {
  key: string;
  eventId: number;
  title: string;
  dates: PromotionDates;
};

type Holidays = Record<string, { start: string; end: string }[]>;

type AllProjects = {
  Golang: Project[];
  Javascript: Project[];
  Rust: Project[];
  Java: Project[];
};

// Comparer les dates sans prendre en compte l'heure
function compareDates(
  startDate: Date,
  endDate: Date,
  currentDate: Date
): boolean {
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  currentDate.setHours(0, 0, 0, 0);

  return startDate <= currentDate && currentDate <= endDate;
}

export async function displayAgenda(
  promotion: Promotion,
  allProjects: AllProjects,
  holidays: Holidays
): Promise<{
  agenda: string[];
  success: boolean;
  promotionName: string;
  currentProject: string;
  progress: number;
}> {
  const result: string[] = [];
  const current_date = new Date();
  let EndDateEstimated: string = '';
  let currentProject: string = 'Aucun';
  let progress: number = 0;

  function getWeekdays(startDate: Date, endDate: Date): Date[] {
    const weekdays: Date[] = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      if (currentDate.getDay() >= 1 && currentDate.getDay() <= 5) {
        weekdays.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return weekdays;
  }

  function getHolidays(
    startDate: Date,
    endDate: Date,
    holidays: Holidays
  ): Date[] {
    const holidayDates: Date[] = [];
    for (const periods of Object.values(holidays)) {
      for (const period of periods) {
        const holidayStart = new Date(period.start);
        const holidayEnd = new Date(period.end);
        if (holidayEnd >= startDate && holidayStart <= endDate) {
          const start = new Date(
            Math.max(startDate.getTime(), holidayStart.getTime())
          );
          const end = new Date(
            Math.min(endDate.getTime(), holidayEnd.getTime())
          );
          holidayDates.push(...getWeekdays(start, end));
        }
      }
    }
    return holidayDates;
  }

  function calculateEffectiveDays(
    startDate: Date,
    endDate: Date,
    holidays: Holidays
  ): Date[] {
    const weekdays = getWeekdays(startDate, endDate);
    const holidaysDates = getHolidays(startDate, endDate, holidays);
    return weekdays.filter(
      (day) =>
        !holidaysDates.some((holiday) => holiday.getTime() === day.getTime())
    );
  }

  async function processProject(
    name: string,
    startDate: Date,
    projectWeeks: number,
    holidays: Holidays,
    currentDate: Date,
    isLastProject: boolean
  ): Promise<Date> {
    let effectiveDays: Date[] = [];
    let endDate = new Date(startDate);

    while (projectWeeks > 0) {
      const nextEndDate = new Date(endDate);
      nextEndDate.setDate(endDate.getDate() + projectWeeks * 7);
      const projectEffectiveDays = calculateEffectiveDays(
        endDate,
        nextEndDate,
        holidays
      );
      effectiveDays = [...effectiveDays, ...projectEffectiveDays];
      const holidaysDates = getHolidays(endDate, nextEndDate, holidays);

      if (holidaysDates.length > 0) {
        const holidayStart = holidaysDates[0];
        const holidayEnd = holidaysDates[holidaysDates.length - 1];
        endDate = new Date(holidayEnd);
        endDate.setDate(holidayEnd.getDate() + 1);
        projectWeeks -= Math.floor(
          (nextEndDate.getTime() - endDate.getTime()) /
          (7 * 24 * 60 * 60 * 1000)
        );
      } else {
        endDate = nextEndDate;
        projectWeeks = 0;
      }
    }

    /*if (promotion.key == "P2 2023"){
                      console.log(`startDate : ${startDate}, endDate : ${endDate}, currentDate : ${currentDate}, project : ${name} `)
                      console.log(compareDates(startDate, endDate, current_date))
                    }*/

    if (compareDates(startDate, endDate, current_date)) {
      const totalDays =
        (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000) + 1;
      const elapsedDays =
        (current_date.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000);
      progress = (elapsedDays / totalDays) * 100;
      currentProject = name;
      EndDateEstimated = endDate.toISOString().split('T')[0];
      console.log(
        `Current project: ${name}, Progress: ${progress.toFixed(2)}% for Promo ${promotion.key}`
      );
      await updateEnv(name, promotion.key);

      if (isLastProject && progress >= 99.9) {
        console.log(`Current project: Spécialité for Promo ${promotion.key}`);
        await updateEnv('Spécialité', promotion.key);
        currentProject = 'Spécialité';
      }
    }

    return endDate;
  }

  let startDate = new Date(promotion.dates.start);

  for (let i = 0; i < allProjects.Golang.length; i++) {
    const project = allProjects.Golang[i];
    const isLastProject = i === allProjects.Golang.length - 1;
    startDate = await processProject(
      project.name,
      startDate,
      project.project_time_week,
      holidays,
      current_date,
      isLastProject
    );
  }

  if (promotion.dates['piscine-js-start'] !== 'NaN') {
    const piscineJsStart = new Date(promotion.dates['piscine-js-start']);
    const piscineJsEnd = new Date(promotion.dates['piscine-js-end']);

    if (compareDates(piscineJsStart, piscineJsEnd, current_date)) {
      if (allProjects.Javascript.length > 0) {
        const nextProject = allProjects.Javascript[0];
        currentProject = nextProject.name;
        progress = 0;
        console.log(
          `Current project: ${nextProject.name}, Progress: 0% for Promo ${promotion.key}`
        );
        await updateEnv(nextProject.name, promotion.key);
      }
    }

    startDate = new Date(piscineJsEnd);
    startDate.setDate(piscineJsEnd.getDate() + 1);

    for (let i = 0; i < allProjects.Javascript.length; i++) {
      const project = allProjects.Javascript[i];
      const isLastProject = i === allProjects.Javascript.length - 1;
      startDate = await processProject(
        project.name,
        startDate,
        project.project_time_week,
        holidays,
        current_date,
        isLastProject
      );
    }
  }

  // Traitement de la piscine Rust/Java (les étudiants choisissent l'un ou l'autre)
  if (promotion.dates['piscine-rust-java-start'] !== 'NaN') {
    const piscineRustJavaStart = new Date(promotion.dates['piscine-rust-java-start']);
    const piscineRustJavaEnd = new Date(promotion.dates['piscine-rust-java-end']);

    if (compareDates(piscineRustJavaStart, piscineRustJavaEnd, current_date)) {
      // Pendant la piscine, on affiche le premier projet de chaque track
      const tracks: { rust?: string; java?: string } = {};

      if (allProjects.Rust.length > 0) {
        tracks.rust = allProjects.Rust[0].name;
      }
      if (allProjects.Java.length > 0) {
        tracks.java = allProjects.Java[0].name;
      }

      if (tracks.rust || tracks.java) {
        currentProject = tracks.rust || tracks.java || 'Aucun';
        progress = 0;
        console.log(
          `Current projects - Rust: ${tracks.rust || 'N/A'}, Java: ${tracks.java || 'N/A'}, Progress: 0% for Promo ${promotion.key}`
        );
        await updateEnvMultiTrack(tracks, promotion.key);
      }
    }

    startDate = new Date(piscineRustJavaEnd);
    startDate.setDate(piscineRustJavaEnd.getDate() + 1);

    // Traiter les projets Rust et Java en parallèle
    let rustStartDate = new Date(startDate);
    let javaStartDate = new Date(startDate);
    let rustEndDate = new Date(startDate);
    let javaEndDate = new Date(startDate);

    // Calculer les dates de fin pour chaque track
    for (let i = 0; i < allProjects.Rust.length; i++) {
      const project = allProjects.Rust[i];
      rustEndDate = await processProject(
        project.name,
        rustStartDate,
        project.project_time_week,
        holidays,
        new Date('1900-01-01'), // Date dans le passé pour ne pas matcher avec current_date
        false
      );
      rustStartDate = new Date(rustEndDate);
    }

    for (let i = 0; i < allProjects.Java.length; i++) {
      const project = allProjects.Java[i];
      javaEndDate = await processProject(
        project.name,
        javaStartDate,
        project.project_time_week,
        holidays,
        new Date('1900-01-01'), // Date dans le passé pour ne pas matcher avec current_date
        false
      );
      javaStartDate = new Date(javaEndDate);
    }

    // Maintenant vérifier sur quel projet actuel on est
    rustStartDate = new Date(startDate);
    javaStartDate = new Date(startDate);
    let currentTracks: { rust?: string; java?: string } = {};
    let foundCurrentProject = false;

    for (let i = 0; i < allProjects.Rust.length; i++) {
      const project = allProjects.Rust[i];
      const isLastProject = i === allProjects.Rust.length - 1;
      const projectEndDate = await processProject(
        project.name,
        rustStartDate,
        project.project_time_week,
        holidays,
        new Date('1900-01-01'),
        false
      );

      if (compareDates(rustStartDate, projectEndDate, current_date)) {
        currentTracks.rust = project.name;
        foundCurrentProject = true;
      }
      rustStartDate = new Date(projectEndDate);
    }

    for (let i = 0; i < allProjects.Java.length; i++) {
      const project = allProjects.Java[i];
      const isLastProject = i === allProjects.Java.length - 1;
      const projectEndDate = await processProject(
        project.name,
        javaStartDate,
        project.project_time_week,
        holidays,
        new Date('1900-01-01'),
        false
      );

      if (compareDates(javaStartDate, projectEndDate, current_date)) {
        currentTracks.java = project.name;
        foundCurrentProject = true;
      }
      javaStartDate = new Date(projectEndDate);
    }

    if (foundCurrentProject && (currentTracks.rust || currentTracks.java)) {
      currentProject = currentTracks.rust || currentTracks.java || 'Aucun';
      const projectStart = new Date(startDate);
      const projectEnd = rustEndDate > javaEndDate ? rustEndDate : javaEndDate;
      const totalDays =
        (projectEnd.getTime() - projectStart.getTime()) / (24 * 60 * 60 * 1000) + 1;
      const elapsedDays =
        (current_date.getTime() - projectStart.getTime()) / (24 * 60 * 60 * 1000);
      progress = (elapsedDays / totalDays) * 100;

      console.log(
        `Current projects - Rust: ${currentTracks.rust || 'N/A'}, Java: ${currentTracks.java || 'N/A'}, Progress: ${progress.toFixed(2)}% for Promo ${promotion.key}`
      );
      await updateEnvMultiTrack(currentTracks, promotion.key);
    }

    // Utiliser la date de fin la plus éloignée
    startDate = rustEndDate > javaEndDate ? rustEndDate : javaEndDate;
  }

  const promoEndDate = new Date(promotion.dates.end);
  if (current_date > promoEndDate) {
    currentProject = 'Fin';
    progress = 100;
    console.log(`Current project: Fin for Promo ${promotion.key}`);
    await updateEnv('Fin', promotion.key);
  } else {
    // Vérifie si la current_date est après la fin du dernier projet mais avant la fin de la promo
    if (current_date > startDate && current_date < promoEndDate) {
      const totalDays =
        (promoEndDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000) +
        1;
      const elapsedDays =
        (current_date.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000);
      progress = (elapsedDays / totalDays) * 100;

      currentProject = 'Spécialité';
      console.log(
        `Current project: Spécialité, Progress: ${progress.toFixed(2)}% for Promo ${promotion.key}`
      );
      await updateEnv('Spécialité', promotion.key);
    }
  }

  return {
    agenda: [
      ...result,
      currentProject === 'Fin' || currentProject === 'Spécialité'
        ? `Fin de la promo: ${promotion.dates.end}`
        : `Fin du projet actuel : ${EndDateEstimated}`
    ],
    success: true,
    promotionName: promotion.key,
    currentProject,
    progress: Math.round(progress)
  };
}