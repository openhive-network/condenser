import { validateOauthRequestParameterClientId } from './oauth-server';

describe('validator function validateOauthRequestParameterClientId', () => {
    const errorResult1 = {
        error: 'invalid_request',
        error_description: "Missing required parameter 'client_id'",
    };
    const errorResult2 = {
        error: 'invalid_request',
        error_description: "Parameter 'client_id' does not match any registered clients",
    };

    it('Should reject when empty object', () => {
        const test_cases = [
            [
                {},
                errorResult1
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
                errorResult1
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
                errorResult2
            ]
        ];
        test_cases.forEach((v) => {
            expect(validateOauthRequestParameterClientId(new URLSearchParams(v[0]))).toStrictEqual(v[1]);
        });
    });

    // TODO Write test for passing validator.

});
