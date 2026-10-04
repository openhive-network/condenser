import counterpart from 'counterpart';

describe('nodeCompat', () => {
    it('lets counterpart.localize() format dates', () => {
        expect(counterpart.localize(new Date(2020, 0, 2), { type: 'date', format: 'long', locale: 'en' })).toBe(
            'Thursday, January 2nd, 2020'
        );
    });
});
