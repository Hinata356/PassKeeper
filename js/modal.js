// =======================
// Element References
// =======================
const modal = document.getElementById("passwordModal");
const createBtn = document.getElementById("create-pass-btn");
const cancelBtn = document.getElementById("cancelModal");

const manualRadio = document.querySelector('input[name="pwSelect"][value="manual"]');
const autoRadio = document.querySelector('input[name="pwSelect"][value="auto"]');
const pwSelectRadios = document.getElementsByName("pwSelect");

const pwName = document.getElementById("pwName");
const pwDisplay = document.getElementById("pwDisplay");
const pwLength = document.getElementById("pwLength");

const autoLength = document.getElementById("autoLength");
const autoOptions = document.getElementById("autoOptions");

const charTypeRadios = document.querySelectorAll('input[name="charType"]');
const charTypeOptions = document.querySelectorAll("input[name='charType']");
const lowerCase = document.getElementById("lowerCase");
const upperCase = document.getElementById("upperCase");
const includeSymbols = document.getElementById("includeSymbols");

const reloadBtn = document.getElementById("reloadBtn");
const copyBtn = document.getElementById("copyBtn");
const checkIcon = document.getElementById("checkIcon");

const emrgencyNum = document.getElementById("emergencyNum");

const numbers = "0123456789";
const lowerLetters = "abcdefghijklmnopqrstuvwxyz";
const upperLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const symbols = "!@#$%^&*()_+-={}[];:,./<>?";


// =======================
// Reset Modal State
// =======================
function resetPasswordModal() {
    document.querySelector("input[name='pwSelect'][value='auto']").checked = true;
    pwLength.value = 4;
    emrgencyNum.value = 1;
    document.querySelector("input[name='charType'][value='num']").checked = true;

    lowerCase.checked = false;
    upperCase.checked = false;
    includeSymbols.checked = false;

    pwName.value = "";
    pwDisplay.value = "";
    pwDisplay.style.height = "";
    pwDisplay.placeholder = "生成/手動入力";

    toggleOptions();
    updateReloadButtonState();

    if (typeof window.resetDateTimePicker === "function") {
        window.resetDateTimePicker();
    }
}


// =======================
// Modal Open / Close
// =======================
function closeModal() {
    resetPasswordModal();
    modal.classList.add("hidden");
}

createBtn.addEventListener("click", () => {
    resetPasswordModal();
    modal.classList.remove("hidden");
});

cancelBtn.addEventListener("click", closeModal);

modal.addEventListener("click", (event) => {
    if (event.target === modal) {
        closeModal();
    }
});

// =======================
// Toggle auto options
// =======================
function toggleOptions() {
    const enable = autoRadio.checked;

    autoOptions.classList.toggle("hidden", !enable);
    autoLength.classList.toggle("hidden", !enable);

    [autoOptions, autoLength].forEach(section => {
        section.querySelectorAll("input").forEach(input => {
            input.disabled = !enable;
        });
    });
}

manualRadio.addEventListener("change", toggleOptions);
autoRadio.addEventListener("change", toggleOptions);
toggleOptions(); // initial setup


// =======================
// Character Type & Checkbox exclusive behavior
// =======================
function updateCaseOptionRestrictions() {
    const selected = document.querySelector('input[name="charType"]:checked').value;

    if (selected === "num") {
        lowerCase.checked = false;
        upperCase.checked = false;
        lowerCase.disabled = true;
        upperCase.disabled = true;

        lowerCase.parentElement.classList.add("disabled-option");
        upperCase.parentElement.classList.add("disabled-option");

    } else {
        lowerCase.disabled = false;
        upperCase.disabled = false;

        lowerCase.parentElement.classList.remove("disabled-option");
        upperCase.parentElement.classList.remove("disabled-option");
    }
}

charTypeRadios.forEach(radio => {
    radio.addEventListener("change", updateCaseOptionRestrictions);
});

lowerCase.addEventListener("change", () => { if (lowerCase.checked) upperCase.checked = false; });
upperCase.addEventListener("change", () => { if (upperCase.checked) lowerCase.checked = false; });

updateCaseOptionRestrictions(); // initial setup


// =======================
// Generate Password
// =======================
function generatePassword() {
    const length = parseInt(pwLength.value);
    const selectedCharType = document.querySelector("input[name='charType']:checked").value;

    let charPool = "";

    if (selectedCharType === "num") charPool = numbers;
    else if (selectedCharType === "al") charPool = lowerLetters + upperLetters;
    else if (selectedCharType === "alnum") charPool = numbers + lowerLetters + upperLetters;

    if (lowerCase.checked && !upperCase.checked) charPool = lowerLetters;
    if (upperCase.checked && !lowerCase.checked) charPool = upperLetters;

    if (includeSymbols.checked) charPool += symbols;

    if (charPool.length === 0) charPool = numbers;

    let password = "";
    for (let i = 0; i < length; i++) {
        password += charPool[Math.floor(Math.random() * charPool.length)];
    }

    pwDisplay.value = password;
}


// Auto/manual selection triggers password generation or clearing
pwSelectRadios.forEach(radio => {
    radio.addEventListener("change", () => {
        if (radio.value === "auto") {
            generatePassword();
            pwDisplay.placeholder = "生成/手動入力";
        } else {
            pwDisplay.value = "";
            pwDisplay.placeholder = "手動入力";
        }
        updateReloadButtonState();
    });
});


// Password regeneration triggers
pwLength.addEventListener("input", generatePassword);
includeSymbols.addEventListener("change", generatePassword);
lowerCase.addEventListener("change", generatePassword);
upperCase.addEventListener("change", generatePassword);
charTypeOptions.forEach(option => option.addEventListener("change", generatePassword));
reloadBtn.addEventListener("click", generatePassword);


// =======================
// Password Input Interaction
// =======================
pwDisplay.addEventListener("focus", () => {
    pwDisplay.placeholder = "";
});


// =======================
// Placeholder restore on blur
// =======================
pwDisplay.addEventListener("blur", () => {
    if (pwDisplay.value.trim() === "") {
        if (manualRadio.checked) {
            pwDisplay.placeholder = "手動入力";
        } else {
            pwDisplay.placeholder = "生成/手動入力";
        }
    }
});


// =======================
// Reload Button Enable/Disable
// =======================
function updateReloadButtonState() {
    const mode = document.querySelector('input[name="pwSelect"]:checked').value;
    const disabled = (mode === "manual");

    reloadBtn.classList.toggle("disabled-option", disabled);
    reloadBtn.style.pointerEvents = disabled ? "none" : "auto";
}

window.addEventListener("load", updateReloadButtonState);


// =======================
// Copy to Clipboard + Icon Swap
// =======================
copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(pwDisplay.value)
        .then(() => {
            copyBtn.addEventListener("transitionend", function handler() {
                copyBtn.style.display = "none";
                checkIcon.style.display = "inline-block";

                copyBtn.removeEventListener("transitionend", handler);

                setTimeout(() => {
                    checkIcon.style.display = "none";
                    copyBtn.style.display = "inline-block";
                }, 3000);
            }, { once: true });
        })
        .catch(err => console.error("Clipboard write failed:", err));
});


// =======================
// Custom Date & Time Picker Logic
// =======================
document.addEventListener('DOMContentLoaded', () => {
    setupDateTimeControl();
});

function setupDateTimeControl() {
    // =======================
    // 1. Element References
    // =======================
    const dateContainer = document.getElementById('customDateContainer');
    const timeContainer = document.getElementById('customTimeContainer');
    
    if (!dateContainer || !timeContainer) return;

    // =======================
    // 2. State Management
    // =======================
    
    // Manage current date and time
    let currentDate = new Date();
    currentDate.setSeconds(0);
    currentDate.setMilliseconds(0);

    // Configuration of interactive segments (Order: Left to Right)
    const segmentConfig = [
        { type: 'year',   elem: dateContainer.querySelector('[data-type="year"]'),   parent: dateContainer },
        { type: 'month',  elem: dateContainer.querySelector('[data-type="month"]'),  parent: dateContainer },
        { type: 'day',    elem: dateContainer.querySelector('[data-type="day"]'),    parent: dateContainer },
        { type: 'hour',   elem: timeContainer.querySelector('[data-type="hour"]'),   parent: timeContainer },
        { type: 'minute', elem: timeContainer.querySelector('[data-type="minute"]'), parent: timeContainer }
    ];

    // Current active index. -1 means no selection (initial state).
    let activeIndex = -1; 

    // =======================
    // 3. Core Functions
    // =======================

    // Update the text display based on currentDate
    function updateDisplay() {
        const y = currentDate.getFullYear();
        const m = String(currentDate.getMonth() + 1).padStart(2, '0');
        const d = String(currentDate.getDate()).padStart(2, '0');
        const h = String(currentDate.getHours()).padStart(2, '0');
        const min = String(currentDate.getMinutes()).padStart(2, '0');

        segmentConfig[0].elem.textContent = y;
        segmentConfig[1].elem.textContent = m;
        segmentConfig[2].elem.textContent = d;
        segmentConfig[3].elem.textContent = h;
        segmentConfig[4].elem.textContent = min;
    }

    // Toggle highlight classes for the UI
    function highlightActive() {
        // Remove active class from all segments
        segmentConfig.forEach(seg => seg.elem.classList.remove('active'));
        
        // If no selection, stop here
        if (activeIndex === -1) return;

        // Add active class to the selected segment and focus parent
        const current = segmentConfig[activeIndex];
        current.elem.classList.add('active');
        current.parent.focus(); 
    }

    // Reset logic (called externally or on init)
    function resetSelection() {
        activeIndex = -1;
        highlightActive();
        
        // Reset date to 'now'
        currentDate = new Date();
        currentDate.setSeconds(0);
        currentDate.setMilliseconds(0);
        updateDisplay();
    }

    // Logic to increment/decrement values
    // direction can be 1, -1, or larger integers for fast swipes
    function adjustValue(direction) {
        // Auto-select "Day" (index 2) if user interacts without selection
        if (activeIndex === -1) {
            activeIndex = 2; 
            highlightActive();
        }

        const testDate = new Date(currentDate);
        const type = segmentConfig[activeIndex].type;

        switch (type) {
            case 'year':
                testDate.setFullYear(testDate.getFullYear() + direction);
                break;
            case 'month':
                testDate.setMonth(testDate.getMonth() + direction);
                break;
            case 'day':
                testDate.setDate(testDate.getDate() + direction);
                break;
            case 'hour':
                testDate.setHours(testDate.getHours() + direction);
                break;
            case 'minute':
                testDate.setMinutes(testDate.getMinutes() + direction);
                break;
        }

        const now = new Date();
        const maxDate = new Date();
        maxDate.setFullYear(now.getFullYear() + 5);

        if (testDate > maxDate) {
            return;
        }

        if (testDate < now) return;
        currentDate = testDate;
        updateDisplay();
    }

    // =======================
    // 4. Initialization
    // =======================
    
    updateDisplay();
    highlightActive();
    window.resetDateTimePicker = resetSelection;

    // =======================
    // 5. Event Listeners (Interaction)
    // =======================

    // --- Pointerdown to Select (Instant reaction) ---
    segmentConfig.forEach((seg, index) => {
        seg.elem.addEventListener('pointerdown', (e) => {
            // Prevent changing selection if clicking the already active one
            if (activeIndex === index) return;
            activeIndex = index;
            highlightActive();
        });
    });

    // --- Pointerdown Outside to Clear Selection ---
    document.addEventListener('pointerdown', (e) => {
        const isInsideDate = dateContainer.contains(e.target);
        const isInsideTime = timeContainer.contains(e.target);

        // If clicking inside, do nothing (let segment handler work)
        if (isInsideDate || isInsideTime) return;
        
        // If clicking outside, clear selection
        if (activeIndex !== -1) {
            activeIndex = -1;
            highlightActive();
        }
    });

    // --- Keyboard Navigation ---
    const handleKeydown = (e) => {
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) return;
        if (e.key === 'Tab') {
            const isShift = e.shiftKey;

            const nextIndex = isShift ? activeIndex - 1 : activeIndex + 1;

            if (nextIndex < 0 || nextIndex >= segmentConfig.length) {
                activeIndex = -1;
                highlightActive();
                return;
            }

        e.preventDefault();
        activeIndex = nextIndex;
            highlightActive();
            return;
    }

        // Handle first interaction
        if (activeIndex === -1) {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                activeIndex = 2; // Default to Day
            } else {
                activeIndex = 2;
                if (e.key === 'ArrowUp') adjustValue(1);
                if (e.key === 'ArrowDown') adjustValue(-1);
            }
            highlightActive();
            return;
        }

        // Navigation
        if (e.key === 'ArrowUp') adjustValue(1);
        else if (e.key === 'ArrowDown') adjustValue(-1);
        else if (e.key === 'ArrowLeft') {
            activeIndex = Math.max(0, activeIndex - 1);
            highlightActive();
        } else if (e.key === 'ArrowRight') {
            activeIndex = Math.min(segmentConfig.length - 1, activeIndex + 1);
            highlightActive();
        }
    };

    dateContainer.addEventListener('keydown', handleKeydown);
    timeContainer.addEventListener('keydown', handleKeydown);


// ==========================================
    // 6. Swipe & Wheel Logic (Heavy Dial / No Inertia)
    // ==========================================
    const attachSwipe = (container) => {

        // --- Configuration ---

        // DISTANCE SENSITIVITY:
        // How many pixels you must drag to change the value by 1.
        // 50-60 is a good balance.
        const PIXELS_PER_STEP = 420;

        // SPEED LIMIT (Cool-down):
        // Minimum milliseconds between updates.
        // Even if you swipe extremely fast, the value won't change faster than this interval.
        // 60ms = approx 15 ticks per second max. This kills the "web scroll momentum" feel.
        const MIN_INTERVAL_MS = 100;

        // --- Touch Variables ---
        let touchStartY = 0;
        let lastChangeTime = 0;

        // --- Touch Start ---
        container.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
            // Reset timing to ensure immediate reaction on first move
            lastChangeTime = 0; 
        }, { passive: false });

        // --- Touch Move (Strict 1-Step Logic) ---
        container.addEventListener('touchmove', (e) => {
            e.preventDefault();

            const now = Date.now();

            // 1. SPEED LIMIT CHECK
            // If the last change happened too recently, ignore this movement completely.
            // This acts like a physical brake on fast swipes.
            if (now - lastChangeTime < MIN_INTERVAL_MS) {
                return;
            }

            const currentY = e.touches[0].clientY;

            // 2. Calculate Distance from the last "Anchor" point
            const diff = touchStartY - currentY;

            // 3. Step Check
            // We only care if the distance exceeded the threshold.
            if (Math.abs(diff) > PIXELS_PER_STEP) {

                // Determine direction (1 or -1)
                // diff > 0 means swiping UP (finger moves up), so value increments
                const dir = diff > 0 ? 1 : -1;

                // 4. Update Value (ONLY 1 step at a time)
                // We do NOT calculate "how many steps". We force it to be just 1.
                // This prevents "jumping" multiple numbers on a fast flick.
                adjustValue(dir);

                // 5. Reset Anchor & Time
                // Reset the start position to the current finger position.
                // The user must move another 55px from *here* to trigger the next step.
                touchStartY = currentY;
                lastChangeTime = now;
            }
        }, { passive: false });


        // --- Wheel / Trackpad (No Inertia) ---
        let wheelAccumulator = 0;
        let wheelResetTimer = null;
        const WHEEL_DEADZONE = 5;

        container.addEventListener('wheel', (e) => {
            e.preventDefault();

            const now = Date.now();

            // Speed limit for wheel as well
            if (now - lastChangeTime < MIN_INTERVAL_MS) {
                wheelAccumulator = 0; // Kill momentum input during cooldown
                return;
            }

            if (Math.abs(e.deltaY) < WHEEL_DEADZONE) return;

            wheelAccumulator += e.deltaY;

            if (Math.abs(wheelAccumulator) > PIXELS_PER_STEP) {
                const dir = wheelAccumulator > 0 ? 1 : -1;
                adjustValue(dir);

                wheelAccumulator = 0;
                lastChangeTime = now;
            }

            if (wheelResetTimer) clearTimeout(wheelResetTimer);
            wheelResetTimer = setTimeout(() => {
                wheelAccumulator = 0;
            }, 100);

        }, { passive: false });
    };

    attachSwipe(dateContainer);
    attachSwipe(timeContainer);

    // ==========================================
    // 7. Preset Buttons Logic
    // ==========================================
    const presetBtns = document.querySelectorAll('.limit-preset-btn-plus, .limit-preset-btn-minus');

    presetBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default button behavior

            // Retrieve data attributes
            const addVal = btn.getAttribute('data-add');
            const typeVal = btn.getAttribute('data-type');

            let tempDate = new Date(currentDate);

            if (addVal) {
                tempDate.setMinutes(tempDate.getMinutes() + parseInt(addVal));
            } else if (typeVal) {
                if (typeVal === 'today') {
                    const now = new Date();
                    now.setDate(now.getDate() + 1);
                    now.setHours(0, 0, 0, 0);
                    tempDate = now;
                } else if (typeVal === 'plus-day') {
                    tempDate.setDate(tempDate.getDate() + 1);
                }
            }

            const now = new Date();
            const maxDate = new Date();
            maxDate.setFullYear(now.getFullYear() + 5);

            if (tempDate <= maxDate) {
                currentDate = tempDate;
                updateDisplay();
            }
        });
    });
    // ==========================================
    // 8. Icon Click Logic (Calendar & Clock)
    // ==========================================
    const calendarIcon = dateContainer.querySelector('.calendar');
    const clockIcon = timeContainer.querySelector('.clock') || document.querySelector('.clock');

    if (calendarIcon) {
        calendarIcon.style.cursor = 'pointer';

        calendarIcon.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const now = new Date();
            currentDate.setFullYear(now.getFullYear());
            currentDate.setMonth(now.getMonth());
            currentDate.setDate(now.getDate());
            updateDisplay();
        });
    }

    if (clockIcon) {
        clockIcon.style.cursor = 'pointer';
        clockIcon.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const now = new Date();
            currentDate.setHours(now.getHours());
            currentDate.setMinutes(now.getMinutes());
            updateDisplay();
        });
    }
}
