import React, { useState, useEffect } from 'react';

export const CalculatorApp: React.FC = () => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [memory, setMemory] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
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

  const calculate = () => {
    if (operation === null || prevValue === null) return;
    const inputValue = parseFloat(display);
    let result = 0;

    switch (operation) {
      case '+': result = prevValue + inputValue; break;
      case '-': result = prevValue - inputValue; break;
      case '×': result = prevValue * inputValue; break;
      case '÷': result = inputValue !== 0 ? prevValue / inputValue : 0; break;
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

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') inputDigit(e.key);
      else if (e.key === '.') inputDecimal();
      else if (e.key === '+' || e.key === '-') performOperation(e.key);
      else if (e.key === '*') performOperation('×');
      else if (e.key === '/') performOperation('÷');
      else if (e.key === 'Enter' || e.key === '=') calculate();
      else if (e.key === 'Backspace') deleteDigit();
      else if (e.key === 'Escape') clearAll();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div className="w-full h-full flex flex-col bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface)] select-none">
      {/* Top bar with memory and history toggle */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--md-sys-color-outline-variant)]/20 text-xs text-[var(--md-sys-color-on-surface-variant)]">
        <div className="flex items-center gap-1 font-semibold">
          <button onClick={() => setMemory(0)} className="px-2 py-1 rounded hover:bg-[var(--md-sys-color-outline-variant)]/20">MC</button>
          <button onClick={() => setDisplay(String(memory))} className="px-2 py-1 rounded hover:bg-[var(--md-sys-color-outline-variant)]/20">MR</button>
          <button onClick={() => setMemory(memory + parseFloat(display))} className="px-2 py-1 rounded hover:bg-[var(--md-sys-color-outline-variant)]/20">M+</button>
          <button onClick={() => setMemory(memory - parseFloat(display))} className="px-2 py-1 rounded hover:bg-[var(--md-sys-color-outline-variant)]/20">M-</button>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`px-2 py-1 rounded flex items-center gap-1 hover:bg-[var(--md-sys-color-outline-variant)]/20 ${showHistory ? 'text-[var(--md-sys-color-primary)] font-bold' : ''}`}
        >
          <span className="material-symbols-outlined text-[16px]">history</span>
          <span>History</span>
        </button>
      </div>

      {showHistory ? (
        <div className="flex-1 p-4 overflow-y-auto space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--md-sys-color-outline-variant)]/20">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]">Calculation History</span>
            <button onClick={() => setHistory([])} className="text-xs text-[var(--md-sys-color-error)] hover:underline">Clear</button>
          </div>
          {history.length === 0 ? (
            <div className="text-center py-12 text-sm text-[var(--md-sys-color-on-surface-variant)]">No calculations yet</div>
          ) : (
            history.map((item, idx) => (
              <div key={idx} className="p-2 rounded-xl bg-[var(--md-sys-color-surface-container)] text-right font-mono text-sm">
                {item}
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          {/* Display */}
          <div className="px-5 py-4 flex flex-col items-end justify-end flex-1">
            <div className="text-xs text-[var(--md-sys-color-on-surface-variant)] h-5 font-mono">
              {equation}
            </div>
            <div className="text-4xl font-light font-mono tracking-tight text-[var(--md-sys-color-on-surface)] truncate max-w-full">
              {display}
            </div>
          </div>

          {/* Keypad Grid */}
          <div className="p-3 grid grid-cols-4 gap-2 bg-[var(--md-sys-color-surface-container)] rounded-t-3xl border-t border-[var(--md-sys-color-outline-variant)]/20">
            <button onClick={clearAll} className="h-12 rounded-full bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)] font-semibold active:scale-95 transition-all text-sm">C</button>
            <button onClick={toggleSign} className="h-12 rounded-full bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] font-semibold active:scale-95 transition-all text-sm">+/-</button>
            <button onClick={inputPercent} className="h-12 rounded-full bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] font-semibold active:scale-95 transition-all text-sm">%</button>
            <button onClick={() => performOperation('÷')} className="h-12 rounded-full bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] font-bold active:scale-95 transition-all text-lg">÷</button>

            <button onClick={() => inputDigit('7')} className="h-12 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] font-medium active:scale-95 transition-all text-lg">7</button>
            <button onClick={() => inputDigit('8')} className="h-12 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] font-medium active:scale-95 transition-all text-lg">8</button>
            <button onClick={() => inputDigit('9')} className="h-12 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] font-medium active:scale-95 transition-all text-lg">9</button>
            <button onClick={() => performOperation('×')} className="h-12 rounded-full bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] font-bold active:scale-95 transition-all text-lg">×</button>

            <button onClick={() => inputDigit('4')} className="h-12 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] font-medium active:scale-95 transition-all text-lg">4</button>
            <button onClick={() => inputDigit('5')} className="h-12 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] font-medium active:scale-95 transition-all text-lg">5</button>
            <button onClick={() => inputDigit('6')} className="h-12 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] font-medium active:scale-95 transition-all text-lg">6</button>
            <button onClick={() => performOperation('-')} className="h-12 rounded-full bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] font-bold active:scale-95 transition-all text-lg">−</button>

            <button onClick={() => inputDigit('1')} className="h-12 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] font-medium active:scale-95 transition-all text-lg">1</button>
            <button onClick={() => inputDigit('2')} className="h-12 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] font-medium active:scale-95 transition-all text-lg">2</button>
            <button onClick={() => inputDigit('3')} className="h-12 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] font-medium active:scale-95 transition-all text-lg">3</button>
            <button onClick={() => performOperation('+')} className="h-12 rounded-full bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] font-bold active:scale-95 transition-all text-lg">+</button>

            <button onClick={deleteDigit} className="h-12 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] flex items-center justify-center active:scale-95 transition-all">
              <span className="material-symbols-outlined text-[20px]">backspace</span>
            </button>
            <button onClick={() => inputDigit('0')} className="h-12 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] font-medium active:scale-95 transition-all text-lg">0</button>
            <button onClick={inputDecimal} className="h-12 rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] font-bold active:scale-95 transition-all text-lg">.</button>
            <button onClick={calculate} className="h-12 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-bold active:scale-95 transition-all text-xl shadow-md">=</button>
          </div>
        </>
      )}
    </div>
  );
};
