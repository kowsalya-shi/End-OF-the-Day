/**
 * Parse a CSV file and return an array of objects
 * @param file - The CSV file to parse
 * @returns Promise that resolves to array of objects
 */
export async function parseCsvFile<T = Record<string, string>>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = parseCsvText(text);
        resolve(rows as T[]);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Parse CSV text content into array of objects
 * @param text - CSV text content
 * @returns Array of objects where keys are column headers
 */
export function parseCsvText(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  
  if (lines.length === 0) {
    return [];
  }
  
  // Parse headers (first line)
  const headers = parseCsvLine(lines[0]);
  
  // Parse data rows
  const data: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    
    // Skip empty rows
    if (values.every(v => !v.trim())) {
      continue;
    }
    
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    data.push(row);
  }
  
  return data;
}

/**
 * Parse a single CSV line, handling quoted values
 * @param line - CSV line to parse
 * @returns Array of values
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Push last field
  result.push(current.trim());
  
  return result;
}

/**
 * Download a CSV template with the given headers
 * @param filename - Name of the template file
 * @param headers - Array of column headers
 * @param sampleData - Optional array of sample rows
 */
export function downloadCsvTemplate(
  filename: string,
  headers: string[],
  sampleData?: string[][]
) {
  const separator = ',';
  let csvContent = headers.join(separator) + '\n';
  
  // Add sample data if provided
  if (sampleData && sampleData.length > 0) {
    csvContent += sampleData.map(row => {
      return row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma or newline
        let escapedCell = String(cell).replace(/"/g, '""');
        if (escapedCell.includes(',') || escapedCell.includes('\n')) {
          escapedCell = `"${escapedCell}"`;
        }
        return escapedCell;
      }).join(separator);
    }).join('\n');
  }
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
