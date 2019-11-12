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