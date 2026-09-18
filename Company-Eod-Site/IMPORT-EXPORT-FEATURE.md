# 📊 CSV Import/Export Feature - Implementation Guide

## ✅ Implementation Status

CSV Import and Export functionality has been added to enable bulk data operations for Daily Work, Tasks, and Training records.

---

## 🎯 Features

### 1. Export to CSV
- ✅ Export existing records to CSV format
- ✅ Already available on all pages (Tasks, Daily Work, Training)
- ✅ Downloads data with all fields properly formatted

### 2. Import from CSV
- ✅ **NEW**: Bulk upload records from CSV file
- ✅ Validates data before import
- ✅ Shows success/error counts
- ✅ Supports batch creation of records

### 3. Download Template
- ✅ **NEW**: Download pre-formatted CSV template
- ✅ Includes sample data for reference
- ✅ Headers match import format exactly

---

## 📁 Files Created/Modified

### New Files
1. **`artifacts/eod-portal/src/lib/import-csv.ts`**
   - CSV parsing utility
   - Template download function
   - Handles quoted values and escaping

### Modified Files
1. **`artifacts/eod-portal/src/pages/employee/daily-work.tsx`**
   - Added import functionality
   - Added template download
   - Added UI buttons (Template, Import)

---

## 🔧 Implementation Details

### Import CSV Utility (`import-csv.ts`)

```typescript
// Parse CSV file to JSON
export async function parseCsvFile<T>(file: File): Promise<T[]>

// Parse CSV text content
export function parseCsvText(text: string): Record<string, string>[]

// Download CSV template
export function downloadCsvTemplate(
  filename: string,
  headers: string[],
  sampleData?: string[][]
)
```

**Features:**
- Handles quoted values with commas
- Escapes double quotes properly
- Trims whitespace
- Skips empty rows

### Daily Work Page Updates

**New Buttons:**
1. **Template** (`FileDown` icon): Downloads CSV template with sample data
2. **Import** (`Upload` icon): Opens file picker for CSV upload

**Import Process:**
1. User clicks "Import" button
2. File picker opens (accepts .csv only)
3. File is parsed into JSON objects
4. Each row is validated and created
5. Success/error counts shown in toast notification
6. Data automatically refreshes

---

## 📊 CSV Format

### Daily Work Template

**Headers:**
```
Date, Action, How, Who, Assigned By, Start Date, Completion Date, Status, Completion %, Remarks
```

**Sample Data:**
```csv
Date,Action,How,Who,Assigned By,Start Date,Completion Date,Status,Completion %,Remarks
2026-09-08,Sample Task,Method description,Responsible person,Manager,2026-09-08,,yts,0,Optional remarks
2026-09-08,Another Task,,,,,,wip,50,
```

**Status Values:**
- `yts` - Yet to Start
- `wip` - Work in Progress
- `completed` - Completed
- `hold` - On Hold
- `cancelled` - Cancelled

---

## 🚀 How to Use

### For Employees

#### Export Daily Work
1. Go to **Daily Work** page
2. Click **"Export"** button (Download icon)
3. CSV file downloads automatically
4. Opens in Excel/Google Sheets

#### Download Template
1. Click **"Template"** button (FileDown icon)
2. Template with sample data downloads
3. Edit the template in Excel/Google Sheets
4. Fill in your data following the sample format

#### Import Daily Work
1. Prepare your CSV file (or use template)
2. Click **"Import"** button (Upload icon)
3. Select your CSV file
4. System processes the file
5. Toast notification shows result:
   - ✅ "Successfully imported X records"
   - ⚠️ "Successfully imported X records, Y failed"
   - ❌ "Import failed" (if file is invalid)
6. Page refreshes with new data

---

## 📋 Step-by-Step Import Example

### Step 1: Download Template
```
Click: Template button
Result: daily_work_template.csv downloaded
```

### Step 2: Edit Template in Excel
```csv
Date,Action,How,Who,Assigned By,Start Date,Completion Date,Status,Completion %,Remarks
2026-09-08,Fix login bug,Debug code,John,Manager,2026-09-08,,wip,50,In progress
2026-09-08,Update documentation,Write docs,John,Manager,2026-09-08,,yts,0,Not started yet
2026-09-08,Code review,Review PR,John,TL,2026-09-08,2026-09-08,completed,100,Done
```

### Step 3: Save and Import
1. Save the Excel file as CSV
2. Go to Daily Work page
3. Click "Import"
4. Select the saved CSV file
5. Wait for import to complete

### Step 4: Verify
```
✅ Toast: "Successfully imported 3 records"
✅ New records appear in the table
✅ Can edit/delete as normal
```

---

## ⚠️ Important Notes

### Valid Status Values
- Must use lowercase: `yts`, `wip`, `completed`, `hold`, `cancelled`
- Invalid values will cause import to fail for that row

### Date Format
- Use format: `YYYY-MM-DD` (e.g., `2026-09-08`)
- Invalid dates will cause import failure

### Completion Percentage
- Must be number between 0-100
- No % symbol needed (just the number)

### CSV Format Rules
1. **First row must be headers** (exactly as in template)
2. **Commas in values**: Wrap in double quotes
   ```csv
   "Task with, comma",Description
   ```
3. **Quotes in values**: Escape with double quotes
   ```csv
   "Task with ""quotes""",Description
   ```
4. **Empty fields**: Leave blank but keep commas
   ```csv
   2026-09-08,Task,,,,,,yts,0,
   ```

---

## 🔒 Security Features

1. **File Type Validation**: Only `.csv` files accepted
2. **Server-Side Validation**: Each record validated before creation
3. **Authentication Required**: Must be logged in to import
4. **User-Specific**: Imports only for authenticated user
5. **Error Handling**: Failed rows don't stop entire import

---

## 🎨 UI Components

### Button Layout (Daily Work Page)
```
┌──────────────────────────────────────────────────┐
│ Daily Work Log                                    │
│                                                   │
│ [Copy Previous Day] [Template] [Import] [Export] │
│                     [+ Add Work]                  │
└──────────────────────────────────────────────────┘
```

### Import Flow
```
User clicks Import
   ↓
File picker opens (.csv only)
   ↓
User selects file
   ↓
File is read and parsed
   ↓
Each row validated
   ↓
Valid rows created in database
   ↓
Toast shows result
   ↓
Page refreshes
```

---

## 🔄 Extending to Other Modules

The same pattern can be applied to:

### Tasks Module
```typescript
// Template headers
["Date", "Task Name", "How", "Who", "Assigned By", "Priority", 
 "Planned Start", "Planned End", "Status", "Completion %", "Remarks"]

// Import similar to Daily Work
```

### Training Module
```typescript
// Template headers
["Date", "Topic", "Category", "Provider", "Trainer", "Duration Hours", 
 "Cost", "Completion Date", "Status", "Certificate", "Remarks"]
```

---

## 🐛 Troubleshooting

### Import fails with "CSV file is empty"
**Cause**: File has no data rows (only headers or completely empty)
**Solution**: Add at least one data row

### Import fails with "Failed to parse CSV file"
**Cause**: File format is incorrect or corrupted
**Solution**: 
1. Download fresh template
2. Copy data carefully
3. Save as CSV (not Excel format)

### Some records imported, others failed
**Cause**: Invalid data in some rows (wrong status, invalid date, etc.)
**Solution**:
1. Check the failed rows
2. Verify status values are lowercase
3. Verify dates are in YYYY-MM-DD format
4. Re-import just the fixed rows

### Import button does nothing
**Cause**: File input is hidden, need to click properly
**Solution**: Make sure JavaScript is enabled and page is fully loaded

---

## ✨ Benefits

1. **Bulk Operations**: Import hundreds of records at once
2. **Data Migration**: Easy to move data from other systems
3. **Backup/Restore**: Export for backup, import to restore
4. **Reporting**: Export to Excel for analysis
5. **Template-Based**: Standard format reduces errors
6. **Time-Saving**: Much faster than manual entry

---

## 📝 Next Steps

To add import/export to Tasks and Training modules:

1. Copy the import handlers from `daily-work.tsx`
2. Adjust field mappings for Tasks/Training schema
3. Update template headers
4. Add buttons to UI
5. Test import/export flow

**Example for Tasks:**
```typescript
const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
  // Similar structure, different field mapping
  const taskData = {
    taskName: row["Task Name"],
    how: row.How,
    who: row.Who,
    priority: row.Priority?.toLowerCase(),
    // ... etc
  };
};
```

---

## 🎉 Summary

✅ **CSV Import** implemented for Daily Work
✅ **CSV Export** already working everywhere  
✅ **Template Download** for easy data entry  
✅ **Error Handling** with detailed feedback  
✅ **User-Friendly** with clear UI buttons  
✅ **Extensible** pattern for Tasks and Training  

**The import/export feature is ready to use!** 🚀

---

**Implementation Date:** September 8, 2026  
**Import Utility:** `artifacts/eod-portal/src/lib/import-csv.ts`  
**Example Page:** `artifacts/eod-portal/src/pages/employee/daily-work.tsx`
