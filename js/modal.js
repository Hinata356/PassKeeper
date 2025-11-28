// ===== Modal Show / Hide =====
const modal = document.getElementById("passwordModal");
const createBtn = document.getElementById("create-pass-btn");
const cancelBtn = document.getElementById("cancelModal");

createBtn.addEventListener("click", () => {
    modal.classList.remove("hidden");
});

cancelBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
});


// ===== Toggle visibility of auto password generation options =====
// Get elements
const manualRadio = document.querySelector('input[name="pwSelect"][value="manual"]');
const autoRadio   = document.querySelector('input[name="pwSelect"][value="auto"]');
const autoLength = document.getElementById("autoLength");
const autoOptions = document.getElementById("autoOptions");

// Initial setup
toggleOptions();

// Event listeners
manualRadio.addEventListener("change", toggleOptions);
autoRadio.addEventListener("change", toggleOptions);

// Show/Hide auto password options area
function toggleOptions() {
    const enable = autoRadio.checked;

    // Show when auto is selected, hide when manual is selected
    autoOptions.classList.toggle("hidden", !enable);
    autoLength.classList.toggle("hidden", !enable);

    // Enable or disable internal inputs
    [autoOptions, autoLength].forEach(section => {
        section.querySelectorAll("input").forEach(input => {
            input.disabled = !enable;
        });
    });
}


// ===== Exclusive behavior for lowercase / uppercase checkboxes =====
// ===== Exclusive behavior + disable options when NUM is selected =====
const charTypeRadios = document.querySelectorAll('input[name="charType"]');
const lowerCase = document.getElementById("lowerCase");
const upperCase = document.getElementById("upperCase");

lowerCase.addEventListener("change", () => {
    if (lowerCase.checked) upperCase.checked = false;
});

upperCase.addEventListener("change", () => {
    if (upperCase.checked) lowerCase.checked = false;
});

charTypeRadios.forEach(radio => {
    radio.addEventListener("change", handleCharTypeChange);
});

// Exclusive checkboxes
lowerCase.addEventListener("change", () => {
    if (lowerCase.checked) upperCase.checked = false;
});
upperCase.addEventListener("change", () => {
    if (upperCase.checked) lowerCase.checked = false;
});

function handleCharTypeChange() {
    const selected = document.querySelector('input[name="charType"]:checked').value;

    if (selected === "num") {
        // disable both
        lowerCase.checked = false;
        upperCase.checked = false;
        lowerCase.disabled = true;
        upperCase.disabled = true;
        lowerCase.parentElement.classList.add("disabled-option");
        upperCase.parentElement.classList.add("disabled-option");
    } else {
        // enable both
        lowerCase.disabled = false;
        upperCase.disabled = false;
        lowerCase.parentElement.classList.remove("disabled-option");
        upperCase.parentElement.classList.remove("disabled-option");
    }
}
// Initial setup
handleCharTypeChange();


// ===== Auto-generate password based on selected options =====
// DOM elements
const pwDisplay = document.getElementById("pwDisplay");
const pwLength = document.getElementById("pwLength");
const includeSymbols = document.getElementById("includeSymbols");

const pwSelect = document.querySelectorAll("input[name='pwSelect']");
const charTypeOptions = document.querySelectorAll("input[name='charType']");

// Character sets
const numbers = "0123456789";
const lowerLetters = "abcdefghijklmnopqrstuvwxyz";
const upperLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const symbols = "!@#$%^&*()_+-={}[];:,./<>?";

// Function to generate a new password
function generatePassword() {
    // Get selected length
    const length = parseInt(pwLength.value);

    // Determine base character type selection
    const selectedCharType = document.querySelector("input[name='charType']:checked").value;

    let charPool = "";

    // Build character pool based on type selection
    if (selectedCharType === "num") {
        charPool = numbers;
    } else if (selectedCharType === "al") {
        charPool = lowerLetters + upperLetters;
    } else if (selectedCharType === "alnum") {
        charPool = numbers + lowerLetters + upperLetters;
    }

    // Filtering options for lowercase / uppercase only
    if (lowerCase.checked && !upperCase.checked) {
        charPool = lowerLetters;
    }
    if (upperCase.checked && !lowerCase.checked) {
        charPool = upperLetters;
    }

    // Add symbol characters if enabled
    if (includeSymbols.checked) {
        charPool += symbols;
    }

    // If no characters selected, default to numbers
    if (charPool.length === 0) {
        charPool = numbers;
    }

    // Generate password string
    let password = "";
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charPool.length);
        password += charPool[randomIndex];
    }

    // Display generated password
    pwDisplay.value = password;
}

// Listen for pwSelect changes (manual / auto)
pwSelect.forEach(option => {
    option.addEventListener("change", () => {
        if (option.value === "auto") {
            generatePassword();  // Generate immediately when "auto" is selected
        }
    });
});

// Regenerate password when options or length change
pwLength.addEventListener("input", generatePassword);
includeSymbols.addEventListener("change", generatePassword);
lowerCase.addEventListener("change", generatePassword);
upperCase.addEventListener("change", generatePassword);
charTypeOptions.forEach(option => option.addEventListener("change", generatePassword));
