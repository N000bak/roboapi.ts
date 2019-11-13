export const REQUEST_SUCCESSFULLY = {
    code: 0,
    message: 'request handled successfully',
    success: true
};
export const NO_QUERY_OPTION = {code: 1, message: 'no query option', success: false};
export const PARTNER_NOT_FOUND = {code: 2, message: 'partner was not found', success: false};
export const PARTNER_INACTIVE = {code: 3, message: 'partner is inactive', success: false};
export const PARTNER_NOT_AVAILABLE = {
    code: 4,
    message: 'SMS sending for this partner is not available',
    success: false
};
export const PARTNER_NOT_POSSIBLE = {
    code: 5,
    message: 'currently sending SMS messages by the indicated partner is not possible',
    success: true
};
export const SMS_LIMIT_HIGHER = {code: 6, message: 'SMS limit is higher', success: false};
export const INVALID_REQUEST_SIGNATURE = {code: 1000, message: 'invalid request signature', success: false};
export const INTERNAL_ERROR = {code: 9999, message: 'internal error', success: false};
export const UNKNOWN_ANSWER = {code: -1, message: 'unknown answer', success: false};
export const OPERATION_INITIATED = {code: 5, message: 'operation initiated', success: false};
export const OPERATION_CANCELLED_MONEY_NOT_RECEIVED = {
    code: 10,
    message: 'operation cancelled money from the buyer was not received',
    success: false
};
export const MONEY_CREDITED_STORE = {
    code: 50,
    message: 'money from the buyer received is made by depositing the money into the account of the store',
    success: false
};
export const MONEY_RETURNED_BUYER = {
    code: 60,
    message: 'money after receipt was returned to the buyer',
    success: false
};
export const OPERATION_SUSPENDED = {code: 80, message: 'operation suspended', success: false};
export const OPERATION_COMPLETED_SUCCESSFULLY = {
    code: 100,
    message: 'operation was completed successfully',
    success: true
};
export const INCORRECT_SIGNATURE = {
    code: 1,
    message: 'Incorrect digital signature request',
    success: false
};
export const OPERATION_NOT_FOUND = {
    code: 3,
    message: 'Couldn\'t find the operation',
    success: false
};
export const FOUND_TWO_OPERATIONS = {
    code: 4,
    message: 'Found two operations with the so InvoiceID',
    success: false
};