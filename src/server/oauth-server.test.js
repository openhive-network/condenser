import {
    validateOauthRequestParameterClientId,
    validateOauthRequestParameterRedirectUri,
    validateOauthRequestParameterScope,
    validateOauthRequestParameterResponseType,
    validateOauthRequestParameterGrantType,
    validateOauthRequestParameterCode,
    getOauthErrorMessageParameterMissing,
    getOauthErrorMessageParameterUnmatched
} from './oauth-server';

describe('validator function validateOauthRequestParameterClientId', () => {

    const parameter = 'client_id';
    const testedFunction = validateOauthRequestParameterClientId;
    it('should reject when there are not any parameters', () => {
        const test_cases = [
            [
                {},
                getOauthErrorMessageParameterMissing(parameter)
            ]
        ];
        test_cases.forEach((v) => {
            expect(testedFunction(new URLSearchParams(v[0])))
                .toStrictEqual(v[1]);
        });
    });

    it(`should reject when parameter '${parameter}' is missing`, () => {
        const test_cases = [
            [
                {
                    foo: 'bar'
                },
                getOauthErrorMessageParameterMissing(parameter)
            ]
        ];
        test_cases.forEach((v) => {
            expect(testedFunction(new URLSearchParams(v[0])))
                .toStrictEqual(v[1]);
        });
    });

    it(`should reject when parameter '${parameter}' does not match any registered value`, () => {
        const test_cases = [
            [
                {
                    client_id: 'really_not_existing_client_id'
                },
                getOauthErrorMessageParameterUnmatched(parameter)
            ]
        ];
        test_cases.forEach((v) => {
            expect(testedFunction(new URLSearchParams(v[0])))
                .toStrictEqual(v[1]);
        });
    });

    it(`should pass when parameter '${parameter}' matches registered value`, () => {
        const test_cases = [
            [
                {
                    client_id: 'openhive_chat'
                },
                null
            ]
        ];
        test_cases.forEach((v) => {
            expect(testedFunction(new URLSearchParams(v[0])))
                .toStrictEqual(v[1]);
        });
    });

});


describe('validator function validateOauthRequestParameterRedirectUri', () => {

    const parameter = 'redirect_uri';
    const testedFunction = validateOauthRequestParameterRedirectUri;
    it('should reject when there are not any parameters', () => {
        const test_cases = [
            [
                {},
                getOauthErrorMessageParameterMissing(parameter)
            ]
        ];
        test_cases.forEach((v) => {
            expect(testedFunction(new URLSearchParams(v[0])))
                .toStrictEqual(v[1]);
        });
    });

    it(`should reject when parameter '${parameter}' is missing`, () => {
        const test_cases = [
            [
                {
                    foo: 'bar'
                },
                getOauthErrorMessageParameterMissing(parameter)
            ]
        ];
        test_cases.forEach((v) => {
            expect(testedFunction(new URLSearchParams(v[0])))
                .toStrictEqual(v[1]);
        });
    });

    it(`should reject when parameter '${parameter}' does not match any registered value`, () => {
        const test_cases = [
            [
                {
                    client_id: 'openhive_chat',
                    redirect_uri: 'really_not_existing_redirect_uri'
                },
                getOauthErrorMessageParameterUnmatched(parameter)
            ]
        ];
        test_cases.forEach((v) => {
            expect(testedFunction(new URLSearchParams(v[0])))
                .toStrictEqual(v[1]);
        });
    });

    it(`should pass when parameter '${parameter}' matches registered value`, () => {
        const test_cases = [
            [
                {
                    client_id: 'openhive_chat',
                    redirect_uri: 'https://openhive.chat/_oauth/hiveblog'
                },
                null
            ]
        ];
        test_cases.forEach((v) => {
            expect(testedFunction(new URLSearchParams(v[0])))
                .toStrictEqual(v[1]);
        });
    });

});


describe('validator function validateOauthRequestParameterScope', () => {

    const parameter = 'scope';
    const testedFunction = validateOauthRequestParameterScope;
    it('should reject when there are not any parameters', () => {
        const test_cases = [
            [
                {},
                getOauthErrorMessageParameterMissing(parameter)
            ]
        ];
        test_cases.forEach((v) => {
            expect(testedFunction(new URLSearchParams(v[0])))
                .toStrictEqual(v[1]);
        });
    });

    it(`should reject when parameter '${parameter}' is missing`, () => {
        const test_cases = [
            [
                {
                    foo: 'bar'
                },
                getOauthErrorMessageParameterMissing(parameter)
            ]
        ];
        test_cases.forEach((v) => {
            expect(testedFunction(new URLSearchParams(v[0])))
                .toStrictEqual(v[1]);
        });
    });

    it(`should reject when parameter '${parameter}' does not include required string 'openid'`, () => {
        const test_cases = [
            [
                {
                    client_id: 'openhive_chat',
                    scope: 'foo'
                },
                {
                    error: 'invalid_scope',
                    error_description: `Missing required string 'openid' in '${parameter}'`,
                }
            ]
        ];
        test_cases.forEach((v) => {
            expect(testedFunction(new URLSearchParams(v[0])))
                .toStrictEqual(v[1]);
        });
    });

    it(`should reject when parameter '${parameter}' includes disallowed value`, () => {
        const test_cases = [
            [
                {
                    client_id: 'openhive_chat',
                    scope: 'openid foo'
                },
                {
                    error: 'invalid_scope',
                    error_description: `Scope 'foo' is not allowed`,
                }
            ]
        ];
        test_cases.forEach((v) => {
            expect(testedFunction(new URLSearchParams(v[0])))
                .toStrictEqual(v[1]);
        });
    });

    it(`should pass when parameter '${parameter}' matches registered value`, () => {
        const test_cases = [
            [
                {
                    client_id: 'openhive_chat',
                    scope: 'openid profile'
                },
                null
            ]
        ];
        test_cases.forEach((v) => {
            expect(testedFunction(new URLSearchParams(v[0])))
                .toStrictEqual(v[1]);
        });
    });

});


describe('validator function validateOauthRequestParameterResponseType', () => {

    const parameter = 'response_type';
    const testedFunction = validateOauthRequestParameterResponseType;
    it('should reject when there are not any parameters', () => {
        const test_cases = [
            [
                {},
                getOauthErrorMessageParameterMissing(parameter)
            ]
        ];
        test_cases.forEach((v) => {
            expect(testedFunction(new URLSearchParams(v[0])))
                .toStrictEqual(v[1]);
        });
    });

    it(`should reject when parameter '${parameter}' is missing`, () => {
        const test_cases = [
            [
                {
                    foo: 'bar'
                },
                getOauthErrorMessageParameterMissing(parameter)
            ]
        ];
        test_cases.forEach((v) => {
            expect(testedFunction(new URLSearchParams(v[0])))
                .toStrictEqual(v[1]);
        });
    });

    it(`should reject when parameter '${parameter}' does not match any registered value`, () => {
        const test_cases = [
            [
                {
                    response_type: 'foo',
                },
                {
                    error: 'unsupported_response_type',
                    error_description: `Server does not support requested '${parameter}'`,
                }
            ]
        ];
        test_cases.forEach((v) => {
            expect(testedFunction(new URLSearchParams(v[0])))
                .toStrictEqual(v[1]);
        });
    });

    it(`should pass when parameter '${parameter}' matches registered value`, () => {
        const test_cases = [
            [
                {
                    response_type: 'code',
                },
                null
            ]
        ];
        test_cases.forEach((v) => {
            expect(testedFunction(new URLSearchParams(v[0])))
                .toStrictEqual(v[1]);
        });
    });

});


describe('validator function validateOauthRequestParameterGrantType', () => {

    const parameter = 'grant_type';
    const testedFunction = validateOauthRequestParameterGrantType;
    it('should reject when there are not any parameters', () => {
        const test_cases = [
            [
                {},
                getOauthErrorMessageParameterMissing(parameter)
            ]
        ];
        test_cases.forEach((v) => {
            expect(testedFunction(new URLSearchParams(v[0])))
                .toStrictEqual(v[1]);
        });
    });

    it(`should reject when parameter '${parameter}' is missing`, () => {
        const test_cases = [
            [
                {
                    foo: 'bar'
                },
                getOauthErrorMessageParameterMissing(parameter)
            ]
        ];
        test_cases.forEach((v) => {
            expect(testedFunction(new URLSearchParams(v[0])))
                .toStrictEqual(v[1]);
        });
    });

    it(`should reject when parameter '${parameter}' does not match any registered value`, () => {
        const test_cases = [
            [
                {
                    grant_type: 'foo',
                },
                {
                    error: 'invalid_request',
                    error_description: `Server does not support requested '${parameter}'`,
                }
            ]
        ];
        test_cases.forEach((v) => {
            expect(testedFunction(new URLSearchParams(v[0])))
                .toStrictEqual(v[1]);
        });
    });

    it(`should pass when parameter '${parameter}' matches registered value`, () => {
        const test_cases = [
            [
                {
                    grant_type: 'authorization_code',
                },
                null
            ]
        ];
        test_cases.forEach((v) => {
            expect(testedFunction(new URLSearchParams(v[0])))
                .toStrictEqual(v[1]);
        });
    });

});


describe('validator function validateOauthRequestParameterCode', () => {

    const parameter = 'code';
    const testedFunction = validateOauthRequestParameterCode;
    it('should reject when there are not any parameters', () => {
        const test_cases = [
            [
                {},
                getOauthErrorMessageParameterMissing(parameter)
            ]
        ];
        test_cases.forEach((v) => {
            expect(testedFunction(new URLSearchParams(v[0])))
                .toStrictEqual(v[1]);
        });
    });

    it(`should reject when parameter '${parameter}' is missing`, () => {
        const test_cases = [
            [
                {
                    foo: 'bar'
                },
                getOauthErrorMessageParameterMissing(parameter)
            ]
        ];
        test_cases.forEach((v) => {
            expect(testedFunction(new URLSearchParams(v[0])))
                .toStrictEqual(v[1]);
        });
    });

    it(`should reject when parameter '${parameter}' is empty`, () => {
        const test_cases = [
            [
                {
                    code: '',
                },
                {
                    error: 'invalid_request',
                    error_description: `Parameter '${parameter}' must not be empty`,
                }
            ]
        ];
        test_cases.forEach((v) => {
            expect(testedFunction(new URLSearchParams(v[0])))
                .toStrictEqual(v[1]);
        });
    });

    it(`should pass when parameter '${parameter}' is not empty`, () => {
        const test_cases = [
            [
                {
                    code: 'foo',
                },
                null
            ]
        ];
        test_cases.forEach((v) => {
            expect(testedFunction(new URLSearchParams(v[0])))
                .toStrictEqual(v[1]);
        });
    });

});
