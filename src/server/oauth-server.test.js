import {
    validateOauthRequestParameterClientId,
    getOauthErrorMessageParameterMissing,
    getOauthErrorMessageParameterUnmatched
} from './oauth-server';

describe('validator function validateOauthRequestParameterClientId', () => {

    const parameterName = 'client_id';
    it('Should reject when there are not any parameters', () => {
        const test_cases = [
            [
                {},
                getOauthErrorMessageParameterMissing(parameterName)
            ]
        ];
        test_cases.forEach((v) => {
            expect(validateOauthRequestParameterClientId(new URLSearchParams(v[0]))).toStrictEqual(v[1]);
        });
    });

    it(`Should reject when parameter '${parameterName}' is missing`, () => {
        const test_cases = [
            [
                {
                    foo: 'bar'
                },
                getOauthErrorMessageParameterMissing(parameterName)
            ]
        ];
        test_cases.forEach((v) => {
            expect(validateOauthRequestParameterClientId(new URLSearchParams(v[0]))).toStrictEqual(v[1]);
        });
    });

    it(`Should reject when parameter '${parameterName}' does not match any registered value`, () => {
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
