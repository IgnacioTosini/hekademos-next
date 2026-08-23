import { DayOfWeek, PrismaClient } from "@prisma/client";
import { seedAdmin } from "./seed-admin.ts";

const prisma = new PrismaClient();

const membershipPlansSeed = [
  {
    name: "Plan 1",
    trainingDaysPerWeek: 2,
    priceCents: 5000000,
    currency: "ARS",
    isRecommended: false,
  },
  {
    name: "Plan 2",
    trainingDaysPerWeek: 3,
    priceCents: 5500000,
    currency: "ARS",
    isRecommended: true,
  },
  {
    name: "Plan 3",
    trainingDaysPerWeek: 4,
    priceCents: 6000000,
    currency: "ARS",
    isRecommended: false,
  },
];

const weeklyClassSchedulesSeed = [
  ...[DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY].flatMap((dayOfWeek) =>
    ["07:30", "09:00", "10:30", "16:00", "17:30", "19:00"].map((startTime) => ({
      dayOfWeek,
      startTime,
      durationMinutes: 90,
      capacity: 10,
      isActive: true,
    })),
  ),
  ...[DayOfWeek.TUESDAY, DayOfWeek.THURSDAY].flatMap((dayOfWeek) =>
    ["16:00", "17:30", "19:00"].map((startTime) => ({
      dayOfWeek,
      startTime,
      durationMinutes: 90,
      capacity: 10,
      isActive: true,
    })),
  ),
];

const coachesSeed = [
  {
    email: "victoria@hekademos.local",
    name: "Victoria Menendez",
    specialty: "Entrenamiento funcional",
    instagram: "victoriamenendez",
  },
  {
    email: "juan@hekademos.local",
    name: "Juan Iglesias",
    specialty: "Fuerza y movilidad",
    instagram: "juaniglesias",
  },
  {
    email: "dalmiro@hekademos.local",
    name: "Dalmiro Mandrini",
    specialty: "Preparacion fisica",
    instagram: "dalmiromandrini",
  },
  {
    email: "marian@hekademos.local",
    name: "Marian Calomino",
    specialty: "Tecnica y acondicionamiento",
    instagram: "mariancalomino",
  },
];

const studentsSeed = [
  {
    email: "lucia.alvarez@example.com",
    name: "Lucia Alvarez",
    firstName: "Lucia",
    lastName: "Alvarez",
    phone: "11 5555-0101",
    coachEmail: "victoria@hekademos.local",
    planName: "Plan 2",
    routineExcelUrl: "https://docs.google.com/spreadsheets/d/lucia-alvarez",
  },
  {
    email: "martin.gomez@example.com",
    name: "Martin Gomez",
    firstName: "Martin",
    lastName: "Gomez",
    phone: "11 5555-0102",
    coachEmail: "juan@hekademos.local",
    planName: "Plan 1",
    routineExcelUrl: "https://docs.google.com/spreadsheets/d/martin-gomez",
  },
  {
    email: "sofia.perez@example.com",
    name: "Sofia Perez",
    firstName: "Sofia",
    lastName: "Perez",
    phone: "11 5555-0103",
    coachEmail: "dalmiro@hekademos.local",
    planName: "Plan 3",
    routineExcelUrl: "https://docs.google.com/spreadsheets/d/sofia-perez",
  },
  {
    email: "tomas.silva@example.com",
    name: "Tomas Silva",
    firstName: "Tomas",
    lastName: "Silva",
    phone: "11 5555-0104",
    coachEmail: "marian@hekademos.local",
    planName: "Plan 2",
    routineExcelUrl: "https://docs.google.com/spreadsheets/d/tomas-silva",
  },
];

async function seedMembershipPlans() {
  for (const plan of membershipPlansSeed) {
    await prisma.membershipPlan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    });
  }
}

async function seedCoaches() {
  const coaches = [];

  for (const coachSeed of coachesSeed) {
    const user = await prisma.user.upsert({
      where: { email: coachSeed.email },
      update: {
        name: coachSeed.name,
        role: "COACH",
        status: "ACTIVE",
      },
      create: {
        email: coachSeed.email,
        name: coachSeed.name,
        role: "COACH",
        status: "ACTIVE",
      },
    });

    const coach = await prisma.coach.upsert({
      where: { userId: user.id },
      update: {
        specialty: coachSeed.specialty,
        instagram: coachSeed.instagram,
        isActive: true,
      },
      create: {
        userId: user.id,
        specialty: coachSeed.specialty,
        instagram: coachSeed.instagram,
        isActive: true,
      },
    });

    coaches.push({ ...coach, email: coachSeed.email });
  }

  return coaches;
}

async function seedWeeklyClassSchedules(coaches: Awaited<ReturnType<typeof seedCoaches>>) {
  await prisma.weeklyClassSchedule.updateMany({
    data: {
      isActive: false,
    },
  });

  for (const coach of coaches) {
    for (const schedule of weeklyClassSchedulesSeed) {
      await prisma.weeklyClassSchedule.upsert({
        where: {
          dayOfWeek_startTime_coachId: {
            dayOfWeek: schedule.dayOfWeek,
            startTime: schedule.startTime,
            coachId: coach.id,
          },
        },
        update: {
          durationMinutes: schedule.durationMinutes,
          capacity: schedule.capacity,
          isActive: schedule.isActive,
          coachId: coach.id,
        },
        create: {
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          durationMinutes: schedule.durationMinutes,
          capacity: schedule.capacity,
          isActive: schedule.isActive,
          coachId: coach.id,
        },
      });
    }
  }

  await prisma.studentScheduleAssignment.updateMany({
    where: {
      weeklySchedule: {
        isActive: false,
      },
    },
    data: {
      isActive: false,
    },
  });
}

async function seedStudents() {
  for (const studentSeed of studentsSeed) {
    const coachUser = await prisma.user.findUnique({
      where: { email: studentSeed.coachEmail },
      include: { coach: true },
    });

    const plan = await prisma.membershipPlan.findUnique({
      where: { name: studentSeed.planName },
    });

    if (!coachUser?.coach || !plan) {
      throw new Error(`Missing seed dependency for ${studentSeed.email}`);
    }

    const user = await prisma.user.upsert({
      where: { email: studentSeed.email },
      update: {
        name: studentSeed.name,
        phone: studentSeed.phone,
        role: "STUDENT",
        status: "ACTIVE",
      },
      create: {
        email: studentSeed.email,
        name: studentSeed.name,
        phone: studentSeed.phone,
        role: "STUDENT",
        status: "ACTIVE",
      },
    });

    const student = await prisma.student.upsert({
      where: { userId: user.id },
      update: {
        coachId: coachUser.coach.id,
        firstName: studentSeed.firstName,
        lastName: studentSeed.lastName,
        routineExcelUrl: studentSeed.routineExcelUrl,
      },
      create: {
        userId: user.id,
        coachId: coachUser.coach.id,
        firstName: studentSeed.firstName,
        lastName: studentSeed.lastName,
        routineExcelUrl: studentSeed.routineExcelUrl,
      },
    });

    const membership = await prisma.studentMembership.findFirst({
      where: {
        studentId: student.id,
        status: "ACTIVE",
      },
    });

    if (membership) {
      await prisma.studentMembership.update({
        where: { id: membership.id },
        data: {
          planId: plan.id,
          classesUsed: 0,
        },
      });
    } else {
      await prisma.studentMembership.create({
        data: {
          studentId: student.id,
          planId: plan.id,
          startDate: new Date(),
          status: "ACTIVE",
          classesUsed: 0,
        },
      });
    }
  }
}

async function main() {
  await seedAdmin(prisma);
  await seedMembershipPlans();

  const coaches = await seedCoaches();

  await seedWeeklyClassSchedules(coaches);
  await seedStudents();

  console.log("Seed completed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
