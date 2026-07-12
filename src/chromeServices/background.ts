import browser from "webextension-polyfill";
import { getScriptType } from "../utils/scriptType";
import { populateQuizStorage, getQuizLastAttempted, setQuizLastAttempted } from "../utils/storage";

(() => {

    // Run as background script only
    if (getScriptType() !== 'BACKGROUND')
        return;

    populateQuizStorage();

    browser.runtime.onMessage.addListener((request: any, sender, sendResponse) => {
        if (request.message === 'quiz-completed') {
            console.log(`Quiz completed: ${request.quiz}`);
            setQuizLastAttempted(request.quiz, Date.now());
            sendResponse({ message: 'success' });
        }
        return true;
    })

})();