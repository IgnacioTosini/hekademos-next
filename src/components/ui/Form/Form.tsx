'use client'

import { Formik, Form as FormikForm, Field, ErrorMessage, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { sendContactMessage } from '@/app/actions/contact.actions';
import './_form.scss';

const validationSchema = Yup.object({
    name: Yup.string()
        .min(2, 'El nombre debe tener al menos 2 caracteres')
        .required('El nombre es requerido'),
    email: Yup.string()
        .email('Email inválido')
        .required('El email es requerido'),
    message: Yup.string()
        .min(10, 'El mensaje debe tener al menos 10 caracteres')
        .required('El mensaje es requerido')
});

type FormValues = {
    name: string;
    email: string;
    message: string;
}

export const Form = () => {
    const handleSubmit = async (values: FormValues, { setSubmitting, resetForm }: FormikHelpers<FormValues>) => {
        try {
            const result = await sendContactMessage(values);

            if (!result.ok) {
                toast.error(result.error);
                return;
            }

            toast.success('Mensaje enviado correctamente!');
            resetForm();
        } catch (error) {
            toast.error('Error al enviar el mensaje');
            console.error('Error al enviar el formulario:', error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="formContainer">
            <h2 className="formTitle">Envíanos un mensaje</h2>
            <Formik
                initialValues={{ name: '', email: '', message: '' }}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
                validateOnChange={true}
                validateOnBlur={true}
            >
                {({ isSubmitting, errors, touched }) => (
                    <FormikForm className="form">
                        <div className="inputGroup">
                            <Field
                                id="contact-name"
                                type="text"
                                name="name"
                                placeholder="Tu nombre"
                                aria-label="Tu nombre"
                                maxLength={80}
                                className={`formInput ${errors.name && touched.name ? 'error' : ''}`}
                            />
                            <ErrorMessage name="name" component="div" className="errorMessage" />
                        </div>

                        <div className="inputGroup">
                            <Field
                                id="contact-email"
                                type="email"
                                name="email"
                                placeholder="Tu email"
                                aria-label="Tu email"
                                autoComplete="email"
                                className={`formInput ${errors.email && touched.email ? 'error' : ''}`}
                            />
                            <ErrorMessage name="email" component="div" className="errorMessage" />
                        </div>

                        <div className="inputGroup">
                            <Field
                                id="contact-message"
                                as="textarea"
                                name="message"
                                placeholder="Tu mensaje"
                                aria-label="Tu mensaje"
                                maxLength={1200}
                                className={`formTextarea ${errors.message && touched.message ? 'error' : ''}`}
                            />
                            <ErrorMessage name="message" component="div" className="errorMessage" />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="formButton"
                        >
                            {isSubmitting ? 'Enviando...' : 'Enviar'}
                        </button>
                    </FormikForm>
                )}
            </Formik>
        </div>
    );
};
