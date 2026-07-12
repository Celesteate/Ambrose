// Easing function for realistic movement (easeInOutQuad)
const easeInOutQuad = (t: number) => {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
};

// Generates a random number between min and max
const randomRange = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
};

export class CursorManager {
    private cursorElement: HTMLElement;
    private currentX: number = window.innerWidth / 2;
    private currentY: number = window.innerHeight / 2;
    private jiggleInterval: any = null;

    constructor() {
        this.cursorElement = document.createElement('div');
        this.cursorElement.style.position = 'fixed';
        this.cursorElement.style.top = '0';
        this.cursorElement.style.left = '0';
        this.cursorElement.style.width = '20px';
        this.cursorElement.style.height = '20px';
        this.cursorElement.style.zIndex = '999999';
        this.cursorElement.style.pointerEvents = 'none'; // Don't block real clicks
        this.cursorElement.style.transform = `translate(${this.currentX}px, ${this.currentY}px)`;
        
        // Basic SVG mouse pointer
        this.cursorElement.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.5 3.21V20.8C5.5 21.45 6.27 21.8 6.76 21.36L11.44 17.15C11.63 16.98 11.88 16.89 12.14 16.89H19C19.55 16.89 20 16.44 20 15.89V14.18C20 13.9 19.89 13.63 19.69 13.43L6.91 2.53C6.44 2.13 5.5 2.47 5.5 3.21Z" fill="black"/>
                <path d="M5.5 3.21V20.8C5.5 21.45 6.27 21.8 6.76 21.36L11.44 17.15C11.63 16.98 11.88 16.89 12.14 16.89H19C19.55 16.89 20 16.44 20 15.89V14.18C20 13.9 19.89 13.63 19.69 13.43L6.91 2.53C6.44 2.13 5.5 2.47 5.5 3.21Z" stroke="white" stroke-width="1.5"/>
            </svg>
        `;
        
        document.body.appendChild(this.cursorElement);
    }

    private updateCursorPos(x: number, y: number) {
        this.currentX = x;
        this.currentY = y;
        this.cursorElement.style.transform = `translate(${x}px, ${y}px)`;
        
        // Dispatch mousemove event
        const targetElement = document.elementFromPoint(x, y);
        if (targetElement) {
            const event = new MouseEvent('mousemove', {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: x,
                clientY: y
            });
            targetElement.dispatchEvent(event);
        }
    }

    public async startJiggling() {
        this.stopJiggling();
        
        const doJiggle = async () => {
            const targetX = this.currentX + randomRange(-10, 10);
            const targetY = this.currentY + randomRange(-10, 10);
            await this.moveTo(targetX, targetY, randomRange(80, 200));
        };

        // Do one immediately, then periodically
        await doJiggle();
        this.jiggleInterval = setInterval(doJiggle, randomRange(300, 800));
    }

    public stopJiggling() {
        if (this.jiggleInterval) {
            clearInterval(this.jiggleInterval);
            this.jiggleInterval = null;
        }
    }

    // Moves in a straight line with slight perpendicular noise on each step.
    // Optionally overshoots the target and corrects back.
    public async moveTo(targetX: number, targetY: number, duration: number = randomRange(250, 500)): Promise<void> {
        this.stopJiggling();
        
        const startX = this.currentX;
        const startY = this.currentY;

        // Randomly decide to overshoot (~30% chance), but not during jiggle moves (short duration)
        const shouldOvershoot = duration > 200 && Math.random() < 0.3;
        const overshootFactor = shouldOvershoot ? randomRange(1.05, 1.15) : 1;

        // Direction vector
        const dx = targetX - startX;
        const dy = targetY - startY;

        // Perpendicular direction for slight drift noise
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const perpX = -dy / len;
        const perpY = dx / len;
        // Random max perpendicular displacement (slight wobble, scales with distance)
        const maxDrift = Math.min(len * 0.04, 6);

        const doMove = (fromX: number, fromY: number, toX: number, toY: number, moveDuration: number): Promise<void> => {
            return new Promise(resolve => {
                let startTime: number | null = null;

                const step = (timestamp: number) => {
                    if (!startTime) startTime = timestamp;
                    let progress = (timestamp - startTime) / moveDuration;
                    if (progress > 1) progress = 1;

                    const easedProgress = easeInOutQuad(progress);

                    // Linear interpolation along the straight line
                    const baseX = fromX + (toX - fromX) * easedProgress;
                    const baseY = fromY + (toY - fromY) * easedProgress;

                    // Add a small perpendicular wobble that tapers off near the start and end
                    const wobbleAmount = Math.sin(easedProgress * Math.PI) * maxDrift * randomRange(0.5, 1.0);
                    const x = baseX + perpX * wobbleAmount;
                    const y = baseY + perpY * wobbleAmount;

                    this.updateCursorPos(x, y);

                    if (progress < 1) {
                        window.requestAnimationFrame(step);
                    } else {
                        this.updateCursorPos(toX, toY);
                        resolve();
                    }
                };

                window.requestAnimationFrame(step);
            });
        };

        if (shouldOvershoot) {
            const overshootX = startX + dx * overshootFactor;
            const overshootY = startY + dy * overshootFactor;
            // First leg: move to overshoot point (most of the duration)
            await doMove(startX, startY, overshootX, overshootY, duration * 0.7);
            // Second leg: correct back to target (short correction)
            await doMove(overshootX, overshootY, targetX, targetY, duration * 0.3);
        } else {
            await doMove(startX, startY, targetX, targetY, duration);
        }
    }

    public async moveToElementAndClick(element: HTMLElement): Promise<void> {
        this.stopJiggling();
        
        const rect = element.getBoundingClientRect();
        // Target a random spot inside the element
        const targetX = randomRange(rect.left + rect.width * 0.2, rect.right - rect.width * 0.2);
        const targetY = randomRange(rect.top + rect.height * 0.2, rect.bottom - rect.height * 0.2);

        await this.moveTo(targetX, targetY);
        
        // Wait a tiny bit before clicking
        await new Promise(r => setTimeout(r, randomRange(50, 150)));

        this.simulateClick(element, targetX, targetY);
    }

    private simulateClick(element: HTMLElement, x: number, y: number) {
        const mousedownEvent = new MouseEvent('mousedown', {
            view: window, bubbles: true, cancelable: true, clientX: x, clientY: y
        });
        element.dispatchEvent(mousedownEvent);

        const mouseupEvent = new MouseEvent('mouseup', {
            view: window, bubbles: true, cancelable: true, clientX: x, clientY: y
        });
        element.dispatchEvent(mouseupEvent);

        const clickEvent = new MouseEvent('click', {
            view: window, bubbles: true, cancelable: true, clientX: x, clientY: y
        });
        element.dispatchEvent(clickEvent);
    }
}
