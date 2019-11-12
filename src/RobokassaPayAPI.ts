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
    PARTNER_NOT_POSSIBLE, SMS_LIMIT_HIGHER, INVALID_REQUEST_SIGNATURE, INTERNAL_ERROR, UNKNOWN_ANSWER
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
     * @param {string} url
     * @param {TSimpleObj} params
     *
     * @return Promise<any>
     */
    private static createRequest(url: string, params: TSimpleObj): Promise<any> {
        return axios({
            method: 'get',
            url,
            params,
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
        this.apiUrl = 'https://auth.robokassa.ru/Merchant/WebService/Service.asmx/';
        this.smsUrl = 'https://services.robokassa.ru/SMS/';
        this.isTest = isTest || false;
    }

    /**
     * @param {string} apiMethod
     * @param {TSimpleObj}  params
     *
     * @return TSimpleObj
     */
    private getData(apiMethod: string, params: TSimpleObj): TSimpleObj {
        return this.parseXmlAndConvertToJson(this.apiUrl, apiMethod, params);
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
            const response = await RobokassaPayAPI.createRequest(this.smsUrl, params);
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
     * Возвращает сумму к оплате с учетом комиссий.
     *
     * @param {string} incCurrLabel Кодовое имя метода оплаты
     * @param {int}    sum          Стоимость товара
     *
     * @return number Стоимость, которую необходимо передавать в Робокассу.
     */
    public getCommissionSum(incCurrLabel: string, sum: number): number {
        const parsed = this.getData('CalcOutSumm', {
            MerchantLogin: this.mrhLogin,
            IncCurrLabel: incCurrLabel,
            IncSum: sum,
            IsTest: Number(this.isTest)
        });

        return parsed && parsed.OutSum;
    }

    /**
     * Получение списка валют, доступных магазину
     *
     * @return Array<TPay> | Array<unknown>
     */
    public getCurrLabels(): TPay[] | unknown[] {
        const parsed = this.getData('GetCurrencies', {
            MerchantLogin: this.mrhLogin,
            Language: 'ru',
            IsTest: Number(this.isTest)
        });

        const paymentMethods: TPay[] | unknown[] = [];
        if (parsed?.Groups) {
            forEach(parsed?.Groups?.Group, group => {
                if (group?.Items?.Currency) {
                    forEach(group['Items']['Currency'], currency => {
                        paymentMethods.push({
                            Name: currency['@_Name'],
                            Label: currency['@_Label'],
                            Alias: currency['@_Alias'],
                            MinValue: currency['@_MinValue'] ? currency['@_MinValue'] : 0,
                            MaxValue: currency['@_MaxValue'] ? currency['@_MaxValue'] : 9999999,
                        } as TPay);
                    });
                }
            })
        }

        return paymentMethods;
    }

    /**
     * Парсит XML в JSON
     *
     * @param {string} apiUrl
     * @param {string} controller
     * @param {TSimpleObj} params
     *
     * @return TSimpleObj | never
     */
    private parseXmlAndConvertToJson(apiUrl: string, controller: string, params: TSimpleObj): TSimpleObj | never {
        const url = `${apiUrl}/${controller}`;
        return RobokassaPayAPI.createRequest(url, params).then(function (response) {
            if (response?.data && validate(response?.data)) {
                return parse(response.data)
            }
        }).catch(function (error) {
            throw error
        });
    }

    /**
     * Запрашивает у робокассы подтверждение платежа
     *
     * @param {int} invId
     *
     * @return TResponse | never
     */
    public reCheck(invId: number): TResponse | never {
        const result = this.getData('OpStateExt', {
            MerchantLogin: this.mrhLogin,
            InvoiceID: invId,
            Signature: this.getSignature(`${this.mrhLogin}:${invId}:${this.mrhPass2}`, 'md5'),
            IsTest: Number(this.isTest)
        });

        switch (result['Result']['Code']) {
            case 0:
                switch (result['State']['Code']) {
                    case 5:
                        return {code: 5, message: 'operation initiated', success: false};
                    case 10:
                        return {code: 10, message: 'operation cancelled money from the buyer was not received', success: false};
                    case 50:
                        return {code: 50, message: 'money from the buyer received is made by depositing the money into the account of the store', success: false};
                    case 60:
                        return {code: 60, message: 'money after receipt was returned to the buyer', success: false};
                    case 80:
                        return {code: 80, message: 'operation suspended', success: false};
                    case 100:
                        return {code: 100, message: 'operation was completed successfully', success: true};
                    default:
                        throw new Error('Unknown response code from the server')
                }
            case 1:
                throw new Error('Incorrect digital signature request');
            case 3:
                throw new Error('Couldn\'t find the operation');
            case 4:
                throw new Error('Found two operations with the so InvoiceID');
            default:
                throw new Error('Unknown response code from the server')
        }
    }

}

export default RobokassaPayAPI;