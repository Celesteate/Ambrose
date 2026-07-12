import browser from "webextension-polyfill";
const quizData = require('../data/answers.json');

let defaultQuizState: { [key: string]: { [key: string]: number | null } } = {};
for (let quizName of Object.keys(quizData)) {
    defaultQuizState[quizName] = { lastAttempted: null };
}

const populateQuizStorage = async () => {
    const result = await browser.storage.sync.get(['quizzes']);
    let quizzes: any = result.quizzes;
    let toStore;
    if (!quizzes) {
        toStore = defaultQuizState;
    } else {
        for (let quizName of Object.keys(defaultQuizState)) {
            if (!quizzes[quizName])
                quizzes[quizName] = defaultQuizState[quizName];
        }
        toStore = quizzes;
    }
    return await browser.storage.sync.set({ quizzes: toStore });
}

const setQuizLastAttempted = async (quizName: string, lastAttempted: number) => {
    const result = await browser.storage.sync.get(['quizzes']);
    let quizzes: any = result.quizzes;
    quizzes[quizName].lastAttempted = lastAttempted;
    return await browser.storage.sync.set({ quizzes: quizzes });
}

const getQuizLastAttempted = async (quizName: string) => {
    const result = await browser.storage.sync.get(['quizzes']);
    let quizzes: any = result.quizzes;
    return quizzes[quizName].lastAttempted;
}

const getAllQuizLastAttempted = async (): Promise<any> => {
    const result = await browser.storage.sync.get(['quizzes']);
    return result.quizzes;
}

export { populateQuizStorage, setQuizLastAttempted, getQuizLastAttempted, getAllQuizLastAttempted };