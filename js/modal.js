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

    toggleOptions();
    updateReloadButtonState();
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
        radio.value === "auto" ? generatePassword() : pwDisplay.value = "";
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