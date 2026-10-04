import React, { useState, useEffect } from 'react';

export const CalculatorApp: React.FC = () => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [memory, setMemory] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [scientificMode, setScientificMode] = useState(false);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clearAll = () => {
    setDisplay('0');
    setEquation('');
    setPrevValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const deleteDigit = () => {
    if (waitingForOperand) return;
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const toggleSign = () => {
    const val = parseFloat(display);
    setDisplay(String(-val));
  };

  const inputPercent = () => {
    const val = parseFloat(display);
    setDisplay(String(val / 100));
  };

  const performOperation = (nextOp: string) => {
    const inputValue = parseFloat(display);

    if (prevValue === null) {
      setPrevValue(inputValue);
      setEquation(`${inputValue} ${nextOp}`);
    } else if (operation) {
      const current = prevValue || 0;
      let result = 0;

      switch (operation) {
        case '+': result = current + inputValue; break;
        case '-': result = current - inputValue; break;
        case '×': result = current * inputValue; break;
        case '÷': result = inputValue !== 0 ? current / inputValue : 0; break;
        case '^': result = Math.pow(current, inputValue); break;
      }

      const formattedResult = parseFloat(result.toFixed(8));
      setDisplay(String(formattedResult));
      setPrevValue(formattedResult);
      setEquation(`${formattedResult} ${nextOp}`);
      setHistory((prev) => [`${current} ${operation} ${inputValue} = ${formattedResult}`, ...prev.slice(0, 19)]);
    }

    setWaitingForOperand(true);
    setOperation(nextOp);
  };

  const performScientific = (func: string) => {
    const val = parseFloat(display);
    let res = 0;
    switch (func) {
      case 'sin': res = Math.sin((val * Math.PI) / 180); break;
      case 'cos': res = Math.cos((val * Math.PI) / 180); break;
      case 'tan': res = Math.tan((val * Math.PI) / 180); break;
      case 'sqrt': res = Math.sqrt(val); break;
      case 'sqr': res = Math.pow(val, 2); break;
      case 'log': res = Math.log10(val); break;
      case 'ln': res = Math.log(val); break;
      case 'pi': res = Math.PI; break;
      case 'e': res = Math.E; break;
      case 'inv': res = 1 / val; break;
    }
    const formatted = parseFloat(res.toFixed(8));
    setHistory((prev) => [`${func}(${val}) = ${formatted}`, ...prev.slice(0, 19)]);
    setDisplay(String(formatted));
    setWaitingForOperand(true);
  };

  const calculate = () => {
    if (operation === null || prevValue === null) return;
    const inputValue = parseFloat(display);
    let result = 0;

    switch (operation) {
      case '+': result = prevValue + inputValue; break;
      case '-': result = prevValue - inputValue; break;
      case '×': result = prevValue * inputValue; break;
      case '÷': result = inputValue !== 0 ? prevValue / inputValue : 0; break;
      case '^': result = Math.pow(prevValue, inputValue); break;
    }

    const formattedResult = parseFloat(result.toFixed(8));
    const record = `${prevValue} ${operation} ${inputValue} = ${formattedResult}`;
    setHistory((prev) => [record, ...prev.slice(0, 19)]);
    setDisplay(String(formattedResult));
    setEquation('');
    setPrevValue(null);
    setOperation(null);
    setWaitingForOperand(true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') inputDigit(e.key);
      else if (e.key === '.') inputDecimal();
      else if (e.key === '+' || e.key === '-') performOperation(e.key);
      else if (e.key === '*') performOperation('×');
      else if (e.key === '/') performOperation('÷');
      else if (e.key === '^') performOperation('^');
      else if (e.key === 'Enter' || e.key === '=') calculate();
      else if (e.key === 'Backspace') deleteDigit();
      else if (e.key === 'Escape') clearAll();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div className="w-full h-full flex flex-col bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface)] select-none">
      {/* Top action header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--md-sys-color-outline-variant)]/20 text-xs text-[var(--md-sys-color-on-surface-variant)] bg-[var(--md-sys-color-surface-container)]">
        <div className="flex items-center gap-1 font-semibold">
          <button onClick={() => setMemory(0)} className="px-2 py-1 rounded-lg hover:bg-[var(--md-sys-color-outline-variant)]/20">MC</button>
          <button onClick={() => setDisplay(String(memory))} className="px-2 py-1 rounded-lg hover:bg-[var(--md-sys-color-outline-variant)]/20">MR</button>
          <button onClick={() => setMemory(memory + parseFloat(display))} className="px-2 py-1 rounded-lg hover:bg-[var(--md-sys-color-outline-variant)]/20">M+</button>
          <button onClick={() => setMemory(memory - parseFloat(display))} className="px-2 py-1 rounded-lg hover:bg-[var(--md-sys-color-outline-variant)]/20">M-</button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setScientificMode(!scientificMode)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              scientificMode
                ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-sm'
                : 'hover:bg-[var(--md-sys-color-outline-variant)]/20'
            }`}
          >
            Scientific
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1 text-xs font-semibold hover:bg-[var(--md-sys-color-outline-variant)]/20 ${
              showHistory ? 'text-[var(--md-sys-color-primary)] font-bold' : ''
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">history</span>
            <span>History</span>
          </button>
        </div>
      </div>

      {showHistory ? (
        <div className="flex-1 p-4 overflow-y-auto space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--md-sys-color-outline-variant)]/20">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">
              Calculation History
            </span>
            <button onClick={() => setHistory([])} className="text-xs text-[var(--md-sys-color-error)] hover:underline">
              Clear All
            </button>
          </div>
          {history.length === 0 ? (
            <div className="text-center py-12 text-sm text-[var(--md-sys-color-on-surface-variant)]">No calculations yet</div>
          ) : (
            history.map((item, idx) => (
              <div
                key={idx}
                onClick={() => {
                  const parts = item.split('=');
                  if (parts[1]) setDisplay(parts[1].trim());
                  setShowHistory(false);
                }}
                className="p-3 rounded-2xl bg-[var(--md-sys-color-surface-container)] text-right font-mono text-sm cursor-pointer hover:bg-[var(--md-sys-color-surface-container-high)] transition-colors"
              >
                {item}
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          {/* Output Display */}
          <div className="px-6 py-4 flex flex-col items-end justify-end flex-1">
            <div className="text-xs text-[var(--md-sys-color-on-surface-variant)] h-5 font-mono">
              {equation}
            </div>
            <div className="text-5xl font-light font-mono tracking-tight text-[var(--md-sys-color-on-surface)] truncate max-w-full">
              {display}
            </div>
          </div>

          {/* Scientific Mode Sub-Panel */}
          {scientificMode && (
            <div className="px-3 py-2 grid grid-cols-5 gap-1.5 bg-[var(--md-sys-color-surface-container-high)] border-t border-[var(--md-sys-color-outline-variant)]/20 text-xs font-semibold">
              <button onClick={() => performScientific('sin')} className="h-9 rounded-xl bg-[var(--md-sys-color-surface)] hover:bg-[var(--md-sys-color-surface-container)] active:scale-95 transition-all">sin</button>
              <button onClick={() => performScientific('cos')} className="h-9 rounded-xl bg-[var(--md-sys-color-surface)] hover:bg-[var(--md-sys-color-surface-container)] active:scale-95 transition-all">cos</button>
              <button onClick={() => performScientific('tan')} className="h-9 rounded-xl bg-[var(--md-sys-color-surface)] hover:bg-[var(--md-sys-color-surface-container)] active:scale-95 transition-all">tan</button>
              <button onClick={() => performScientific('sqrt')} className="h-9 rounded-xl bg-[var(--md-sys-color-surface)] hover:bg-[var(--md-sys-color-surface-container)] active:scale-95 transition-all">√</button>
              <button onClick={() => performOperation('^')} className="h-9 rounded-xl bg-[var(--md-sys-color-surface)] hover:bg-[var(--md-sys-color-surface-container)] active:scale-95 transition-all">xʸ</button>

              <button onClick={() => performScientific('ln')} className="h-9 rounded-xl bg-[var(--md-sys-color-surface)] hover:bg-[var(--md-sys-color-surface-container)] active:scale-95 transition-all">ln</button>
              <button onClick={() => performScientific('log')} className="h-9 rounded-xl bg-[var(--md-sys-color-surface)] hover:bg-[var(--md-sys-color-surface-container)] active:scale-95 transition-all">log</button>
              <button onClick={() => performScientific('pi')} className="h-9 rounded-xl bg-[var(--md-sys-color-surface)] hover:bg-[var(--md-sys-color-surface-container)] active:scale-95 transition-all">π</button>
              <button onClick={() => performScientific('e')} className="h-9 rounded-xl bg-[var(--md-sys-color-surface)] hover:bg-[var(--md-sys-color-surface-container)] active:scale-95 transition-all">e</button>
              <button onClick={() => performScientific('inv')} className="h-9 rounded-xl bg-[var(--md-sys-color-surface)] hover:bg-[var(--md-sys-color-surface-container)] active:scale-95 transition-all">1/x</button>
            </div>
          )}

          {/* Keypad Grid (M3 Expressive) */}
          <div className="p-3 grid grid-cols-4 gap-2 bg-[var(--md-sys-color-surface-container)] rounded-t-3xl border-t border-[var(--md-sys-color-outline-variant)]/20 shadow-inner">
            <button onClick={clearAll} className="h-12 rounded-full bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)] font-bold active:scale-95 transition-all text-sm shadow-sm">C</button>
            <button onClick={toggleSign} className="h-12 rounded-full bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] font-semibold active:scale-95 transition-all text-sm shadow-sm">+/-</button>
            <button onClick={inputPercent} className="h-12 rounded-full bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] font-semibold active:scale-95 transition-all text-sm shadow-sm">%</button>
            <button onClick={() => performOperation('÷')} className="h-12 rounded-full bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] font-bold active:scale-95 transition-all text-lg shadow-sm">÷</button>

            <button onClick={() => inputDigit('7')} className="h-12 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] font-medium active:scale-95 transition-all text-lg shadow-sm">7</button>
            <button onClick={() => inputDigit('8')} className="h-12 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] font-medium active:scale-95 transition-all text-lg shadow-sm">8</button>
            <button onClick={() => inputDigit('9')} className="h-12 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] font-medium active:scale-95 transition-all text-lg shadow-sm">9</button>
            <button onClick={() => performOperation('×')} className="h-12 rounded-full bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] font-bold active:scale-95 transition-all text-lg shadow-sm">×</button>

            <button onClick={() => inputDigit('4')} className="h-12 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] font-medium active:scale-95 transition-all text-lg shadow-sm">4</button>
            <button onClick={() => inputDigit('5')} className="h-12 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] font-medium active:scale-95 transition-all text-lg shadow-sm">5</button>
            <button onClick={() => inputDigit('6')} className="h-12 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] font-medium active:scale-95 transition-all text-lg shadow-sm">6</button>
            <button onClick={() => performOperation('-')} className="h-12 rounded-full bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] font-bold active:scale-95 transition-all text-lg shadow-sm">−</button>

            <button onClick={() => inputDigit('1')} className="h-12 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] font-medium active:scale-95 transition-all text-lg shadow-sm">1</button>
            <button onClick={() => inputDigit('2')} className="h-12 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] font-medium active:scale-95 transition-all text-lg shadow-sm">2</button>
            <button onClick={() => inputDigit('3')} className="h-12 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] font-medium active:scale-95 transition-all text-lg shadow-sm">3</button>
            <button onClick={() => performOperation('+')} className="h-12 rounded-full bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] font-bold active:scale-95 transition-all text-lg shadow-sm">+</button>

            <button onClick={deleteDigit} className="h-12 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] flex items-center justify-center active:scale-95 transition-all shadow-sm">
              <span className="material-symbols-outlined text-[20px]">backspace</span>
            </button>
            <button onClick={() => inputDigit('0')} className="h-12 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] font-medium active:scale-95 transition-all text-lg shadow-sm">0</button>
            <button onClick={inputDecimal} className="h-12 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] font-bold active:scale-95 transition-all text-lg shadow-sm">.</button>
            <button onClick={calculate} className="h-12 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-bold active:scale-95 transition-all text-xl shadow-md">=</button>
          </div>
        </>
      )}
    </div>
  );
};
