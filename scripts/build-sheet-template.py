"""Build an importable XLSX from the five CSV templates using Python's standard library.
Run: python scripts/build-sheet-template.py
No Google credentials, runtime dependencies, or network requests are needed.
"""
import csv
from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
FOLDER = ROOT / 'templates' / 'google-sheets'
NAMES = ['Subjects', 'Chapters', 'Collections', 'Questions', 'Documents']
NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
REL = 'http://schemas.openxmlformats.org/package/2006/relationships'
DOCREL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

def column(index):
    name = ''
    while index:
        index, digit = divmod(index - 1, 26)
        name = chr(65 + digit) + name
    return name

with ZipFile(FOLDER / 'learning-template.xlsx', 'w', ZIP_DEFLATED) as workbook:
    overrides = ''.join(f'<Override PartName="/xl/worksheets/sheet{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' for i in range(1, 6))
    workbook.writestr('[Content_Types].xml', f'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>{overrides}</Types>')
    workbook.writestr('_rels/.rels', f'<Relationships xmlns="{REL}"><Relationship Id="rId1" Type="{DOCREL}/officeDocument" Target="xl/workbook.xml"/></Relationships>')
    sheets = ''.join(f'<sheet name="{name}" sheetId="{i}" r:id="rId{i}"/>' for i, name in enumerate(NAMES, 1))
    workbook.writestr('xl/workbook.xml', f'<workbook xmlns="{NS}" xmlns:r="{DOCREL}"><sheets>{sheets}</sheets></workbook>')
    relations = ''.join(f'<Relationship Id="rId{i}" Type="{DOCREL}/worksheet" Target="worksheets/sheet{i}.xml"/>' for i in range(1, 6))
    workbook.writestr('xl/_rels/workbook.xml.rels', f'<Relationships xmlns="{REL}">{relations}</Relationships>')
    for i, name in enumerate(NAMES, 1):
        with (FOLDER / f'{name}.csv').open(encoding='utf-8', newline='') as file:
            rows = list(csv.reader(file))
        data = ''
        for row_number, row in enumerate(rows, 1):
            cells = ''.join(f'<c r="{column(j)}{row_number}" t="inlineStr"><is><t xml:space="preserve">{escape(value)}</t></is></c>' for j, value in enumerate(row, 1))
            data += f'<row r="{row_number}">{cells}</row>'
        workbook.writestr(f'xl/worksheets/sheet{i}.xml', f'<worksheet xmlns="{NS}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" state="frozen"/></sheetView></sheetViews><sheetData>{data}</sheetData></worksheet>')
print('Created templates/google-sheets/learning-template.xlsx')
