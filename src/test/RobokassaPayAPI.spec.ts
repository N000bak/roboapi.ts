import 'mocha';
import {expect} from 'chai';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import RobokassaPayAPI from "../RobokassaPayAPI";
import receipt from './helpers/receipt.json'
import {
    OPERATION_COMPLETED_SUCCESSFULLY,
    PARTNER_NOT_AVAILABLE,
    REQUEST_SUCCESSFULLY,
    OPERATION_NOT_FOUND,
    INCORRECT_SIGNATURE,
    FOUND_TWO_OPERATIONS,
    OPERATION_INITIATED,
    OPERATION_CANCELLED_MONEY_NOT_RECEIVED,
    MONEY_CREDITED_STORE,
    MONEY_RETURNED_BUYER,
    OPERATION_SUSPENDED,
    UNKNOWN_ANSWER
} from "../helpers/response";
import calcOutSumError from './helpers/calcOutSumError';
import calcOutSumSuccess from './helpers/calcOutSumSuccess';
import fullCurrencies from "./helpers/fullCurrencies";
import emptyCurrencies from "./helpers/emptyCurrencies";
import emptyOperation from "./helpers/emptyOperation";
import fullOperation from "./helpers/fullOperation";
import incompleteOperation from "./helpers/incompleteOperation";

const mrhLogin = 'login';
const mrhPass1 = 'pass1';
const mrhPass2 = 'pass2';
const isTest = true;


const mock = new MockAdapter(axios);
const sum = 100;
const invId = 1;


describe('RobokassaPayAPI check methods', () => {
    const RobokassaPay = new RobokassaPayAPI({
        mrhLogin,
        mrhPass1,
        mrhPass2,
        isTest
    });

    afterEach(() => {
        mock.reset();
    });

    describe('Получаем контрольную сумму подписи', () => {
        it('Получаем строку для подписи без JSON', (done) => {
            const signatureString = RobokassaPay.getSignatureString(sum, invId);
            expect(signatureString).to.equal(`${mrhLogin}:${sum}:${invId}:${mrhPass1}`);
            done();
        });
        it('Получаем строку для подписи с JSON', (done) => {
            const receiptJson = JSON.stringify(receipt);
            const signatureString = RobokassaPay.getSignatureString(sum, invId, receiptJson);
            expect(signatureString).to.equal(`${mrhLogin}:${sum}:${invId}:${receiptJson}:${mrhPass1}`);
            done();
        });
        it('Получаем контрольную сумму без JSON', (done) => {
            const signatureString = RobokassaPay.getSignatureString(sum, invId);
            const signature = RobokassaPay.getSignature(signatureString, 'md5');
            expect(signature).to.equal(
                RobokassaPay.getSignature(
                    `${mrhLogin}:${sum}:${invId}:${mrhPass1}`,
                    'md5'
                )
            );
            done();
        });
        it('Получаем контрольную сумму с JSON', (done) => {
            const receiptJson = JSON.stringify(receipt);
            const signatureString = RobokassaPay.getSignatureString(sum, invId, receiptJson);
            const signature = RobokassaPay.getSignature(signatureString, 'md5');
            expect(signature).to.equal(
                RobokassaPay.getSignature(
                    `${mrhLogin}:${sum}:${invId}:${receiptJson}:${mrhPass1}`,
                    'md5'
                )
            );
            done();
        });
        it('Получаем ошибку при неверном методе хеширования', (done) => {
            const receiptJson = JSON.stringify(receipt);
            const signatureString = RobokassaPay.getSignatureString(sum, invId, receiptJson);
            try {
                // @ts-ignore
                RobokassaPay.getSignature(signatureString, 'md6');
                done('the method of hashing the wrong');
            } catch (e) {
                expect(e).to.throw;
                done();
            }
        })
    });
    describe('Отправка СМС через Robokassa', () => {
        const phone = '71234567890';
        const message = 'Test';
        const smsMock = mock.onGet('https://services.robokassa.ru/SMS/');

        it('СМС успешно отправлено', (done) => {
            smsMock.reply(200, {
                result: true,
                count: 10,
                errorCode: 0,
                errorMessage: ''
            });
            RobokassaPay.sendSms(phone, message).then(response => {
                expect(response, 'В ответе вернулись правильные ключи').to.contain.keys(['code', 'message', 'success']);
                expect(response, 'Вернуло успешно выполненную операцию').to.deep.equal(REQUEST_SUCCESSFULLY);
                done();
            }).catch(e => {
                done(e);
            })
        });
        it('При отправке СМС возникает ошибка', (done) => {
            smsMock.reply(200, {
                result: false,
                count: 10,
                errorCode: 4,
                errorMessage: ''
            });
            RobokassaPay.sendSms(phone, message).then(response => {
                expect(response, 'Вернуло ошибку SMS sending for this partner is not available').to.deep.equal(PARTNER_NOT_AVAILABLE);
                done();
            }).catch(e => {
                done(e);
            })
        });
        it('Некорректный запрос отправки СМС', (done) => {
            smsMock.networkErrorOnce();
            RobokassaPay.sendSms(phone, message).then(() => {
                done('Data should not be obtained');
            }).catch(e => {
                expect(e, 'Правильно обработало исключение').to.throw;
                done();
            })
        });
    });
    describe('Получение суммы с комиссией', () => {
        const commissionMock = mock.onPost('https://auth.robokassa.ru/Merchant/WebService/Service.asmx/CalcOutSumm');
        it('Сумма с комиссией успешно рассчитана', (done) => {
            commissionMock.reply(200, calcOutSumSuccess);
            RobokassaPay.getCommissionSum('', 120).then(result => {
                expect(result).to.equal(120);
                done();
            }).catch(e => {
                done(e);
            });
        });
        it('Некорректная сумма с комиссией', (done) => {
            commissionMock.reply(200, calcOutSumError);
            RobokassaPay.getCommissionSum('', 120).then(() => {
                done(new Error('Комиссия расчитана неверно'));
            }).catch(e => {
                expect(e).to.throw;
                done();
            });
        });
        it('При получении суммы комиссии возникли ошибки', (done) => {
            commissionMock.networkErrorOnce();
            RobokassaPay.getCommissionSum('', 120).then(() => {
                done('Data should not be obtained');
            }).catch(e => {
                expect(e, 'Правильно обработало исключение').to.throw;
                done();
            })
        });
    });
    describe('Получение способов оплаты', () => {
        const currenciesMock = mock.onPost('https://auth.robokassa.ru/Merchant/WebService/Service.asmx/GetCurrencies');
        it('Способы оплаты успешно получены и непустые', (done) => {
            currenciesMock.reply(200, fullCurrencies);
            RobokassaPay.getCurrencies().then(result => {
                result.every(i => expect(i).to.have.all.keys(['Name', 'Label', 'Alias', 'MinValue', 'MaxValue']));
                done();
            }).catch(e => {
                done(e);
            });
        });
        it('Способы оплаты успешно получены и пустые', (done) => {
            currenciesMock.reply(200, emptyCurrencies);
            RobokassaPay.getCurrencies().then(result => {
                expect(result).to.deep.equal([]);
                done();
            }).catch(e => {
                done(e);
            });
        });
        it('При получении способов оплаты возникли ошибки', (done) => {
            currenciesMock.networkErrorOnce();
            RobokassaPay.getCurrencies().then(() => {
                done('Data should not be obtained');
            }).catch(e => {
                expect(e, 'Правильно обработало исключение').to.throw;
                done();
            })
        });
    });
    describe('Получение статуса платежа', () => {
        const checkPaymentMock = mock.onPost('https://auth.robokassa.ru/Merchant/WebService/Service.asmx/OpStateExt');
        it('Статус оплаты получен. Платеж успешно проведен', (done) => {
            checkPaymentMock.reply(200, fullOperation);
            RobokassaPay.checkPayment(1234).then(result => {
                expect(result).to.deep.equal(OPERATION_COMPLETED_SUCCESSFULLY);
                done();
            }).catch(e => {
                done(e);
            });
        });
        it('Неверная цифровая подпись запроса', (done) => {
            checkPaymentMock.reply(200, emptyOperation(1));
            RobokassaPay.checkPayment(1234).then(result => {
                expect(result).to.deep.equal(INCORRECT_SIGNATURE);
                done();
            }).catch(e => {
                done(e);
            });
        });
        it('Не удалось найти операцию', (done) => {
            checkPaymentMock.reply(200, emptyOperation(3));
            RobokassaPay.checkPayment(1234).then(result => {
                expect(result).to.deep.equal(OPERATION_NOT_FOUND);
                done();
            }).catch(e => {
                done(e);
            });
        });
        it('найдено две операции с таким InvoiceID', (done) => {
            checkPaymentMock.reply(200, emptyOperation(4));
            RobokassaPay.checkPayment(1234).then(result => {
                expect(result).to.deep.equal(FOUND_TWO_OPERATIONS);
                done();
            }).catch(e => {
                done(e);
            });
        });
        it('Операция только инициализирована', (done) => {
            checkPaymentMock.reply(200, incompleteOperation(5));
            RobokassaPay.checkPayment(1234).then(result => {
                expect(result).to.deep.equal(OPERATION_INITIATED);
                done();
            }).catch(e => {
                done(e);
            });
        });
        it('Операция отменена, деньги от покупателя не были получены', (done) => {
            checkPaymentMock.reply(200, incompleteOperation(10));
            RobokassaPay.checkPayment(1234).then(result => {
                expect(result).to.deep.equal(OPERATION_CANCELLED_MONEY_NOT_RECEIVED);
                done();
            }).catch(e => {
                done(e);
            });
        });
        it('Деньги от покупателя получены, производится зачисление денег на счет магазина', (done) => {
            checkPaymentMock.reply(200, incompleteOperation(50));
            RobokassaPay.checkPayment(1234).then(result => {
                expect(result).to.deep.equal(MONEY_CREDITED_STORE);
                done();
            }).catch(e => {
                done(e);
            });
        });
        it('Деньги после получения были возвращены покупателю', (done) => {
            checkPaymentMock.reply(200, incompleteOperation(60));
            RobokassaPay.checkPayment(1234).then(result => {
                expect(result).to.deep.equal(MONEY_RETURNED_BUYER);
                done();
            }).catch(e => {
                done(e);
            });
        });
        it('Исполнение операции приостановлено', (done) => {
            checkPaymentMock.reply(200, incompleteOperation(80));
            RobokassaPay.checkPayment(1234).then(result => {
                expect(result).to.deep.equal(OPERATION_SUSPENDED);
                done();
            }).catch(e => {
                done(e);
            });
        });
        it('Неизвестный код сотояния оплаты', (done) => {
            checkPaymentMock.reply(200, incompleteOperation(800));
            RobokassaPay.checkPayment(1234).then(result => {
                expect(result).to.deep.equal(UNKNOWN_ANSWER);
                done();
            }).catch(e => {
                done(e);
            });
        });
        it('Неизвестный код результата оплаты', (done) => {
            checkPaymentMock.reply(200, emptyOperation(800));
            RobokassaPay.checkPayment(1234).then(result => {
                expect(result).to.deep.equal(UNKNOWN_ANSWER);
                done();
            }).catch(e => {
                done(e);
            });
        });
        it('При получении статуса оплаты возникли ошибки', (done) => {
            checkPaymentMock.networkErrorOnce();
            RobokassaPay.getCurrencies().then(() => {
                done('Data should not be obtained');
            }).catch(e => {
                expect(e, 'Правильно обработало исключение').to.throw;
                done();
            })
        });
    });
});