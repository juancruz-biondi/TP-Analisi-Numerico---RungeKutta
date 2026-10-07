import React from 'react';
import katex from 'katex';

export default function MathText({ math, text, block = false, className = "" }) {
  // Si se le pasa la propiedad 'math' directamente (ej: math="e^{x^2 - 1}")
  if (math) {
    try {
      const html = katex.renderToString(math, {
        displayMode: block,
        throwOnError: false,
      });
      return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
    } catch (e) {
      return <span className={className}>{math}</span>;
    }
  }

  // Si se le pasa 'text' con texto mezclado y signos $ (ej: "según $y = 2xy$")
  if (text) {
    const parts = text.split(/(\$[^$]+\$)/g);
    return (
      <span className={className}>
        {parts.map((part, index) => {
          if (part.startsWith('$') && part.endsWith('$')) {
            const mathExp = part.slice(1, -1);
            try {
              const html = katex.renderToString(mathExp, {
                displayMode: false,
                throwOnError: false,
              });
              return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
            } catch (e) {
              return <span key={index}>{part}</span>;
            }
          }
          return <span key={index}>{part}</span>;
        })}
      </span>
    );
  }

  return null;
}