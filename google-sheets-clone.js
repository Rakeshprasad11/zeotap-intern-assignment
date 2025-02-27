import React, { useState, useEffect, useRef } from 'react';
import './SpreadsheetApp.css';

const SpreadsheetApp = () => {
  // Default number of rows and columns
  const DEFAULT_ROWS = 50;
  const DEFAULT_COLS = 26;
  
  // State for spreadsheet data, selections, and UI controls
  const [data, setData] = useState({});
  const [selectedCell, setSelectedCell] = useState(null);
  const [formulaBarValue, setFormulaBarValue] = useState('');
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [selectedRange, setSelectedRange] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [clipboard, setClipboard] = useState(null);
  const gridRef = useRef(null);
  
  // Initialize empty spreadsheet data
  useEffect(() => {
    const initialData = {};
    for (let r = 0; r < DEFAULT_ROWS; r++) {
      for (let c = 0; c < DEFAULT_COLS; c++) {
        const cellId = `${String.fromCharCode(65 + c)}${r + 1}`;
        initialData[cellId] = {
          value: '',
          formula: '',
          formatted: '',
          formatting: {
            bold: false,
            italic: false,
            color: 'black',
            fontSize: 12,
          }
        };
      }
    }
    setData(initialData);
  }, []);

  // Helper function to convert column index to letter (A, B, C, ...)
  const colIndexToLetter = (index) => {
    return String.fromCharCode(65 + index);
  };

  // Handle selecting a cell
  const handleCellSelect = (cellId) => {
    setSelectedCell(cellId);
    setFormulaBarValue(data[cellId]?.formula || data[cellId]?.value || '');
    setDragStart(cellId);
    setDragEnd(cellId);
    setSelectedRange({ start: cellId, end: cellId });
  };

  // Handle mouse down for drag selection
  const handleMouseDown = (cellId, e) => {
    e.preventDefault();
    setSelectedCell(cellId);
    setFormulaBarValue(data[cellId]?.formula || data[cellId]?.value || '');
    setDragStart(cellId);
    setDragEnd(cellId);
    setSelectedRange({ start: cellId, end: cellId });
    setIsDragging(true);
  };

  // Handle mouse over for drag selection
  const handleMouseOver = (cellId) => {
    if (isDragging) {
      setDragEnd(cellId);
      setSelectedRange({ start: dragStart, end: cellId });
    }
  };

  // Handle mouse up to end dragging
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add event listener for mouse up
  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Parse and evaluate formulas
  const evaluateFormula = (formula, cellId) => {
    // If not a formula, return the value
    if (!formula.startsWith('=')) {
      return formula;
    }

    try {
      // Remove the '=' sign
      const expression = formula.substring(1);

      // Check for functions
      if (expression.includes('SUM(')) {
        return evaluateSum(expression, cellId);
      } else if (expression.includes('AVERAGE(')) {
        return evaluateAverage(expression, cellId);
      } else if (expression.includes('MAX(')) {
        return evaluateMax(expression, cellId);
      } else if (expression.includes('MIN(')) {
        return evaluateMin(expression, cellId);
      } else if (expression.includes('COUNT(')) {
        return evaluateCount(expression, cellId);
      } else if (expression.includes('TRIM(')) {
        return evaluateTrim(expression, cellId);
      } else if (expression.includes('UPPER(')) {
        return evaluateUpper(expression, cellId);
      } else if (expression.includes('LOWER(')) {
        return evaluateLower(expression, cellId);
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

  // Extract range from formula like "A1:B5"
  const extractRange = (rangeStr) => {
    const [start, end] = rangeStr.split(':');
    return { start, end };
  };

  // Get cells within a range
  const getCellsInRange = (range) => {
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

  // Implementation of SUM function
  const evaluateSum = (expression, cellId) => {
    // Extract range from SUM(A1:B5)
    const rangeStr = expression.match(/SUM\(([^)]+)\)/)[1];
    const range = extractRange(rangeStr);
    const cells = getCellsInRange(range);
    
    let sum = 0;
    for (const cell of cells) {
      if (data[cell] && !isNaN(data[cell].value)) {
        sum += parseFloat(data[cell].value);
      }
    }
    
    return sum;
  };

  // Implementation of AVERAGE function
  const evaluateAverage = (expression, cellId) => {
    const rangeStr = expression.match(/AVERAGE\(([^)]+)\)/)[1];
    const range = extractRange(rangeStr);
    const cells = getCellsInRange(range);
    
    let sum = 0;
    let count = 0;
    
    for (const cell of cells) {
      if (data[cell] && !isNaN(data[cell].value)) {
        sum += parseFloat(data[cell].value);
        count++;
      }
    }
    
    return count > 0 ? sum / count : 0;
  };

  // Implementation of MAX function
  const evaluateMax = (expression, cellId) => {
    const rangeStr = expression.match(/MAX\(([^)]+)\)/)[1];
    const range = extractRange(rangeStr);
    const cells = getCellsInRange(range);
    
    let max = Number.NEGATIVE_INFINITY;
    
    for (const cell of cells) {
      if (data[cell] && !isNaN(data[cell].value)) {
        const value = parseFloat(data[cell].value);
        if (value > max) {
          max = value;
        }
      }
    }
    
    return max === Number.NEGATIVE_INFINITY ? 0 : max;
  };

  // Implementation of MIN function
  const evaluateMin = (expression, cellId) => {
    const rangeStr = expression.match(/MIN\(([^)]+)\)/)[1];
    const range = extractRange(rangeStr);
    const cells = getCellsInRange(range);
    
    let min = Number.POSITIVE_INFINITY;
    
    for (const cell of cells) {
      if (data[cell] && !isNaN(data[cell].value)) {
        const value = parseFloat(data[cell].value);
        if (value < min) {
          min = value;
        }
      }
    }
    
    return min === Number.POSITIVE_INFINITY ? 0 : min;
  };

  // Implementation of COUNT function
  const evaluateCount = (expression, cellId) => {
    const rangeStr = expression.match(/COUNT\(([^)]+)\)/)[1];
    const range = extractRange(rangeStr);
    const cells = getCellsInRange(range);
    
    let count = 0;
    
    for (const cell of cells) {
      if (data[cell] && !isNaN(data[cell].value)) {
        count++;
      }
    }
    
    return count;
  };

  // Implementation of TRIM function
  const evaluateTrim = (expression, cellId) => {
    const cellRef = expression.match(/TRIM\(([^)]+)\)/)[1];
    
    if (data[cellRef]) {
      return String(data[cellRef].value).trim();
    }
    
    return '';
  };

  // Implementation of UPPER function
  const evaluateUpper = (expression, cellId) => {
    const cellRef = expression.match(/UPPER\(([^)]+)\)/)[1];
    
    if (data[cellRef]) {
      return String(data[cellRef].value).toUpperCase();
    }
    
    return '';
  };

  // Implementation of LOWER function
  const evaluateLower = (expression, cellId) => {
    const cellRef = expression.match(/LOWER\(([^)]+)\)/)[1];
    
    if (data[cellRef]) {
      return String(data[cellRef].value).toLowerCase();
    }
    
    return '';
  };

  // Handle formula bar input change
  const handleFormulaBarChange = (e) => {
    setFormulaBarValue(e.target.value);
  };

  // Handle formula bar key press
  const handleFormulaBarKeyPress = (e) => {
    if (e.key === 'Enter' && selectedCell) {
      updateCellData(selectedCell, formulaBarValue);
    }
  };

  // Update cell data and handle dependencies
  const updateCellData = (cellId, value) => {
    const newData = { ...data };
    const isFormula = value.startsWith('=');
    
    // Update the cell data
    newData[cellId] = {
      ...newData[cellId],
      formula: isFormula ? value : '',
      value: isFormula ? evaluateFormula(value, cellId) : value,
      formatted: isFormula ? evaluateFormula(value, cellId) : value,
    };
    
    // Update dependent cells
    updateDependentCells(newData);
    
    setData(newData);
  };

  // Update cells that depend on changed cells
  const updateDependentCells = (newData) => {
    // This is a simple implementation that reevaluates all formulas
    // A more efficient implementation would track dependencies
    for (const cellId in newData) {
      if (newData[cellId].formula) {
        newData[cellId].value = evaluateFormula(newData[cellId].formula, cellId);
        newData[cellId].formatted = newData[cellId].value;
      }
    }
  };

  // Handle keyboard shortcuts (Copy/Paste/Cut)
  const handleKeyDown = (e) => {
    if (selectedCell) {
      // Copy (Ctrl+C)
      if (e.ctrlKey && e.key === 'c') {
        setClipboard({
          type: 'copy',
          data: data[selectedCell]
        });
      }
      
      // Cut (Ctrl+X)
      if (e.ctrlKey && e.key === 'x') {
        setClipboard({
          type: 'cut',
          data: data[selectedCell]
        });
        
        const newData = { ...data };
        newData[selectedCell] = {
          ...newData[selectedCell],
          formula: '',
          value: '',
          formatted: '',
        };
        
        setData(newData);
      }
      
      // Paste (Ctrl+V)
      if (e.ctrlKey && e.key === 'v' && clipboard) {
        const newData = { ...data };
        newData[selectedCell] = {
          ...newData[selectedCell],
          formula: clipboard.data.formula,
          value: clipboard.data.formula 
            ? evaluateFormula(clipboard.data.formula, selectedCell) 
            : clipboard.data.value,
          formatted: clipboard.data.formula 
            ? evaluateFormula(clipboard.data.formula, selectedCell) 
            : clipboard.data.value,
          formatting: { ...clipboard.data.formatting },
        };
        
        setData(newData);
      }
    }
  };

  // Apply text formatting to selected cell
  const applyFormatting = (type) => {
    if (!selectedCell) return;

    const newData = { ...data };
    
    switch (type) {
      case 'bold':
        newData[selectedCell].formatting.bold = !newData[selectedCell].formatting.bold;
        break;
      case 'italic':
        newData[selectedCell].formatting.italic = !newData[selectedCell].formatting.italic;
        break;
      case 'color':
        const color = prompt('Enter color (e.g., red, #FF0000):', newData[selectedCell].formatting.color);
        if (color) {
          newData[selectedCell].formatting.color = color;
        }
        break;
      case 'fontSize':
        const size = prompt('Enter font size:', newData[selectedCell].formatting.fontSize);
        if (size && !isNaN(size)) {
          newData[selectedCell].formatting.fontSize = parseInt(size);
        }
        break;
      default:
        break;
    }
    
    setData(newData);
  };

  // Function to handle remove duplicates
  const removeDuplicates = () => {
    if (!selectedRange) return;
    
    const cells = getCellsInRange(selectedRange);
    const values = cells.map(cellId => data[cellId].value);
    
    // Find unique values
    const uniqueValues = [...new Set(values)];
    
    // Update cells to only include unique values
    const newData = { ...data };
    
    for (let i = 0; i < cells.length; i++) {
      if (i < uniqueValues.length) {
        newData[cells[i]].value = uniqueValues[i];
        newData[cells[i]].formatted = uniqueValues[i];
        newData[cells[i]].formula = '';
      } else {
        // Clear excess cells
        newData[cells[i]].value = '';
        newData[cells[i]].formatted = '';
        newData[cells[i]].formula = '';
      }
    }
    
    setData(newData);
  };

  // Function to handle find and replace
  const findAndReplace = () => {
    const findText = prompt('Find:');
    if (findText === null) return;
    
    const replaceText = prompt('Replace with:');
    if (replaceText === null) return;
    
    const newData = { ...data };
    
    // If range is selected, only search within that range
    if (selectedRange) {
      const cells = getCellsInRange(selectedRange);
      
      for (const cellId of cells) {
        if (typeof newData[cellId].value === 'string' && newData[cellId].value.includes(findText)) {
          newData[cellId].value = newData[cellId].value.replaceAll(findText, replaceText);
          newData[cellId].formatted = newData[cellId].value;
          // Clear formula if it exists as we're changing the value directly
          if (newData[cellId].formula) {
            newData[cellId].formula = '';
          }
        }
      }
    } else {
      // Search entire sheet
      for (const cellId in newData) {
        if (typeof newData[cellId].value === 'string' && newData[cellId].value.includes(findText)) {
          newData[cellId].value = newData[cellId].value.replaceAll(findText, replaceText);
          newData[cellId].formatted = newData[cellId].value;
          // Clear formula if it exists as we're changing the value directly
          if (newData[cellId].formula) {
            newData[cellId].formula = '';
          }
        }
      }
    }
    
    setData(newData);
  };

  // Check if cell is in selected range
  const isCellInSelectedRange = (cellId) => {
    if (!selectedRange) return false;
    
    const cells = getCellsInRange(selectedRange);
    return cells.includes(cellId);
  };

  // Add a new row
  const addRow = () => {
    // Get current selected row index
    if (!selectedCell) return;
    
    const rowIndex = parseInt(selectedCell.match(/[0-9]+/)[0]);
    
    // Create new data object
    const newData = { ...data };
    
    // Shift all rows below the selected row down by one
    for (let r = DEFAULT_ROWS - 1; r >= rowIndex; r--) {
      for (let c = 0; c < DEFAULT_COLS; c++) {
        const oldCellId = `${String.fromCharCode(65 + c)}${r}`;
        const newCellId = `${String.fromCharCode(65 + c)}${r + 1}`;
        
        if (newData[oldCellId]) {
          newData[newCellId] = { ...newData[oldCellId] };
        }
      }
    }
    
    // Initialize new row
    for (let c = 0; c < DEFAULT_COLS; c++) {
      const cellId = `${String.fromCharCode(65 + c)}${rowIndex}`;
      newData[cellId] = {
        value: '',
        formula: '',
        formatted: '',
        formatting: {
          bold: false,
          italic: false,
          color: 'black',
          fontSize: 12,
        }
      };
    }
    
    setData(newData);
    updateDependentCells(newData);
  };

  // Add a new column
  const addColumn = () => {
    // Get current selected column index
    if (!selectedCell) return;
    
    const colLetter = selectedCell.match(/[A-Z]+/)[0];
    const colIndex = colLetter.charCodeAt(0) - 65;
    
    // Create new data object
    const newData = { ...data };
    
    // Shift all columns to the right of the selected column by one
    for (let c = DEFAULT_COLS - 1; c >= colIndex; c--) {
      for (let r = 0; r < DEFAULT_ROWS; r++) {
        const oldCellId = `${String.fromCharCode(65 + c)}${r + 1}`;
        const newCellId = `${String.fromCharCode(65 + c + 1)}${r + 1}`;
        
        if (newData[oldCellId]) {
          newData[newCellId] = { ...newData[oldCellId] };
        }
      }
    }
    
    // Initialize new column
    for (let r = 0; r < DEFAULT_ROWS; r++) {
      const cellId = `${String.fromCharCode(65 + colIndex)}${r + 1}`;
      newData[cellId] = {
        value: '',
        formula: '',
        formatted: '',
        formatting: {
          bold: false,
          italic: false,
          color: 'black',
          fontSize: 12,
        }
      };
    }
    
    setData(newData);
    updateDependentCells(newData);
  };

  // Delete a row
  const deleteRow = () => {
    if (!selectedCell) return;
    
    const rowIndex = parseInt(selectedCell.match(/[0-9]+/)[0]);
    
    // Create new data object
    const newData = { ...data };
    
    // Shift all rows below the selected row up by one
    for (let r = rowIndex; r < DEFAULT_ROWS; r++) {
      for (let c = 0; c < DEFAULT_COLS; c++) {
        const currentCellId = `${String.fromCharCode(65 + c)}${r}`;
        const nextCellId = `${String.fromCharCode(65 + c)}${r + 1}`;
        
        if (newData[nextCellId]) {
          newData[currentCellId] = { ...newData[nextCellId] };
        } else {
          newData[currentCellId] = {
            value: '',
            formula: '',
            formatted: '',
            formatting: {
              bold: false,
              italic: false,
              color: 'black',
              fontSize: 12,
            }
          };
        }
      }
    }
    
    setData(newData);
    updateDependentCells(newData);
  };

  // Delete a column
  const deleteColumn = () => {
    if (!selectedCell) return;
    
    const colLetter = selectedCell.match(/[A-Z]+/)[0];
    const colIndex = colLetter.charCodeAt(0) - 65;
    
    // Create new data object
    const newData = { ...data };
    
    // Shift all columns to the right of the selected column left by one
    for (let c = colIndex; c < DEFAULT_COLS - 1; c++) {
      for (let r = 0; r < DEFAULT_ROWS; r++) {
        const currentCellId = `${String.fromCharCode(65 + c)}${r + 1}`;
        const nextCellId = `${String.fromCharCode(65 + c + 1)}${r + 1}`;
        
        if (newData[nextCellId]) {
          newData[currentCellId] = { ...newData[nextCellId] };
        } else {
          newData[currentCellId] = {
            value: '',
            formula: '',
            formatted: '',
            formatting: {
              bold: false,
              italic: false,
              color: 'black',
              fontSize: 12,
            }
          };
        }
      }
    }
    
    setData(newData);
    updateDependentCells(newData);
  };

  // Save spreadsheet data
  const saveSpreadsheet = () => {
    const filename = prompt('Enter filename:') || 'spreadsheet';
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Load spreadsheet data
  const loadSpreadsheet = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const loadedData = JSON.parse(event.target.result);
          setData(loadedData);
        } catch (error) {
          console.error('Error loading spreadsheet:', error);
          alert('Error loading spreadsheet. File may be corrupted.');
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  };

  return (
    <div className="spreadsheet-app" onKeyDown={handleKeyDown} tabIndex="0">
      <div className="toolbar">
        <div className="toolbar-buttons">
          <button onClick={() => saveSpreadsheet()}>Save</button>
          <button onClick={() => loadSpreadsheet()}>Load</button>
          <div className="divider"></div>
          <button onClick={() => applyFormatting('bold')}>B</button>
          <button onClick={() => applyFormatting('italic')}>I</button>
          <button onClick={() => applyFormatting('color')}>Color</button>
          <button onClick={() => applyFormatting('fontSize')}>Font Size</button>
          <div className="divider"></div>
          <button onClick={() => addRow()}>Add Row</button>
          <button onClick={() => deleteRow()}>Delete Row</button>
          <button onClick={() => addColumn()}>Add Column</button>
          <button onClick={() => deleteColumn()}>Delete Column</button>
          <div className="divider"></div>
          <button onClick={() => removeDuplicates()}>Remove Duplicates</button>
          <button onClick={() => findAndReplace()}>Find & Replace</button>
          <div className="divider"></div>
          <span className="function-info">
            Functions: SUM, AVERAGE, MAX, MIN, COUNT, TRIM, UPPER, LOWER
          </span>
        </div>
      </div>
      
      <div className="formula-bar">
        <div className="selected-cell-display">
          {selectedCell}
        </div>
        <input
          type="text"
          value={formulaBarValue}
          onChange={handleFormulaBarChange}
          onKeyPress={handleFormulaBarKeyPress}
          placeholder="Enter a value or formula starting with ="
          className="formula-input"
        />
      </div>
      
      <div className="spreadsheet-container" ref={gridRef}>
        <table className="spreadsheet-grid">
          <thead>
            <tr>
              <th className="corner-header"></th>
              {Array.from({ length: DEFAULT_COLS }, (_, i) => (
                <th key={`col-${i}`} className="column-header">{colIndexToLetter(i)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: DEFAULT_ROWS }, (_, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                <td className="row-header">{rowIndex + 1}</td>
                {Array.from({ length: DEFAULT_COLS }, (_, colIndex) => {
                  const cellId = `${colIndexToLetter(colIndex)}${rowIndex + 1}`;
                  const cellData = data[cellId] || { value: '', formatting: {} };
                  
                  return (
                    <td
                      key={cellId}
                      className={`cell ${selectedCell === cellId ? 'selected' : ''} ${isCellInSelectedRange(cellId) ? 'in-range' : ''}`}
                      onClick={() => handleCellSelect(cellId)}
                      onMouseDown={(e) => handleMouseDown(cellId, e)}
                      onMouseOver={() => handleMouseOver(cellId)}
                      style={{
                        fontWeight: cellData.formatting?.bold ? 'bold' : 'normal',
                        fontStyle: cellData.formatting?.italic ? 'italic' : 'normal',
                        color: cellData.formatting?.color || 'black',
                        fontSize: `${cellData.formatting?.fontSize || 12}px`,
                      }}
                    >
                      {cellData.formatted !== undefined ? cellData.formatted : cellData.value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SpreadsheetApp;
