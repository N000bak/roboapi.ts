import {join, difference, includes, toUpper, forEach} from 'lodash';
import {createHash} from 'crypto';
import axios from 'axios';
import {validate, parse} from 'fast-xml-parser';

export type TSimpleObj = {
    [key: string]: any
}
export type TCurrency = 'USD' | 'EUR' | 'KZT';
export type TPay = {
    Name: string;
    Label: string;
    Alias: string;
    MinValue: number;
    MaxValue: number;
}
export type THash = 'md5' | 'ripemd160' | 'sha1' | 'sha256' | 'sha384' | 'sha512' | 'md5';
export type TReCheck = {
    code: number;
    message: string;
    success: boolean;
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
    private method: string;

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
     * @var string
     */
    private response: TSimpleObj = {};

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
    private static async createRequest(url: string, params: TSimpleObj): Promise<any> {
        await axios({
            method: 'get',
            url,
            params,
        });
    }

    /**
     * @param {string} mrhLogin
     * @param {string} mrhPass1
     * @param {string} mrhPass2
     * @param {string} method
     * @param {TCurrency} outCurrency
     * @param {boolean} isTest
     */
    constructor(
        mrhLogin: string,
        mrhPass1: string,
        mrhPass2: string,
        method: string,
        outCurrency: TCurrency,
        isTest?: boolean
    ) {
        this.mrhLogin = mrhLogin;
        this.mrhPass1 = mrhPass1;
        this.mrhPass2 = mrhPass2;
        this.method = method;
        this.outCurrency = outCurrency;
        this.apiUrl = 'https://auth.robokassa.ru/Merchant/WebService/Service.asmx/';
        this.smsUrl = 'https://services.robokassa.ru/SMS/';
        this.isTest = isTest || false;
    }

    /**
     * @return TSimpleObj
     */
    public getResponse(): TSimpleObj {
        return this.response;
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
     * @param {string} sum
     * @param {string} invId
     * @param {string} receiptJson
     *
     * @return string
     */
    private getSignatureString(sum: string, invId: string, receiptJson: string): string {

        /** @var null|string outCurrency */
        const outCurrency = this.outCurrency || null;

        return join(
            difference(
                [
                    this.mrhLogin,
                    sum,
                    invId,
                    outCurrency,
                    receiptJson,
                    this.mrhPass1,
                ],
                [
                    false,
                    '',
                    null
                ]
            ), ':');
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
    public async sendSms(phone: string, message: string): Promise<boolean> | never {
        const params = {
            'login': this.mrhLogin,
            'phone': phone,
            'message': message,
            'signature': this.getSignature(`${this.mrhLogin}:${phone}:${message}:${this.mrhPass1}`),
        };

        try {
            const response = await RobokassaPayAPI.createRequest(this.smsUrl, params);
            this.response = response;

            return response && response['data'] && response['data']['result'] === 1;
        } catch (error) {
            throw new Error(error);
        }
    }

    /**
     * Запрашиват размер комиссии в процентах для конкретного способа оплаты
     *
     * @param {string} incCurrLabel Кодовое имя метода оплаты
     * @param {int}    sum          Стоимость товара
     *
     * @return number Комиссия метода в %
     */
    public getCommission(incCurrLabel: string, sum = 10000): number {
        const parsed = this.getData('CalcOutSumm', {
            MerchantLogin: this.mrhLogin,
            IncCurrLabel: incCurrLabel === 'all' ? '' : incCurrLabel,
            IncSum: sum,
            IsTest: Number(this.isTest)
        });

        return Math.abs(Math.round((sum - parsed['OutSum']) / parsed['OutSum'] * 100));
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
        if (parsed && parsed['Groups']) {
            forEach(parsed['Groups'] && parsed['Groups']['Group'], group => {
                if (group && group['Items'] && group['Items']['Currency']) {
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
            if (response && response.data && validate(response.data)) {
                return parse(response.data)
            }
        }).catch(function (error) {
            throw new Error(error)
        });
    }

    /**
     * Запрашивает у робокассы подтверждение платежа
     *
     * @param {int} invId
     *
     * @return TReCheck | never
     */
    public reCheck(invId: number): TReCheck | never {
        const result = this.getData('OpState', {
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