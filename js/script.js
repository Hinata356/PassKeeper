// ==========================================
// PassKeeper UI / Card Logic (simplified UI + persistence)
// ==========================================

// ---------- Element References ----------
const modal = document.getElementById("passwordModal");
const createBtn = document.getElementById("create-pass-btn");
const cancelBtn = document.getElementById("cancelModal");
const saveBtn = document.getElementById("saveModal");
const cardContainer = document.getElementById("passwordCardContainer") || document.querySelector(".card-container");
const createCardBtn = document.getElementById("create-card-btn");
const deleteAllBtn = document.getElementById("delete-all-btn");

const pwName = document.getElementById("pwName");
const pwDisplay = document.getElementById("pwDisplay");
const pwLength = document.getElementById("pwLength");
const emrgencyNum = document.getElementById("emergencyNum");

const manualRadio = document.querySelector('input[name="pwSelect"][value="manual"]');
const autoRadio = document.querySelector('input[name="pwSelect"][value="auto"]');
const pwSelectRadios = document.getElementsByName("pwSelect");
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

const extendLimitModal = document.getElementById("extendLimitModal");
const extendLimitCancelBtn = document.getElementById("extendLimitCancelBtn");
const extendLimitSaveBtn = document.getElementById("extendLimitSaveBtn");

const confirmModal = document.getElementById("confirmModal");
const confirmModalTitle = document.getElementById("confirmModalTitle");
const confirmModalText = document.getElementById("confirmModalText");
const confirmModalSubtext = document.getElementById("confirmModalSubtext");
const confirmModalCancelBtn = document.getElementById("confirmModalCancelBtn");
const confirmModalOkBtn = document.getElementById("confirmModalOkBtn");

const passwordPreviewModal = document.getElementById("passwordPreviewModal");
const passwordPreviewText = document.getElementById("passwordPreviewText");
const passwordPreviewCloseBtn = document.getElementById("passwordPreviewCloseBtn");
const passwordPreviewCopyBtn = document.getElementById("passwordPreviewCopyBtn");

const noticeArea = document.getElementById("noticeArea");
const scrollTopBtn = document.getElementById("scrollTopBtn");

// ---------- Constants ----------
const numbers = "0123456789";
const lowerLetters = "abcdefghijklmnopqrstuvwxyz";
const upperLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const symbols = "!@#$%^&*()_+-={}[];:,./<>?";

const TITLE_MAX_LENGTH = 120;
const TITLE_PREVIEW_LENGTH = 10;
const MASK_DOT_COUNT = 8;
const REVEAL_AUTO_HIDE_MS = 5 * 60 * 1000;
const STORAGE_KEY = "passkeeper.cards.v2";

let activeMenuCard = null;
let pendingConfirmAction = null;
let extendTargetCard = null;
let previewPasswordCache = "";

// ---------- Utilities ----------
function showNotice(message, type = "info") {
    if (!noticeArea || !message) return;
    const item = document.createElement("div");
    item.className = `notice-item ${type}`;
    item.innerHTML = `<span class="notice-dot" aria-hidden="true"></span><span class="notice-message"></span>`;
    item.querySelector(".notice-message").textContent = String(message);
    noticeArea.appendChild(item);

    requestAnimationFrame(() => item.classList.add("is-show"));

    const remove = () => {
        item.classList.remove("is-show");
        setTimeout(() => item.remove(), 180);
    };
    item.addEventListener("click", remove);
    setTimeout(remove, 3200);
}

function openOverlay(overlay) {
    if (!overlay) return;
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
}

function closeOverlay(overlay) {
    if (!overlay) return;
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
}

function formatHMS(ms) {
    if (ms <= 0) return "00:00";
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) {
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatRemainingTime(ms) {
    if (ms <= 0) return "期限切れ";
    const totalSec = Math.floor(ms / 1000);
    const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
    const s = String(totalSec % 60).padStart(2, "0");
    return `あと ${h}:${m}:${s}`;
}

function clampTitle(title) {
    return String(title ?? "").slice(0, TITLE_MAX_LENGTH);
}

function getTitlePreview(title) {
    if (title.length <= TITLE_PREVIEW_LENGTH) return title;
    return `${title.slice(0, TITLE_PREVIEW_LENGTH)}…`;
}

function generateId() {
    return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getCards() {
    return Array.from(cardContainer.querySelectorAll(".card:not(.empty)"));
}

function getNextUntitledName() {
    const usedNumbers = getCards()
        .map(card => card.querySelector(".card-title")?.dataset.fullTitle || "")
        .map(raw => {
            const m = raw.match(/^未設定(\d+)$/);
            return m ? parseInt(m[1], 10) : null;
        })
        .filter(v => Number.isInteger(v));

    let next = 1;
    const set = new Set(usedNumbers);
    while (set.has(next)) next += 1;
    return `未設定${next}`;
}

function maskPassword() {
    return "●".repeat(MASK_DOT_COUNT);
}

function applyPasswordText(maskEl, password, { revealed = false } = {}) {
    if (!maskEl) return;
    if (revealed) {
        maskEl.textContent = password;
        maskEl.classList.add("is-revealed");
        maskEl.title = password;
        const overflow = maskEl.scrollWidth > maskEl.clientWidth || String(password).length > 14;
        maskEl.classList.toggle("is-overflow", overflow);
        if (overflow) maskEl.setAttribute("aria-label", "クリックで全文表示");
        else maskEl.removeAttribute("aria-label");
    } else {
        maskEl.textContent = maskPassword();
        maskEl.classList.remove("is-revealed", "is-overflow");
        maskEl.removeAttribute("aria-label");
        maskEl.title = "";
    }
}

function closeActiveMenu(exceptCard = null) {
    if (!activeMenuCard) return;
    if (exceptCard && activeMenuCard === exceptCard) return;
    const menu = activeMenuCard.querySelector(".card-menu");
    const btn = activeMenuCard.querySelector(".card-menu-btn");
    if (menu) menu.classList.add("hidden");
    if (btn) btn.setAttribute("aria-expanded", "false");
    activeMenuCard = null;
}

function showConfirmDialog({ title = "確認", text = "", subtext = "", okText = "OK", danger = false, onConfirm = null }) {
    if (!confirmModal) {
        if (window.confirm(text)) onConfirm?.();
        return;
    }
    confirmModalTitle.textContent = title;
    confirmModalText.textContent = text;
    if (subtext) {
        confirmModalSubtext.textContent = subtext;
        confirmModalSubtext.classList.remove("hidden");
    } else {
        confirmModalSubtext.textContent = "";
        confirmModalSubtext.classList.add("hidden");
    }
    confirmModalOkBtn.textContent = okText;
    confirmModalOkBtn.classList.toggle("btn-danger", !!danger);
    pendingConfirmAction = onConfirm;
    openOverlay(confirmModal);
}

function closeConfirmDialog() {
    pendingConfirmAction = null;
    closeOverlay(confirmModal);
}

function showPasswordPreview(password) {
    previewPasswordCache = String(password || "");
    if (!passwordPreviewModal || !passwordPreviewText) {
        showNotice(previewPasswordCache, "info");
        return;
    }
    passwordPreviewText.textContent = previewPasswordCache;
    openOverlay(passwordPreviewModal);
}

function closePasswordPreview() {
    closeOverlay(passwordPreviewModal);
}

// ---------- Persistence ----------
function serializeCard(card) {
    const titleEl = card.querySelector(".card-title");
    return {
        id: card.dataset.id,
        title: titleEl?.dataset.fullTitle || titleEl?.textContent || "未設定",
        password: card.dataset.password || "",
        expiresAt: card.dataset.expiresAt || new Date().toISOString(),
        emergencyLimit: parseInt(card.dataset.total || "0", 10) || 0,
        remaining: parseInt(card.dataset.remaining || "0", 10) || 0,
        masked: card.dataset.masked !== "false",
        revealUntil: card.dataset.revealUntil || null
    };
}

function saveCardsToStorage() {
    try {
        const data = getCards().map(serializeCard);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
        console.error("saveCardsToStorage failed", err);
    }
}

function loadCardsFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed;
    } catch (err) {
        console.error("loadCardsFromStorage failed", err);
        return [];
    }
}

// ---------- Create modal state ----------
function resetPasswordModal() {
    autoRadio.checked = true;
    pwLength.value = 4;
    emrgencyNum.value = 1;
    document.querySelector("input[name='charType'][value='num']").checked = true;

    lowerCase.checked = false;
    upperCase.checked = false;
    includeSymbols.checked = false;

    pwName.value = "";
    pwDisplay.value = "";
    pwDisplay.placeholder = "生成/手動入力";

    toggleOptions();
    updateCaseOptionRestrictions();
    updateReloadButtonState();

    createDateTimeCtrl?.resetNow();
}

function openCreateModal() {
    resetPasswordModal();
    if (autoRadio.checked) generatePassword();
    openOverlay(modal);
}

function closeModal() {
    closeOverlay(modal);
    resetPasswordModal();
}

function toggleOptions() {
    const enable = autoRadio.checked;
    autoOptions.classList.toggle("hidden", !enable);
    autoLength.classList.toggle("hidden", !enable);
    [autoOptions, autoLength].forEach(section => {
        section.querySelectorAll("input").forEach(input => input.disabled = !enable);
    });
}

function updateCaseOptionRestrictions() {
    const selected = document.querySelector('input[name="charType"]:checked')?.value;
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

function updateReloadButtonState() {
    const mode = document.querySelector('input[name="pwSelect"]:checked')?.value;
    const disabled = mode === "manual";
    reloadBtn.classList.toggle("disabled-option", disabled);
    reloadBtn.style.pointerEvents = disabled ? "none" : "auto";
}

function generatePassword() {
    const length = Math.max(1, Math.min(99, parseInt(pwLength.value || "4", 10)));
    const selectedCharType = document.querySelector("input[name='charType']:checked")?.value || "num";

    let charPool = "";
    if (selectedCharType === "num") charPool = numbers;
    else if (selectedCharType === "al") charPool = lowerLetters + upperLetters;
    else if (selectedCharType === "alnum") charPool = numbers + lowerLetters + upperLetters;

    if (lowerCase.checked && !upperCase.checked) charPool = lowerLetters;
    if (upperCase.checked && !lowerCase.checked) charPool = upperLetters;
    if (includeSymbols.checked) charPool += symbols;
    if (!charPool.length) charPool = numbers;

    let password = "";
    for (let i = 0; i < length; i++) {
        password += charPool[Math.floor(Math.random() * charPool.length)];
    }
    pwDisplay.value = password;
}

// ---------- Generic custom date/time picker ----------
function createDateTimeController({ root, dateContainer, timeContainer }) {
    if (!root || !dateContainer || !timeContainer) return null;

    let currentDate = new Date();
    currentDate.setSeconds(0, 0);
    let activeIndex = -1;

    const segmentConfig = [
        { type: "year", elem: dateContainer.querySelector('[data-type="year"]'), parent: dateContainer },
        { type: "month", elem: dateContainer.querySelector('[data-type="month"]'), parent: dateContainer },
        { type: "day", elem: dateContainer.querySelector('[data-type="day"]'), parent: dateContainer },
        { type: "hour", elem: timeContainer.querySelector('[data-type="hour"]'), parent: timeContainer },
        { type: "minute", elem: timeContainer.querySelector('[data-type="minute"]'), parent: timeContainer }
    ];

    function setDate(dateLike) {
        const d = new Date(dateLike);
        if (Number.isNaN(d.getTime())) return;
        d.setSeconds(0, 0);
        currentDate = d;
        updateDisplay();
    }

    function getDate() {
        return new Date(currentDate);
    }

    function resetNow() {
        activeIndex = -1;
        currentDate = new Date();
        currentDate.setSeconds(0, 0);
        updateDisplay();
        highlightActive();
    }

    function updateDisplay() {
        const y = currentDate.getFullYear();
        const m = String(currentDate.getMonth() + 1).padStart(2, "0");
        const d = String(currentDate.getDate()).padStart(2, "0");
        const h = String(currentDate.getHours()).padStart(2, "0");
        const min = String(currentDate.getMinutes()).padStart(2, "0");
        segmentConfig[0].elem.textContent = y;
        segmentConfig[1].elem.textContent = m;
        segmentConfig[2].elem.textContent = d;
        segmentConfig[3].elem.textContent = h;
        segmentConfig[4].elem.textContent = min;
    }

    function highlightActive() {
        segmentConfig.forEach(seg => seg.elem.classList.remove("active"));
        if (activeIndex === -1) return;
        const current = segmentConfig[activeIndex];
        current.elem.classList.add("active");
        current.parent.focus();
    }

    function adjustValue(direction) {
        if (activeIndex === -1) {
            activeIndex = 2;
            highlightActive();
        }
        const testDate = new Date(currentDate);
        const type = segmentConfig[activeIndex].type;
        switch (type) {
            case "year": testDate.setFullYear(testDate.getFullYear() + direction); break;
            case "month": testDate.setMonth(testDate.getMonth() + direction); break;
            case "day": testDate.setDate(testDate.getDate() + direction); break;
            case "hour": testDate.setHours(testDate.getHours() + direction); break;
            case "minute": testDate.setMinutes(testDate.getMinutes() + direction); break;
        }

        const now = new Date();
        const maxDate = new Date();
        maxDate.setFullYear(now.getFullYear() + 5);

        if (testDate > maxDate) return;
        if (testDate < now) return;

        currentDate = testDate;
        updateDisplay();
    }

    function handleKeydown(e) {
        if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)) return;

        if (e.key === "Tab") {
            e.preventDefault();
            const nextIndex = e.shiftKey ? activeIndex - 1 : activeIndex + 1;
            activeIndex = (nextIndex < 0 || nextIndex >= segmentConfig.length) ? -1 : nextIndex;
            highlightActive();
            return;
        }

        if (activeIndex === -1) {
            activeIndex = 2;
            if (["ArrowUp", "ArrowDown"].includes(e.key)) adjustValue(e.key === "ArrowUp" ? 1 : -1);
            highlightActive();
            return;
        }

        if (e.key === "ArrowUp") adjustValue(1);
        else if (e.key === "ArrowDown") adjustValue(-1);
        else if (e.key === "ArrowLeft") { activeIndex = Math.max(0, activeIndex - 1); highlightActive(); }
        else if (e.key === "ArrowRight") { activeIndex = Math.min(segmentConfig.length - 1, activeIndex + 1); highlightActive(); }
    }

    function attachSwipe(container) {
        const PIXELS_PER_STEP = 420;
        const MIN_INTERVAL_MS = 100;
        let touchStartY = 0;
        let lastChangeTime = 0;
        let wheelAccumulator = 0;
        let wheelResetTimer = null;

        container.addEventListener("touchstart", (e) => {
            touchStartY = e.touches[0].clientY;
            lastChangeTime = 0;
        }, { passive: false });

        container.addEventListener("touchmove", (e) => {
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

        container.addEventListener("wheel", (e) => {
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
    }

    segmentConfig.forEach((seg, index) => {
        seg.elem.addEventListener("pointerdown", () => {
            if (activeIndex === index) return;
            activeIndex = index;
            highlightActive();
        });
    });

    document.addEventListener("pointerdown", (e) => {
        const inside = dateContainer.contains(e.target) || timeContainer.contains(e.target);
        if (!inside && activeIndex !== -1) {
            activeIndex = -1;
            highlightActive();
        }
    });

    dateContainer.addEventListener("keydown", handleKeydown);
    timeContainer.addEventListener("keydown", handleKeydown);

    root.querySelectorAll(".limit-preset-btn-plus, .limit-preset-btn-minus").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            const addVal = btn.getAttribute("data-add");
            const typeVal = btn.getAttribute("data-type");
            let tempDate = new Date(currentDate);

            if (addVal) {
                tempDate.setMinutes(tempDate.getMinutes() + parseInt(addVal, 10));
            } else if (typeVal) {
                if (typeVal === "today") {
                    const now = new Date();
                    now.setDate(now.getDate() + 1);
                    now.setHours(0, 0, 0, 0);
                    tempDate = now;
                } else if (typeVal === "plus-day") {
                    tempDate.setDate(tempDate.getDate() + 1);
                }
            }

            const maxDate = new Date();
            maxDate.setFullYear(maxDate.getFullYear() + 5);
            if (tempDate <= maxDate) {
                currentDate = tempDate;
                updateDisplay();
            }
        });
    });

    const calendarIcon = dateContainer.querySelector(".calendar");
    const clockIcon = timeContainer.querySelector(".clock");

    if (calendarIcon) {
        calendarIcon.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const now = new Date();
            currentDate.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
            updateDisplay();
        });
    }

    if (clockIcon) {
        clockIcon.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const now = new Date();
            currentDate.setHours(now.getHours(), now.getMinutes(), 0, 0);
            updateDisplay();
        });
    }

    attachSwipe(dateContainer);
    attachSwipe(timeContainer);
    updateDisplay();
    highlightActive();

    return { getDate, setDate, resetNow };
}

let createDateTimeCtrl = null;
let extendDateTimeCtrl = null;

function getSelectedDateTimeFromCreateModal() {
    return createDateTimeCtrl?.getDate() || null;
}

// ---------- Card title editing ----------
function applyCardTitleUI(titleEl, rawTitle) {
    if (!titleEl) return;
    const safeFullTitle = clampTitle((rawTitle || "").trim() || "未設定");
    titleEl.dataset.fullTitle = safeFullTitle;
    titleEl.textContent = getTitlePreview(safeFullTitle);
    titleEl.title = safeFullTitle;

    if (!titleEl.dataset.bindInlineEdit) {
        titleEl.dataset.bindInlineEdit = "true";
        titleEl.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            startInlineTitleEdit(titleEl);
        });
    }
}

function startInlineTitleEdit(titleEl) {
    if (!titleEl || titleEl.dataset.editing === "true") return;
    const card = titleEl.closest(".card");
    if (!card || card.classList.contains("empty")) return;

    titleEl.dataset.editing = "true";
    const currentFullTitle = titleEl.dataset.fullTitle || titleEl.textContent || "";
    const input = document.createElement("input");
    input.type = "text";
    input.className = "card-title-input";
    input.maxLength = TITLE_MAX_LENGTH;
    input.value = currentFullTitle;

    titleEl.style.display = "none";
    titleEl.insertAdjacentElement("afterend", input);
    input.focus();
    input.select();

    let finished = false;
    const finish = (save) => {
        if (finished) return;
        finished = true;
        if (save) {
            let nextTitle = (input.value || "").trim();
            if (!nextTitle) nextTitle = currentFullTitle || "未設定";
            applyCardTitleUI(titleEl, nextTitle);
            saveCardsToStorage();
        }
        if (input.isConnected) input.remove();
        titleEl.style.display = "";
        delete titleEl.dataset.editing;
    };

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); finish(true); }
        else if (e.key === "Escape") { e.preventDefault(); finish(false); }
    });
    input.addEventListener("blur", () => finish(true));
}

// ---------- Card state/timers ----------
function updateRevealMeta(card) {
    const remaining = parseInt(card.dataset.remaining || "0", 10);
    const total = parseInt(card.dataset.total || "0", 10);
    const strong = card.querySelector(".js-remaining-count");
    const totalText = card.querySelector(".js-total-count");
    if (strong) strong.textContent = String(remaining);
    if (totalText) totalText.textContent = String(total);
    card.classList.toggle("warning", remaining <= 1 || card.dataset.expired === "true");
}

function applyButtonState(card) {
    const revealBtn = card.querySelector(".btn-reveal");
    if (!revealBtn) return;
    const expired = card.dataset.expired === "true";
    const masked = card.dataset.masked === "true";
    const remaining = parseInt(card.dataset.remaining || "0", 10);

    if (expired) {
        revealBtn.disabled = true;
        revealBtn.textContent = "期限切れ";
        return;
    }
    revealBtn.disabled = masked && remaining <= 0;
    revealBtn.textContent = masked ? "表示する" : "隠す";
}

function setInlineStatus(card, text = "", type = "") {
    const el = card.querySelector(".js-inline-status");
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("is-visible", !!text);
    el.classList.toggle("is-alert", type === "alert");
}

function applyCardVisibility(card, revealed) {
    const maskEl = card.querySelector(".password-mask");
    const password = card.dataset.password || "";
    card.dataset.masked = revealed ? "false" : "true";
    applyPasswordText(maskEl, password, { revealed });
    applyButtonState(card);
}

function clearCardTimers(card) {
    if (card._statusInterval) {
        clearInterval(card._statusInterval);
        card._statusInterval = null;
    }
}

function markCardExpired(card) {
    if (card.dataset.expired === "true") return;
    card.dataset.expired = "true";
    card.dataset.revealUntil = "";
    applyCardVisibility(card, true);
    setInlineStatus(card, "期限切れのため表示中", "alert");
    updateRevealMeta(card);
    saveCardsToStorage();
}

function hideCardPassword(card, { save = true } = {}) {
    if (!card) return;
    if (card.dataset.expired === "true") return;
    card.dataset.revealUntil = "";
    applyCardVisibility(card, false);
    setInlineStatus(card, "", "");
    if (save) saveCardsToStorage();
}

function revealCardPassword(card, { consumeCount = true } = {}) {
    const expiresAtMs = new Date(card.dataset.expiresAt).getTime();
    if (Number.isNaN(expiresAtMs)) {
        showNotice("期限日時を読み込めませんでした。", "error");
        return;
    }
    if (expiresAtMs <= Date.now()) {
        markCardExpired(card);
        return;
    }

    let remaining = parseInt(card.dataset.remaining || "0", 10);
    if (consumeCount && remaining <= 0) {
        showNotice("緊急表示の回数が残っていません。", "error");
        return;
    }

    if (consumeCount) {
        remaining -= 1;
        card.dataset.remaining = String(remaining);
    }

    card.dataset.revealUntil = new Date(Date.now() + REVEAL_AUTO_HIDE_MS).toISOString();
    applyCardVisibility(card, true);
    updateRevealMeta(card);
    saveCardsToStorage();
    tickCard(card);
}

function tickCard(card) {
    if (!card?.isConnected) return false;

    const expiresAt = new Date(card.dataset.expiresAt);
    const expireTextEl = card.querySelector(".js-remaining-time");
    const now = Date.now();

    if (!Number.isNaN(expiresAt.getTime())) {
        const expireDiff = expiresAt.getTime() - now;
        if (expireTextEl) expireTextEl.textContent = formatRemainingTime(expireDiff);
        if (expireDiff <= 0) {
            markCardExpired(card);
            return false;
        }
    }

    const masked = card.dataset.masked === "true";
    if (!masked) {
        const revealUntilMs = new Date(card.dataset.revealUntil || "").getTime();
        if (Number.isFinite(revealUntilMs) && revealUntilMs > now) {
            setInlineStatus(card, `自動で隠れるまで ${formatHMS(revealUntilMs - now)}`);
        } else {
            hideCardPassword(card);
        }
    } else if (card.dataset.expired !== "true") {
        setInlineStatus(card, "");
    }

    return true;
}

function startCardTimer(card) {
    clearCardTimers(card);
    tickCard(card);
    card._statusInterval = setInterval(() => {
        const keep = tickCard(card);
        if (!keep) {
            // keep timer for expired text not needed
            clearCardTimers(card);
        }
    }, 1000);
}

function bindPasswordFullTextClick(maskEl, card) {
    if (!maskEl || !card || maskEl.dataset.bindFullPasswordClick) return;
    maskEl.dataset.bindFullPasswordClick = "true";
    maskEl.addEventListener("click", () => {
        if (card.dataset.masked === "true") return;
        const password = card.dataset.password || "";
        const isOverflow = maskEl.scrollWidth > maskEl.clientWidth || password.length > 14;
        if (isOverflow) showPasswordPreview(password);
    });
}

function buildCardElement({ id, title, password, expiresAt, emergencyLimit, remaining, masked = true, revealUntil = null }) {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.id = id || generateId();
    card.dataset.password = password;
    card.dataset.expiresAt = new Date(expiresAt).toISOString();
    card.dataset.masked = masked ? "true" : "false";
    card.dataset.remaining = String(Math.max(0, Number.isFinite(remaining) ? remaining : emergencyLimit));
    card.dataset.total = String(Math.max(0, emergencyLimit));
    card.dataset.expired = "false";
    card.dataset.revealUntil = revealUntil ? new Date(revealUntil).toISOString() : "";

    card.innerHTML = `
        <div class="card-header">
            <h3 class="card-title"></h3>
            <div class="card-menu-wrap">
                <button class="card-menu-btn" aria-label="カードメニュー" aria-haspopup="menu" aria-expanded="false" type="button">
                    <span class="dli-more"></span>
                </button>
                <div class="card-menu hidden" role="menu">
                    <button class="card-menu-item" type="button" data-action="extend">期限を延長</button>
                    <button class="card-menu-item danger" type="button" data-action="delete">削除</button>
                </div>
            </div>
        </div>

        <div class="card-body">
            <div class="password-mask"></div>
            <button class="btn-reveal" type="button">表示する</button>
            <div class="card-inline-status js-inline-status" aria-live="polite"></div>
        </div>

        <div class="card-footer">
            <div class="meta-row">
                <div class="meta-item">
                    <span class="meta-key">期限</span>
                    <span class="meta-text js-remaining-time"></span>
                </div>
                <div class="meta-item">
                    <span class="meta-key">表示</span>
                    <span class="meta-text">残り <strong class="js-remaining-count"></strong> / <span class="js-total-count"></span> 回</span>
                </div>
            </div>
        </div>
    `;

    const titleEl = card.querySelector(".card-title");
    const maskEl = card.querySelector(".password-mask");
    const revealBtn = card.querySelector(".btn-reveal");
    const menuBtn = card.querySelector(".card-menu-btn");
    const menu = card.querySelector(".card-menu");

    applyCardTitleUI(titleEl, title || "未設定");
    bindPasswordFullTextClick(maskEl, card);
    updateRevealMeta(card);

    // Restore visibility safely
    const now = Date.now();
    const expireMs = new Date(card.dataset.expiresAt).getTime();
    if (expireMs <= now) {
        card.dataset.expired = "true";
        card.dataset.masked = "false";
        card.dataset.revealUntil = "";
        applyPasswordText(maskEl, card.dataset.password, { revealed: true });
        setInlineStatus(card, "期限切れのため表示中", "alert");
    } else {
        const revealUntilMs = new Date(card.dataset.revealUntil || "").getTime();
        const shouldRemainRevealed = card.dataset.masked === "false" && Number.isFinite(revealUntilMs) && revealUntilMs > now;
        if (shouldRemainRevealed) {
            applyPasswordText(maskEl, card.dataset.password, { revealed: true });
        } else {
            card.dataset.masked = "true";
            card.dataset.revealUntil = "";
            applyPasswordText(maskEl, card.dataset.password, { revealed: false });
        }
    }
    applyButtonState(card);

    revealBtn.addEventListener("click", () => {
        if (card.dataset.expired === "true") {
            showNotice("期限切れのため表示中です。", "info");
            return;
        }
        if (card.dataset.masked === "true") revealCardPassword(card, { consumeCount: true });
        else hideCardPassword(card);
    });

    menuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = !menu.classList.contains("hidden");
        if (isOpen) {
            closeActiveMenu();
            return;
        }
        closeActiveMenu(card);
        menu.classList.remove("hidden");
        menuBtn.setAttribute("aria-expanded", "true");
        activeMenuCard = card;
    });

    menu.addEventListener("click", (e) => {
        const item = e.target.closest(".card-menu-item");
        if (!item) return;
        const action = item.dataset.action;
        closeActiveMenu();
        if (action === "delete") {
            askDeleteSingleCard(card);
        } else if (action === "extend") {
            openExtendLimitModal(card);
        }
    });

    startCardTimer(card);
    return card;
}

function insertCard(card) {
    if (createCardBtn && createCardBtn.parentNode === cardContainer) {
        cardContainer.insertBefore(card, createCardBtn);
    } else {
        cardContainer.appendChild(card);
    }
}

function deleteCard(card, { silent = false } = {}) {
    if (!card) return;
    clearCardTimers(card);
    if (activeMenuCard === card) activeMenuCard = null;
    card.remove();
    saveCardsToStorage();
    if (!silent) showNotice("カードを削除しました。", "info");
}

function askDeleteSingleCard(card) {
    const title = card.querySelector(".card-title")?.dataset.fullTitle || "このカード";
    showConfirmDialog({
        title: "削除の確認",
        text: `「${title}」を削除しますか？`,
        subtext: "この操作は取り消せません。",
        okText: "削除する",
        danger: true,
        onConfirm: () => deleteCard(card)
    });
}

function deleteAllCards() {
    getCards().forEach(card => {
        clearCardTimers(card);
        card.remove();
    });
    localStorage.removeItem(STORAGE_KEY);
    showNotice("すべてのカードを削除しました。", "info");
}

function askDeleteAllCards() {
    const count = getCards().length;
    if (count <= 0) {
        showNotice("削除するカードはありません。", "info");
        return;
    }
    showConfirmDialog({
        title: "全削除の確認",
        text: "保存済みのパスワードカードをすべて削除します。",
        subtext: `対象件数: ${count}件（取り消し不可）`,
        okText: "全削除する",
        danger: true,
        onConfirm: deleteAllCards
    });
}

// ---------- Extend expiration modal ----------
function openExtendLimitModal(card) {
    extendTargetCard = card;
    const currentExpire = new Date(card.dataset.expiresAt || Date.now());
    if (extendDateTimeCtrl) {
        extendDateTimeCtrl.setDate(currentExpire > new Date() ? currentExpire : new Date(Date.now() + 30 * 60 * 1000));
    }
    openOverlay(extendLimitModal);
}

function closeExtendLimitModal() {
    extendTargetCard = null;
    closeOverlay(extendLimitModal);
}

function applyExtendedLimit() {
    if (!extendTargetCard || !extendDateTimeCtrl) return;
    const nextDate = extendDateTimeCtrl.getDate();
    const currentExpire = new Date(extendTargetCard.dataset.expiresAt || "");

    if (!nextDate || Number.isNaN(nextDate.getTime()) || nextDate.getTime() <= Date.now()) {
        showNotice("期限日時を現在より未来に設定してください。", "error");
        return;
    }

    if (!Number.isNaN(currentExpire.getTime()) && nextDate.getTime() < currentExpire.getTime()) {
        showNotice("延長後の期限は、元の期限より前に設定できません。", "error");
        return;
    }

    extendTargetCard.dataset.expiresAt = nextDate.toISOString();
    extendTargetCard.dataset.expired = "false";
    extendTargetCard.dataset.revealUntil = "";
    hideCardPassword(extendTargetCard, { save: false });
    updateRevealMeta(extendTargetCard);
    startCardTimer(extendTargetCard);
    saveCardsToStorage();
    showNotice("期限を更新しました。", "success");
    closeExtendLimitModal();
}

// ---------- Create card/save ----------
function saveNewCardFromModal() {
    if (autoRadio.checked && !pwDisplay.value.trim()) generatePassword();

    const rawName = pwName.value.trim();
    const title = rawName ? clampTitle(rawName) : getNextUntitledName();
    const password = pwDisplay.value.trim();
    if (!password) {
        showNotice("パスワードを入力するか、生成してください。", "error");
        return;
    }

    const expiresAt = getSelectedDateTimeFromCreateModal();
    if (!expiresAt || Number.isNaN(expiresAt.getTime())) {
        showNotice("期限日時を正しく設定してください。", "error");
        return;
    }
    if (expiresAt.getTime() <= Date.now()) {
        showNotice("期限日時は現在より未来にしてください。", "error");
        return;
    }

    const emergencyLimit = Math.max(0, parseInt(emrgencyNum.value || "0", 10) || 0);

    const newCard = buildCardElement({
        id: generateId(),
        title,
        password,
        expiresAt,
        emergencyLimit,
        remaining: emergencyLimit,
        masked: true,
        revealUntil: null
    });

    insertCard(newCard);
    saveCardsToStorage();
    closeModal();
    showNotice("パスワードを保存しました。", "success");
}

// ---------- Restore ----------
function restoreCards() {
    const items = loadCardsFromStorage();
    if (!items.length) return;

    items.forEach(item => {
        if (!item || typeof item !== "object") return;
        const expiresAt = new Date(item.expiresAt);
        if (Number.isNaN(expiresAt.getTime())) return;

        const card = buildCardElement({
            id: item.id || generateId(),
            title: item.title || getNextUntitledName(),
            password: String(item.password || ""),
            expiresAt,
            emergencyLimit: Math.max(0, parseInt(item.emergencyLimit || "0", 10) || 0),
            remaining: Math.max(0, parseInt(((item.remaining ?? item.emergencyLimit) ?? "0"), 10) || 0),
            masked: item.masked !== false,
            revealUntil: item.revealUntil || null
        });
        insertCard(card);
    });

    // normalize (drop broken entries / update expired state)
    saveCardsToStorage();
}

// ---------- Event bindings ----------
function setupBasicEvents() {
    createBtn?.addEventListener("click", openCreateModal);
    createCardBtn?.addEventListener("click", openCreateModal);
    createCardBtn?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openCreateModal();
        }
    });

    cancelBtn?.addEventListener("click", closeModal);
    saveBtn?.addEventListener("click", saveNewCardFromModal);
    deleteAllBtn?.addEventListener("click", askDeleteAllCards);

    [modal, extendLimitModal, confirmModal, passwordPreviewModal].forEach(overlay => {
        overlay?.addEventListener("click", (e) => {
            if (e.target !== overlay) return;
            if (overlay === modal) closeModal();
            else if (overlay === extendLimitModal) closeExtendLimitModal();
            else if (overlay === confirmModal) closeConfirmDialog();
            else if (overlay === passwordPreviewModal) closePasswordPreview();
        });
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (activeMenuCard) closeActiveMenu();
            else if (!confirmModal?.classList.contains("hidden")) closeConfirmDialog();
            else if (!passwordPreviewModal?.classList.contains("hidden")) closePasswordPreview();
            else if (!extendLimitModal?.classList.contains("hidden")) closeExtendLimitModal();
            else if (!modal?.classList.contains("hidden")) closeModal();
        }
    });

    document.addEventListener("pointerdown", (e) => {
        const inMenu = e.target.closest(".card-menu-wrap");
        if (!inMenu) closeActiveMenu();
    });

    confirmModalCancelBtn?.addEventListener("click", closeConfirmDialog);
    confirmModalOkBtn?.addEventListener("click", () => {
        const fn = pendingConfirmAction;
        closeConfirmDialog();
        fn?.();
    });

    extendLimitCancelBtn?.addEventListener("click", closeExtendLimitModal);
    extendLimitSaveBtn?.addEventListener("click", applyExtendedLimit);

    passwordPreviewCloseBtn?.addEventListener("click", closePasswordPreview);
    passwordPreviewCopyBtn?.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(previewPasswordCache);
            showNotice("コピーしました。", "success");
        } catch {
            showNotice("コピーに失敗しました。", "error");
        }
    });

    // Form events
    pwLength?.addEventListener("input", generatePassword);
    includeSymbols?.addEventListener("change", generatePassword);
    lowerCase?.addEventListener("change", generatePassword);
    upperCase?.addEventListener("change", generatePassword);
    reloadBtn?.addEventListener("click", generatePassword);

    charTypeOptions.forEach(option => option.addEventListener("change", generatePassword));
    charTypeRadios.forEach(radio => radio.addEventListener("change", updateCaseOptionRestrictions));

    lowerCase?.addEventListener("change", () => { if (lowerCase.checked) upperCase.checked = false; });
    upperCase?.addEventListener("change", () => { if (upperCase.checked) lowerCase.checked = false; });

    manualRadio?.addEventListener("change", toggleOptions);
    autoRadio?.addEventListener("change", toggleOptions);
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

    pwDisplay?.addEventListener("focus", () => { pwDisplay.placeholder = ""; });
    pwDisplay?.addEventListener("blur", () => {
        if (pwDisplay.value.trim() === "") pwDisplay.placeholder = manualRadio.checked ? "手動入力" : "生成/手動入力";
    });

    copyBtn?.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(pwDisplay.value);
            copyBtn.style.display = "none";
            checkIcon.style.display = "inline-block";
            setTimeout(() => {
                checkIcon.style.display = "none";
                copyBtn.style.display = "inline-block";
            }, 1200);
            showNotice("コピーしました。", "success");
        } catch (err) {
            console.error(err);
            showNotice("コピーに失敗しました。", "error");
        }
    });
}


function setupScrollTopButton() {
    if (!scrollTopBtn) return;

    const toggleScrollTopButton = () => {
        const shouldShow = window.scrollY > 240;
        scrollTopBtn.classList.toggle("hidden", !shouldShow);
    };

    scrollTopBtn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    window.addEventListener("scroll", toggleScrollTopButton, { passive: true });
    toggleScrollTopButton();
}

// ---------- Init ----------
function init() {
    createDateTimeCtrl = createDateTimeController({
        root: document.getElementById("passwordModal"),
        dateContainer: document.getElementById("customDateContainer"),
        timeContainer: document.getElementById("customTimeContainer")
    });

    extendDateTimeCtrl = createDateTimeController({
        root: document.getElementById("extendLimitModal"),
        dateContainer: document.getElementById("extendDateContainer"),
        timeContainer: document.getElementById("extendTimeContainer")
    });

    setupBasicEvents();
    setupScrollTopButton();
    updateReloadButtonState();
    updateCaseOptionRestrictions();
    toggleOptions();
    restoreCards();
}

document.addEventListener("DOMContentLoaded", init);
