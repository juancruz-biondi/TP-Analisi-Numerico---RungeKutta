from flask import Flask, request, jsonify
from flask_cors import CORS
import sympy as sp
from sympy.parsing.sympy_parser import (
    parse_expr, 
    standard_transformations, 
    implicit_multiplication_application,
    convert_xor
)

app = Flask(__name__)
CORS(app)

# Habilita multiplicación implícita (ej: 2x -> 2*x) y potencia con ^ (ej: x^2 -> x**2)
transformations = standard_transformations + (implicit_multiplication_application, convert_xor)

@app.route("/solve", methods=["POST"])
def solve_rk2():
    data = request.get_json()
    if not data:
        return jsonify({"detail": "Datos no proporcionados"}), 400

    equation_str = data.get("equation", "")
    x0 = float(data.get("x0", 0.0))
    y0 = float(data.get("y0", 0.0))
    xf = float(data.get("xf", 1.0))
    h = float(data.get("h", 0.1))
    var_name = data.get("variable", "x")

    try:
        # Reemplazos amigables habituales en español
        eq_clean = equation_str.replace("sen(", "sin(")
        
        var = sp.Symbol(var_name)
        y = sp.Symbol('y')
        
        # Parsea con soporte de 2x y ^
        expr = parse_expr(eq_clean, transformations=transformations)
        f = sp.lambdify((var, y), expr, modules=['math'])
    except Exception as e:
        return jsonify({"detail": f"Error en la expresión f({var_name}, y): {str(e)}"}), 400


@app.route("/preset-exercises", methods=["GET"])
def get_presets():
    return jsonify([
        {
            "title": "Ejercicio 4 Teórico",
            "equation": "2*x*y",
            "x0": 1.0,
            "y0": 1.0,
            "xf": 1.3,
            "h": 0.1,
            "variable": "x",
            "description": "Problema resuelto en el apunte. Demuestra paso a paso hasta 1.3."
        },
        {
            "title": "Práctica 2 - Ejercicio 1.a",
            "equation": "-3*x**2*y",
            "x0": 0.0,
            "y0": 3.0,
            "xf": 0.5,
            "h": 0.1,
            "variable": "x",
            "description": "Ecuación con derivada cuadrática en x: y' = -3x²y."
        },
        {
            "title": "Práctica 2 - Ejercicio 1.b",
            "equation": "0.25*(1 + y**2)",
            "x0": 0.0,
            "y0": 1.0,
            "xf": 0.5,
            "h": 0.1,
            "variable": "x",
            "description": "Ecuación no lineal: y' = 1/4 (1 + y²)."
        }
    ])


if __name__ == "__main__":
    print("Servidor backend corriendo en http://localhost:8000")
    app.run(host="0.0.0.0", port=8000, debug=True)