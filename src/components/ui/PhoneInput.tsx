'use client';

import { useState } from 'react';
import { type CountryCode } from 'libphonenumber-js/min';
import { composeContactPhone, isValidOptionalContactPhone, normalizeContactPhone, phoneValidationMessage, splitContactPhone } from '@/utils/phone';
import { phoneCountries } from '@/utils/phone-countries';
import './_phoneInput.scss';

export function PhoneInput({ id, value, onChange, disabled = false }: {
    id: string; value: string; onChange: (value: string) => void; disabled?: boolean;
}) {
    const [fields, setFields] = useState(() => ({ ...splitContactPhone(value), lastValue: value }));
    if (fields.lastValue !== value) setFields({ ...splitContactPhone(value), lastValue: value });
    const update = (country: CountryCode, national: string) => {
        const nextValue = composeContactPhone(country, national);
        const pasted = national.trim().startsWith('+') || national.trim().startsWith('00');
        const parts = pasted && normalizeContactPhone(nextValue) ? splitContactPhone(nextValue) : { country, national };
        setFields({ ...parts, lastValue: nextValue });
        onChange(nextValue);
    };
    const invalid = !isValidOptionalContactPhone(value);
    return <div className="phone-input">
        <div className="phone-input__fields">
            <select id={`${id}-country`} aria-label="País del teléfono" value={fields.country}
                disabled={disabled} onChange={(event) => update(event.target.value as CountryCode, fields.national)}>
                {phoneCountries.map(({ code, name, callingCode }) => <option key={code} value={code}>
                    {name} (+{callingCode})
                </option>)}
            </select>
            <input id={id} type="tel" inputMode="tel" autoComplete="tel-national" maxLength={40}
                value={fields.national} disabled={disabled} aria-invalid={invalid} aria-describedby={`${id}-help`}
                onChange={(event) => update(fields.country, event.target.value)}
                placeholder={fields.country === 'AR' ? '223 426 8951' : 'Código de área y número'} />
        </div>
        <small id={`${id}-help`} className={invalid ? 'phone-input__error' : ''}>
            {invalid ? phoneValidationMessage : fields.country === 'AR'
                ? 'Argentina: código de área y número, sin 0 ni 15. Agregamos +54 y el 9 de celular automáticamente.'
                : 'Ingresá el código de área y el número. También podés pegar el teléfono completo con +código de país.'}
        </small>
    </div>;
}
