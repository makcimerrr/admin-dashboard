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

type Project = {
  id: number;
  name: string;
  project_time_week: number;
};

type PromotionDates = {
  start: string;
  'piscine-js-start': string;
  'piscine-js-end': string;
  'piscine-rust-start': string;
  'piscine-rust-end': string;
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

  if (promotion.dates['piscine-rust-start'] !== 'NaN') {
    const piscineRustStart = new Date(promotion.dates['piscine-rust-start']);
    const piscineRustEnd = new Date(promotion.dates['piscine-rust-end']);

    if (compareDates(piscineRustStart, piscineRustEnd, current_date)) {
      if (allProjects.Rust.length > 0) {
        const nextProject = allProjects.Rust[0];
        currentProject = nextProject.name;
        progress = 0;
        console.log(
          `Current project: ${nextProject.name}, Progress: 0% for Promo ${promotion.key}`
        );
        await updateEnv(nextProject.name, promotion.key);
      }
    }

    startDate = new Date(piscineRustEnd);
    startDate.setDate(piscineRustEnd.getDate() + 1);

    for (let i = 0; i < allProjects.Rust.length; i++) {
      const project = allProjects.Rust[i];
      const isLastProject = i === allProjects.Rust.length - 1;
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
