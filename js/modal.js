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