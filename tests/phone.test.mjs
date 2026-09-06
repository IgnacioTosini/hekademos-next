import assert from 'node:assert/strict';
import { test, mock } from 'node:test';
import { normalizeContactPhone, isValidOptionalContactPhone, composeContactPhone, splitContactPhone } from '../src/utils/phone.ts';
import { normalizeWhatsAppPhoneNumber, sendWhatsAppTemplate } from '../src/lib/whatsapp.ts';
import { normalizeWhatsappPhoneNumber } from '../src/utils/whatsapp.ts';

test('formatos argentinos históricos se normalizan igual en formularios, API y enlaces', () => {
    for (const value of ['02234268951', '223 426-8951', '0223 15 4268951', '5492234268951', '+54 223 4268951', '+54 9 223 4268951', '0054 9 223 4268951']) {
        assert.equal(normalizeContactPhone(value), '+5492234268951');
        assert.equal(normalizeWhatsAppPhoneNumber(value), '5492234268951');
        assert.equal(normalizeWhatsappPhoneNumber(value), '5492234268951');
    }
});
test('se conservan los prefijos y ceros nacionales de otros países', () => {
    for (const phone of ['+34612345678', '+14155552671', '+59899123456', '+39066982']) {
        assert.equal(normalizeContactPhone(phone), phone);
    }
    assert.equal(composeContactPhone('ES', '612345678'), '+34612345678');
    assert.equal(composeContactPhone('AR', '+34612345678'), '+34612345678');
});
test('el selector recupera país y número sin duplicar prefijos', () => {
    assert.deepEqual(splitContactPhone('02234268951'), { country: 'AR', national: '2234268951' });
    assert.deepEqual(splitContactPhone('+34612345678'), { country: 'ES', national: '612345678' });
    assert.equal(composeContactPhone('AR', '0223 15 4268951'), '+5492234268951');
    assert.equal(composeContactPhone('AR', '+5492234268951'), '+5492234268951');
    assert.equal(composeContactPhone('AR', ''), '');
});
test('números incompletos, países inexistentes y caracteres ajenos se rechazan', () => {
    for (const phone of ['123456', '+54', '+999123456789', 'abc2234268951', '++5492234268951', '54+92234268951', '+34612345678 ext123', '+12345678901234567890']) {
        assert.equal(isValidOptionalContactPhone(phone), false, phone);
    }
    assert.equal(isValidOptionalContactPhone(''), true);
    assert.equal(isValidOptionalContactPhone(null), true);
});
test('WhatsApp acepta un teléfono local antiguo sin necesidad de editar la base', async () => {
    const original = { ...process.env };
    const fetchMock = mock.method(globalThis, 'fetch', async (_url, options) => {
        assert.equal(JSON.parse(options.body).to, '5492234268951');
        return Response.json({ messages: [{ id: 'qa-phone-test' }] });
    });
    try {
        Object.assign(process.env, { WHATSAPP_ENABLED: 'true', WHATSAPP_TEST_MODE: 'false', WHATSAPP_PRODUCTION_SENDS_CONFIRMED: 'true', ACCESS_TOKEN_WHATSAPP_BUSINESS: 'fake', PHONE_NUMBER_ID: '123' });
        const result = await sendWhatsAppTemplate({ to: '02234268951', templateName: 'qa', languageCode: 'es_AR' });
        assert.equal(result.status, 'SENT'); assert.equal(fetchMock.mock.callCount(), 1);
    } finally { process.env = original; fetchMock.mock.restore(); }
});

test('el modo de prueba conserva exactamente el destinatario autorizado por Meta', async () => {
    const original = { ...process.env };
    const fetchMock = mock.method(globalThis, 'fetch', async (_url, options) => {
        assert.equal(JSON.parse(options.body).to, '54223154268951');
        return Response.json({ messages: [{ id: 'qa-meta-test-recipient' }] });
    });
    try {
        Object.assign(process.env, {
            WHATSAPP_ENABLED: 'true',
            WHATSAPP_TEST_MODE: 'true',
            WHATSAPP_TEST_RECIPIENT: '+54 223 15 4268951',
            ACCESS_TOKEN_WHATSAPP_BUSINESS: 'fake',
            PHONE_NUMBER_ID: '123',
        });
        const result = await sendWhatsAppTemplate({
            to: '02234268951',
            templateName: 'qa',
            languageCode: 'es_AR',
        });
        assert.equal(result.status, 'SENT');
        assert.equal(result.testMode, true);
        assert.equal(fetchMock.mock.callCount(), 1);
    } finally {
        process.env = original;
        fetchMock.mock.restore();
    }
});
