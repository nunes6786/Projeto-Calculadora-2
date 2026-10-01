(() => {
  const $ = (id) => document.getElementById(id);
  const mainEl = $("main"), hintEl = $("hint");
  const overlay = $("overlay"), song = $("song");

  let expr = "";
  let done = false; // true logo após apertar "="

  /* ---------- Avaliador de expressões ---------- */
  function evaluate(src) {
    let s = src.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
    const open = (s.match(/\(/g) || []).length - (s.match(/\)/g) || []).length;
    if (open > 0) s += ")".repeat(open);

    const re = /\s*(?:(\d+\.?\d*(?:e[+-]?\d+)?|\.\d+(?:e[+-]?\d+)?)|(.))/giy;
    const tokens = [];
    let m;
    while (re.lastIndex < s.length && (m = re.exec(s))) {
      tokens.push(m[1] !== undefined ? { n: parseFloat(m[1]) } : { op: m[2] });
    }
    let i = 0;
    const peek = () => tokens[i];
    const isOp = (o) => peek() && peek().op === o;

    function expression() {
      let v = term();
      while (isOp("+") || isOp("-")) {
        const o = tokens[i++].op;
        const r = term();
        v = o === "+" ? v + r : v - r;
      }
      return v;
    }
    function term() {
      let v = unary();
      while (isOp("*") || isOp("/")) {
        const o = tokens[i++].op;
        const r = unary();
        v = o === "*" ? v * r : v / r;
      }
      return v;
    }
    function unary() {
      if (isOp("-")) { i++; return -unary(); }
      if (isOp("+")) { i++; return unary(); }
      return postfix();
    }
    function postfix() {
      let v = primary();
      while (isOp("!") || isOp("%")) {
        const o = tokens[i++].op;
        v = o === "!" ? factorial(v) : v / 100;
      }
      return v;
    }
    function primary() {
      const t = tokens[i++];
      if (!t) throw new Error("fim inesperado");
      if (t.n !== undefined) return t.n;
      if (t.op === "(") {
        const v = expression();
        if (!isOp(")")) throw new Error("parêntese");
        i++;
        return v;
      }
      throw new Error("símbolo inválido");
    }
    function factorial(n) {
      if (!Number.isInteger(n) || n < 0 || n > 170) throw new Error("fatorial inválido");
      let r = 1;
      for (let k = 2; k <= n; k++) r *= k;
      return r;
    }

    const result = expression();
    if (i < tokens.length) throw new Error("sobrou algo");
    if (!Number.isFinite(result)) throw new Error("resultado inválido");
    return result;
  }

  function format(n) {
    const a = Math.abs(n);
    if (Number.isInteger(n) && a < 1e15) return String(n);
    if (a >= 1e15 || (a !== 0 && a < 1e-7)) {
      return n.toExponential(6).replace(/\.?0+e/, "e");
    }
    return String(parseFloat(n.toPrecision(12)));
  }

  /* ---------- Tela ---------- */
  function render() {
    mainEl.classList.remove("erro");
    const text = expr || "0";
    mainEl.textContent = text;
    const len = text.length;
    mainEl.style.fontSize = len > 22 ? "1.2rem" : len > 16 ? "1.6rem" : len > 11 ? "2rem" : "";

    if (!done) {
      let preview = "\u00a0";
      if (/[+\-×÷!%]/.test(expr.replace(/^-/, "")) ) {
        try { preview = "= " + format(evaluate(expr)); } catch (_) {}
      }
      hintEl.textContent = preview;
    }
  }

  function showError() {
    mainEl.textContent = "Erro";
    mainEl.style.fontSize = "";
    mainEl.classList.add("erro");
    hintEl.textContent = expr;
    expr = "";
    done = true;
  }

  /* ---------- Entrada ---------- */
  const isDigit = (c) => /[0-9]/.test(c);
  const isBinary = (c) => "+−×÷".includes(c);

  function press(k) {
    if (k === "AC") { expr = ""; done = false; hintEl.textContent = "\u00a0"; return render(); }
    if (k === "⌫") {
      if (done) { expr = ""; done = false; hintEl.textContent = "\u00a0"; return render(); }
      expr = expr.slice(0, -1);
      return render();
    }
    if (k === "=") return equals();

    const last = expr.slice(-1);

    if (done) {
      // Depois de um resultado: número começa conta nova; operador continua a conta
      if (isDigit(k) || k === "." || k === "(") expr = "";
      done = false;
    }

    if (isDigit(k)) {
      expr += (last === ")" || last === "!" || last === "%") ? "×" + k : k;
    } else if (k === ".") {
      const currentNumber = expr.split(/[+−×÷()!%]/).pop();
      if (currentNumber.includes(".")) return;
      expr += currentNumber === "" ? "0." : ".";
    } else if (isBinary(k)) {
      if (expr === "" ) { if (k === "−") expr = "−"; }
      else if (expr === "−") { /* ignora */ }
      else if (isBinary(last)) expr = expr.slice(0, -1) + k;
      else if (last === "(") { if (k === "−") expr += k; }
      else expr += k;
    } else if (k === "!" || k === "%") {
      if (isDigit(last) || last === ")" || last === "%" ) expr += k;
    } else if (k === "(") {
      expr += (isDigit(last) || last === ")" || last === "!" || last === "%") ? "×(" : "(";
    } else if (k === ")") {
      const opens = (expr.match(/\(/g) || []).length - (expr.match(/\)/g) || []).length;
      if (opens > 0 && (isDigit(last) || last === ")" || last === "!" || last === "%")) expr += ")";
    }
    render();
  }

  function equals() {
    if (!expr || done) return;
    const original = expr;
    let result;
    try { result = evaluate(expr); } catch (_) { return showError(); }

    const text = format(result);
    hintEl.textContent = original + " =";
    mainEl.textContent = text;
    mainEl.style.fontSize = text.length > 11 ? "1.8rem" : "";
    mainEl.classList.remove("erro");
    expr = text;
    done = true;

    // A conta especial: 67!
    if (original.replace(/\s/g, "") === "67!") celebrate();
  }

  /* ---------- Celebração ---------- */
  function celebrate() {
    overlay.hidden = false;
    // reinicia a animação de zoom
    const card = overlay.querySelector(".card");
    card.style.animation = "none"; void card.offsetWidth; card.style.animation = "";
    const vid = $("photo");
    vid.currentTime = 0;
    vid.play().catch(() => {});
    song.currentTime = 0;
    song.play().catch(() => {});
    $("close").focus();
  }

  function closeCelebration() {
    overlay.hidden = true;
    song.pause();
    $("photo").pause();
  }

  $("close").addEventListener("click", closeCelebration);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeCelebration(); });

  /* ---------- Eventos ---------- */
  document.querySelector(".keys").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-k]");
    if (b) press(b.dataset.k);
  });

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!overlay.hidden) {
      if (e.key === "Escape") closeCelebration();
      return;
    }
    const map = { "*": "×", "/": "÷", "-": "−", ",": ".", Enter: "=", "=": "=", Backspace: "⌫", Escape: "AC", Delete: "AC" };
    let k = map[e.key] || e.key;
    if (/^[0-9+.()!%]$/.test(k) || "−×÷=⌫".includes(k) || k === "AC") {
      e.preventDefault();
      press(k);
    }
  });

  render();
})();
