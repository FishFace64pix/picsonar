import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { validateCUI } from '../utils/validateCUI';
import { CompanyDetails } from '../types';

export interface BillingFormData {
    companyName: string;
    cui: string;
    vatPayer: boolean;
    country: string;
    city: string;
    street: string;
    postalCode: string;
    billingEmail: string;
    regCom?: string;
    bank?: string;
    iban?: string;
}

interface BillingDataFormProps {
    onValidationChange: (isValid: boolean, data: BillingFormData) => void;
    initialData?: Partial<CompanyDetails>;
}

export const BillingDataForm: React.FC<BillingDataFormProps> = ({
    onValidationChange,
    initialData = {}
}) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState<BillingFormData>({
        companyName: initialData.companyName || '',
        cui: initialData.cui || '',
        vatPayer: initialData.vatPayer || false,
        country: initialData.country || 'Romania',
        city: initialData.city || '',
        street: initialData.street || '',
        postalCode: initialData.postalCode || '',
        billingEmail: initialData.billingEmail || '',
        regCom: initialData.regCom || '',
        bank: initialData.bank || '',
        iban: initialData.iban || ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [cuiValidation, setCuiValidation] = useState<{ valid: boolean; message: string }>({
        valid: false,
        message: ''
    });

    // Validate CUI on change (instant feedback)
    useEffect(() => {
        if (formData.cui.trim()) {
            const result = validateCUI(formData.cui);
            if (result.valid) {
                setCuiValidation({ valid: true, message: t('billingForm.errors.validCui') });
                setErrors(prev => ({ ...prev, cui: '' }));
            } else {
                setCuiValidation({ valid: false, message: result.error || t('billingForm.errors.invalidCui') });
                setErrors(prev => ({ ...prev, cui: result.error || t('billingForm.errors.invalidCui') }));
            }
        } else {
            setCuiValidation({ valid: false, message: '' });
        }
    }, [formData.cui]);

    // Validate email format
    useEffect(() => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (formData.billingEmail && !emailRegex.test(formData.billingEmail)) {
            setErrors(prev => ({ ...prev, billingEmail: t('billingForm.errors.invalidEmail') }));
        } else {
            setErrors(prev => ({ ...prev, billingEmail: '' }));
        }
    }, [formData.billingEmail]);

    // Validate all required fields and notify parent
    useEffect(() => {
        const newErrors: Record<string, string> = {};

        if (!formData.companyName.trim()) newErrors.companyName = t('billingForm.errors.required');
        if (!formData.cui.trim()) newErrors.cui = t('billingForm.errors.required');
        if (!formData.city.trim()) newErrors.city = t('billingForm.errors.required');
        if (!formData.street.trim()) newErrors.street = t('billingForm.errors.required');
        if (!formData.postalCode.trim()) newErrors.postalCode = t('billingForm.errors.required');
        if (!formData.billingEmail.trim()) newErrors.billingEmail = t('billingForm.errors.required');

        const isValid =
            Object.keys(newErrors).length === 0 &&
            cuiValidation.valid &&
            formData.companyName.length >= 2 &&
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.billingEmail);

        onValidationChange(isValid, formData);
    }, [formData, cuiValidation, onValidationChange]);

    const handleBlur = (field: string) => {
        setTouched(prev => ({ ...prev, [field]: true }));
    };

    const handleChange = (field: keyof BillingFormData, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const showError = (field: string) => touched[field] && errors[field];

    return (
        <div className="glass-panel p-8 max-w-2xl mx-auto border border-white/20">
            <h2 className="text-3xl font-bold mb-2 text-white bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-secondary-400">
                {t('billingForm.title')}
            </h2>
            <p className="text-sm text-gray-400 mb-8">
                {t('billingForm.subtitle')}
            </p>

            {/* Company Name */}
            <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                    {t('billingForm.companyName')} <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    onBlur={() => handleBlur('companyName')}
                    className={`input-field ${showError('companyName') ? 'border-red-500/50 bg-red-500/5' : ''}`}
                    placeholder="S.C. Example S.R.L."
                />
                {showError('companyName') && (
                    <p className="text-red-400 text-xs mt-1.5 font-medium ml-1">{errors.companyName}</p>
                )}
            </div>

            {/* CUI/CIF with inline validation */}
            <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                    {t('billingForm.cuiCif')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <input
                        type="text"
                        value={formData.cui}
                        onChange={(e) => handleChange('cui', e.target.value)}
                        onBlur={() => handleBlur('cui')}
                        className={`input-field ${touched.cui && !cuiValidation.valid ? 'border-red-500/50 bg-red-500/5' :
                            cuiValidation.valid ? 'border-green-500/50 bg-green-500/5' : ''
                            }`}
                        placeholder="RO12345678 or 12345678"
                    />
                    {cuiValidation.message && (
                        <p className={`text-xs mt-1 ${cuiValidation.valid ? 'text-green-600' : 'text-red-500'
                            }`}>
                            {cuiValidation.message}
                        </p>
                    )}
                </div>
            </div>

            {/* VAT Payer Checkbox */}
            <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/5">
                <label className="flex items-center cursor-pointer group">
                    <div className="relative">
                        <input
                            type="checkbox"
                            checked={formData.vatPayer}
                            onChange={(e) => handleChange('vatPayer', e.target.checked)}
                            className="sr-only"
                        />
                        <div className={`w-10 h-6 rounded-full transition-colors ${formData.vatPayer ? 'bg-primary-600' : 'bg-white/10'}`}></div>
                        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.vatPayer ? 'translate-x-4' : ''}`}></div>
                    </div>
                    <span className="ml-3 text-sm font-medium text-gray-300 group-hover:text-white transition-colors">{t('billingForm.vatPayer')}</span>
                </label>
            </div>

            {/* Country & City */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                        {t('billingForm.country')} <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={formData.country}
                        onChange={(e) => handleChange('country', e.target.value)}
                        className="input-field appearance-none"
                    >
                        <option value="Romania" className="bg-slate-900">{t('billingForm.romania')}</option>
                        <option value="Other" className="bg-slate-900">{t('billingForm.otherCountry')}</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                        {t('billingForm.city')} <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleChange('city', e.target.value)}
                        onBlur={() => handleBlur('city')}
                        className={`input-field ${showError('city') ? 'border-red-500/50 bg-red-500/5' : ''}`}
                        placeholder="Bucharest"
                    />
                    {showError('city') && (
                        <p className="text-red-400 text-xs mt-1.5 font-medium ml-1">{errors.city}</p>
                    )}
                </div>
            </div>

            {/* Street Address */}
            <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                    {t('billingForm.address')} <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={formData.street}
                    onChange={(e) => handleChange('street', e.target.value)}
                    onBlur={() => handleBlur('street')}
                    className={`input-field ${showError('street') ? 'border-red-500/50 bg-red-500/5' : ''}`}
                    placeholder="Example St. no. 123"
                />
                {showError('street') && (
                    <p className="text-red-400 text-xs mt-1.5 font-medium ml-1">{errors.street}</p>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                        {t('billingForm.postalCode')} <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.postalCode}
                        onChange={(e) => handleChange('postalCode', e.target.value)}
                        onBlur={() => handleBlur('postalCode')}
                        className={`input-field ${showError('postalCode') ? 'border-red-500/50 bg-red-500/5' : ''}`}
                        placeholder="010101"
                    />
                    {showError('postalCode') && (
                        <p className="text-red-400 text-xs mt-1.5 font-medium ml-1">{errors.postalCode}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                        {t('billingForm.billingEmail')} <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="email"
                        value={formData.billingEmail}
                        onChange={(e) => handleChange('billingEmail', e.target.value)}
                        onBlur={() => handleBlur('billingEmail')}
                        className={`input-field ${showError('billingEmail') ? 'border-red-500/50 bg-red-500/5' : ''}`}
                        placeholder="billing@company.com"
                    />
                    {showError('billingEmail') && (
                        <p className="text-red-400 text-xs mt-1.5 font-medium ml-1">{errors.billingEmail}</p>
                    )}
                </div>
            </div>

            {/* Optional Fields - Collapsed */}
            <details className="group mb-6">
                <summary className="flex items-center cursor-pointer text-sm text-primary-400 hover:text-primary-300 font-semibold transition-colors list-none">
                    <svg className="w-4 h-4 mr-2 group-open:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    {t('billingForm.additionalDetails')}
                </summary>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white/5 rounded-2xl border border-white/10 animate-fade-in">
                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">{t('billingForm.regCom')}</label>
                        <input
                            type="text"
                            value={formData.regCom}
                            onChange={(e) => handleChange('regCom', e.target.value)}
                            className="input-field"
                            placeholder="J40/1234/2020"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">{t('billingForm.bank')}</label>
                        <input
                            type="text"
                            value={formData.bank}
                            onChange={(e) => handleChange('bank', e.target.value)}
                            className="input-field"
                            placeholder="Transilvania Bank"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-300 mb-2">{t('billingForm.iban')}</label>
                        <input
                            type="text"
                            value={formData.iban}
                            onChange={(e) => handleChange('iban', e.target.value)}
                            className="input-field"
                            placeholder="RO49AAAA1B31007593840000"
                        />
                    </div>
                </div>
            </details>

            <p className="text-xs text-gray-500 mt-4">
                <span className="text-red-500">*</span> {t('billingForm.requiredFields')}
            </p>
        </div>
    );
};
