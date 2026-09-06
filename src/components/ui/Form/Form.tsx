'use client'

import { FormEvent, useState } from 'react';
import { toast } from 'react-toastify';
import { sendContactMessage } from '@/app/actions/contact.actions';
import './_form.scss';
import type { HomePageContent } from '@/lib/home-page-content';

type FormValues = {
    name: string;
    email: string;
    message: string;
}

type FormErrors = Partial<Record<keyof FormValues, string>>;

const initialValues: FormValues = { name: '', email: '', message: '' };

const validateField = (field: keyof FormValues, value: string) => {
    const normalized = value.trim();

    if (!normalized) {
        return field === 'name'
            ? 'El nombre es requerido'
            : field === 'email'
                ? 'El email es requerido'
                : 'El mensaje es requerido';
    }
    if (field === 'name' && normalized.length < 2) return 'El nombre debe tener al menos 2 caracteres';
    if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return 'Email inválido';
    if (field === 'message' && normalized.length < 10) return 'El mensaje debe tener al menos 10 caracteres';

    return '';
};

const validateForm = (values: FormValues) => Object.fromEntries(
    (Object.keys(values) as Array<keyof FormValues>)
        .map((field) => [field, validateField(field, values[field])] as const)
        .filter(([, error]) => Boolean(error))
) as FormErrors;

type Props = { content: HomePageContent['contact']['form'] };

export const Form = ({ content }: Props) => {
    const [values, setValues] = useState<FormValues>(initialValues);
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Partial<Record<keyof FormValues, boolean>>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const updateField = (field: keyof FormValues, value: string) => {
        setValues((current) => ({ ...current, [field]: value }));
        if (touched[field]) setErrors((current) => ({ ...current, [field]: validateField(field, value) }));
    };

    const touchField = (field: keyof FormValues) => {
        setTouched((current) => ({ ...current, [field]: true }));
        setErrors((current) => ({ ...current, [field]: validateField(field, values[field]) }));
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const nextErrors = validateForm(values);

        setTouched({ name: true, email: true, message: true });
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        setIsSubmitting(true);
        try {
            const result = await sendContactMessage(values);

            if (!result.ok) {
                toast.error(result.error);
                return;
            }

            toast.success(content.successMessage);
            setValues(initialValues);
            setTouched({});
            setErrors({});
        } catch (error) {
            toast.error('Error al enviar el mensaje');
            console.error('Error al enviar el formulario:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="formContainer">
            <h2 className="formTitle">{content.title}</h2>
            <form className="form" onSubmit={handleSubmit} noValidate>
                <div className="inputGroup">
                    <input
                        id="contact-name"
                        type="text"
                        name="name"
                        value={values.name}
                        onChange={(event) => updateField('name', event.target.value)}
                        onBlur={() => touchField('name')}
                        placeholder={content.namePlaceholder}
                        aria-label={content.namePlaceholder}
                        aria-invalid={Boolean(errors.name && touched.name)}
                        maxLength={80}
                        className={`formInput ${errors.name && touched.name ? 'error' : ''}`}
                    />
                    {errors.name && touched.name && <div className="errorMessage">{errors.name}</div>}
                </div>

                <div className="inputGroup">
                    <input
                        id="contact-email"
                        type="email"
                        name="email"
                        value={values.email}
                        onChange={(event) => updateField('email', event.target.value)}
                        onBlur={() => touchField('email')}
                        placeholder={content.emailPlaceholder}
                        aria-label={content.emailPlaceholder}
                        aria-invalid={Boolean(errors.email && touched.email)}
                        autoComplete="email"
                        className={`formInput ${errors.email && touched.email ? 'error' : ''}`}
                    />
                    {errors.email && touched.email && <div className="errorMessage">{errors.email}</div>}
                </div>

                <div className="inputGroup">
                    <textarea
                        id="contact-message"
                        name="message"
                        value={values.message}
                        onChange={(event) => updateField('message', event.target.value)}
                        onBlur={() => touchField('message')}
                        placeholder={content.messagePlaceholder}
                        aria-label={content.messagePlaceholder}
                        aria-invalid={Boolean(errors.message && touched.message)}
                        maxLength={1200}
                        className={`formTextarea ${errors.message && touched.message ? 'error' : ''}`}
                    />
                    {errors.message && touched.message && <div className="errorMessage">{errors.message}</div>}
                </div>

                <button type="submit" disabled={isSubmitting} className="formButton">
                    {isSubmitting ? content.submittingLabel : content.submitLabel}
                </button>
            </form>
        </div>
    );
};
