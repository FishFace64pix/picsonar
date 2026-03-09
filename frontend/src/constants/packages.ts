import { TFunction } from 'i18next';

export const getPackages = (t: TFunction) => [
    {
        id: 'starter',
        name: t('packages.starter.name'),
        price: 149,
        originalPrice: null,
        currency: t('packages.currency'),
        billingPeriod: t('packages.billingPeriod'),
        credits: 1,
        recommendedUpsell: t('packages.starter.upsell'),
        features: [
            { text: t('packages.starter.features.0'), active: true },
            { text: t('packages.starter.features.1'), active: true },
            { text: t('packages.starter.features.2'), active: true },
            { text: t('packages.starter.features.3'), active: true },
            { text: t('packages.starter.features.4'), active: true },
            { text: t('packages.starter.features.5'), active: true },
        ],
        popular: false
    },
    {
        id: 'studio',
        name: t('packages.studio.name'),
        price: 799,
        originalPrice: null,
        currency: t('packages.currency'),
        billingPeriod: t('packages.billingPeriod'),
        credits: 4,
        recommendedUpsell: t('packages.studio.upsell'),
        features: [
            { text: t('packages.studio.features.0'), active: true },
            { text: t('packages.studio.features.1'), active: true },
            { text: t('packages.studio.features.2'), active: true },
            { text: t('packages.studio.features.3'), active: true },
            { text: t('packages.studio.features.4'), active: true },
            { text: t('packages.studio.features.5'), active: true },
        ],
        popular: true
    },
    {
        id: 'agency',
        name: t('packages.agency.name'),
        price: 2499,
        originalPrice: null,
        currency: t('packages.currency'),
        billingPeriod: t('packages.billingPeriod'),
        credits: 12,
        recommendedUpsell: t('packages.agency.upsell'),
        features: [
            { text: t('packages.agency.features.0'), active: true },
            { text: t('packages.agency.features.1'), active: true },
            { text: t('packages.agency.features.2'), active: true },
            { text: t('packages.agency.features.3'), active: true },
            { text: t('packages.agency.features.4'), active: true },
            { text: t('packages.agency.features.5'), active: true },
        ],
        popular: false
    }
];

export const getPackage = (id: string, t: TFunction) => getPackages(t).find(p => p.id === id);
