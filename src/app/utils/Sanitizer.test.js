import Sanitizer from './Sanitizer';

describe('Sanitizer', () => {
    it('sanitizeTextOnly should return text only', () => {
        const testText = "<a>test anchor</a>\n<script>let a = 'test variable';</script>\n## test MD\ntest text";
        expect(Sanitizer.getTextOnly(testText)).toEqual('test anchor\nlet a  test variable\ntest MD\ntest text');
    });
});
