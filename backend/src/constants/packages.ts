export const PACKAGES = {
    'starter': {
        name: 'Starter',
        credits: 1,
        limits: {
            photoLimitPerEvent: 1000,
            storageMonths: 2
        }
    },
    'studio': {
        name: 'Studio',
        credits: 4,
        limits: {
            photoLimitPerEvent: 2500,
            storageMonths: 6
        }
    },
    'agency': {
        name: 'Agency',
        credits: 12,
        limits: {
            photoLimitPerEvent: 5000,
            storageMonths: 12
        }
    },
    'extra_event': {
        name: 'Extra Event',
        credits: 1,
        limits: {
            photoLimitPerEvent: 3000,
            storageMonths: 6
        }
    }
}
