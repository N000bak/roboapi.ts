import {join, includes, toUpper, forEach, compact} from 'lodash';
import {createHash} from 'crypto';
import axios from 'axios';
import {validate, parse} from 'fast-xml-parser';
import {
    REQUEST_SUCCESSFULLY,
    NO_QUERY_OPTION,
    PARTNER_NOT_FOUND,
    PARTNER_INACTIVE,
    PARTNER_NOT_AVAILABLE,
    PARTNER_NOT_POSSIBLE,
    SMS_LIMIT_HIGHER,
    INVALID_REQUEST_SIGNATURE,
    INTERNAL_ERROR,
    UNKNOWN_ANSWER,
    OPERATION_INITIATED,
    OPERATION_CANCELLED_MONEY_NOT_RECEIVED,
    MONEY_CREDITED_STORE,
    MONEY_RETURNED_BUYER,
    OPERATION_SUSPENDED,
    OPERATION_COMPLETED_SUCCESSFULLY,
    INCORRECT_SIGNATURE, OPERATION_NOT_FOUND, FOUND_TWO_OPERATIONS
} from "./helpers/response";

export type TSimpleObj = {
    [key: string]: any
}
export type TCurrency = 'USD' | 'EUR' | 'KZT' | null;
export type TPay = {
    Name: string;
    Label: string;
    Alias: string;
    MinValue: number;
    MaxValue: number;
}
export type THash = 'md5' | 'ripemd160' | 'sha1' | 'sha256' | 'sha384' | 'sha512' | 'md5';
export type TResponse = {
    code: number;
    message: string;
    success: boolean;
}
export type TConstructorArgs = {
    mrhLogin: string,
    mrhPass1: string,
    mrhPass2: string,
    outCurrency?: TCurrency,
    isTest?: boolean
}
export type THttpMethod = 'GET' | 'POST';

class RobokassaPayAPI {

    /**
     * @var string
     */
    private readonly mrhLogin: string;

    /**
     * @var string
     */
    private readonly mrhPass1: string;

    /**
     * @var string
     */
    private readonly mrhPass2: string;

    /**
     * @var string
     */
    private readonly apiUrl: string;

    /**
     * @var string
     */
    private readonly smsUrl: string;

    /**
     * @var TCurrency
     */
    private readonly outCurrency: TCurrency;

    /**
     * @var boolean
     */
    private readonly isTest: boolean;

    /**
     *
     * @param {THttpMethod} httpMethod
     * @param {string} url
     * @param {TSimpleObj} params
     *
     * @return Promise<any>
     */
    private static createRequest(httpMethod: THttpMethod, url: string, params: TSimpleObj): Promise<any> {
        return axios({
            method: httpMethod,
            url,
            [httpMethod === 'GET' ? 'params' : 'data']: params,
        });
    }

    /**
     * @param {TConstructorArgs} args
     * @param {string} args.mrhLogin - идентификатор
     * @param {string} args.mrhPass1 - пароль 1
     * @param {string} args.mrhPass2 - пароль 2
     * @param {TCurrency} args.outCurrency - валюта (если не RUB)
     * @param {boolean} args.isTest - тестовый запрос
     */
    constructor(args: TConstructorArgs) {
        const {mrhLogin, mrhPass1, mrhPass2, outCurrency, isTest} = args;
        this.mrhLogin = mrhLogin;
        this.mrhPass1 = mrhPass1;
        this.mrhPass2 = mrhPass2;
        this.outCurrency = outCurrency || null;
        this.apiUrl = 'https://auth.robokassa.ru/Merchant/WebService/Service.asmx';
        this.smsUrl = 'https://services.robokassa.ru/SMS/';
        this.isTest = isTest || false;
    }

    /**
     * @param {THttpMethod} httpMethod
     * @param {string} apiMethod
     * @param {TSimpleObj}  params
     *
     * @return Promise<TSimpleObj>
     */
    private getData(httpMethod: THttpMethod, apiMethod: string, params: TSimpleObj): Promise<TSimpleObj> | never {
        return this.parseXmlAndConvertToJson(httpMethod, this.apiUrl, apiMethod, params);
    }

    /**
     * Если receiptJson пустой - то в формировании сигнатуры
     * он не будет использоваться, а если не пустой - используем его json-представление
     *
     * @param {number} sum
     * @param {number} invId - Номер счета в магазине
     * @param {string} receiptJson - В этом параметре передается информация о перечне товаров/услуг, количестве,
     * цене и ставке налога по каждой позиции.
     *
     * @return string
     */
    public getSignatureString(sum: number, invId: number, receiptJson: string = ''): string {
        return join(compact([this.mrhLogin, sum, invId, this.outCurrency, receiptJson, this.mrhPass1]), ':');
    }

    /**
     * Генерирует хеш для строки string с помощью метода method
     *
     * @param {string} string
     * @param {string} method
     *
     * @return string | never
     *
     * @throws \Exception
     */
    public getSignature(string: string, method: THash = 'md5'): string | never {
        const methods = ['md5', 'ripemd160', 'sha1', 'sha256', 'sha384', 'sha512'];
        if (includes(methods, method)) {
            return toUpper(createHash(method).update(string).digest('hex'));
        }

        throw new Error('Wrong Signature Method');
    }

    /**
     * Отправляет СМС с помощью GET-запроса на робокассу
     *
     * @param {string} phone
     * @param {string} message
     *
     * @return boolean | never
     * @throws \Exception
     */
    public async sendSms(phone: string, message: string): Promise<TResponse> | never {
        const params = {
            phone,
            message,
            login: this.mrhLogin,
            signature: this.getSignature(`${this.mrhLogin}:${phone}:${message}:${this.mrhPass1}`),
        };

        try {
            const response = await RobokassaPayAPI.createRequest('GET', this.smsUrl, params);
            switch (response?.data?.errorCode) {
                case 0:
                    return REQUEST_SUCCESSFULLY;
                case 1:
                    return NO_QUERY_OPTION;
                case 2:
                    return PARTNER_NOT_FOUND;
                case 3:
                    return PARTNER_INACTIVE;
                case 4:
                    return PARTNER_NOT_AVAILABLE;
                case 5:
                    return PARTNER_NOT_POSSIBLE;
                case 6:
                    return SMS_LIMIT_HIGHER;
                case 1000:
                    return INVALID_REQUEST_SIGNATURE;
                case 9999:
                    return INTERNAL_ERROR;
                default:
                    return UNKNOWN_ANSWER;
            }
        } catch (error) {
            throw error;
        }
    }

    /**
     * Возвращает сумму к оплате с учетом комиссии.
     *
     * @param {string} incCurrLabel Кодовое имя метода оплаты
     * @param {int}    sum          Стоимость товара
     *
     * @return Promise<number> Стоимость, которую необходимо передавать в Робокассу.
     */
    public async getCommissionSum(incCurrLabel: string, sum: number): Promise<number> | never {
        const parsed = await this.getData('POST', 'CalcOutSumm', {
            MerchantLogin: this.mrhLogin,
            IncCurrLabel: incCurrLabel,
            IncSum: sum,
            IsTest: Number(this.isTest)
        });

        try {
            if (parsed?.CalcSummsResponseData?.OutSum > 0) {
                return parsed?.CalcSummsResponseData?.OutSum
            }

            throw new Error('there was an error in the calculation of the commission');
        } catch (e) {
            throw e;
        }
    }

    /**
     * Получение списка способов оплаты (в офф. документации валют), доступных магазину
     *
     * @return Promise<TPay[] | unknown[]> | never
     */
    public async getCurrencies(): Promise<TPay[] | unknown[]> | never {
        const parsed = await this.getData('POST', 'GetCurrencies', {
            MerchantLogin: this.mrhLogin,
            Language: 'ru',
            IsTest: Number(this.isTest)
        });

        try {
            const paymentMethods: TPay[] | unknown[] = [];

            if (parsed?.CurrenciesList?.Groups) {
                forEach(parsed?.CurrenciesList?.Groups, group => {
                    if (group?.[0]?.Items?.Currency) {
                        forEach(group?.[0]?.Items?.Currency, currency => {
                            paymentMethods.push({
                                Name: currency['@_Name'],
                                Label: currency['@_Label'],
                                Alias: currency['@_Alias'],
                                MinValue: currency['@_MinValue'] ? Number(currency['@_MinValue']) : 0,
                                MaxValue: currency['@_MaxValue'] ? Number(currency['@_MaxValue']) : 9999999,
                            } as TPay);
                        });
                    }
                })
            }

            return paymentMethods;
        } catch (e) {
            throw e
        }
    }

    /**
     * Парсит XML в JSON
     *
     * @param {THttpMethod} httpMethod
     * @param {string} apiUrl
     * @param {string} controller
     * @param {TSimpleObj} params
     *
     * @return Promise<TSimpleObj> | never
     */
    private parseXmlAndConvertToJson(
        httpMethod: THttpMethod,
        apiUrl: string,
        controller: string,
        params: TSimpleObj
    ): Promise<TSimpleObj> | never {
        const url = `${apiUrl}/${controller}`;
        return RobokassaPayAPI.createRequest(httpMethod, url, params).then(response => {
            if (response?.data && validate(response?.data)) {
                return parse(response.data, {
                    ignoreAttributes: false
                })
            }
        }).catch(error => {
            return Promise.reject(error.message)
        });
    }

    /**
     * Запрашивает у робокассы подтверждение платежа
     *
     * @param {int} invId
     *
     * @return Promise<TResponse> | never
     */
    public async checkPayment(invId: number): Promise<TResponse> | never {
        const result = await this.getData('POST', 'OpStateExt', {
            MerchantLogin: this.mrhLogin,
            InvoiceID: invId,
            Signature: this.getSignature(`${this.mrhLogin}:${invId}:${this.mrhPass2}`, 'md5'),
            IsTest: Number(this.isTest)
        });

        try {
            switch (result?.OperationStateResponse?.Result?.Code) {
                case 0:
                    switch (result?.OperationStateResponse?.State?.Code) {
                        case 5:
                            return OPERATION_INITIATED;
                        case 10:
                            return OPERATION_CANCELLED_MONEY_NOT_RECEIVED;
                        case 50:
                            return MONEY_CREDITED_STORE;
                        case 60:
                            return MONEY_RETURNED_BUYER;
                        case 80:
                            return OPERATION_SUSPENDED;
                        case 100:
                            return OPERATION_COMPLETED_SUCCESSFULLY;
                        default:
                            return UNKNOWN_ANSWER;
                    }
                case 1:
                    return INCORRECT_SIGNATURE;
                case 3:
                    return OPERATION_NOT_FOUND;
                case 4:
                    return FOUND_TWO_OPERATIONS;
                default:
                    return UNKNOWN_ANSWER;
            }
        } catch (e) {
            throw e
        }
    }
}

export default RobokassaPayAPI;