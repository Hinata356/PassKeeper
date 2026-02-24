document.addEventListener("DOMContentLoaded", () => {
    loadCardsFromStorage();
    ensureEmptyCard();
    updateCountdown();
});

function saveToStorage() {
    const cards = document.querySelectorAll(".card:not(.empty)");
    const data = [];

    cards.forEach(card => {
        data.push({
            name: card.querySelector(".card-name").textContent,
            password: card.dataset.password,
            deadline: parseInt(card.dataset.deadline),
            emergency: parseInt(card.dataset.emergency)
        });
    });

    localStorage.setItem("passkeeper_cards", JSON.stringify(data));
}

function loadCardsFromStorage() {
    const saved = JSON.parse(localStorage.getItem("passkeeper_cards"));
    if (!saved) return;

    saved.forEach(item => {
        const card = document.querySelector(".card.empty");
        card.classList.remove("empty");

        card.innerHTML = `
            <div class="card-title">
                <span class="card-name">${item.name}</span>
                <span class="card-dots">●●●●</span>
            </div>

            <div class="card-info">
                <p class="lock-time">計算中...</p>
                <p class="emergency-count">残り ${item.emergency}/${item.emergency} 回</p>
            </div>

            <div class="alert">
                <span class="alert-icon">▲</span>
                <div class="alert-text">
                    表示回数が制限されています！<br>
                    パスワードの表示は慎重に行ってください
                </div>
            </div>

            <button class="show-btn show-button">表示</button>
        `;

        card.dataset.password = item.password;
        card.dataset.deadline = item.deadline;
        card.dataset.emergency = item.emergency;

        // 次の空カードが必要なら作る
        ensureEmptyCard();
        saveToStorage();
    });
}

function ensureEmptyCard() {
    if (!document.querySelector(".card.empty")) {
        const newEmpty = document.createElement("div");
        newEmpty.className = "card empty";
        cardContainer.appendChild(newEmpty);
    }
}

const createBtn = document.getElementById("create-pass-btn");
const modal = document.getElementById("modal");
const saveBtn = document.getElementById("save-btn");
const cancelBtn = document.getElementById("cancel-btn");
const generateBtn = document.getElementById("generate-btn");
const cardContainer = document.querySelector(".card-container");

// モーダル表示 / 非表示
createBtn.addEventListener("click", () => modal.classList.remove("hidden"));
cancelBtn.addEventListener("click", () => modal.classList.add("hidden"));

// ランダム生成関数
function generatePassword(length = 4, charset = "num") {
let chars = "0123456789";
if (charset === "alpha") chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
if (charset === "all") chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";

let result = "";
for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
}
return result;
}

function updateCountdown() {
    const cards = document.querySelectorAll(".card:not(.empty)");

    cards.forEach(card => {
        const deadline = parseInt(card.dataset.deadline);
        const now = Date.now();
        const timeLeft = deadline - now;
        const lockEl = card.querySelector(".lock-time");

        if (timeLeft <= 0) {
            lockEl.textContent = "表示可能";
            card.classList.remove("locked"); // 必要なら外見変更
            return;
        }

        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

        lockEl.textContent = `あと ${hours}時間 ${minutes}分 ${seconds}秒`;
    });
}

setInterval(() => {
    updateCountdown;
}, 1000);


// 生成ボタン押下
generateBtn.addEventListener("click", () => {
const len = parseInt(document.getElementById("length-input").value);
const charset = document.getElementById("charset-select").value;
document.getElementById("manual-pass-input").value = generatePassword(len, charset);
});

// 保存処理
saveBtn.addEventListener("click", () => {
    const name = document.getElementById("name-input").value.trim();
    const manualPass = document.getElementById("manual-pass-input").value.trim();
    const deadline = document.getElementById("deadline-input").value; // datetime-local

    // パス名自動生成
    const existingCount = document.querySelectorAll(".card:not(.empty)").length;
    const finalName = name || `Pass${existingCount + 1}`;
    const password = manualPass || generatePassword();

    const empty = document.querySelector(".card.empty");
    empty.classList.remove("empty");

    empty.innerHTML = `
        <div class="card-title">
            <span class="card-name">${finalName}</span>
            <span class="card-dots">●●●●</span>
            <button class="edit-btn">⋮</button>
        </div>

        <div class="card-info">
            <p class="lock-time">計算中...</p>
            <p class="emergency-count">残り 1/1 回</p>
        </div>

        <div class="alert">
            <span class="alert-icon">▲</span>
            <div class="alert-text">
                表示回数が制限されています！<br>
                パスワードの表示は慎重に行ってください
            </div>
        </div>

        <button class="show-btn show-button">表示</button>
    `;

    empty.dataset.password = password;
    empty.dataset.deadline = new Date(deadline).getTime();
    empty.dataset.emergency = 1;

    if (!document.querySelector(".card.empty")) {
        const newEmpty = document.createElement("div");
        newEmpty.className = "card empty";
        cardContainer.appendChild(newEmpty);
    }

    modal.classList.add("hidden");
    saveToStorage();
});

// 表示ボタンの動作
document.addEventListener("click", (e) => {
    if (!e.target.classList.contains("show-btn")) return;

    const card = e.target.closest(".card");
    const deadline = parseInt(card.dataset.deadline);
    let emergency = parseInt(card.dataset.emergency);
    const password = card.dataset.password;
    const dotsEl = card.querySelector(".card-dots");

    // ロック中
    if (Date.now() < deadline) {
        alert("まだ表示できません。期限までお待ちください。");
        return;
    }

    // 緊急回数ゼロ
    if (emergency <= 0) {
        alert("表示可能回数がありません");
        return;
    }

    // 確認ダイアログ
    const confirmShow = confirm(`パスワードを表示しますか？\n残り ${emergency} 回`);
    if (!confirmShow) return;

    // 表示へ反映
    dotsEl.textContent = password;

    // 緊急回数減少
    emergency--;
    card.dataset.emergency = emergency;

    // 緊急回数表示更新
    const emergencyText = card.querySelector(".emergency-count");
    emergencyText.textContent = `残り ${emergency}/1 回`;
});

let editingCard = null;

// 編集ボタン押下
document.addEventListener("click", (e) => {
    if (!e.target.classList.contains("edit-btn")) return;

    editingCard = e.target.closest(".card");

    document.getElementById("edit-name").value =
        editingCard.querySelector(".card-name").textContent;

    document.getElementById("edit-password").value =
        editingCard.dataset.password;

    document.getElementById("edit-deadline").value =
        new Date(parseInt(editingCard.dataset.deadline))
        .toISOString().slice(0, 16);

    document.getElementById("edit-emergency").value =
        editingCard.dataset.emergency;

    document.getElementById("edit-modal").classList.remove("hidden");
});

// 保存（編集）
document.getElementById("edit-save-btn").addEventListener("click", () => {

    if (!confirm("変更を保存しますか？")) return;

    const newName = document.getElementById("edit-name").value;
    const newPass = document.getElementById("edit-password").value;
    const newDeadline = new Date(document.getElementById("edit-deadline").value).getTime();
    const newEmergency = document.getElementById("edit-emergency").value;

    editingCard.querySelector(".card-name").textContent = newName;
    editingCard.dataset.password = newPass;
    editingCard.dataset.deadline = newDeadline;
    editingCard.dataset.emergency = newEmergency;
    editingCard.querySelector(".emergency-count").textContent = `残り ${newEmergency}/${newEmergency} 回`;

    saveToStorage();
    document.getElementById("edit-modal").classList.add("hidden");
});

// 削除処理
document.getElementById("delete-btn").addEventListener("click", () => {
    if (!confirm("本当に削除しますか？")) return;

    editingCard.remove();
    saveToStorage();
    ensureEmptyCard();
    document.getElementById("edit-modal").classList.add("hidden");
});

// キャンセル
document.getElementById("edit-cancel-btn").addEventListener("click", () => {
    document.getElementById("edit-modal").classList.add("hidden");
});

// 全削除ボタン
document.getElementById("delete-all-btn").addEventListener("click", () => {
    const result = confirm("登録されている全パスワードを削除しますか？\nこの操作は元に戻せません。");
    if (!result) return;

    localStorage.removeItem("passkeeper_cards");
    location.reload();
});
