// ==========================================
// PassKeeper UI / Card Logic (simplified UI + persistence)
// ==========================================

// ---------- Element References ----------
const modal = document.getElementById("passwordModal");
const createBtn = document.getElementById("create-pass-btn");
const minigameBtn = document.getElementById("minigame-btn") || document.querySelector(".btn-game");
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

// Settings
const settingsBtn = document.getElementById("settings-btn");
const settingsModal = document.getElementById("settingsModal");
const settingsCancelBtn = document.getElementById("settingsCancelBtn");
const settingsSaveBtn = document.getElementById("settingsSaveBtn");
const ratioLettersInput = document.getElementById("ratioLetters");
const ratioSymbolsInput = document.getElementById("ratioSymbols");
const ratioUpperInput = document.getElementById("ratioUpper");
const ratioSummary = document.getElementById("ratioSummary");
const ratioLettersVal = document.getElementById("ratioLettersVal");
const ratioSymbolsVal = document.getElementById("ratioSymbolsVal");
const ratioUpperVal = document.getElementById("ratioUpperVal");
const ratioResetBtn = document.getElementById("ratioResetBtn");
const excludeCharsInput = document.getElementById("excludeChars");
const trashRetentionDaysInput = document.getElementById("trashRetentionDays");
const trashRetentionDaysText = document.getElementById("trashRetentionDaysText");

// Trash (Recycle bin)
const trashBtn = document.getElementById("trashBtn");
const trashBadge = document.getElementById("trashBadge");
const trashModal = document.getElementById("trashModal");
const trashList = document.getElementById("trashList");
const trashSelectAll = document.getElementById("trashSelectAll");
const trashRestoreSelectedBtn = document.getElementById("trashRestoreSelectedBtn");
const trashDeleteSelectedBtn = document.getElementById("trashDeleteSelectedBtn");
const trashEmptyBtn = document.getElementById("trashEmptyBtn");
const trashCloseBtn = document.getElementById("trashCloseBtn");


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
const TRASH_KEY = "passkeeper.trash.v1";
const SETTINGS_KEY = "passkeeper.settings.v1";

const DEFAULT_SETTINGS = Object.freeze({
    ratioLetters: 50,          // % of total length (letters)
    ratioSymbols: 10,          // % of total length (symbols)
    ratioUpper: 50,            // % of letters (uppercase)
    excludeChars: "",          // chars to exclude from generation pool
    trashRetentionDays: 30     // 1..30
});

let appSettings = { ...DEFAULT_SETTINGS };

let activeMenuCard = null;
let pendingConfirmAction = null;
let extendTargetCard = null;
let previewPasswordCache = "";
let trashTicker = null;

// ---------- Settings ----------
function clampInt(val, min, max, fallback) {
    const n = parseInt(String(val ?? ""), 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
}

function normalizeSettings(next = {}) {
    const ratioLetters = clampInt(next.ratioLetters, 0, 100, DEFAULT_SETTINGS.ratioLetters);
    let ratioSymbols = clampInt(next.ratioSymbols, 0, 100, DEFAULT_SETTINGS.ratioSymbols);
    const ratioUpper = clampInt(next.ratioUpper, 0, 100, DEFAULT_SETTINGS.ratioUpper);
    const excludeChars = String(next.excludeChars ?? DEFAULT_SETTINGS.excludeChars);
    const trashRetentionDays = clampInt(next.trashRetentionDays, 1, 30, DEFAULT_SETTINGS.trashRetentionDays);

    // ensure letters + symbols <= 100
    if (ratioLetters + ratioSymbols > 100) {
        ratioSymbols = Math.max(0, 100 - ratioLetters);
    }

    return { ratioLetters, ratioSymbols, ratioUpper, excludeChars, trashRetentionDays };
}

function loadSettingsFromStorage() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) return { ...DEFAULT_SETTINGS };
        const parsed = JSON.parse(raw);
        return normalizeSettings({ ...DEFAULT_SETTINGS, ...(parsed || {}) });
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

function saveSettingsToStorage(settings) {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalizeSettings(settings)));
    } catch {
        // ignore
    }
}

function getTrashRetentionDays() {
    return clampInt(appSettings?.trashRetentionDays, 1, 30, DEFAULT_SETTINGS.trashRetentionDays);
}

function getTrashRetentionMs() {
    return getTrashRetentionDays() * 24 * 60 * 60 * 1000;
}

function updateTrashRetentionText() {
    const days = getTrashRetentionDays();
    if (trashRetentionDaysText) trashRetentionDaysText.textContent = String(days);
}

function updateRatioValueLabels() {
    const letters = clampInt(ratioLettersInput?.value, 0, 100, appSettings.ratioLetters);
    const symbols = clampInt(ratioSymbolsInput?.value, 0, 100, appSettings.ratioSymbols);
    const upper = clampInt(ratioUpperInput?.value, 0, 100, appSettings.ratioUpper);

    if (ratioLettersVal) ratioLettersVal.textContent = `${letters}%`;
    if (ratioSymbolsVal) ratioSymbolsVal.textContent = `${symbols}%`;
    if (ratioUpperVal) ratioUpperVal.textContent = `${upper}%`;
}

function updateRatioSummaryText() {
    updateRatioValueLabels();
    if (!ratioSummary) return;
    const letters = clampInt(ratioLettersInput?.value, 0, 100, appSettings.ratioLetters);
    const symbols = clampInt(ratioSymbolsInput?.value, 0, 100, appSettings.ratioSymbols);
    const digits = Math.max(0, 100 - letters - symbols);
    ratioSummary.textContent = `数字: ${digits}%（英字${letters}% / 記号${symbols}%）`;
}

function enforceRatioConstraint(changed) {
    if (!ratioLettersInput || !ratioSymbolsInput) return;
    let letters = clampInt(ratioLettersInput.value, 0, 100, appSettings.ratioLetters);
    let symbolsPct = clampInt(ratioSymbolsInput.value, 0, 100, appSettings.ratioSymbols);
    if (letters + symbolsPct <= 100) {
        ratioLettersInput.value = String(letters);
        ratioSymbolsInput.value = String(symbolsPct);
        updateRatioSummaryText();
        return;
    }

    if (changed === 'letters') {
        symbolsPct = Math.max(0, 100 - letters);
        ratioSymbolsInput.value = String(symbolsPct);
    } else {
        letters = Math.max(0, 100 - symbolsPct);
        ratioLettersInput.value = String(letters);
    }
    updateRatioSummaryText();
}

function applySettingsToUI() {
    if (ratioLettersInput) ratioLettersInput.value = String(appSettings.ratioLetters);
    if (ratioSymbolsInput) ratioSymbolsInput.value = String(appSettings.ratioSymbols);
    if (ratioUpperInput) ratioUpperInput.value = String(appSettings.ratioUpper);
    if (excludeCharsInput) excludeCharsInput.value = String(appSettings.excludeChars || "");
    if (trashRetentionDaysInput) trashRetentionDaysInput.value = String(getTrashRetentionDays());
    updateTrashRetentionText();
    updateRatioValueLabels();
    updateRatioSummaryText();
}

function openSettingsModal() {
    appSettings = loadSettingsFromStorage();
    applySettingsToUI();
    openOverlay(settingsModal);
}

function closeSettingsModal() {
    closeOverlay(settingsModal);
}

function saveSettingsFromModal() {
    const next = normalizeSettings({
        ratioLetters: ratioLettersInput?.value,
        ratioSymbols: ratioSymbolsInput?.value,
        ratioUpper: ratioUpperInput?.value,
        excludeChars: excludeCharsInput?.value,
        trashRetentionDays: trashRetentionDaysInput?.value
    });

    appSettings = next;
    saveSettingsToStorage(appSettings);
    updateTrashRetentionText();

    // prune trash immediately with the latest retention setting
    const before = loadTrashFromStorage();
    const after = normalizeAndPruneTrash(before);
    if (after.length !== (Array.isArray(before) ? before.length : 0)) {
        saveTrashToStorage(after);
        updateTrashBadge();
        if (!trashModal?.classList.contains('hidden')) renderTrashList();
    }

    closeSettingsModal();
    showNotice('設定を保存しました。', 'success');
}


function resetRatiosToDefault() {
    if (!ratioLettersInput || !ratioSymbolsInput || !ratioUpperInput) return;
    ratioLettersInput.value = String(DEFAULT_SETTINGS.ratioLetters);
    ratioSymbolsInput.value = String(DEFAULT_SETTINGS.ratioSymbols);
    ratioUpperInput.value = String(DEFAULT_SETTINGS.ratioUpper);
    enforceRatioConstraint('letters');
    updateRatioSummaryText();
    showNotice('割合をリセットしました。（保存はまだです）', 'info');
}

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

function formatDDHHMMSS(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const sec = totalSec % 60;
    const dd = String(d).padStart(2, "0");
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    const ss = String(sec).padStart(2, "0");
    return `${dd}日${hh}時間${mm}分${ss}秒`;
}

function formatRemainingTime(ms) {
    if (ms <= 0) return "期限切れ";
    return formatDDHHMMSS(ms);
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


function getUsedTitleSet() {
    return new Set(
        getCards()
            .map(card => card.querySelector(".card-title")?.dataset.fullTitle || "")
            .filter(Boolean)
    );
}

/**
 * If title is duplicated, auto-append sequential number (1,2,3...) to the end.
 * ex: "メモ" -> "メモ1" -> "メモ2"
 */
function ensureUniqueTitle(desiredTitle) {
    const base = clampTitle(String(desiredTitle ?? "").trim() || "未設定");
    const used = getUsedTitleSet();
    if (!used.has(base)) return base;

    let n = 1;
    while (used.has(`${base}${n}`)) n += 1;
    return `${base}${n}`;
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
// ---------- Trash modal ----------
function openTrashModal() {
    updateTrashBadge();
    renderTrashList();
    openOverlay(trashModal);
    startTrashTicker();
}

function closeTrashModal() {
    stopTrashTicker();
    closeOverlay(trashModal);
}

function getSelectedTrashIds() {
    if (!trashList) return [];
    return Array.from(trashList.querySelectorAll('.trash-checkbox:checked'))
        .map(el => el.getAttribute('data-trash-id'))
        .filter(Boolean);
}

function setTrashActionButtonsState() {
    const selected = getSelectedTrashIds();
    const hasSelected = selected.length > 0;
    if (trashRestoreSelectedBtn) trashRestoreSelectedBtn.disabled = !hasSelected;
    if (trashDeleteSelectedBtn) trashDeleteSelectedBtn.disabled = !hasSelected;
}

function syncTrashSelectAllState() {
    if (!trashSelectAll || !trashList) return;
    const all = Array.from(trashList.querySelectorAll('.trash-checkbox'));
    const checked = all.filter(cb => cb.checked);
    trashSelectAll.checked = all.length > 0 && checked.length === all.length;
    trashSelectAll.indeterminate = checked.length > 0 && checked.length < all.length;
    setTrashActionButtonsState();
}

function renderTrashList() {
    if (!trashList) return;
    const items = getTrashItems();

    trashList.innerHTML = '';
    if (!items.length) {
        const empty = document.createElement('div');
        empty.className = 'trash-empty';
        empty.textContent = 'ゴミ箱は空です。';
        trashList.appendChild(empty);
        if (trashSelectAll) {
            trashSelectAll.checked = false;
            trashSelectAll.indeterminate = false;
        }
        setTrashActionButtonsState();
        return;
    }

    items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'trash-item';
        row.dataset.trashId = item.trashId;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'trash-checkbox';
        checkbox.setAttribute('data-trash-id', item.trashId);
        checkbox.addEventListener('change', syncTrashSelectAllState);

        const left = document.createElement('div');
        left.appendChild(checkbox);

        const main = document.createElement('div');

        const title = document.createElement('p');
        title.className = 'trash-item-title';
        title.textContent = item.title || '未設定';

        const passRow = document.createElement('div');
        passRow.className = 'trash-item-pass';

        const passText = document.createElement('span');
        passText.className = 'trash-pass-text';
        const rawPassword = String(item.password || '');

        const expiresAtMs = new Date(item.expiresAt || '').getTime();
        const withinLimit = Number.isFinite(expiresAtMs) && expiresAtMs > Date.now();

        passText.textContent = maskPassword();
        passText.dataset.revealed = 'false';
        passText.title = '';
        passText.addEventListener('click', () => {
            if (passText.dataset.revealed === 'true') showPasswordPreview(rawPassword);
        });

        const revealBtn = document.createElement('button');
        revealBtn.type = 'button';
        revealBtn.className = 'btn-secondary small-btn';
        revealBtn.classList.add('js-trash-reveal-btn');
        revealBtn.textContent = withinLimit ? '期限内' : '表示';
        revealBtn.disabled = withinLimit;
        revealBtn.addEventListener('click', () => {
            const expiresAt = new Date(row.dataset.expiresAt || '').getTime();
            const withinNow = Number.isFinite(expiresAt) && expiresAt > Date.now();
            if (withinNow) return; // safety
            const nowRevealed = passText.dataset.revealed !== 'true';
            passText.dataset.revealed = nowRevealed ? 'true' : 'false';
            passText.textContent = nowRevealed ? rawPassword : maskPassword();
            revealBtn.textContent = nowRevealed ? '隠す' : '表示';
            passText.title = nowRevealed ? rawPassword : '';
        });

        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'btn-primary small-btn';
        copyBtn.classList.add('js-trash-copy-btn');
        copyBtn.textContent = 'コピー';
        copyBtn.disabled = withinLimit;
        copyBtn.addEventListener('click', async () => {
            const expiresAt = new Date(row.dataset.expiresAt || '').getTime();
            const withinNow = Number.isFinite(expiresAt) && expiresAt > Date.now();
            if (withinNow) return; // safety
            try {
                await navigator.clipboard.writeText(rawPassword);
                showNotice('コピーしました。', 'success');
            } catch {
                showNotice('コピーに失敗しました。', 'error');
            }
        });

        passRow.append(passText, revealBtn, copyBtn);

        const meta = document.createElement('div');
        meta.className = 'trash-meta';
        const remain = document.createElement('span');
        remain.className = 'js-trash-remaining';
        remain.dataset.deletedAt = item.deletedAt || new Date().toISOString();
        meta.innerHTML = '<span>自動削除まで</span>';
        meta.appendChild(remain);

        const lock = document.createElement('span');
        lock.className = 'trash-lock-note js-trash-lock-note';
        lock.dataset.expiresAt = item.expiresAt || '';
        lock.textContent = withinLimit ? '期限内（表示・コピー不可）' : '期限切れ';
        meta.appendChild(lock);

        main.append(title, passRow, meta);

        const actions = document.createElement('div');
        actions.className = 'trash-row-actions';

        const restoreBtn = document.createElement('button');
        restoreBtn.type = 'button';
        restoreBtn.className = 'btn-secondary small-btn';
        restoreBtn.textContent = '復元';
        restoreBtn.addEventListener('click', () => restoreTrashItems([item.trashId]));

        const purgeBtn = document.createElement('button');
        purgeBtn.type = 'button';
        purgeBtn.className = 'btn-primary btn-danger small-btn';
        purgeBtn.textContent = '完全削除';
        purgeBtn.addEventListener('click', () => purgeTrashItems([item.trashId]));

        actions.append(restoreBtn, purgeBtn);

        row.append(left, main, actions);
        row.dataset.expiresAt = item.expiresAt || '';
        trashList.appendChild(row);
    });

    syncTrashSelectAllState();
    tickTrashRemaining();
}

function tickTrashRemaining() {
    if (!trashList) return;
    const now = Date.now();

    trashList.querySelectorAll('.js-trash-remaining').forEach(node => {
        const deletedAtMs = new Date(node.dataset.deletedAt || '').getTime();
        const expireMs = (Number.isFinite(deletedAtMs) ? deletedAtMs : now) + getTrashRetentionMs();
        const diff = expireMs - now;
        node.textContent = diff > 0 ? formatDDHHMMSS(diff) : '期限切れ';
    });

    // also update "within limit" lock state (card expiration)
    trashList.querySelectorAll('.trash-item').forEach(row => {
        const expiresAtMs = new Date(row.dataset.expiresAt || '').getTime();
        const withinLimit = Number.isFinite(expiresAtMs) && expiresAtMs > now;

        const passText = row.querySelector('.trash-pass-text');
        const revealBtn = row.querySelector('.js-trash-reveal-btn');
        const copyBtn = row.querySelector('.js-trash-copy-btn');
        const lockNote = row.querySelector('.js-trash-lock-note');

        if (lockNote) lockNote.textContent = withinLimit ? '期限内（表示・コピー不可）' : '期限切れ';

        if (revealBtn) {
            revealBtn.disabled = withinLimit;
            if (withinLimit) {
                revealBtn.textContent = '期限内';
                if (passText) {
                    passText.dataset.revealed = 'false';
                    passText.textContent = maskPassword();
                    passText.title = '';
                }
            } else if (passText) {
                revealBtn.textContent = passText.dataset.revealed === 'true' ? '隠す' : '表示';
            }
        }

        if (copyBtn) copyBtn.disabled = withinLimit;
    });

    // prune while ticking
    const before = loadTrashFromStorage();
    const after = normalizeAndPruneTrash(before);
    if (after.length !== (Array.isArray(before) ? before.length : 0)) {
        saveTrashToStorage(after);
        updateTrashBadge();
        if (!trashModal?.classList.contains('hidden')) renderTrashList();
    }
}

function startTrashTicker() {
    stopTrashTicker();
    tickTrashRemaining();
    trashTicker = setInterval(tickTrashRemaining, 1000);
}

function stopTrashTicker() {
    if (trashTicker) {
        clearInterval(trashTicker);
        trashTicker = null;
    }
}

function restoreTrashItems(trashIds = []) {
    const set = new Set(trashIds);
    const items = getTrashItems();
    const toRestore = items.filter(it => set.has(it.trashId));
    if (!toRestore.length) return;

    toRestore.forEach(it => {
        const expiresAt = new Date(it.expiresAt);
        const card = buildCardElement({
            id: it.id || generateId(),
            title: ensureUniqueTitle(it.title || getNextUntitledName()),
            password: String(it.password || ''),
            expiresAt: Number.isNaN(expiresAt.getTime()) ? new Date(Date.now() + 30 * 60 * 1000) : expiresAt,
            emergencyLimit: Math.max(0, parseInt(it.emergencyLimit || '0', 10) || 0),
            remaining: Math.max(0, parseInt(((it.remaining ?? it.emergencyLimit) ?? '0'), 10) || 0),
            masked: true,
            revealUntil: null
        });
        insertCard(card);
    });

    removeTrashByIds(Array.from(set));
    saveCardsToStorage();
    showNotice('復元しました。', 'success');
    renderTrashList();
}

function purgeTrashItems(trashIds = []) {
    const count = trashIds.length;
    if (count <= 0) return;

    showConfirmDialog({
        title: '完全削除の確認',
        text: count === 1 ? '選択したパスワードを完全に削除しますか？' : `選択した ${count} 件を完全に削除しますか？`,
        subtext: 'この操作は取り消せません。',
        okText: '完全削除',
        danger: true,
        onConfirm: () => {
            removeTrashByIds(trashIds);
            renderTrashList();
            showNotice('完全に削除しました。', 'info');
        }
    });
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



// ---------- Trash (Recycle bin) persistence ----------
function loadTrashFromStorage() {
    try {
        const raw = localStorage.getItem(TRASH_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed;
    } catch (err) {
        console.error("loadTrashFromStorage failed", err);
        return [];
    }
}

function saveTrashToStorage(items) {
    try {
        localStorage.setItem(TRASH_KEY, JSON.stringify(Array.isArray(items) ? items : []));
    } catch (err) {
        console.error("saveTrashToStorage failed", err);
    }
}

function generateTrashId() {
    return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeAndPruneTrash(items) {
    const now = Date.now();
    const out = [];

    (Array.isArray(items) ? items : []).forEach(item => {
        if (!item || typeof item !== "object") return;

        const deletedAt = item.deletedAt ? new Date(item.deletedAt) : null;
        const deletedAtMs = deletedAt && !Number.isNaN(deletedAt.getTime()) ? deletedAt.getTime() : now;
        const expireMs = deletedAtMs + getTrashRetentionMs();
        if (expireMs <= now) return;

        const trashId = item.trashId || generateTrashId();
        out.push({ ...item, trashId, deletedAt: new Date(deletedAtMs).toISOString() });
    });

    out.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
    return out;
}

function getTrashItems() {
    const items = normalizeAndPruneTrash(loadTrashFromStorage());
    // keep storage normalized
    saveTrashToStorage(items);
    return items;
}

function addTrashEntries(entries) {
    const current = getTrashItems();
    const next = normalizeAndPruneTrash([
        ...entries.map(e => ({ ...e, trashId: e.trashId || generateTrashId() })),
        ...current
    ]);
    saveTrashToStorage(next);
    updateTrashBadge();
    return next;
}

function removeTrashByIds(trashIds = []) {
    const set = new Set(trashIds);
    const current = getTrashItems();
    const next = current.filter(item => !set.has(item.trashId));
    saveTrashToStorage(next);
    updateTrashBadge();
    return next;
}

function clearTrash() {
    saveTrashToStorage([]);
    updateTrashBadge();
}

function updateTrashBadge() {
    if (!trashBadge) return;
    const count = getTrashItems().length;
    trashBadge.textContent = count > 99 ? "99+" : String(count);
    trashBadge.classList.toggle("hidden", count <= 0);
}

function buildTrashEntryFromCard(card) {
    const data = serializeCard(card);
    return { ...data, trashId: generateTrashId(), deletedAt: new Date().toISOString() };
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

    // Always keep in sync (settings modal can be opened without reload)
    appSettings = loadSettingsFromStorage();

    const excludeSet = new Set(String(appSettings.excludeChars || "").split(""));
    const filterPool = (pool) => String(pool).split("").filter(ch => !excludeSet.has(ch)).join("");

    let digitsPool = filterPool(numbers);
    let lowerPool = filterPool(lowerLetters);
    let upperPool = filterPool(upperLetters);
    let symbolPool = filterPool(symbols);

    const symbolsEnabled = !!includeSymbols?.checked;
    const lettersEnabled = selectedCharType !== "num";
    const digitsEnabled = selectedCharType !== "al";

    // user ratio: letters/symbols (total), digits = remainder
    let lettersPct = clampInt(appSettings.ratioLetters, 0, 100, DEFAULT_SETTINGS.ratioLetters);
    let symbolsPct = clampInt(appSettings.ratioSymbols, 0, 100, DEFAULT_SETTINGS.ratioSymbols);
    if (lettersPct + symbolsPct > 100) symbolsPct = Math.max(0, 100 - lettersPct);
    let digitsPct = Math.max(0, 100 - lettersPct - symbolsPct);

    // redistribute to available categories
    if (!symbolsEnabled) {
        digitsPct += symbolsPct;
        symbolsPct = 0;
    }
    if (!lettersEnabled) {
        digitsPct += lettersPct;
        lettersPct = 0;
    }
    if (!digitsEnabled) {
        lettersPct += digitsPct;
        digitsPct = 0;
    }

    const percentMap = {
        digits: digitsPct,
        letters: lettersPct,
        symbols: symbolsPct
    };

    function allocateCounts(total, pctByKey) {
        const keys = Object.keys(pctByKey);
        const raw = keys.map(k => ({ k, v: (total * (pctByKey[k] || 0)) / 100 }));
        const base = Object.fromEntries(raw.map(r => [r.k, Math.floor(r.v)]));
        let used = Object.values(base).reduce((a, b) => a + b, 0);
        let remain = total - used;
        raw
            .map(r => ({ k: r.k, frac: r.v - Math.floor(r.v) }))
            .sort((a, b) => b.frac - a.frac)
            .forEach(({ k }) => {
                if (remain <= 0) return;
                base[k] += 1;
                remain -= 1;
            });
        return base;
    }

    let counts = allocateCounts(length, percentMap);

    // If a pool is empty, move its counts to other available pools.
    const poolByKey = {
        digits: digitsPool,
        letters: (lowerPool + upperPool),
        symbols: symbolPool
    };
    const keysOrder = ["digits", "letters", "symbols"]; // fallback preference
    keysOrder.forEach(src => {
        if (counts[src] <= 0) return;
        if (poolByKey[src] && poolByKey[src].length) return;
        // move src counts away
        let move = counts[src];
        counts[src] = 0;
        while (move > 0) {
            const dst = keysOrder.find(k => k !== src && (poolByKey[k] && poolByKey[k].length));
            if (!dst) break;
            counts[dst] += 1;
            move -= 1;
        }
    });

    // If everything is excluded, fall back to digits
    if ((!digitsPool || !digitsPool.length) && (!lowerPool && !upperPool) && (!symbolPool || !symbolPool.length)) {
        digitsPool = numbers;
        counts = { digits: length, letters: 0, symbols: 0 };
        showNotice("除外文字の影響で候補がなくなったため、数字のみで生成しました。", "info");
    }

    // split letters into lower/upper
    const upperPct = clampInt(appSettings.ratioUpper, 0, 100, DEFAULT_SETTINGS.ratioUpper);
    let upperCount = 0;
    let lowerCount = 0;
    if (counts.letters > 0) {
        if (lowerCase?.checked && !upperCase?.checked) {
            lowerCount = counts.letters;
        } else if (upperCase?.checked && !lowerCase?.checked) {
            upperCount = counts.letters;
        } else {
            upperCount = Math.round((counts.letters * upperPct) / 100);
            upperCount = Math.max(0, Math.min(counts.letters, upperCount));
            lowerCount = counts.letters - upperCount;
        }

        // if some pool is empty, shift within letters
        if (upperCount > 0 && (!upperPool || !upperPool.length)) {
            lowerCount += upperCount;
            upperCount = 0;
        }
        if (lowerCount > 0 && (!lowerPool || !lowerPool.length)) {
            upperCount += lowerCount;
            lowerCount = 0;
        }
    }

    // build characters
    const chars = [];
    const randFrom = (pool) => pool[Math.floor(Math.random() * pool.length)];

    for (let i = 0; i < (counts.digits || 0); i++) {
        if (!digitsPool?.length) break;
        chars.push(randFrom(digitsPool));
    }
    for (let i = 0; i < lowerCount; i++) {
        if (!lowerPool?.length) break;
        chars.push(randFrom(lowerPool));
    }
    for (let i = 0; i < upperCount; i++) {
        if (!upperPool?.length) break;
        chars.push(randFrom(upperPool));
    }
    for (let i = 0; i < (counts.symbols || 0); i++) {
        if (!symbolPool?.length) break;
        chars.push(randFrom(symbolPool));
    }

    // if counts got reduced due to empty pools, refill with any available pool
    const allPool = (digitsPool || "") + (lowerPool || "") + (upperPool || "") + (symbolsEnabled ? (symbolPool || "") : "");
    while (chars.length < length && allPool.length) {
        chars.push(randFrom(allPool));
    }

    // shuffle
    for (let i = chars.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    pwDisplay.value = chars.join("");
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
    // Show full title; actual visible range is controlled by CSS width (ellipsis)
    titleEl.textContent = safeFullTitle;
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

function deleteCard(card, { silent = false, skipSave = false } = {}) {
    if (!card) return;

    const entry = buildTrashEntryFromCard(card);
    addTrashEntries([entry]);

    clearCardTimers(card);
    if (activeMenuCard === card) activeMenuCard = null;
    card.remove();

    if (!skipSave) saveCardsToStorage();
    if (!silent) showNotice("ゴミ箱に移動しました。", "info");
}

function askDeleteSingleCard(card) {
    const title = card.querySelector(".card-title")?.dataset.fullTitle || "このカード";
    const days = getTrashRetentionDays();
    showConfirmDialog({
        title: "削除の確認",
        text: `「${title}」をゴミ箱に移動しますか？`,
        subtext: `ゴミ箱の中で${days}日間保存されます（復元・完全削除が可能）。`,
        okText: "削除する",
        danger: true,
        onConfirm: () => deleteCard(card)
    });
}

function deleteAllCards() {
    const cards = getCards();
    if (!cards.length) {
        showNotice("削除するカードはありません。", "info");
        return;
    }

    const entries = cards.map(card => buildTrashEntryFromCard(card));

    closeCardMenu();
    activeMenuCard = null;

    cards.forEach(card => {
        clearCardTimers(card);
        card.remove();
    });

    addTrashEntries(entries);
    localStorage.removeItem(STORAGE_KEY);
    showNotice("すべてのカードをゴミ箱に移動しました。", "info");
}

function askDeleteAllCards() {
    const count = getCards().length;
    if (count <= 0) {
        showNotice("削除するカードはありません。", "info");
        return;
    }
    const days = getTrashRetentionDays();
    showConfirmDialog({
        title: "全削除の確認",
        text: "保存済みのパスワードカードをすべてゴミ箱に移動します。",
        subtext: `対象件数: ${count}件（${days}日間保存）`,
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
    const baseTitle = rawName ? clampTitle(rawName) : getNextUntitledName();
    const title = rawName ? ensureUniqueTitle(baseTitle) : baseTitle;
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
            title: ensureUniqueTitle(item.title || getNextUntitledName()),
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
function bindLogoNavigation() {
    const logo = document.querySelector('.logo');
    if (!logo) return;

    logo.setAttribute('role', 'button');
    logo.setAttribute('tabindex', '0');

    const goHome = () => {
        const path = window.location.pathname || '';
        const isHome = /(?:^|\/)(?:index\.html)?$/.test(path) || path.endsWith('/') || path.endsWith('/index.html');
        if (isHome) window.location.reload();
        else window.location.href = 'index.html';
    };

    logo.addEventListener('click', goHome);
    logo.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            goHome();
        }
    });
}

function setupBasicEvents() {
    bindLogoNavigation();
    // Settings
    settingsBtn?.addEventListener("click", openSettingsModal);
    settingsCancelBtn?.addEventListener("click", closeSettingsModal);
    settingsSaveBtn?.addEventListener("click", saveSettingsFromModal);
    ratioLettersInput?.addEventListener("input", () => enforceRatioConstraint('letters'));
    ratioSymbolsInput?.addEventListener("input", () => enforceRatioConstraint('symbols'));
    ratioUpperInput?.addEventListener("input", updateRatioSummaryText);
    ratioResetBtn?.addEventListener("click", resetRatiosToDefault);
    trashRetentionDaysInput?.addEventListener("input", () => {
        const n = clampInt(trashRetentionDaysInput.value, 1, 30, getTrashRetentionDays());
        trashRetentionDaysInput.value = String(n);
    });
    excludeCharsInput?.addEventListener("input", () => {
        // no-op, but keep for future
    });

    createBtn?.addEventListener("click", openCreateModal);
    createCardBtn?.addEventListener("click", openCreateModal);

    // Navigate to mini game page
    minigameBtn?.addEventListener("click", () => {
        window.location.href = "minigame.html";
    });
    createCardBtn?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openCreateModal();
        }
    });

    cancelBtn?.addEventListener("click", closeModal);
    saveBtn?.addEventListener("click", saveNewCardFromModal);
    deleteAllBtn?.addEventListener("click", askDeleteAllCards);

    trashBtn?.addEventListener("click", openTrashModal);
    trashCloseBtn?.addEventListener("click", closeTrashModal);

    trashSelectAll?.addEventListener("change", () => {
        if (!trashList) return;
        const check = !!trashSelectAll.checked;
        trashList.querySelectorAll(".trash-checkbox").forEach(cb => { cb.checked = check; });
        syncTrashSelectAllState();
    });

    trashRestoreSelectedBtn?.addEventListener("click", () => {
        const ids = getSelectedTrashIds();
        if (ids.length) restoreTrashItems(ids);
    });

    trashDeleteSelectedBtn?.addEventListener("click", () => {
        const ids = getSelectedTrashIds();
        if (ids.length) purgeTrashItems(ids);
    });

    trashEmptyBtn?.addEventListener("click", () => {
        const items = getTrashItems();
        if (!items.length) { showNotice("ゴミ箱は空です。", "info"); return; }
        showConfirmDialog({
            title: "ゴミ箱を空にする",
            text: `ゴミ箱内の ${items.length} 件をすべて完全に削除しますか？`,
            subtext: "この操作は取り消せません。",
            okText: "全削除",
            danger: true,
            onConfirm: () => {
                clearTrash();
                renderTrashList();
                showNotice("ゴミ箱を空にしました。", "info");
            }
        });
    });


    [modal, extendLimitModal, confirmModal, passwordPreviewModal, trashModal, settingsModal].forEach(overlay => {
        overlay?.addEventListener("click", (e) => {
            if (e.target !== overlay) return;
            if (overlay === modal) closeModal();
            else if (overlay === extendLimitModal) closeExtendLimitModal();
            else if (overlay === confirmModal) closeConfirmDialog();
            else if (overlay === passwordPreviewModal) closePasswordPreview();
            else if (overlay === trashModal) closeTrashModal();
            else if (overlay === settingsModal) closeSettingsModal();
        });
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (activeMenuCard) closeActiveMenu();
            else if (!confirmModal?.classList.contains("hidden")) closeConfirmDialog();
            else if (!passwordPreviewModal?.classList.contains("hidden")) closePasswordPreview();
            else if (!trashModal?.classList.contains("hidden")) closeTrashModal();
            else if (!extendLimitModal?.classList.contains("hidden")) closeExtendLimitModal();
            else if (!settingsModal?.classList.contains("hidden")) closeSettingsModal();
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
    appSettings = loadSettingsFromStorage();
    updateTrashRetentionText();

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
    updateTrashBadge();
    // prune trash periodically
    setInterval(() => {
        const before = loadTrashFromStorage();
        const after = normalizeAndPruneTrash(before);
        if (after.length !== (Array.isArray(before) ? before.length : 0)) {
            saveTrashToStorage(after);
            updateTrashBadge();
            if (!trashModal?.classList.contains("hidden")) renderTrashList();
        }
    }, 60 * 1000);
    updateReloadButtonState();
    updateCaseOptionRestrictions();
    toggleOptions();
    restoreCards();
}

document.addEventListener("DOMContentLoaded", init);
