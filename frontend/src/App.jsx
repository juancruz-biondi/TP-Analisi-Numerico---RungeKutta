import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calculator, 
  BookOpen, 
  TrendingUp, 
  HelpCircle, 
  ArrowRight, 
  CheckCircle2, 
  Activity, 
  Layers, 
  Sparkles, 
  AlertTriangle, 
  Info, 
  Check, 
  Zap, 
  Target, 
  Delete, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import MathText from './components/MathText';

// Ejercicios oficiales del PDF de la cátedra UTN FRLP
const PRESET_EXERCISES = {
  ej4_teorico: {
    nombre: "Ejercicio Teórico (Pág. 15)",
    tag: "y(1.3)",
    eq: "2*x*y",
    eqLaTeX: "y' = 2xy",
    x0: 1.0,
    y0: 1.0,
    xf: 1.3,
    h: 0.1,
    variable: "x",
    solucionExacta: (x) => Math.exp(x * x - 1),
    eqExactaLaTeX: "y(x) = e^{x^2 - 1}",
    descripcion: "Demostración de 3 iteraciones que utiliza el profesor Amiconi en el apunte.",
    color: "#38bdf8"
  },
  ej1a_practica: {
    nombre: "Práctica 2 - Ej. 1.a",
    tag: "y(0.5)",
    eq: "-3*x**2*y",
    eqLaTeX: "y' = -3x^2y",
    x0: 0.0,
    y0: 3.0,
    xf: 0.5,
    h: 0.1,
    variable: "x",
    solucionExacta: (x) => 3 * Math.exp(-Math.pow(x, 3)),
    eqExactaLaTeX: "y(x) = 3e^{-x^3}",
    descripcion: "Ecuación con decaimiento cúbico en x. Evalúa la respuesta frente a fuerte curvatura inicial.",
    color: "#f59e0b"
  },
  ej1b_practica: {
    nombre: "Práctica 2 - Ej. 1.b",
    tag: "y(0.5)",
    eq: "0.25*(1 + y**2)",
    eqLaTeX: "y' = \\frac{1}{4}(1 + y^2)",
    x0: 0.0,
    y0: 1.0,
    xf: 0.5,
    h: 0.1,
    variable: "x",
    solucionExacta: (x) => Math.tan(0.25 * x + Math.PI / 4),
    eqExactaLaTeX: "y(x) = \\tan\\left(\\frac{x}{4} + \\frac{\\pi}{4}\\right)",
    descripcion: "Ecuación no lineal autónoma. Demuestra la ventaja de RK2 sobre Taylor al no requerir derivar implícitamente.",
    color: "#a855f7"
  },
  ej1c_practica: {
    nombre: "Práctica 2 - Ej. 1.c",
    tag: "y(1.5)",
    eq: "2*x*y",
    eqLaTeX: "y' = 2xy",
    x0: 1.0,
    y0: 1.0,
    xf: 1.5,
    h: 0.1,
    variable: "x",
    solucionExacta: (x) => Math.exp(x * x - 1),
    eqExactaLaTeX: "y(x) = e^{x^2 - 1}",
    descripcion: "Inciso 1.c del PDF práctico. Resuelve la ecuación hasta x = 1.5 (5 iteraciones completas).",
    color: "#10b981"
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('simulador');
  const [activePresetKey, setActivePresetKey] = useState('ej4_teorico');
  const [activeSubTab, setActiveSubTab] = useState('graficos');
  
  // Teclado matemático desplegable
  const [showKeypad, setShowKeypad] = useState(false);
  const inputRef = useRef(null);

  const currentPreset = PRESET_EXERCISES[activePresetKey];
  const [equation, setEquation] = useState(currentPreset.eq);
  const [x0, setX0] = useState(currentPreset.x0);
  const [y0, setY0] = useState(currentPreset.y0);
  const [xf, setXf] = useState(currentPreset.xf);
  const [h, setH] = useState(currentPreset.h);
  const [variable, setVariable] = useState(currentPreset.variable);

  const [resultData, setResultData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Solver local instantáneo
  function computeLocalRK2(eqStr, startX, startY, endX, stepH) {
    const fn = (xVal, yVal) => {
      if (eqStr.includes('2*x*y') || eqStr.includes('2xy')) return 2 * xVal * yVal;
      if (eqStr.includes('-3*x**2*y')) return -3 * Math.pow(xVal, 2) * yVal;
      if (eqStr.includes('0.25*(1 + y**2)')) return 0.25 * (1 + yVal * yVal);
      const sanitized = eqStr.replaceAll('**', '^').replaceAll('^', '**');
      const fJs = new Function('x', 'y', `return ${sanitized};`);
      return fJs(xVal, yVal);
    };

    const steps = [];
    let curX = startX;
    let curY = startY;
    let n = 0;
    const totalIter = Math.max(1, Math.round((endX - startX) / stepH));

    steps.push({
      n: 0,
      xn: Number(curX.toFixed(4)),
      yn: Number(curY.toFixed(6)),
      k1: null,
      x_mid: null,
      y_mid: null
    });

    while (n < totalIter && n < 1000) {
      const fVal = fn(curX, curY);
      const k1 = stepH * fVal;
      const xMid = curX + stepH / 2.0;
      const yMid = curY + k1 / 2.0;
      const fMid = fn(xMid, yMid);
      const nextY = curY + stepH * fMid;

      n += 1;
      curX = Number((startX + n * stepH).toFixed(8));

      steps.push({
        n,
        xn: Number(curX.toFixed(4)),
        yn: Number(nextY.toFixed(6)),
        k1: Number(k1.toFixed(6)),
        x_mid: Number(xMid.toFixed(4)),
        y_mid: Number(yMid.toFixed(6))
      });
      curY = nextY;
    }

    return {
      final_result: Number(curY.toFixed(6)),
      total_steps: n,
      iterations: steps
    };
  }

  // Sincronizar presets de forma instantánea
  const handleSelectPreset = (key) => {
    setActivePresetKey(key);
    const p = PRESET_EXERCISES[key];
    setEquation(p.eq);
    setX0(p.x0);
    setY0(p.y0);
    setXf(p.xf);
    setH(p.h);
    setVariable(p.variable);
    
    // Cálculo instantáneo para máxima fluidez
    const instantData = computeLocalRK2(p.eq, p.x0, p.y0, p.xf, p.h);
    setResultData(instantData);
  };

  const insertSymbol = (val) => {
    setEquation((prev) => prev + val);
    if (inputRef.current) inputRef.current.focus();
  };

  const clearEquation = () => {
    setEquation('');
    if (inputRef.current) inputRef.current.focus();
  };

  const backspaceEquation = () => {
    setEquation((prev) => prev.slice(0, -1));
    if (inputRef.current) inputRef.current.focus();
  };

  const sanitizeEquation = (raw) => {
    return raw
      .replace(/sen\(/gi, 'sin(')
      .replace(/\^/g, '**')
      .replace(/(\d)([a-zA-Z(])/g, '$1*$2')
      .replace(/([a-zA-Z)])(\d)/g, '$1*$2')
      .replace(/(\))([a-zA-Z(])/g, '$1*$2');
  };

  const previewLatex = useMemo(() => {
    if (!equation.trim()) return "y' = 0";
    let formatted = equation
      .replace(/\*\*/g, '^')
      .replace(/\*/g, ' \\cdot ')
      .replace(/sin\(/g, '\\operatorname{sen}(')
      .replace(/cos\(/g, '\\cos(')
      .replace(/tan\(/g, '\\tan(')
      .replace(/exp\(([^)]+)\)/g, 'e^{$1}')
      .replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}');
    return `y' = ${formatted}`;
  }, [equation]);

  // Recálculo reactivo cuando se modifican parámetros
  useEffect(() => {
    const numX0 = parseFloat(x0);
    const numY0 = parseFloat(y0);
    const numXf = parseFloat(xf);
    const numH = parseFloat(h);

    if (
      !isNaN(numX0) && 
      !isNaN(numY0) && 
      !isNaN(numXf) && 
      !isNaN(numH) && 
      numH > 0 && 
      numXf > numX0 &&
      equation.trim().length > 0
    ) {
      const cleanEq = sanitizeEquation(equation);
      try {
        const localData = computeLocalRK2(cleanEq, numX0, numY0, numXf, numH);
        setResultData(localData);
        setErrorMsg('');
      } catch (err) {
        setErrorMsg('Error al evaluar: ' + err.message);
      }
    }
  }, [equation, x0, y0, xf, h]);

  // Chequeo de solución analítica
  const hasExactSolution = useMemo(() => {
    return (equation.includes('2*x*y') || equation.includes('-3*x**2*y') || equation.includes('0.25*(1 + y**2)')) 
      && currentPreset.solucionExacta;
  }, [equation, currentPreset]);

  // Datos para el gráfico
  const chartData = useMemo(() => {
    if (!resultData?.iterations) return [];
    return resultData.iterations.map(step => {
      const exactVal = hasExactSolution ? currentPreset.solucionExacta(step.xn) : null;
      const errorAbs = exactVal !== null ? Math.abs(exactVal - step.yn) : null;
      return {
        ...step,
        exactVal: exactVal !== null ? Number(exactVal.toFixed(6)) : null,
        errorAbs: errorAbs !== null ? Number(errorAbs.toFixed(6)) : null
      };
    });
  }, [resultData, hasExactSolution, currentPreset]);

  const finalExact = (hasExactSolution && currentPreset.solucionExacta) 
    ? currentPreset.solucionExacta(parseFloat(xf)) 
    : null;

  const finalError = (finalExact !== null && resultData?.final_result !== undefined) 
    ? Math.abs(finalExact - resultData.final_result).toFixed(6) 
    : 'N/A';

  // Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs font-mono backdrop-blur">
          <p className="text-cyan-400 font-bold mb-1">Paso n = {data.n} (x = {data.xn})</p>
          <div className="space-y-1 text-slate-300">
            <p><span className="text-slate-500">y (RK2):</span> <strong className="text-white">{data.yn}</strong></p>
            {data.exactVal !== null && (
              <div className="pt-1 mt-1 border-t border-slate-800">
                <p><span className="text-slate-500">y (Exacto):</span> {data.exactVal}</p>
                <p className="text-emerald-400"><span className="text-slate-500">Error Abs:</span> {data.errorAbs}</p>
              </div>
            )}
            {data.k1 !== null && (
              <div className="pt-1 mt-1 border-t border-slate-800 text-[11px] text-slate-400">
                <p>k₁ = {data.k1}</p>
                <p>Punto Medio = ({data.x_mid}, {data.y_mid})</p>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* HEADER */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-indigo-600 to-cyan-500 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20 text-white font-mono font-bold text-base flex items-center justify-center">
              RK2
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-cyan-300 bg-clip-text text-transparent flex items-center gap-2">
                <span>Runge-Kutta 2º Orden</span>
                <span className="text-xs font-normal text-cyan-400 font-mono">(Método del Punto Medio)</span>
              </h1>
              <p className="text-xs text-slate-400">Modelos Numéricos & Cálculo Avanzado — UTN FRLP</p>
            </div>
          </div>

          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setActiveTab('simulador')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'simulador' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calculator className="w-4 h-4" /> Simulador & Auditoría
            </button>
            <button
              onClick={() => setActiveTab('fundamentos')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'fundamentos' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" /> Fundamentos del P.V.I
            </button>
            <button
              onClick={() => setActiveTab('defensa')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'defensa' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <HelpCircle className="w-4 h-4" /> Ejercicios & Defensa
            </button>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full space-y-6">

        {activeTab === 'simulador' && (
          <div className="space-y-6">
            
            {/* SELECTOR DE EJERCICIOS CON LOS 4 DEL PDF */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Ejercicios de la Cátedra:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.keys(PRESET_EXERCISES).map((key) => {
                  const p = PRESET_EXERCISES[key];
                  const isSel = activePresetKey === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleSelectPreset(key)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-2 border cursor-pointer ${
                        isSel 
                          ? 'bg-indigo-600/20 border-indigo-500 text-cyan-300 shadow-sm shadow-indigo-500/20' 
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isSel ? 'bg-cyan-400' : 'bg-slate-600'}`} />
                      <span>{p.nombre}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({p.tag})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* KPI STAT CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Aproximación RK2</p>
                  <p className="text-xl font-bold font-mono text-cyan-400 mt-0.5">
                    y({xf}) ≈ {resultData?.final_result ?? '...'}
                  </p>
                </div>
                <div className="bg-cyan-500/10 p-2.5 rounded-xl text-cyan-400">
                  <Activity className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Solución Exacta</p>
                  <p className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                    {finalExact !== null ? finalExact.toFixed(6) : 'Personalizada'}
                  </p>
                </div>
                <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-400">
                  <Check className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Error Absoluto</p>
                  <p className="text-xl font-bold font-mono text-amber-400 mt-0.5">
                    {finalError}
                  </p>
                </div>
                <div className="bg-amber-500/10 p-2.5 rounded-xl text-amber-400">
                  <Target className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Iteraciones</p>
                  <p className="text-xl font-bold font-mono text-indigo-300 mt-0.5">
                    {resultData?.total_steps ?? 0} <span className="text-xs text-slate-500">pasos</span>
                  </p>
                </div>
                <div className="bg-indigo-500/10 p-2.5 rounded-xl text-indigo-400">
                  <Zap className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* SECCIÓN PRINCIPAL */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* PANEL IZQUIERDO */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                  
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h2 className="text-sm font-semibold flex items-center gap-2 text-indigo-300">
                      <Layers className="w-4 h-4 text-indigo-400" /> Parámetros del P.V.I
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowKeypad(!showKeypad)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>{showKeypad ? 'Ocultar Teclado' : 'Teclado Matemático'}</span>
                      {showKeypad ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  <div className="space-y-3.5">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-medium text-slate-300">
                          Ecuación Diferencial:
                        </label>
                        <span className="text-xs text-cyan-300 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          <MathText math={previewLatex} />
                        </span>
                      </div>
                      <input
                        ref={inputRef}
                        type="text"
                        value={equation}
                        onChange={(e) => setEquation(e.target.value)}
                        placeholder="Ej: 2x*y o -3x^2*y"
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-cyan-300 font-mono focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    {/* TECLADO MATEMÁTICO */}
                    {showKeypad && (
                      <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800/90 space-y-2 animate-in fade-in duration-150">
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                          <span>Botones rápidos:</span>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={backspaceEquation}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer"
                            >
                              <Delete className="w-3 h-3" /> ⌫
                            </button>
                            <button
                              type="button"
                              onClick={clearEquation}
                              className="px-2 py-0.5 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60 flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" /> AC
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-5 gap-1.5 text-xs font-mono">
                          <button type="button" onClick={() => insertSymbol('x')} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-cyan-300 font-bold">x</button>
                          <button type="button" onClick={() => insertSymbol('y')} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-cyan-300 font-bold">y</button>
                          <button type="button" onClick={() => insertSymbol('x^2')} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-indigo-300 font-semibold">x²</button>
                          <button type="button" onClick={() => insertSymbol('y^2')} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-indigo-300 font-semibold">y²</button>
                          <button type="button" onClick={() => insertSymbol('^')} className="p-1.5 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 rounded font-bold">xⁿ</button>

                          <button type="button" onClick={() => insertSymbol('+')} className="p-1.5 bg-slate-900 hover:bg-slate-800 rounded text-amber-300 font-bold">+</button>
                          <button type="button" onClick={() => insertSymbol('-')} className="p-1.5 bg-slate-900 hover:bg-slate-800 rounded text-amber-300 font-bold">-</button>
                          <button type="button" onClick={() => insertSymbol('*')} className="p-1.5 bg-slate-900 hover:bg-slate-800 rounded text-amber-300 font-bold">×</button>
                          <button type="button" onClick={() => insertSymbol('/')} className="p-1.5 bg-slate-900 hover:bg-slate-800 rounded text-amber-300 font-bold">÷</button>
                          <button type="button" onClick={() => insertSymbol('0.25*')} className="p-1.5 bg-slate-900 hover:bg-slate-800 rounded text-slate-300">¼·</button>

                          <button type="button" onClick={() => insertSymbol('(')} className="p-1.5 bg-slate-900 hover:bg-slate-800 rounded text-slate-300">(</button>
                          <button type="button" onClick={() => insertSymbol(')')} className="p-1.5 bg-slate-900 hover:bg-slate-800 rounded text-slate-300">)</button>
                          <button type="button" onClick={() => insertSymbol('exp(')} className="p-1.5 bg-slate-900 hover:bg-slate-800 rounded text-emerald-300 font-semibold">eˣ</button>
                          <button type="button" onClick={() => insertSymbol('sen(')} className="p-1.5 bg-slate-900 hover:bg-slate-800 rounded text-emerald-300 font-semibold">sen</button>
                          <button type="button" onClick={() => insertSymbol('cos(')} className="p-1.5 bg-slate-900 hover:bg-slate-800 rounded text-emerald-300 font-semibold">cos</button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-300 block mb-1">
                          <MathText math="x_0" /> (Inicio)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={x0}
                          onChange={(e) => setX0(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs font-mono focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-300 block mb-1">
                          <MathText math="y_0 = y(x_0)" />
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={y0}
                          onChange={(e) => setY0(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs font-mono focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-300 block mb-1">
                          <MathText math="x_f" /> (Objetivo)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={xf}
                          onChange={(e) => setXf(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs font-mono focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-300 block mb-1">
                          Paso (<MathText math="h" />)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={h}
                          onChange={(e) => setH(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs font-mono focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>✓ Actualización reactiva fluida</span>
                      {loading && <span className="text-cyan-400 font-mono animate-pulse">Calculando...</span>}
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-300 text-xs">
                      {errorMsg}
                    </div>
                  )}
                </div>

                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <Info className="w-4 h-4 text-cyan-400" />
                    <span>Detalle del Problema</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Al modificar cualquier parámetro, la curva spline de Recharts se interpola suavemente entre los nuevos puntos sin saltos ni tirones.
                  </p>
                </div>
              </div>

              {/* PANEL DERECHO: GRÁFICA FLUIDA CON LINECHART */}
              <div className="lg:col-span-7 space-y-4">
                
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveSubTab('graficos')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                        activeSubTab === 'graficos' 
                          ? 'bg-slate-800 text-cyan-300 border border-slate-700' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Gráfica Curva Suave
                    </button>
                    <button
                      onClick={() => setActiveSubTab('tabla')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                        activeSubTab === 'tabla' 
                          ? 'bg-slate-800 text-cyan-300 border border-slate-700' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Auditoría Paso a Paso
                    </button>
                    <button
                      onClick={() => setActiveSubTab('deduccion')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                        activeSubTab === 'deduccion' 
                          ? 'bg-slate-800 text-cyan-300 border border-slate-700' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Deducción Oficial de Cátedra
                    </button>
                  </div>

                  <span className="text-[11px] font-mono text-slate-500">
                    <MathText math={`h = ${h}`} /> · {resultData?.total_steps ?? 0} pasos
                  </span>
                </div>

                {/* GRÁFICA FLUIDA 100% CON LINECHART (COMPORTAMIENTO ORIGINAL) */}
                {activeSubTab === 'graficos' && (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-cyan-400" /> Curva de Solución Aproximada
                        </h3>
                        <p className="text-xs text-slate-400">
                          Interpolación suave tipo *monotone* adaptada a los puntos calculados.
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Curva RK2
                        </span>
                        {hasExactSolution && (
                          <span className="flex items-center gap-1.5 text-slate-400">
                            <span className="w-3 h-0.5 bg-slate-400" /> Analítica
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart 
                          data={chartData} 
                          margin={{ top: 20, right: 25, bottom: 15, left: 10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis 
                            dataKey="xn" 
                            stroke="#64748b" 
                            tick={{ fontSize: 11 }} 
                          />
                          <YAxis 
                            stroke="#64748b" 
                            tick={{ fontSize: 11 }} 
                            domain={['auto', 'auto']} 
                          />
                          <Tooltip content={<CustomTooltip />} />
                          
                          {/* Línea analítica discontinua si existe */}
                          {hasExactSolution && (
                            <Line 
                              type="monotone" 
                              dataKey="exactVal" 
                              stroke="#64748b" 
                              strokeDasharray="4 4" 
                              strokeWidth={2} 
                              dot={false} 
                              name="Solución Exacta" 
                              isAnimationActive={true}
                              animationDuration={400}
                            />
                          )}

                          {/* Línea principal RK2 con puntos elegantes */}
                          <Line 
                            type="monotone" 
                            dataKey="yn" 
                            stroke="#38bdf8" 
                            strokeWidth={3} 
                            dot={{ r: 5, fill: '#6366f1', stroke: '#38bdf8', strokeWidth: 2 }} 
                            activeDot={{ r: 7, fill: '#38bdf8' }}
                            name="y (RK2)" 
                            isAnimationActive={true}
                            animationDuration={400}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* TABLA NUMÉRICA PASO A PASO */}
                {activeSubTab === 'tabla' && (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-xl overflow-x-auto space-y-3">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">
                        Tabla Numérica Desglosada con Fórmulas de Cátedra
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Puntos intermedios y avance paso a paso para el intervalo configurado.
                      </p>
                    </div>

                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-2.5 text-center"><MathText math="n" /></th>
                          <th className="p-2.5"><MathText math="x_n" /></th>
                          <th className="p-2.5 text-cyan-300"><MathText math="y_n \text{ (RK2)}" /></th>
                          <th className="p-2.5"><MathText math="k_1 = h \cdot f(x_n, y_n)" /></th>
                          <th className="p-2.5"><MathText math="x_{\text{med}}" /></th>
                          <th className="p-2.5"><MathText math="y_{\text{med}}" /></th>
                          <th className="p-2.5 text-emerald-400"><MathText math="y_{\text{exacto}}" /></th>
                          <th className="p-2.5 text-amber-300">Error Abs.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {chartData.map((s) => (
                          <tr key={s.n} className="hover:bg-slate-800/30">
                            <td className="p-2.5 text-center font-bold text-slate-400">{s.n}</td>
                            <td className="p-2.5 text-slate-300">{s.xn}</td>
                            <td className="p-2.5 text-cyan-300 font-bold">{s.yn}</td>
                            <td className="p-2.5 text-slate-400">{s.k1 !== null ? s.k1 : '— (Inicio)'}</td>
                            <td className="p-2.5 text-slate-400">{s.x_mid !== null ? s.x_mid : '—'}</td>
                            <td className="p-2.5 text-slate-400">{s.y_mid !== null ? s.y_mid : '—'}</td>
                            <td className="p-2.5 text-emerald-400 font-semibold">{s.exactVal !== null ? s.exactVal : 'N/A'}</td>
                            <td className="p-2.5 text-amber-300 font-bold">{s.errorAbs !== null ? s.errorAbs : '0.000000'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* DEDUCCIÓN OFICIAL */}
                {activeSubTab === 'deduccion' && (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5 text-xs">
                    <div>
                      <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                        Procedimiento Exigido · Cátedra UTN FRLP
                      </span>
                      <h3 className="text-base font-bold text-white mt-1">
                        Definición Formal de la "Ordenada Genérica" en Runge-Kutta 2
                      </h3>
                      <p className="text-slate-400 mt-1">
                        Fórmulas oficiales presentadas en la página 5 y 15 del apunte del Ing. Amiconi Diego Federico.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                        <h4 className="font-semibold text-slate-200">1. Pendiente Inicial (<MathText math="k_1" />)</h4>
                        <p className="text-slate-400">
                          Se calcula la pendiente en el inicio del subintervalo:
                        </p>
                        <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-cyan-300 text-center font-bold text-sm">
                          <MathText math="k_1 = h \cdot f(x_n, y_n) = h \cdot y'_n" block />
                        </div>
                      </div>

                      <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                        <h4 className="font-semibold text-slate-200">2. Coordenadas del Punto Medio</h4>
                        <p className="text-slate-400">
                          Se avanza medio paso tanto en la abscisa como en la ordenada estimada:
                        </p>
                        <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-indigo-300 text-center font-bold text-sm">
                          <MathText math="x_{\text{med}} = x_n + \frac{h}{2} \quad , \quad y_{\text{med}} = y_n + \frac{k_1}{2}" block />
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-2">
                      <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold font-mono">
                        Expresión Final de la Ordenada Genérica:
                      </p>
                      <div className="text-base font-bold text-white py-1">
                        <MathText math="y_{n+1} = y_n + h \cdot f\left(x_n + \frac{h}{2} \;,\; y_n + \frac{k_1}{2}\right)" block />
                      </div>
                    </div>

                    <div className="p-3 bg-amber-950/50 rounded-xl border border-amber-800/80 text-amber-200 flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong>Instrucción Práctica de Cátedra:</strong> Para aplicar la fórmula en una prueba escrita, tomas la función diferencial del problema <MathText math="y' = f(x, y)" /> y reemplazas cada aparición de <MathText math="x" /> por <MathText math="\left(x_n + \frac{h}{2}\right)" /> y cada aparición de <MathText math="y" /> por <MathText math="\left(y_n + \frac{k_1}{2}\right)" />.
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        )}

        {/* TAB 2: FUNDAMENTOS */}
        {activeTab === 'fundamentos' && (
          <div className="space-y-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
                Marco Teórico · Problemas de Valor Inicial (P.V.I)
              </span>
              <h2 className="text-2xl font-bold text-white">
                Los 4 Elementos Fundamentales de un P.V.I
              </h2>
              <p className="text-slate-300 leading-relaxed text-sm">
                En ingeniería la mayoría de las ecuaciones diferenciales no admiten solución analítica por integrales directas. Se definen cuatro componentes obligatorios para su resolución numérica:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 font-mono text-xs">
                <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[11px] mb-1">1. Ecuación Diferencial</span>
                  <div className="font-bold text-white text-sm"><MathText math="y' = f(x, y)" /></div>
                </div>
                <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[11px] mb-1">2. Condición Inicial</span>
                  <div className="font-bold text-white text-sm"><MathText math="y(x_0) = y_0" /></div>
                </div>
                <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[11px] mb-1">3. Dominio de Trabajo</span>
                  <div className="font-bold text-white text-sm"><MathText math="x_0 \le x \le x_f" /></div>
                </div>
                <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[11px] mb-1">4. Paso Discreto</span>
                  <div className="font-bold text-white text-sm"><MathText math="h = x_{n+1} - x_n" /></div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-lg font-bold text-white">
                Comparativa Crítica: ¿Por qué Runge-Kutta supera a sus rivales?
              </h3>

              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-3">Método Numérico</th>
                      <th className="p-3">Orden de Error Local</th>
                      <th className="p-3">Cálculo Analítico</th>
                      <th className="p-3">Evaluaciones de f por paso</th>
                      <th className="p-3">Evaluación Técnica de Cátedra</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    <tr className="hover:bg-slate-800/20">
                      <td className="p-3 font-semibold text-slate-300">Euler Clásico</td>
                      <td className="p-3 font-mono text-slate-400"><MathText math="\mathcal{O}(h)" /> — Orden 1</td>
                      <td className="p-3 text-emerald-400 font-medium">Ninguno</td>
                      <td className="p-3 font-mono">1 cálculo: solo evalúa f al inicio</td>
                      <td className="p-3 text-slate-400">Muy bajo costo, pero error inadmisible en problemas de ingeniería con curvatura.</td>
                    </tr>
                    <tr className="hover:bg-slate-800/20">
                      <td className="p-3 font-semibold text-indigo-300">Taylor Grado 2</td>
                      <td className="p-3 font-mono text-emerald-400 font-bold"><MathText math="\mathcal{O}(h^2)" /> — Orden 2</td>
                      <td className="p-3 text-rose-400 font-medium">
                        Requiere <MathText math="y'' = \frac{\partial f}{\partial x} + \frac{\partial f}{\partial y}y'" />
                      </td>
                      <td className="p-3 font-mono">Requiere calcular f y sus derivadas parciales</td>
                      <td className="p-3 text-slate-400">Excelente orden, pero calcular derivadas analíticas parciales es impráctico o imposible.</td>
                    </tr>
                    <tr className="bg-indigo-950/30 font-semibold border-l-2 border-indigo-500">
                      <td className="p-3 text-cyan-300">Runge-Kutta Grado 2</td>
                      <td className="p-3 font-mono text-emerald-400 font-bold"><MathText math="\mathcal{O}(h^2)" /> — Orden 2</td>
                      <td className="p-3 text-emerald-400 font-bold">¡Cero derivadas analíticas!</td>
                      <td className="p-3 font-mono text-cyan-300">2 cálculos: al inicio y en el punto medio</td>
                      <td className="p-3 text-slate-200">Gana en equilibrio: misma convergencia que Taylor 2 sin calcular derivadas.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DEFENSA */}
        {activeTab === 'defensa' && (
          <div className="space-y-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
                Preguntas Clave para el Coloquio / Examen Oral
              </span>
              <h2 className="text-2xl font-bold text-white">
                Defensa Técnica frente al Tribunal Docente
              </h2>
              <p className="text-slate-300 text-sm">
                Respuestas exactas con el vocabulario técnico que evalúan en la cátedra de Modelos Numéricos UTN La Plata:
              </p>

              <div className="space-y-4 pt-2">
                <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                  <h4 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    1. ¿Por qué Runge-Kutta es de "Paso Simple" y cómo se relaciona con los métodos de "Paso Múltiple"?
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed pl-6">
                    Es de <strong className="text-white font-semibold">Paso Simple (One-step)</strong> porque para obtener <MathText math="y_{n+1}" /> únicamente requiere la información del intervalo actual <MathText math="[x_n, x_{n+1}]" />. Por el contrario, los métodos de <strong className="text-white font-semibold">Paso Múltiple</strong> (como Adams-Bashforth) necesitan varios puntos previos (<MathText math="y_n, y_{n-1}, y_{n-2}" />). Por esa razón, <strong className="text-cyan-300 font-semibold">siempre se debe iniciar un problema con Runge-Kutta como arrancador</strong> para generar los primeros puntos que el paso múltiple no conoce inicialmente.
                  </p>
                </div>

                <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                  <h4 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    2. ¿Qué significado geométrico tiene evaluar en el punto medio?
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed pl-6">
                    Representa el <strong className="text-white font-semibold">Método del Punto Medio</strong>. Al dar medio paso hasta las coordenadas intermedias <MathText math="\left(x_n + \frac{h}{2}, \; y_n + \frac{k_1}{2}\right)" /> con la pendiente inicial, se muestrea la inclinación promedio en el centro del intervalo. Esto balancea la concavidad de la curva y elimina el error de pendiente unilateral que tiene Euler clásico.
                  </p>
                </div>

                <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                  <h4 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                    3. ¿Qué implicancia práctica tiene que el error local sea O(h²)?
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed pl-6">
                    Significa que si se reduce el tamaño del paso a la mitad (por ejemplo de <MathText math="h = 0.1" /> a <MathText math="h = 0.05" />), el error local se reduce a la cuarta parte (<MathText math="(1/2)^2 = 1/4" />). La velocidad de convergencia cuadrática permite alcanzar gran precisión con pasos considerablemente mayores que en Euler.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-950 border border-indigo-700/50 rounded-2xl p-5 text-xs text-slate-300 space-y-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" /> Conclusión de Cierre para la Exposición
              </h4>
              <p className="leading-relaxed">
                Runge-Kutta de Grado 2 representa el estándar de balance en cálculo numérico: elimina por completo la complejidad analítica de calcular derivadas parciales requeridas por Taylor de grado 2, pero conservando su misma tasa de convergencia cuadrática y estabilidad numérica.
              </p>
            </div>
          </div>
        )}

      </main>

      <footer className="border-t border-slate-800/80 py-4 text-center text-xs font-mono text-slate-500">
        Cátedra de Modelos Numéricos & Cálculo Avanzado · UTN Facultad Regional La Plata
      </footer>
    </div>
  );
}