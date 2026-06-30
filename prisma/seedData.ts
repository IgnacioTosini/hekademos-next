export const membershipPlansSeed = [
    {
        name: 'Plan 1',
        trainingDaysPerWeek: 2,
        priceCents: 5000000,
        currency: 'ARS',
        isRecommended: false,
    },
    {
        name: 'Plan 2',
        trainingDaysPerWeek: 3,
        priceCents: 5500000,
        currency: 'ARS',
        isRecommended: true,
    },
    {
        name: 'Plan 3',
        trainingDaysPerWeek: 4,
        priceCents: 6000000,
        currency: 'ARS',
        isRecommended: false,
    },
]

export const weeklyClassSchedulesSeed = [
    ...['MONDAY', 'WEDNESDAY', 'FRIDAY'].flatMap((dayOfWeek) => (
        ['07:30', '09:00', '10:30', '16:00', '17:30', '19:00'].map((startTime) => ({
            dayOfWeek,
            startTime,
            durationMinutes: 90,
            capacity: 10,
            isActive: true,
        }))
    )),
    ...['TUESDAY', 'THURSDAY'].flatMap((dayOfWeek) => (
        ['16:00', '17:30', '19:00'].map((startTime) => ({
            dayOfWeek,
            startTime,
            durationMinutes: 90,
            capacity: 10,
            isActive: true,
        }))
    )),
]
