import browser from "webextension-polyfill";
import { getScriptType } from "../utils/scriptType";
import { addErrorElement, addSuccessElement } from "../utils/alerts";
import { solveQuiz, getConfidence, quizAnswers } from "../utils/quiz";
import { autoClickEnabled } from "../utils/autoClick";
import { CursorManager } from "../utils/CursorManager";

let cursorManager: CursorManager | null = null;

(() => {

    // Run as content script only
    console.log(getScriptType());
    if (getScriptType() !== 'CONTENT')
        return;

    let pollCount = 0;

    if (!window.location.href.includes('quiz/trivia/game')) {
        const supportedQuizzes = Object.keys(quizAnswers);
        
        const highlightSupportedQuizzes = () => {
            const elements = document.querySelectorAll('a, h2, h3, div, span, p, strong, b');
            elements.forEach((el) => {
                if (el.children.length === 0 && el.textContent) {
                    const text = el.textContent.trim().replace(' Trivia', '');
                    if (supportedQuizzes.includes(text) || supportedQuizzes.includes(text + ' Trivia')) {
                        const htmlEl = el as HTMLElement;
                        if (!htmlEl.dataset.ambroseHighlighted) {
                            htmlEl.dataset.ambroseHighlighted = 'true';
                            htmlEl.style.backgroundColor = '#bbf7d0'; // Tailwind green-200
                            htmlEl.style.color = '#166534'; // Tailwind green-800
                            htmlEl.style.padding = '0.125rem 0.25rem';
                            htmlEl.style.borderRadius = '0.25rem';
                            htmlEl.style.fontWeight = 'bold';
                        }
                    }
                }
            });
        };

        highlightSupportedQuizzes();
        setInterval(highlightSupportedQuizzes, 2000);
        return; 
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const nextQuestionButton = document.querySelector("#nextQuestion") as HTMLElement;
            if (nextQuestionButton && nextQuestionButton.style.visibility === 'visible') {
                nextQuestionButton.click();
            }
        }
    });

    const pollInterval = setInterval(() => {

        const quizCompletedElement: HTMLElement|null = document.querySelector('.rewardText');
        
        if (quizCompletedElement) {
            clearInterval(pollInterval);
            addSuccessElement('Quiz completed!');
            
            const quizNameRegex = new RegExp(/You completed ([\w\s]+) Trivia./);
            const quizNameMatch = quizNameRegex.exec(quizCompletedElement.innerText);
            const quizName = quizNameMatch ? quizNameMatch[1] : '';

            if (!quizName) {
                addErrorElement('Could not find quiz name.');
                return;
            } else {
                browser.runtime.sendMessage({ message: "quiz-completed", quiz: quizName}).then(() => {});
            }
            return;
        }
    
        const currQuizElement:HTMLElement|null = document.querySelector('h1');
        const quizQuestionElement: HTMLElement|null = document.querySelector(".quizQuestion");
        const quizOptionsElements:Array<HTMLElement> = Array.from(document.querySelectorAll(".answer"));
        const nextQuestionButton: HTMLElement|null = document.querySelector("#nextQuestion");
        
        if (currQuizElement && quizQuestionElement && nextQuestionButton && quizOptionsElements.length === 4) {
            clearInterval(pollInterval);

            // Remove the fading in animation
            for (let i = 0; i < quizOptionsElements.length; i++) {
                quizOptionsElements[i].style.visibility = 'visible';
                quizOptionsElements[i].classList.add('fadeIn');
            }
            nextQuestionButton.style.visibility = 'visible';
            nextQuestionButton.classList.add('fadeIn');

            doQuiz(currQuizElement, quizQuestionElement, quizOptionsElements);
            return;
        }

        pollCount++;
        console.log(`Polling for quiz elements... ${pollCount}`);
        
        if (pollCount >= 10) {
            clearInterval(pollInterval);
            addErrorElement('Uh oh! Could not find quiz elements.');
            return
        }
    }, 1000);

    const doQuiz = (currQuizElement:HTMLElement, quizQuestionElement:HTMLElement, quizOptionsElements:Array<HTMLElement>) => {

        const quizAnswer = solveQuiz(
            currQuizElement.innerText.replace('Trivia', '').trim(),
            quizQuestionElement.innerText.trim(),
            quizOptionsElements
        );
        
        if (!quizAnswer) {
            addErrorElement('Uh oh! This quiz might not be supported.');
            return;
        }

        const {answer, confidence} = quizAnswer;

        if (confidence > 50) {
            if (autoClickEnabled()) {
                if (!cursorManager) cursorManager = new CursorManager();
                
                // Start jiggling immediately while we wait the initial delay
                cursorManager.startJiggling();
                
                // Random delay between 500ms and 2000ms before moving to answer
                const initialDelay = Math.random() * (2000 - 500) + 500;
                
                setTimeout(async () => {
                    // Click the answer
                    const answerButton = answer.children[0]?.children[0] as HTMLElement;
                    if (answerButton) {
                        await cursorManager!.moveToElementAndClick(answerButton);
                        
                        // Immediately move to and click next question
                        const nextQuestionButton = document.getElementById("nextQuestion");
                        if (nextQuestionButton) {
                            await cursorManager!.moveToElementAndClick(nextQuestionButton);
                        }
                    }
                }, initialDelay);
            }

            answer.classList.add('font-bold', 'text-green-700');
            const confidenceSpan = document.createElement('span');
            confidenceSpan.innerText = `(${confidence.toFixed(2)})`;
            answer.appendChild(confidenceSpan);

            const correctIcon:HTMLImageElement = document.createElement('img');
            addSuccessElement('Correct answer found!');
            return;
        }

        addErrorElement('Uh oh! This quiz might not be supported.');
        return;
    };

})()