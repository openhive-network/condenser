/**
 * Returns true if page is loaded in iframe, false otherwise.
 *
 * @export
 * @returns {boolean}
 */
export function inIframe() {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
}

export default inIframe;
