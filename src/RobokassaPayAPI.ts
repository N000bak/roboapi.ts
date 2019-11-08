import { join, difference, includes, toUpper, forEach } from 'lodash';
import {createHash} from "crypto";
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
    Commission: number;
    MinValue: number;
    MaxValue: number;
}
export type THash = 'md5' | 'ripemd160' | 'sha1' | 'sha256' | 'sha384' | 'sha512' | 'md5';

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
     * @var string
     */
    private readonly outCurrency: TCurrency;

    /**
     * @var string
     */
    private response: TSimpleObj = {};

    /**
     *
     * @param {string} url
     * @param {object} params
     *
     * @return Promise
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
     * @param {string} outCurrency
     */
    constructor(
        mrhLogin: string,
        mrhPass1: string,
        mrhPass2: string,
        method: string,
        outCurrency: TCurrency
    ) {
        this.mrhLogin = mrhLogin;
            this.mrhPass1 = mrhPass1;
            this.mrhPass2 = mrhPass2;
            this.method = method;
            this.outCurrency = outCurrency;
            this.apiUrl = 'https://auth.robokassa.ru/Merchant/WebService/Service.asmx/';
            this.smsUrl = 'https://services.robokassa.ru/SMS/';
    }

    /**
     * @return object
     */
    public getResponse(): TSimpleObj {
        return this.response;
    }

    /**
     * @param {string} apiMethod
     * @param {array}  params
     *
     * @return object
     */
    private getData(apiMethod: string, params: TSimpleObj): TSimpleObj {
        return this.parseXmlAndConvertToJson(this.apiUrl, apiMethod, params);
    }

    /**
     * Если receiptJson пустой (то есть имеет значение "[]") - то в формировании сигнатуры
     * он не будет использоваться, а если не пустой - используем его json-представление
     *
     * @param {string} sum
     * @param {string} invId
     * @param {string} receiptJson
     *
     * @return string
     */
    private getSignatureString(sum: string, invId: string, receiptJson: string): string
    {

        /** @var null|string $outCurrency */
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
        ),':');
    }

    /**
     * Генерирует хеш для строки $string с помощью метода $method
     *
     * @param {string} string
     * @param {string} method
     *
     * @return string
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
     * @return boolean
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

            return response && response['result'] == 1;
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
     * @return float Комиссия метода в %
     */
    public getCommission(incCurrLabel: string, sum = 10000): number {
        const parsed = this.getData('CalcOutSumm', {
            MerchantLogin: this.mrhLogin,
            IncCurrLabel: incCurrLabel === 'all' ? '' : incCurrLabel,
            IncSum: sum
        });

        return Math.abs(Math.round((sum - parsed['OutSum']) / parsed['OutSum'] * 100));
    }

    /**
     * Возвращает сумму к оплате с учетом комиссий.
     *
     * @param {string} incCurrLabel Кодовое имя метода оплаты
     * @param {int}    sum          Стоимость товара
     *
     * @return float Стоимость, которую необходимо передавать в Робокассу.
     */
    public getCommissionSum(incCurrLabel: string, sum: number): number {
        const parsed = this.getData('CalcOutSumm', {
            MerchantLogin: this.mrhLogin,
            IncCurrLabel: incCurrLabel,
            IncSum: sum,
        });

        return parsed && parsed.OutSum;
    }

    /**
     * Запрашивает и парсит в массив все возможные способы оплаты для данного магазина
     *
     * @return array
     */
    public getCurrLabels(): TPay[] | unknown[] {
        const parsed = this.getData('GetCurrencies', {
            MerchantLogin: this.mrhLogin,
            Language: 'ru',
        });

        const paymentMethods: TPay[] | unknown[] = [];
        if(parsed && parsed['Groups'])
        {
            forEach(parsed['Groups'] && parsed['Groups']['Group'], group => {
                if (group) {
                    forEach(group && group['Items'] && group['Items']['Currency'], currency => {
                        if (currency['@attributes']) {
                            const attributes = currency['@attributes'];
                            if (attributes['Name']) {
                                paymentMethods.push({
                                    Name: attributes['Name'],
                                    Label: attributes['Label'],
                                    Alias: attributes['Alias'],
                                    Commission: this.getCommission(attributes['Label']),
                                    MinValue: attributes['MinValue'] ? attributes['MinValue'] : 0,
                                    MaxValue: attributes['MaxValue'] ? attributes['MaxValue'] : 9999999,
                                } as TPay);
                            }
                        }
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
     * @param {object} params
     *
     * @return object
     */
    private parseXmlAndConvertToJson(apiUrl: string, controller: string, params: TSimpleObj): TSimpleObj | never {
        const url = `${apiUrl}/${controller}`;
        return RobokassaPayAPI.createRequest(url, params).then(function (response) {
            if (response && response.data && validate(response.data)) {
                return parse(response.data)
            }
        })
        .catch(function (error) {
            throw new Error(error)
        });
    }

    /**
     * Запрашивает у робокассы подтверждение платежа
     *
     * @param {int} invId
     *
     * @return bool
     */
    public reCheck(invId: number): boolean {
        const result = this.getData('OpState', {
            MerchantLogin: this.mrhLogin,
            InvoiceID: invId,
            Signature: this.getSignature(`${this.mrhLogin}:${invId}:${this.mrhPass2}`, 'md5'),
        });

        return result['Result']['Code'] == '0';
    }

}

export default RobokassaPayAPI;