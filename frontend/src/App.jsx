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
    nombre: "Ejercicio Teórico",
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
    color: "#0284c7"
  },
  ej1a_practica: {
    nombre: "Práctica 2 - Ej. 1.a",
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
    color: "#d97706"
  },
  ej1b_practica: {
    nombre: "Práctica 2 - Ej. 1.b",
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
    color: "#7c3aed"
  },
  ej1c_practica: {
    nombre: "Práctica 2 - Ej. 1.c",
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
    color: "#059669"
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
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-slate-300 p-3 rounded-xl shadow-xl text-xs font-mono text-slate-800">
          <p className="text-indigo-600 font-bold mb-1">Paso n = {data.n} (x = {data.xn})</p>
          <div className="space-y-1 text-slate-700">
            <p><span className="text-slate-500">y (RK2):</span> <strong className="text-slate-900">{data.yn}</strong></p>
            {data.exactVal !== null && (
              <div className="pt-1 mt-1 border-t border-slate-200">
                <p><span className="text-slate-500">y (Exacto):</span> {data.exactVal}</p>
                <p className="text-emerald-700 font-bold"><span className="text-slate-500">Error Abs:</span> {data.errorAbs}</p>
              </div>
            )}
            {data.k1 !== null && (
              <div className="pt-1 mt-1 border-t border-slate-200 text-[11px] text-slate-500">
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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      
      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-md font-mono font-bold text-base flex items-center justify-center">
              RK2
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Runge-Kutta 2º Orden</span>
                <span className="text-xs font-semibold text-indigo-600 font-mono bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  (Método del Punto Medio)
                </span>
              </h1>
              <p className="text-xs text-slate-500">Analisis Numerico — UTN</p>
            </div>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setActiveTab('simulador')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'simulador' 
                  ? 'bg-white text-indigo-700 shadow-sm font-bold border border-slate-200' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calculator className="w-4 h-4" /> Simulador
            </button>
            <button
              onClick={() => setActiveTab('fundamentos')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'fundamentos' 
                  ? 'bg-white text-indigo-700 shadow-sm font-bold border border-slate-200' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4" /> Fundamentos del P.V.I
            </button>
            <button
              onClick={() => setActiveTab('defensa')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'defensa' 
                  ? 'bg-white text-indigo-700 shadow-sm font-bold border border-slate-200' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HelpCircle className="w-4 h-4" /> Conclusión
            </button>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full space-y-6">

        {activeTab === 'simulador' && (
          <div className="space-y-6">
            
            {/* SELECTOR DE EJERCICIOS CON LOS 4 DEL PDF */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Ejercicios:</span>
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
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-800 font-bold shadow-sm' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isSel ? 'bg-indigo-600' : 'bg-slate-400'}`} />
                      <span>{p.nombre}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* KPI STAT CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Aproximación RK2</p>
                  <p className="text-xl font-bold font-mono text-indigo-600 mt-0.5">
                    y({xf}) ≈ {resultData?.final_result ?? '...'}
                  </p>
                </div>
                <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl border border-indigo-100">
                  <Activity className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Solución Exacta</p>
                  <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
                    {finalExact !== null ? finalExact.toFixed(6) : 'Personalizada'}
                  </p>
                </div>
                <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl border border-emerald-100">
                  <Check className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Error Absoluto</p>
                  <p className="text-xl font-bold font-mono text-amber-700 mt-0.5">
                    {finalError}
                  </p>
                </div>
                <div className="bg-amber-50 text-amber-600 p-2.5 rounded-xl border border-amber-100">
                  <Target className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Iteraciones</p>
                  <p className="text-xl font-bold font-mono text-slate-800 mt-0.5">
                    {resultData?.total_steps ?? 0} <span className="text-xs font-normal text-slate-500">pasos</span>
                  </p>
                </div>
                <div className="bg-slate-100 text-slate-600 p-2.5 rounded-xl border border-slate-200">
                  <Zap className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* SECCIÓN PRINCIPAL */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* PANEL IZQUIERDO */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h2 className="text-sm font-bold flex items-center gap-2 text-slate-900">
                      <Layers className="w-4 h-4 text-indigo-600" /> Parámetros del P.V.I
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowKeypad(!showKeypad)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>{showKeypad ? 'Ocultar Teclado' : 'Teclado Matemático'}</span>
                      {showKeypad ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  <div className="space-y-3.5">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-slate-700">
                          Ecuación Diferencial:
                        </label>
                        <span className="text-xs text-indigo-700 font-mono bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 font-bold">
                          <MathText math={previewLatex} />
                        </span>
                      </div>
                      <input
                        ref={inputRef}
                        type="text"
                        value={equation}
                        onChange={(e) => setEquation(e.target.value)}
                        placeholder="Ej: 2x*y o -3x^2*y"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:border-indigo-500 focus:bg-white focus:outline-none"
                      />
                    </div>

                    {/* TECLADO MATEMÁTICO */}
                    {showKeypad && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                          <span>Botones rápidos:</span>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={backspaceEquation}
                              className="px-2 py-0.5 rounded bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 flex items-center gap-1 cursor-pointer"
                            >
                              <Delete className="w-3 h-3" /> ⌫
                            </button>
                            <button
                              type="button"
                              onClick={clearEquation}
                              className="px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" /> AC
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-5 gap-1.5 text-xs font-mono">
                          <button type="button" onClick={() => insertSymbol('x')} className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-indigo-700 font-bold">x</button>
                          <button type="button" onClick={() => insertSymbol('y')} className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-indigo-700 font-bold">y</button>
                          <button type="button" onClick={() => insertSymbol('x^2')} className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 font-semibold">x²</button>
                          <button type="button" onClick={() => insertSymbol('y^2')} className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 font-semibold">y²</button>
                          <button type="button" onClick={() => insertSymbol('^')} className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded font-bold">xⁿ</button>

                          <button type="button" onClick={() => insertSymbol('+')} className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-amber-700 font-bold">+</button>
                          <button type="button" onClick={() => insertSymbol('-')} className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-amber-700 font-bold">-</button>
                          <button type="button" onClick={() => insertSymbol('*')} className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-amber-700 font-bold">×</button>
                          <button type="button" onClick={() => insertSymbol('/')} className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-amber-700 font-bold">÷</button>
                          <button type="button" onClick={() => insertSymbol('0.25*')} className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-600">¼·</button>

                          <button type="button" onClick={() => insertSymbol('(')} className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700">(</button>
                          <button type="button" onClick={() => insertSymbol(')')} className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700">)</button>
                          <button type="button" onClick={() => insertSymbol('exp(')} className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-emerald-700 font-semibold">eˣ</button>
                          <button type="button" onClick={() => insertSymbol('sen(')} className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-emerald-700 font-semibold">sen</button>
                          <button type="button" onClick={() => insertSymbol('cos(')} className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-emerald-700 font-semibold">cos</button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          <MathText math="x_0" /> (Inicio)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={x0}
                          onChange={(e) => setX0(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold focus:border-indigo-500 focus:bg-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          <MathText math="y_0 = y(x_0)" />
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={y0}
                          onChange={(e) => setY0(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold focus:border-indigo-500 focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          <MathText math="x_f" /> (Objetivo)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={xf}
                          onChange={(e) => setXf(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold focus:border-indigo-500 focus:bg-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Paso (<MathText math="h" />)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={h}
                          onChange={(e) => setH(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold focus:border-indigo-500 focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      {loading && <span className="text-indigo-600 font-mono animate-pulse">Calculando...</span>}
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                      {errorMsg}
                    </div>
                  )}
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Info className="w-4 h-4 text-indigo-600" />
                    <span>Detalle</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Al modificar cualquier valor, la curva se adapta dependiendo de los parametros que se hayan ingresado.
                  </p>
                </div>
              </div>

              {/* PANEL DERECHO: GRÁFICA FLUIDA CON LINECHART */}
              <div className="lg:col-span-7 space-y-4">
                
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveSubTab('graficos')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                        activeSubTab === 'graficos' 
                          ? 'bg-white text-indigo-700 border border-slate-300 shadow-sm font-bold' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Gráfica
                    </button>
                    <button
                      onClick={() => setActiveSubTab('tabla')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                        activeSubTab === 'tabla' 
                          ? 'bg-white text-indigo-700 border border-slate-300 shadow-sm font-bold' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Paso a Paso
                    </button>
                    <button
                      onClick={() => setActiveSubTab('deduccion')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                        activeSubTab === 'deduccion' 
                          ? 'bg-white text-indigo-700 border border-slate-300 shadow-sm font-bold' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Deducción
                    </button>
                  </div>

                  <span className="text-[11px] font-mono text-slate-500">
                    <MathText math={`h = ${h}`} /> · {resultData?.total_steps ?? 0} pasos
                  </span>
                </div>

                {/* GRÁFICA FLUIDA 100% CON LINECHART */}
                {activeSubTab === 'graficos' && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-indigo-600" /> Curva de Solución Aproximada
                        </h3>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="flex items-center gap-1.5 text-slate-800 font-semibold">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> Curva RK2
                        </span>
                        {hasExactSolution && (
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <span className="w-3 h-0.5 bg-slate-400" /> Analítica
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="h-[500px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart 
                          data={chartData} 
                          margin={{ top: 20, right: 30, bottom: 20, left: 15 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="xn" 
                            stroke="#64748b" 
                            tick={{ fontSize: 11 }} 
                          />
                          <YAxis 
                            stroke="#64748b" 
                            tick={{ fontSize: 11 }} 
                            domain={['auto', 'auto']} 
                            tickFormatter={(val) => Math.abs(val) >= 10000 || (Math.abs(val) < 0.001 && val !== 0) ? val.toExponential(1) : val}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          
                          {/* Línea analítica discontinua si existe */}
                          {hasExactSolution && (
                            <Line 
                              type="monotone" 
                              dataKey="exactVal" 
                              stroke="#94a3b8" 
                              strokeDasharray="4 4" 
                              strokeWidth={2} 
                              dot={false} 
                              name="Solución Exacta" 
                              isAnimationActive={true}
                              animationDuration={400}
                            />
                          )}

                          {/* Línea principal RK2 */}
                          <Line 
                            type="monotone" 
                            dataKey="yn" 
                            stroke="#4f46e5" 
                            strokeWidth={3} 
                            dot={{ r: 5, fill: '#6366f1', stroke: '#4f46e5', strokeWidth: 2 }} 
                            activeDot={{ r: 7, fill: '#4f46e5' }}
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
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm overflow-x-auto space-y-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        Tabla Numérica Desglosada
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Puntos intermedios y avance paso a paso para el intervalo configurado.
                      </p>
                    </div>

                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5 text-center"><MathText math="n" /></th>
                          <th className="p-2.5"><MathText math="x_n" /></th>
                          <th className="p-2.5 text-indigo-700 font-bold"><MathText math="y_n \text{ (RK2)}" /></th>
                          <th className="p-2.5"><MathText math="k_1 = h \cdot f(x_n, y_n)" /></th>
                          <th className="p-2.5"><MathText math="x_{\text{med}}" /></th>
                          <th className="p-2.5"><MathText math="y_{\text{med}}" /></th>
                          <th className="p-2.5 text-emerald-700"><MathText math="y_{\text{exacto}}" /></th>
                          <th className="p-2.5 text-amber-700">Error Abs.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {chartData.map((s) => (
                          <tr key={s.n} className="hover:bg-slate-50">
                            <td className="p-2.5 text-center font-bold text-slate-500">{s.n}</td>
                            <td className="p-2.5 text-slate-800">{s.xn}</td>
                            <td className="p-2.5 text-indigo-700 font-bold">{s.yn}</td>
                            <td className="p-2.5 text-slate-600">{s.k1 !== null ? s.k1 : '— (Inicio)'}</td>
                            <td className="p-2.5 text-slate-600">{s.x_mid !== null ? s.x_mid : '—'}</td>
                            <td className="p-2.5 text-slate-600">{s.y_mid !== null ? s.y_mid : '—'}</td>
                            <td className="p-2.5 text-emerald-700 font-semibold">{s.exactVal !== null ? s.exactVal : 'N/A'}</td>
                            <td className="p-2.5 text-amber-700 font-bold">{s.errorAbs !== null ? s.errorAbs : '0.000000'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* DEDUCCIÓN OFICIAL */}
                {activeSubTab === 'deduccion' && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5 text-xs">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 mt-1">
                        Definición Formal de la "Ordenada Genérica" en Runge-Kutta 2
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <h4 className="font-bold text-slate-900">1. Pendiente Inicial (<MathText math="k_1" />)</h4>
                        <p className="text-slate-600">
                          Se calcula la pendiente en el inicio del subintervalo:
                        </p>
                        <div className="p-3 bg-white rounded-lg border border-slate-200 text-indigo-700 text-center font-bold text-sm">
                          <MathText math="k_1 = h \cdot f(x_n, y_n) = h \cdot y'_n" block />
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <h4 className="font-bold text-slate-900">2. Coordenadas del Punto Medio</h4>
                        <p className="text-slate-600">
                          Se avanza medio paso tanto en la abscisa como en la ordenada estimada:
                        </p>
                        <div className="p-3 bg-white rounded-lg border border-slate-200 text-indigo-700 text-center font-bold text-sm">
                          <MathText math="x_{\text{med}} = x_n + \frac{h}{2} \quad , \quad y_{\text{med}} = y_n + \frac{k_1}{2}" block />
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                      <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold font-mono">
                        Expresión Final de la Ordenada Genérica:
                      </p>
                      <div className="text-base font-bold text-slate-900 py-1">
                        <MathText math="y_{n+1} = y_n + h \cdot f\left(x_n + \frac{h}{2} \;,\; y_n + \frac{k_1}{2}\right)" block />
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        )}

        {/* ========================================================
            TAB 2: FUNDAMENTOS DEL P.V.I & CLASIFICACIÓN DE CÁTEDRA
        ======================================================== */}
        {activeTab === 'fundamentos' && (
          <div className="space-y-6">
            
            {/* BLOQUE 1: DEFINICIÓN DE EDO Y SOLUCIÓN NUMÉRICA */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <span className="text-xs font-mono uppercase tracking-wider text-indigo-600 font-bold">
                Marco Teórico · Ecuaciones Diferenciales Ordinarias (E.D.O.)
              </span>
              <h2 className="text-2xl font-bold text-slate-900">
                ¿Qué es una E.D.O y qué se busca resolver numéricamente?
              </h2>
              <p className="text-slate-700 leading-relaxed text-sm">
                Una ecuación diferencial ordinaria relaciona una función desconocida con sus derivadas:
              </p>
              
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center font-mono text-indigo-700 text-base">
                <MathText math="y' = f(x, y(x)) = \frac{dy}{dx}" block />
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
                <p className="font-bold text-slate-900">
                  ¿Qué significa obtener una "Solución Numérica"?
                </p>
                <p className="text-slate-600 leading-relaxed">
                  En muchos problemas de ingeniería no se puede obtener fácilmente una solución analítica o fórmula cerrada de <MathText math="y(x)" />. El objetivo de los métodos numéricos no es hallar esa función continua, sino calcular una <strong className="text-slate-900 font-bold">sucesión discreta de valores aproximados</strong>:
                </p>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-center font-mono text-indigo-700 text-base">
                  <MathText math="y_1, \, y_2, \, y_3, \, \dots, \, y_n \approx y(x_1), \, y(x_2), \, y(x_3), \, \dots, \, y(x_n)" block />
                </div>
                <p className="text-slate-600">
                  Donde cada <MathText math="y_n" /> representa la aproximación numérica del valor verdadero en la abscisa <MathText math="x_n" />.
                </p>
              </div>
            </div>

            {/* BLOQUE 2: LOS 4 ELEMENTOS OBLIGATORIOS DEL P.V.I */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-900">
                Los 4 Elementos Necesarios para Resolver un P.V.I
              </h3>
              <p className="text-slate-600 text-xs">
                Un Problema de Valor Inicial queda unívocamente determinado por cuatro componentes:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 font-mono text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[11px] mb-1">1. Ecuación diferencial</span>
                  <div className="font-bold text-slate-900 text-sm"><MathText math="y' = f(x, y)" /></div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Indica cómo varía la función</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[11px] mb-1">2. Condición inicial</span>
                  <div className="font-bold text-slate-900 text-sm"><MathText math="y(x_0) = y_0" /></div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Punto de partida conocido</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[11px] mb-1">3. Dominio de trabajo</span>
                  <div className="font-bold text-slate-900 text-sm"><MathText math="x_0 \le x \le x_f" /></div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Intervalo de integración</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[11px] mb-1">4. Paso de avance (h)</span>
                  <div className="font-bold text-slate-900 text-sm"><MathText math="x_{n+1} = x_n + h" /></div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Distancia entre iteraciones</span>
                </div>
              </div>

              {/* FÓRMULA DE CANTIDAD DE ITERACIONES */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div>
                  <span className="text-slate-600">Cálculo de cantidad de iteraciones necesarias:</span>
                  <span className="text-indigo-700 font-bold ml-2">N = (x_f - x₀) / h</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Ejemplo: [1.0 a 1.3] con h=0.1 ➔ N = (1.3 - 1.0)/0.1 = <strong>3 pasos</strong>
                </span>
              </div>
            </div>

            {/* BLOQUE 3: PASO SIMPLE VS PASO MÚLTIPLE & EL ROL DE RK2 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-900">
                Clasificación de Algoritmos para la "Ordenada Genérica" yₙ₊₁
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Paso Simple */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-indigo-700 text-sm">1. Algoritmos de Paso Simple</h4>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 font-mono font-bold">
                      Aquí entra RK2
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Para calcular <MathText math="y_{n+1}" /> requieren únicamente información correspondiente al subintervalo actual <MathText math="[x_n, x_{n+1}]" />.
                  </p>
                  <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                    <li>Utilizan valores de <MathText math="y_n" /> y de <MathText math="f(x_n, y_n)" /> en el punto actual o puntos intermedios.</li>
                    <li><strong className="text-slate-800">No necesitan</strong> información de pasos anteriores (<MathText math="y_{n-1}, y_{n-2}" />).</li>
                  </ul>
                </div>

                {/* Paso Múltiple */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 text-sm">2. Algoritmos de Paso Múltiple</h4>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded border border-slate-300 font-mono">
                      Adams-Bashforth
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Para calcular <MathText math="y_{n+1}" /> requieren información que provenga de varios subintervalos previos:
                  </p>
                  <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                    <li>Necesitan conocer previamente los valores de <MathText math="y_n, y_{n-1}, y_{n-2}, \dots" /></li>
                    <li>Reutilizan evaluaciones anteriores para ahorrar costo computacional.</li>
                  </ul>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: PREGUNTAS TÍPICAS DE DEFENSA & COLOQUIO
        ======================================================== */}
        {activeTab === 'defensa' && (
          <div className="space-y-6">
            
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-2xl font-bold text-slate-900">
                Preguntas interesantes
              </h2>

              <div className="space-y-4 pt-2">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="text-sm font-bold text-indigo-900">
                    1. ¿Por qué Runge-Kutta es de "Paso Simple" y cómo se relaciona con los métodos de "Paso Múltiple"?
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed pl-2">
                    Es de <strong className="text-slate-900 font-bold">Paso Simple (One-step)</strong> porque para obtener <MathText math="y_{n+1}" /> únicamente requiere la información del intervalo actual <MathText math="[x_n, x_{n+1}]" />. Por el contrario, los métodos de <strong className="text-slate-900 font-bold">Paso Múltiple</strong> (como Adams-Bashforth) necesitan varios puntos previos (<MathText math="y_n, y_{n-1}, y_{n-2}" />). Por esa razón, <strong className="text-indigo-700 font-bold">siempre se debe iniciar un problema con Runge-Kutta como "arrancador"</strong> para generar los primeros puntos que el paso múltiple no conoce inicialmente.
                  </p>
                </div>

                <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                  <h4 className="text-sm font-bold text-indigo-900">
                    2. ¿Qué significado geométrico tiene evaluar en el punto medio?
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed pl-2">
                    Representa el <strong className="text-slate-900 font-bold">Método del Punto Medio</strong>. Al dar medio paso hasta las coordenadas intermedias <MathText math="\left(x_n + \frac{h}{2}, \; y_n + \frac{k_1}{2}\right)" /> con la pendiente inicial, se muestrea la inclinación promedio en el centro del intervalo. Esto balancea la curvatura de la función y elimina el error de pendiente unilateral que tiene Euler clásico.
                  </p>
                </div>
              </div>
            </div>

            {/* CONCLUSIÓN FINAL */}
            <div className="bg-gradient-to-r from-indigo-50 to-white border border-indigo-200 rounded-2xl p-5 text-xs text-slate-700 space-y-2 shadow-sm">
              <h4 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" /> Conclusión de Cierre para la Exposición
              </h4>
              <p className="leading-relaxed">
                Runge-Kutta de Grado 2 representa el estándar de balance en cálculo numérico: elimina por completo la complejidad analítica de calcular derivadas parciales requeridas por Taylor de grado 2, pero conservando su misma tasa de convergencia cuadrática y estabilidad numérica.
              </p>
            </div>

          </div>
        )}

      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs font-mono text-slate-500">
        Analisis Numerico · UTN Facultad Regional La Plata
      </footer>
    </div>
  );
}