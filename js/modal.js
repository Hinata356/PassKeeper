// ==========================================
// 1. Element References & Constants
// ==========================================

// Modal Controls
const modal = document.getElementById("passwordModal");
const createBtn = document.getElementById("create-pass-btn");
const cancelBtn = document.getElementById("cancelModal");

// Password Form Elements
const pwName = document.getElementById("pwName");
const pwDisplay = document.getElementById("pwDisplay");
const pwLength = document.getElementById("pwLength");
const emrgencyNum = document.getElementById("emergencyNum"); // Note: ID preserved as is

// Option Controls
const manualRadio = document.querySelector('input[name="pwSelect"][value="manual"]');
const autoRadio = document.querySelector('input[name="pwSelect"][value="auto"]');
const pwSelectRadios = document.getElementsByName("pwSelect");
const autoLength = document.getElementById("autoLength");
const autoOptions = document.getElementById("autoOptions");

// Character Types & Checkboxes
const charTypeRadios = document.querySelectorAll('input[name="charType"]');
const charTypeOptions = document.querySelectorAll("input[name='charType']");
const lowerCase = document.getElementById("lowerCase");
const upperCase = document.getElementById("upperCase");
const includeSymbols = document.getElementById("includeSymbols");

// Action Buttons & Icons
const reloadBtn = document.getElementById("reloadBtn");
const copyBtn = document.getElementById("copyBtn");
const checkIcon = document.getElementById("checkIcon");

// Character Pools
const numbers = "0123456789";
const lowerLetters = "abcdefghijklmnopqrstuvwxyz";
const upperLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const symbols = "!@#$%^&*()_+-={}[];:,./<>?";


// ==========================================
// 2. State Management & UI Utilities
// ==========================================

/**
 * Resets the modal to its default state.
 */
function resetPasswordModal() {
    // Reset inputs
    document.querySelector("input[name='pwSelect'][value='auto']").checked = true;
    pwLength.value = 4;
    emrgencyNum.value = 1;
    document.querySelector("input[name='charType'][value='num']").checked = true;

    // Reset checkboxes
    lowerCase.checked = false;
    upperCase.checked = false;
    includeSymbols.checked = false;

    // Reset display area
    pwName.value = "";
    pwDisplay.value = "";
    pwDisplay.style.height = "";
    pwDisplay.placeholder = "生成/手動入力";

    // Update UI states
    toggleOptions();
    updateReloadButtonState();

    // Reset DatePicker if initialized
    if (typeof window.resetDateTimePicker === "function") {
        window.resetDateTimePicker();
    }
}

/**
 * Toggles visibility and state of auto-generation options.
 */
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

/**
 * Enforces mutually exclusive logic between character types.
 */
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

/**
 * Updates the state of the reload button based on the mode.
 */
function updateReloadButtonState() {
    const mode = document.querySelector('input[name="pwSelect"]:checked').value;
    const disabled = (mode === "manual");

    reloadBtn.classList.toggle("disabled-option", disabled);
    reloadBtn.style.pointerEvents = disabled ? "none" : "auto";
}


// ==========================================
// 3. Modal Event Listeners
// ==========================================

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


// ==========================================
// 4. Password Generation Logic
// ==========================================

function generatePassword() {
    const length = parseInt(pwLength.value);
    const selectedCharType = document.querySelector("input[name='charType']:checked").value;

    let charPool = "";

    // Build pool based on radio selection
    if (selectedCharType === "num") charPool = numbers;
    else if (selectedCharType === "al") charPool = lowerLetters + upperLetters;
    else if (selectedCharType === "alnum") charPool = numbers + lowerLetters + upperLetters;

    // Apply strict filters
    if (lowerCase.checked && !upperCase.checked) charPool = lowerLetters;
    if (upperCase.checked && !lowerCase.checked) charPool = upperLetters;
    if (includeSymbols.checked) charPool += symbols;

    // Fallback
    if (charPool.length === 0) charPool = numbers;

    // Generate
    let password = "";
    for (let i = 0; i < length; i++) {
        password += charPool[Math.floor(Math.random() * charPool.length)];
    }

    pwDisplay.value = password;
}

// Event Listeners for Generation
pwLength.addEventListener("input", generatePassword);
includeSymbols.addEventListener("change", generatePassword);
lowerCase.addEventListener("change", generatePassword);
upperCase.addEventListener("change", generatePassword);
reloadBtn.addEventListener("click", generatePassword);

charTypeOptions.forEach(option => {
    option.addEventListener("change", generatePassword);
});

charTypeRadios.forEach(radio => {
    radio.addEventListener("change", updateCaseOptionRestrictions);
});

// Case exclusivity listeners
lowerCase.addEventListener("change", () => { if (lowerCase.checked) upperCase.checked = false; });
upperCase.addEventListener("change", () => { if (upperCase.checked) lowerCase.checked = false; });

// Mode switching listeners
manualRadio.addEventListener("change", toggleOptions);
autoRadio.addEventListener("change", toggleOptions);

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


// ==========================================
// 5. Input & Interaction Logic
// ==========================================

// Placeholder Handling
pwDisplay.addEventListener("focus", () => {
    pwDisplay.placeholder = "";
});

pwDisplay.addEventListener("blur", () => {
    if (pwDisplay.value.trim() === "") {
        pwDisplay.placeholder = manualRadio.checked ? "手動入力" : "生成/手動入力";
    }
});

// Copy to Clipboard Interaction
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

// Initial Setup Calls
window.addEventListener("load", updateReloadButtonState);
updateCaseOptionRestrictions();
toggleOptions();


// ==========================================
// 6. Custom Date & Time Picker Logic
// ==========================================

document.addEventListener('DOMContentLoaded', setupDateTimeControl);

function setupDateTimeControl() {
    const dateContainer = document.getElementById('customDateContainer');
    const timeContainer = document.getElementById('customTimeContainer');

    if (!dateContainer || !timeContainer) return;

    // --- State ---
    let currentDate = new Date();
    currentDate.setSeconds(0);
    currentDate.setMilliseconds(0);
    let activeIndex = -1; 

    // --- Configuration ---
    const segmentConfig = [
        { type: 'year',   elem: dateContainer.querySelector('[data-type="year"]'),   parent: dateContainer },
        { type: 'month',  elem: dateContainer.querySelector('[data-type="month"]'),  parent: dateContainer },
        { type: 'day',    elem: dateContainer.querySelector('[data-type="day"]'),    parent: dateContainer },
        { type: 'hour',   elem: timeContainer.querySelector('[data-type="hour"]'),   parent: timeContainer },
        { type: 'minute', elem: timeContainer.querySelector('[data-type="minute"]'), parent: timeContainer }
    ];

    // --- Core Functions ---
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

    function highlightActive() {
        segmentConfig.forEach(seg => seg.elem.classList.remove('active'));
        if (activeIndex === -1) return;
        const current = segmentConfig[activeIndex];
        current.elem.classList.add('active');
        current.parent.focus(); 
    }

    function resetSelection() {
        activeIndex = -1;
        highlightActive();
        currentDate = new Date();
        currentDate.setSeconds(0);
        currentDate.setMilliseconds(0);
        updateDisplay();
    }

    function adjustValue(direction) {
        if (activeIndex === -1) {
            activeIndex = 2; // Auto-select Day
            highlightActive();
        }

        const testDate = new Date(currentDate);
        const type = segmentConfig[activeIndex].type;

        switch (type) {
            case 'year':   testDate.setFullYear(testDate.getFullYear() + direction); break;
            case 'month':  testDate.setMonth(testDate.getMonth() + direction); break;
            case 'day':    testDate.setDate(testDate.getDate() + direction); break;
            case 'hour':   testDate.setHours(testDate.getHours() + direction); break;
            case 'minute': testDate.setMinutes(testDate.getMinutes() + direction); break;
        }

        const now = new Date();
        const maxDate = new Date();
        maxDate.setFullYear(now.getFullYear() + 5);

        if (testDate > maxDate) return;
        if (testDate < now) return;

        currentDate = testDate;
        updateDisplay();
    }

    // --- Swipe & Wheel Logic ---
    const attachSwipe = (container) => {
        const PIXELS_PER_STEP = 420;
        const MIN_INTERVAL_MS = 100;
        let touchStartY = 0;
        let lastChangeTime = 0;
        let wheelAccumulator = 0;
        let wheelResetTimer = null;

        // Touch
        container.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
            lastChangeTime = 0; 
        }, { passive: false });

        container.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const now = Date.now();
            if (now - lastChangeTime < MIN_INTERVAL_MS) return;

            const currentY = e.touches[0].clientY;
            const diff = touchStartY - currentY;

            if (Math.abs(diff) > PIXELS_PER_STEP) {
                adjustValue(diff > 0 ? 1 : -1);
                touchStartY = currentY;
                lastChangeTime = now;
            }
        }, { passive: false });

        // Wheel
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const now = Date.now();
            if (now - lastChangeTime < MIN_INTERVAL_MS) {
                wheelAccumulator = 0;
                return;
            }

            if (Math.abs(e.deltaY) < 5) return;
            wheelAccumulator += e.deltaY;

            if (Math.abs(wheelAccumulator) > PIXELS_PER_STEP) {
                adjustValue(wheelAccumulator > 0 ? 1 : -1);
                wheelAccumulator = 0;
                lastChangeTime = now;
            }

            if (wheelResetTimer) clearTimeout(wheelResetTimer);
            wheelResetTimer = setTimeout(() => { wheelAccumulator = 0; }, 100);
        }, { passive: false });
    };

    // --- Interaction Listeners ---

    // 1. Pointer Down (Select Segment)
    segmentConfig.forEach((seg, index) => {
        seg.elem.addEventListener('pointerdown', () => {
            if (activeIndex === index) return;
            activeIndex = index;
            highlightActive();
        });
    });

    // 2. Clear Selection on Outside Click
    document.addEventListener('pointerdown', (e) => {
        const isInside = dateContainer.contains(e.target) || timeContainer.contains(e.target);
        if (!isInside && activeIndex !== -1) {
            activeIndex = -1;
            highlightActive();
        }
    });

    // 3. Keyboard Navigation
    const handleKeydown = (e) => {
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) return;

        if (e.key === 'Tab') {
            e.preventDefault();
            const nextIndex = e.shiftKey ? activeIndex - 1 : activeIndex + 1;
            activeIndex = (nextIndex < 0 || nextIndex >= segmentConfig.length) ? -1 : nextIndex;
            highlightActive();
            return;
        }

        if (activeIndex === -1) {
            activeIndex = 2; // Default to Day
            if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
                adjustValue(e.key === 'ArrowUp' ? 1 : -1);
            }
            highlightActive();
            return;
        }

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

    // 4. Preset Buttons (+/-)
    document.querySelectorAll('.limit-preset-btn-plus, .limit-preset-btn-minus').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
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

    // 5. Icons (Reset to current Date/Time)
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

    // --- Init ---
    attachSwipe(dateContainer);
    attachSwipe(timeContainer);
    updateDisplay();
    highlightActive();

    // Export reset function to global scope for modal reset
    window.resetDateTimePicker = resetSelection;
}