// ==========================================
// PassKeeper Minigames
// - Solo Concentration (Number pairs)
// - Number Memory
// ==========================================

(() => {
  const $ = (id) => document.getElementById(id);

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function formatTime(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = String(Math.floor(total / 60)).padStart(2, "0");
    const s = String(total % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  function starsText(count) {
    if (!count || count <= 0) return "–";
    return "★".repeat(count);
  }

  // ==========================================
  // MiniGame: Solo Concentration (Number pairs)
  // - board: 4x4 / 6x6 / 8x8 / 10x10
  // - score: turns (lower is better), efficiency, time
  // - keep top 5 per board size (turn asc, time asc)
  // ==========================================

  const SoloMemory = (() => {
    const elTurns = $("smTurns");
    const elMiss = $("smMiss");
    const elEff = $("smEff");
    const elTime = $("smTime");
    const elStars = $("smStars");
    const elStatus = $("smStatus");
    const elBoard = $("smBoard");
    const elTopList = $("smTopList");
    const btnStart = $("smStart");
    const btnRestart = $("smRestart");
    const btnQuit = $("smQuit");

    const sizeButtons = Array.from(document.querySelectorAll(".sm-size"));

    const STORAGE_KEY = "passkeeper.minigame.soloMemory.records.v1";
    const THRESHOLDS = {
      // ★判定は「総ターン数T（=2枚めくりを1ターン）」の閾値で決定
      // ※小さい盤面（4×4 / 6×6）は★6を取りやすめに調整
      4: { 2: 18, 3: 16, 4: 14, 5: 13, 6: 12 },
      6: { 2: 42, 3: 37, 4: 33, 5: 29, 6: 26 },
      8: { 2: 58, 3: 52, 4: 47, 5: 44, 6: 41 },
      10: { 2: 96, 3: 86, 4: 79, 5: 73, 6: 68 },
    };

    let selectedSize = 4;
    let turns = 0;
    let matchedPairs = 0;
    let totalPairs = 0;
    let firstBtn = null;
    let lock = false;
    let startedAt = 0;
    let elapsedMs = 0;
    let timerId = null;
    let inGame = false;
    let runId = 0;

    function setStatus(text) {
      if (elStatus) elStatus.textContent = String(text || "");
    }

    function setSizeButtonsEnabled(enabled) {
      sizeButtons.forEach((b) => {
        b.disabled = !enabled;
      });
    }

    function ratingFromTurns(size, t) {
      const map = THRESHOLDS[size];
      if (!map || !Number.isFinite(t) || t <= 0) return 0;
      for (let s = 6; s >= 1; s--) {
        if (t <= map[s]) return s;
      }
      return 1;
    }

    function computeEfficiency() {
      if (!turns) return 0;
      return totalPairs / turns;
    }

    function updateUI() {
      if (elTurns) elTurns.textContent = String(turns);
      const misses = Math.max(0, turns - matchedPairs);
      if (elMiss) elMiss.textContent = String(misses);
      if (elEff) elEff.textContent = computeEfficiency().toFixed(2);

      const ms = inGame && startedAt ? Date.now() - startedAt : elapsedMs;
      if (elTime) elTime.textContent = formatTime(ms);

      const star = matchedPairs === totalPairs && totalPairs > 0 ? ratingFromTurns(selectedSize, turns) : 0;
      if (elStars) elStars.textContent = star ? starsText(star) : "–";
    }

    function stopTimer() {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
    }

    function startTimer() {
      stopTimer();
      timerId = setInterval(() => {
        if (!inGame) return;
        updateUI();
      }, 250);
    }

    function loadAllRecords() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const obj = JSON.parse(raw);
        return obj && typeof obj === "object" ? obj : {};
      } catch {
        return {};
      }
    }

    function saveAllRecords(obj) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(obj || {}));
      } catch {
        // ignore
      }
    }

    function loadRecordsForSize(size) {
      const all = loadAllRecords();
      const list = all[String(size)];
      if (!Array.isArray(list)) return [];
      return list
        .map((r) => ({
          turns: Number(r?.turns),
          timeMs: Number(r?.timeMs),
        }))
        .filter((r) => Number.isFinite(r.turns) && r.turns > 0 && Number.isFinite(r.timeMs) && r.timeMs >= 0)
        .sort((a, b) => (a.turns - b.turns) || (a.timeMs - b.timeMs))
        .slice(0, 5);
    }

    function saveRecord(size, record) {
      const all = loadAllRecords();
      const key = String(size);
      const current = Array.isArray(all[key]) ? all[key] : [];
      const next = [...current, record]
        .map((r) => ({ turns: Number(r?.turns), timeMs: Number(r?.timeMs) }))
        .filter((r) => Number.isFinite(r.turns) && r.turns > 0 && Number.isFinite(r.timeMs) && r.timeMs >= 0)
        .sort((a, b) => (a.turns - b.turns) || (a.timeMs - b.timeMs))
        .slice(0, 5);
      all[key] = next;
      saveAllRecords(all);
    }

    function updateRankingUI() {
      if (!elTopList) return;
      elTopList.innerHTML = "";
      const top = loadRecordsForSize(selectedSize);
      if (!top.length) {
        const li = document.createElement("li");
        li.textContent = "–";
        elTopList.appendChild(li);
        return;
      }
      top.forEach((r) => {
        const li = document.createElement("li");
        const star = ratingFromTurns(selectedSize, r.turns);
        li.textContent = `${r.turns} ターン（${formatTime(r.timeMs)}） ${starsText(star)}`;
        elTopList.appendChild(li);
      });
    }

    function setSelectedSize(size) {
      selectedSize = [4, 6, 8, 10].includes(Number(size)) ? Number(size) : 4;
      sizeButtons.forEach((b) => b.classList.toggle("is-active", Number(b.dataset.size) === selectedSize));
      updateRankingUI();
      if (!inGame) {
        setStatus(`サイズ: ${selectedSize}×${selectedSize}（「スタート」で開始）`);
      }
    }

    function makeDeck(size) {
      const n = size * size;
      const pairs = n / 2;
      const deck = [];
      for (let i = 1; i <= pairs; i++) {
        deck.push(i);
        deck.push(i);
      }
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      return { deck, pairs };
    }

    function clearBoard() {
      if (elBoard) elBoard.innerHTML = "";
      firstBtn = null;
      lock = false;
    }

    function resetGameUI() {
      runId += 1;
      turns = 0;
      matchedPairs = 0;
      totalPairs = 0;
      startedAt = 0;
      elapsedMs = 0;
      inGame = false;
      stopTimer();
      clearBoard();

      setSizeButtonsEnabled(true);
      if (btnStart) btnStart.disabled = false;
      if (btnRestart) btnRestart.disabled = true;
      if (btnQuit) btnQuit.disabled = true;
      updateUI();
    }

    async function flipBack(a, b, token) {
      await sleep(650);
      if (token !== runId) return;
      if (!a?.isConnected || !b?.isConnected) return;
      [a, b].forEach((btn) => {
        btn.classList.remove("is-flipped");
        btn.textContent = "";
        btn.disabled = false;
      });
    }

    async function onCardClick(btn) {
      const token = runId;
      if (!inGame || lock) return;
      if (token !== runId) return;
      if (!btn || btn.disabled) return;
      if (btn.classList.contains("is-matched") || btn.classList.contains("is-flipped")) return;

      btn.classList.add("is-flipped");
      btn.textContent = btn.dataset.value || "";

      if (!firstBtn) {
        firstBtn = btn;
        return;
      }

      // second pick
      lock = true;
      turns += 1;
      updateUI();

      const a = firstBtn;
      const b = btn;
      a.disabled = true;
      b.disabled = true;

      const isMatch = a.dataset.value === b.dataset.value;
      if (isMatch) {
        a.classList.add("is-matched");
        b.classList.add("is-matched");
        matchedPairs += 1;
        firstBtn = null;
        lock = false;

        if (matchedPairs >= totalPairs) {
          // finish
          inGame = false;
          stopTimer();
          const timeMs = Date.now() - startedAt;
          elapsedMs = timeMs;
          const star = ratingFromTurns(selectedSize, turns);
          saveRecord(selectedSize, { turns, timeMs });
          updateRankingUI();
          updateUI();
          setStatus(`クリア！ ${turns} ターン / 効率 ${(totalPairs / Math.max(1, turns)).toFixed(2)} / ${formatTime(timeMs)} ${starsText(star)}`);
          if (btnStart) btnStart.disabled = false;
          if (btnRestart) btnRestart.disabled = false;
          if (btnQuit) btnQuit.disabled = false;
          setSizeButtonsEnabled(true);
          return;
        }

        setStatus(`成功！ 残り ${totalPairs - matchedPairs} ペア`);
        return;
      }

      // mismatch
      setStatus("不一致…");
      await flipBack(a, b, token);
      if (token !== runId) return;
      a.disabled = false;
      b.disabled = false;
      firstBtn = null;
      lock = false;
      updateUI();
      setStatus(`もう一度：残り ${totalPairs - matchedPairs} ペア`);
    }

    function quitGame() {
      // Stop and reset without saving record
      resetGameUI();
      setStatus(`やめました：サイズ ${selectedSize}×${selectedSize}（変更できます）`);
    }

    function startGame() {
      resetGameUI();
      const { deck, pairs } = makeDeck(selectedSize);
      totalPairs = pairs;
      inGame = true;
      startedAt = Date.now();
      elapsedMs = 0;
      startTimer();

      if (btnStart) btnStart.disabled = true;
      if (btnRestart) btnRestart.disabled = false;
      if (btnQuit) btnQuit.disabled = false;
      setSizeButtonsEnabled(false);

      if (elBoard) {
        elBoard.style.setProperty("--cols", String(selectedSize));
        elBoard.innerHTML = "";
        deck.forEach((v, idx) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "sm-card";
          b.dataset.index = String(idx);
          b.dataset.value = String(v);
          b.setAttribute("aria-label", "カード");
          b.addEventListener("click", () => onCardClick(b));
          elBoard.appendChild(b);
        });
      }

      setStatus(`開始！ ${selectedSize}×${selectedSize}（${totalPairs} ペア）`);
      updateUI();
    }

    function bind() {
      if (btnStart) btnStart.addEventListener("click", startGame);
      if (btnQuit) btnQuit.addEventListener("click", quitGame);
      if (btnRestart) {
        btnRestart.addEventListener("click", () => {
          startGame();
        });
      }

      sizeButtons.forEach((b) => {
        b.addEventListener("click", () => {
          if (inGame) {
            setStatus("プレイ中はサイズ変更できません（やめる/クリア後に変更）");
            return;
          }
          const next = Number(b.dataset.size);
          setSelectedSize(next);
          resetGameUI();
          setStatus(`サイズ: ${selectedSize}×${selectedSize}（「スタート」で開始）`);
        });
      });
    }

    function init() {
      if (!elBoard || !btnStart) return; // page guard
      bind();
      setSelectedSize(4);
      resetGameUI();
      updateRankingUI();
    }

    return { init };
  })();

  // ==========================================
  // MiniGame: Number Memory
  // - show digits sequentially
  // - user inputs order
  // - score = consecutive successes (S)
  // - display max length (L) = S + 2
  // - keep top 5 scores
  // ==========================================

    const NumberMemory = (() => {
    const elScore = $("nmScore");
    const elLen = $("nmLen");
    const elStars = $("nmStars");
    const elBest = $("nmBest");
    const elTopList = $("nmTopList");
    const elStatus = $("nmStatus");
    const elDisplay = $("nmDisplay");
    const elInputArea = $("nmInputArea");
    const elTyped = $("nmTyped");
    const btnStart = $("nmStart");
    const btnRestart = $("nmRestart");
    const btnQuit = $("nmQuit");
    const btnOk = $("nmOk");
    const btnBack = $("nmBack");
    const btnClear = $("nmClear");

    const STORAGE_KEY = "passkeeper.minigame.numberMemory.scores.v2";

    const DEFAULT_START_LEN = 3;
    const SHOW_MS = 650;
    const GAP_MS = 140;

    // 開始を分かりやすくするため、毎回「Ready」を少し長めに表示（カウントダウン無し）
    const READY_MS = 950;

    let sequence = [];
    let input = "";
    let score = 0;
    let seqLen = DEFAULT_START_LEN;
    let busy = false;
    let inSession = false; // セッション中はテンキーを隠さない（レイアウトジャンプ防止）
    let keyboardBound = false;
    let runToken = 0;
    const pendingTimeouts = new Set();

    function schedule(fn, ms) {
      const id = setTimeout(() => {
        pendingTimeouts.delete(id);
        fn();
      }, ms);
      pendingTimeouts.add(id);
      return id;
    }

    function clearPending() {
      for (const id of pendingTimeouts) clearTimeout(id);
      pendingTimeouts.clear();
    }

    function nmStarCount(s) {
      if (s >= 8) return 6;
      if (s >= 6) return 5;
      if (s === 5) return 4;
      if (s === 4) return 3;
      if (s === 3) return 2;
      if (s >= 1) return 1;
      return 0;
    }

    function loadTopScores() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
          .map((v) => parseInt(v, 10))
          .filter((v) => Number.isFinite(v) && v >= 0)
          .sort((a, b) => b - a)
          .slice(0, 5);
      } catch {
        return [];
      }
    }

    function saveTopScores(list) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(list) ? list.slice(0, 5) : []));
      } catch {
        // ignore
      }
    }

    function updateScoreUI() {
      const len = score + 2;
      const star = nmStarCount(score);

      if (elScore) elScore.textContent = String(score);
      if (elLen) elLen.textContent = String(len);
      if (elStars) elStars.textContent = star ? starsText(star) : "–";

      const top = loadTopScores();
      const best = top[0] ?? 0;
      if (elBest) elBest.textContent = String(best);

      if (elTopList) {
        elTopList.innerHTML = "";
        const list = top.length ? top : [0];
        list.forEach((v) => {
          const li = document.createElement("li");
          const L = v + 2;
          li.textContent = `${v} 回（${L} 桁） ${starsText(nmStarCount(v))}`;
          elTopList.appendChild(li);
        });
      }
    }

    function setStatus(text) {
      if (elStatus) elStatus.textContent = String(text || "");
    }

    function setDisplay(text) {
      if (elDisplay) elDisplay.textContent = String(text || "–");
    }

    function flashDisplay() {
      if (!elDisplay) return;
      elDisplay.classList.remove("nm-flash");
      // force reflow so the animation restarts
      void elDisplay.offsetWidth;
      elDisplay.classList.add("nm-flash");
    }

    function setInputAreaVisible(visible) {
      if (!elInputArea) return;
      // セッション中は隠さない（毎問ごとの表示/非表示でスクロールが動くのを防ぐ）
      const shouldShow = inSession ? true : !!visible;
      elInputArea.classList.toggle("hidden", !shouldShow);
    }

    function setTyped(text) {
      input = String(text ?? "");
      if (elTyped) elTyped.textContent = input;
    }

    function enableControls({ start = true, restart = true, quit = false, inputEnabled = true } = {}) {
      if (btnStart) btnStart.disabled = !start;
      if (btnRestart) btnRestart.disabled = !restart;
      if (btnQuit) btnQuit.disabled = !quit;

      const keys = document.querySelectorAll(".nm-key");
      keys.forEach((b) => (b.disabled = !inputEnabled));
      if (btnOk) btnOk.disabled = !inputEnabled;
      if (btnBack) btnBack.disabled = !inputEnabled;
      if (btnClear) btnClear.disabled = !inputEnabled;
    }

    function makeSequence(len) {
      const out = [];
      for (let i = 0; i < len; i++) out.push(String(Math.floor(Math.random() * 10)));
      return out;
    }

    async function showSequence(seq, token) {
      // show digits one by one (keep keypad visible, just disable input)
      setInputAreaVisible(true);
      setTyped("");
      enableControls({ start: false, restart: true, quit: true, inputEnabled: false });

      const roundNo = score + 1;
      setStatus(`第${roundNo}問：${seq.length} 桁（開始します）`);
      setDisplay("Ready");
      flashDisplay();

      await sleep(READY_MS);
      if (token !== runToken) return false;

      setDisplay("–");
      await sleep(180);
      if (token !== runToken) return false;

      for (const d of seq) {
        setDisplay(d);
        await sleep(SHOW_MS);
        if (token !== runToken) return false;
        setDisplay(" ");
        await sleep(GAP_MS);
        if (token !== runToken) return false;
      }

      setDisplay("入力してください");
      setStatus("テンキー、またはキーボードで入力 → OK");
      setInputAreaVisible(true);
      enableControls({ start: false, restart: true, quit: true, inputEnabled: true });
      return true;
    }

    function endGame(message, { reveal = true } = {}) {
      inSession = false;
      setInputAreaVisible(false);
      setStatus(message);
      if (reveal) setDisplay(`正解: ${sequence.join("")}`);

      // update top scores
      const top = loadTopScores();
      const next = [score, ...top].sort((a, b) => b - a).slice(0, 5);
      saveTopScores(next);
      updateScoreUI();

      clearPending();
      runToken += 1;
      enableControls({ start: true, restart: false, quit: false, inputEnabled: false });
      if (btnQuit) btnQuit.disabled = true;
      busy = false;
    }

    async function nextRound() {
      if (busy) return;
      busy = true;

      const token = runToken;
      sequence = makeSequence(seqLen);
      const ok = await showSequence(sequence, token);
      if (!ok || token !== runToken) {
        busy = false;
        return;
      }
      busy = false;
    }

    function resetGame() {
      clearPending();
      runToken += 1;
      sequence = [];
      input = "";
      score = 0;
      seqLen = DEFAULT_START_LEN;
      inSession = false;
      setTyped("");
      setInputAreaVisible(false);
      setStatus("「スタート」で開始");
      setDisplay("–");
      enableControls({ start: true, restart: false, quit: false, inputEnabled: false });
      updateScoreUI();
      busy = false;
    }

    function checkAnswer() {
      if (!sequence.length) return;
      const expected = sequence.join("");

      if (input === expected) {
        score += 1;
        seqLen += 1;
        updateScoreUI();
        setStatus(`成功！ 次は ${seqLen} 桁`);
        setDisplay("✓");
        // Keep keypad visible; just lock input until next round
        setInputAreaVisible(true);
        enableControls({ start: false, restart: true, quit: true, inputEnabled: false });
        schedule(() => nextRound(), 750);
        return;
      }

      endGame(`終了！ スコア: ${score} 回（最大 ${score + 2} 桁）`, { reveal: true });
    }

    function bindPad() {
      document.querySelectorAll(".nm-key[data-digit]").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (btn.disabled) return;
          const d = btn.getAttribute("data-digit");
          if (!d) return;
          if (input.length >= seqLen) return;
          setTyped(input + d);
        });
      });

      btnBack?.addEventListener("click", () => {
        if (btnBack.disabled) return;
        setTyped(input.slice(0, -1));
      });

      btnClear?.addEventListener("click", () => {
        if (btnClear.disabled) return;
        setTyped("");
      });

      btnOk?.addEventListener("click", () => {
        if (btnOk.disabled) return;
        checkAnswer();
      });

      if (!keyboardBound) {
        keyboardBound = true;
        document.addEventListener("keydown", (e) => {
          if (busy) return;
          const inputEnabled = !btnOk?.disabled;
          if (!inputEnabled) return;

          if (e.key >= "0" && e.key <= "9") {
            if (input.length >= seqLen) return;
            setTyped(input + e.key);
          } else if (e.key === "Backspace") {
            setTyped(input.slice(0, -1));
          } else if (e.key === "Enter") {
            checkAnswer();
          } else if (e.key === "Escape") {
            setTyped("");
          }
        });
      }
    }

    function bindButtons() {
      btnStart?.addEventListener("click", () => {
        resetGame();
        inSession = true;
        setInputAreaVisible(true);
        setStatus("開始！");
        flashDisplay();
        enableControls({ start: false, restart: true, quit: true, inputEnabled: false });
        schedule(() => nextRound(), 250);
      });

      btnQuit?.addEventListener("click", () => {
        resetGame();
        setStatus("やめました");
        setDisplay("–");
      });

      btnRestart?.addEventListener("click", () => {
        resetGame();
        setStatus("リスタートしました");
        schedule(() => {
          btnStart?.click();
        }, 150);
      });
    }

    function init() {
      if (!btnStart || !elDisplay) return; // page guard
      resetGame();
      bindPad();
      bindButtons();
    }

    return { init };
  })();

  // ==========================================
  // Page helpers
  // ==========================================

  function setupScrollTopButton() {
    const scrollTopBtn = $("scrollTopBtn");
    if (!scrollTopBtn) return;

    const toggle = () => {
      const shouldShow = window.scrollY > 240;
      scrollTopBtn.classList.toggle("hidden", !shouldShow);
    };

    scrollTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    window.addEventListener("scroll", toggle, { passive: true });
    toggle();
  }

  function bindLogoNavigation() {
    const logo = document.querySelector(".logo");
    if (!logo) return;

    logo.setAttribute("role", "button");
    logo.setAttribute("tabindex", "0");

    const goHome = () => {
      const path = window.location.pathname || "";
      const isHome = /(?:^|\/)(?:index\.html)?$/.test(path) || path.endsWith("/") || path.endsWith("/index.html");
      if (isHome) {
        window.location.reload();
      } else {
        window.location.href = "index.html";
      }
    };

    logo.addEventListener("click", goHome);
    logo.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        goHome();
      }
    });
  }

  function init() {
    SoloMemory.init();
    NumberMemory.init();
    bindLogoNavigation();
    setupScrollTopButton();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
