import {
    validateOauthRequestParameterClientId,
    getOauthErrorMessageParameterMissing,
    getOauthErrorMessageParameterUnmatched
} from './oauth-server';

describe('validator function validateOauthRequestParameterClientId', () => {

    it('Should reject when empty object', () => {
        const test_cases = [
            [
                {},
                getOauthErrorMessageParameterMissing('client_id')
            ]
        ];
        test_cases.forEach((v) => {
            expect(validateOauthRequestParameterClientId(new URLSearchParams(v[0]))).toStrictEqual(v[1]);
        });
    });

    it('Should reject when missing parameter', () => {
        const test_cases = [
            [
                {
                    foo: 'bar'
                },
                getOauthErrorMessageParameterMissing('client_id')
            ]
        ];
        test_cases.forEach((v) => {
            expect(validateOauthRequestParameterClientId(new URLSearchParams(v[0]))).toStrictEqual(v[1]);
        });
    });

    it('Should reject when parameter does not match any registered clients', () => {
        const test_cases = [
            [
                {
                    client_id: 'really_not_existing_client_id'
                },
                getOauthErrorMessageParameterUnmatched('client_id')
            ]
        ];
        test_cases.forEach((v) => {
            expect(validateOauthRequestParameterClientId(new URLSearchParams(v[0]))).toStrictEqual(v[1]);
        });
    });

    // TODO Write test for passing validator.

});
