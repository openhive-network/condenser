module.exports = {
    moduleFileExtensions: [
        'js',
        'jsx',
    ],
    testEnvironment: 'jsdom',
    transform: {
        '^.+\\.(js|jsx)?$': 'babel-jest',
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/src/test/unit/fileTransformer.js',
    },
    rootDir: '../../../',
    testMatch: [
        '**/!(*.integration).(test|spec).(js|jsx)',
    ],
    coveragePathIgnorePatterns: [
        '/node_modules/',
        'setupTests.js',
    ],
    setupFilesAfterEnv: [
        './src/test/unit/setupTests.js',
    ],
    coverageReporters: [
        'json',
        'lcov',
        'text',
        'text-summary',
    ],
    moduleNameMapper: {
        '\\.svg': '<rootDir>/__mocks__/svgrMock.js',
        '^app/(.*)$': '<rootDir>/src/app/$1',
        '^assets/(.*)$': '<rootDir>/src/app/assets/$1',
        '^shared/(.*)$': '<rootDir>/src/shared/$1',
    },
    reporters: [
        "default",
        [
            "jest-junit",
            {
                suiteName: "condenser",
                outputDirectory: "./jest",
                outputName: "junit.xml",
                classNameTemplate: "{classname} -- {title}",
                titleTemplate: "{classname} -- {title}"
            }
        ]
    ]
};
