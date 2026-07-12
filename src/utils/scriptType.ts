import browser from "webextension-polyfill";

const getScriptType = () => {
    // eslint-disable-next-line no-restricted-globals
    if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.getURL('static/js/background.js') === location.href) {
        return 'BACKGROUND';
    // eslint-disable-next-line no-restricted-globals
    } else if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.getURL('index.html') === location.href) {
        return 'POPUP';
    // eslint-disable-next-line no-restricted-globals
    } else if (typeof browser !== 'undefined' && browser.runtime) {
        return 'CONTENT';
    } else {
        return 'WEB';
    }
}

export { getScriptType };