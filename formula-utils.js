// formulaUtils.js - Utility functions for formula evaluation

// Extract range from formula like "A1:B5"
export const extractRange = (rangeStr) => {
  const [start, end] = rangeStr.split(':');
  return { start, end };
};

// Get cells within a range
export const getCellsInRange = (range) => {
  const { start, end } = range;
  
  // Extract column and row indices
  const startCol = start.match(/[A-Z]+/)[0];
  const startRow = parseInt(start.match(/[0-9]+/)[0]);
  const endCol = end.match(/[A-Z]+/)[0];
  const endRow = parseInt(end.match(/[0-9]+/)[0]);
  
  // Convert column letters to indices
  const startColIdx = startCol.charCodeAt(0) - 65;
  const endColIdx = endCol.charCodeAt(0) - 65;
  
  const cells = [];
  
  for (let r = Math.min(startRow, endRow); r <= Math.max(startRow, endRow); r++) {
    for (let c = Math.min(startColIdx, endColIdx); c <= Math.max(startColIdx, endColIdx); c++) {
      const cellId = `${String.fromCharCode(65 + c)}${r}`;
      cells.push(cellId);
    }
  }
  
  return cells;
};

// Parse and evaluate formulas
export const evaluateFormula = (formula, cellId, data) => {
  // If not a formula, return the value
  if (!formula.startsWith('=')) {
    return formula;
  }

  try {
    // Remove the '=' sign
    const expression = formula.substring(1);

    // Check for functions
    if (expression.includes('SUM(')) {
      return evaluateSum(expression, cellId, data);
    } else if (expression.includes('AVERAGE(')) {
      return evaluateAverage(expression, cellId, data);
    } else if (expression.includes('MAX(')) {
      return evaluateMax(expression, cellId, data);
    } else if (expression.includes('MIN(')) {
      return evaluateMin(expression, cellId, data);
    } else if (expression.includes('COUNT(')) {
      return evaluateCount(expression, cellId, data);
    } else if (expression.includes('TRIM(')) {
      return evaluateTrim(expression, cellId, data);
    } else if (expression.includes('UPPER(')) {
      return evaluateUpper(expression, cellId, data);
    } else if (expression.includes('LOWER(')) {
      return evaluateLower(expression, cellId, data);
    } else {
      // Handle basic calculations
      // Replace cell references with their values
      const cellRegex = /[A-Z]+[0-9]+/g;
      const cellsInFormula = expression.match(cellRegex) || [];
      
      let evaluatedExpression = expression;
      
      for (const cell of cellsInFormula) {
        // Check for circular references
        if (cell === cellId) {
          throw new Error('Circular reference detected');
        }
        
        const cellValue = data[cell]?.value !== undefined ? data[cell].value : 0;
        
        // Only replace if it's not a string value
        if (!isNaN(cellValue)) {
          evaluatedExpression = evaluatedExpression.replace(cell, cellValue);
        } else {
          evaluatedExpression = evaluatedExpression.replace(cell, `"${cellValue}"`);
        }
      }
      
      // Safely evaluate the expression
      // eslint-disable-next-line no-eval
      return eval(evaluatedExpression);
    }
  } catch (error) {
    console.error('Formula evaluation error:', error);
    return '#ERROR!';
  }
};

// Implementation of SUM function
export const evaluateSum = (expression, cellId, data) => {
  try {
    // Extract range from SUM(A1:B5)
    const rangeStr = expression.match(/SUM\(([^)]+)\)/)[1];
    const range = extractRange(rangeStr);
    const cells = getCellsInRange(range);
    
    let sum = 0;
    for (const cell of cells) {
      if