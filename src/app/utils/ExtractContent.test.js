import { extractBodySummary } from './ExtractContent';

describe('extractBodySummary', () => {
    it(
        'returns promptly for a body starting with many blank lines when stripping quotes',
        () => {
            const body = `${'\n'.repeat(200)}Hello world`;
            // A sync regex can't be pre-empted by the Jest timeout, so measure the elapsed time too.
            const start = Date.now();
            const summary = extractBodySummary(body, true);
            expect(Date.now() - start).toBeLessThan(1000);
            expect(summary).toBe('Hello world');
        },
        1000
    );

    it('strips a leading block quote and keeps the rest when stripQuotes is true', () => {
        expect(extractBodySummary('> quoted\n\nRest of body', true)).toBe('Rest of body');
    });

    it('keeps a leading block quote when stripQuotes is false', () => {
        // Rendering the blockquote leaves a run of whitespace whose width is not part of the contract.
        const summary = extractBodySummary('> quoted\n\nRest of body', false);
        expect(summary.replace(/\s+/g, ' ')).toBe('quoted Rest of body');
    });
});
