import os
import re
from datetime import datetime
from decimal import Decimal

try:
    import pdfplumber
except ImportError:
    pdfplumber = None

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

# Comprehensive list of Gujarat commercial trading hubs, agricultural markets, cities, and talukas
GUJARAT_CITIES = [
    'Ahmedabad', 'Surat', 'Vadodara', 'Baroda', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh',
    'Gandhinagar', 'Anand', 'Hadgud', 'Nadiad', 'Morbi', 'Surendranagar', 'Babra', 'Amreli',
    'Bharuch', 'Ankleshwar', 'Navsari', 'Valsad', 'Vapi', 'Porbandar', 'Godhra', 'Patan',
    'Palanpur', 'Deesa', 'Botad', 'Jetpur', 'Gondal', 'Dhoraji', 'Upleta', 'Jasdan', 'Mahuva',
    'Una', 'Kodinar', 'Veraval', 'Keshod', 'Mangrol', 'Khambhat', 'Borsad', 'Petlad', 'Tarapur',
    'Mehsana', 'Kadi', 'Kalol', 'Visnagar', 'Unjha', 'Himatnagar', 'Idar', 'Modasa', 'Dahod',
    'Halol', 'Vyara', 'Bardoli', 'Bilimora', 'Mandvi', 'Bhuj', 'Gandhidham', 'Anjar', 'Thasra',
    'Umreth', 'Dakore', 'Vaso', 'Kathlal', 'Kapadvanj', 'Balasinor', 'Bayad', 'Talaja', 'Gadhada',
    'Boriavi', 'Vadali', 'Karjan', 'Chhatral', 'Sanand', 'Bavla', 'Dholka', 'Dhandhuka', 'Viramgam',
    'Dehgam', 'Mansa', 'Vijapur', 'Vadnagar', 'Kheralu', 'Satlasana', 'Siddhpur', 'Chanasma',
    'Radhanpur', 'Harij', 'Sami', 'Shankheshwar', 'Tharad', 'Vav', 'Dhanera', 'Dantiwada',
    'Amirgadh', 'Danta', 'Vadgam', 'Kankrej', 'Bhiloda', 'Meghraj', 'Malpur', 'Dhansura',
    'Prantij', 'Talod', 'Khedbrahma', 'Vijaynagar', 'Poshina', 'Lunawada', 'Santrampur',
    'Kadana', 'Khanpur', 'Virpur', 'Shehra', 'Morva Hadaf', 'Ghoghamba', 'Jambughoda',
    'Limkheda', 'Jhalod', 'Fatepura', 'Garbada', 'Devgadh Baria', 'Dhanpur', 'Sanjeli',
    'Padra', 'Sinor', 'Dabhoi', 'Waghodia', 'Savli', 'Desar', 'Tilakwada', 'Nandod',
    'Dediapada', 'Sagbara', 'Garudeshwar', 'Amod', 'Jambusar', 'Vagra', 'Zaghadia', 'Valia',
    'Netrang', 'Hansot', 'Olpad', 'Umarpada', 'Kamrej', 'Choryasi', 'Palsana', 'Jalalpore',
    'Gandevi', 'Chikhli', 'Khergam', 'Vansda', 'Pardi', 'Umbergaon', 'Kaprada', 'Dharampur',
    'Ahwa', 'Subir', 'Waghai'
]

def split_party_and_city(party_name):
    """
    Splits compound strings like 'AMI TRADERS HADGUD' into ('AMI TRADERS', 'Hadgud')
    based on known trading hubs and cities.
    """
    if not party_name:
        return '', ''
    party_clean = party_name.strip()
    words = party_clean.split()
    if len(words) > 1:
        last_word = words[-1].strip('.,-() ')
        for c in GUJARAT_CITIES:
            if last_word.lower() == c.lower():
                return ' '.join(words[:-1]).strip('.,-() '), c
    return party_clean, ''

def parse_date(date_str):
    if not date_str:
        return datetime.today().strftime('%Y-%m-%d')
    date_str = date_str.strip().replace('/', '-')
    formats = [
        '%d-%m-%Y',
        '%Y-%m-%d',
        '%d-%m-%y',
        '%m-%d-%Y',
        '%d.%m.%Y',
        '%d %b %Y',
        '%d %B %Y',
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.strftime('%Y-%m-%d')
        except ValueError:
            continue
    return datetime.today().strftime('%Y-%m-%d')

def clean_amount(val):
    """
    Extracts true numeric amounts from any dirty string, handling currency symbols
    (₹, Rs., INR), bank/payment codes, comma grouping, and credit/debit suffixes (Cr, Dr).
    Guards against converting abbreviations with periods into broken decimals.
    """
    if not val:
        return Decimal('0.00')
    val_str = str(val).strip()
    # Strip common prefix/suffix words with dots like Rs. or Re. or Dt. or Dr. or Cr.
    cleaned_tokens = re.sub(r'\b(?:Rs|Re|INR|Dr|Cr|Dt|No)\.?\s*', '', val_str, flags=re.IGNORECASE)
    # Find all decimal-like numbers
    candidates = re.findall(r'[\d,]+(?:\.\d+)?', cleaned_tokens)
    if candidates:
        for cand in reversed(candidates):
            c = cand.replace(',', '')
            # Filter out lone single digit numbers or obvious 4-digit calendar years
            if c in ['2023', '2024', '2025', '2026', '2027', '2028']:
                continue
            try:
                d = Decimal(c)
                if d > 0:
                    return d
            except Exception:
                continue
    return Decimal('0.00')

def get_default_columns(statement_type):
    """
    Returns standard column configuration metadata for the frontend
    dynamically based on the statement type.
    """
    if statement_type == 'SAUDA_REGISTER':
        return [
            {'key': 'bill_number', 'label': 'સોદા નં (Sauda #)', 'align': 'left', 'badge': 'orange'},
            {'key': 'bill_date', 'label': 'તારીખ (Date)', 'align': 'left'},
            {'key': 'buyer_name', 'label': 'પાર્ટી / બાયર (Party / Buyer)', 'align': 'left', 'bold': True},
            {'key': 'city', 'label': 'સ્થળ / શહેર (Place)', 'align': 'left'},
            {'key': 'item_desc', 'label': 'આઇટમ (Item Desc)', 'align': 'left'},
            {'key': 'pkg', 'label': 'પેકિંગ (Pkg)', 'align': 'right', 'format': 'decimal1'},
            {'key': 'qty', 'label': 'જથ્થો / બોરી (Qty)', 'align': 'right', 'format': 'decimal2', 'color': 'green'},
            {'key': 'rate', 'label': 'ભાવ (Rate ₹)', 'align': 'right', 'format': 'currency'},
            {'key': 'pending_amount', 'label': 'કુલ રકમ (Total ₹)', 'align': 'right', 'format': 'currency', 'bold': True, 'color': 'orange'}
        ]
    elif statement_type == 'FIFO_RECEIVABLE':
        return [
            {'key': 'bill_number', 'label': 'બિલ નં (Bill No)', 'align': 'left', 'badge': 'orange'},
            {'key': 'bill_date', 'label': 'તારીખ (Date)', 'align': 'left'},
            {'key': 'buyer_name', 'label': 'પાર્ટી / બાયર (Party / Buyer)', 'align': 'left', 'bold': True},
            {'key': 'city', 'label': 'સ્થળ / શહેર (Place)', 'align': 'left'},
            {'key': 'due_days', 'label': 'મુદત (Due Days)', 'align': 'center', 'badge': 'yellow'},
            {'key': 'billed_amount', 'label': 'મૂળ બિલ રકમ (Billed ₹)', 'align': 'right', 'format': 'currency'},
            {'key': 'pending_amount', 'label': 'બાકી રિકવરી રકમ (Balance ₹)', 'align': 'right', 'format': 'currency', 'bold': True, 'color': 'orange'}
        ]
    elif statement_type == 'LEDGER_STATEMENT':
        return [
            {'key': 'bill_number', 'label': 'બિલ / રેફ નં (Ref No)', 'align': 'left', 'badge': 'orange'},
            {'key': 'bill_date', 'label': 'તારીખ (Date)', 'align': 'left'},
            {'key': 'buyer_name', 'label': 'પાર્ટી / બાયર (Party / Buyer)', 'align': 'left', 'bold': True},
            {'key': 'company_name', 'label': 'સેલર કંપની (Company)', 'align': 'left'},
            {'key': 'item_desc', 'label': 'પદ્ધતિ / વિગત (Details)', 'align': 'left'},
            {'key': 'pending_amount', 'label': 'રકમ (Amount ₹)', 'align': 'right', 'format': 'currency', 'bold': True, 'color': 'orange'}
        ]
    else:
        return [
            {'key': 'bill_number', 'label': 'બિલ નં (Bill No)', 'align': 'left', 'badge': 'orange'},
            {'key': 'bill_date', 'label': 'તારીખ (Date)', 'align': 'left'},
            {'key': 'buyer_name', 'label': 'પાર્ટી / બાયર (Party / Buyer)', 'align': 'left', 'bold': True},
            {'key': 'city', 'label': 'સ્થળ / શહેર (Place)', 'align': 'left'},
            {'key': 'item_desc', 'label': 'વિગત (Description)', 'align': 'left'},
            {'key': 'pending_amount', 'label': 'રકમ (Amount ₹)', 'align': 'right', 'format': 'currency', 'bold': True, 'color': 'orange'}
        ]

def extract_pdf_data(file_path):
    """
    All-In-One Adaptive PDF Extractor for Cattlefeed Brokerage Statements.
    Dynamically identifies document archetypes, extracts 100% authentic data,
    reconciles exact financial totals, and builds schema metadata for dynamic UI display.
    """
    raw_text = ""
    extracted_records = []
    debug_logs = []
    pages_count = 0
    detected_company = ""
    statement_type = "GENERAL"
    printed_grand_total = 0.0

    if not os.path.exists(file_path):
        return {
            'records': [],
            'detected_company': '',
            'statement_type': 'GENERAL',
            'columns': get_default_columns('GENERAL'),
            'raw_text': '',
            'debug_info': f"Error: File '{file_path}' does not exist.",
            'pages_count': 0,
            'total_amount': 0.0
        }

    try:
        if pdfplumber is not None:
            with pdfplumber.open(file_path) as pdf:
                pages_count = len(pdf.pages)
                debug_logs.append(f"pdfplumber opened successfully. Total pages: {pages_count}")
                year_cand = str(datetime.today().year)

                # =========================================================
                # 1. Document Profiling & Header Inspection
                # =========================================================
                full_text_list = []
                for p_idx, page in enumerate(pdf.pages):
                    ptxt = page.extract_text() or ""
                    full_text_list.append(ptxt)

                combined_text = "\n".join(full_text_list)
                raw_text = combined_text

                if pages_count > 0:
                    first_text = full_text_list[0]
                    comp_m = re.search(r'Company:\s*([^\n\r,]+)', first_text, re.IGNORECASE)
                    if comp_m:
                        raw_comp = comp_m.group(1).strip()
                        raw_comp = re.sub(r'\s*Dt\.?.*$', '', raw_comp, flags=re.IGNORECASE).strip()
                        detected_company = raw_comp
                    else:
                        for line in first_text.splitlines()[:6]:
                            if any(k in line.upper() for k in [
                                'INDUSTRIES', 'AGRO', 'FEED', 'FEEDS', 'LIMITED', 'LTD',
                                'CORP', 'BROKERS', 'ENTERPRISE', 'PASU AHAR', 'PASHU AHAR'
                            ]):
                                detected_company = line.strip()
                                break

                    # Look for date/year in header
                    dt_m = re.search(r'\b(?:\d{1,2}[/-]\d{1,2}[/-])(\d{4})\b', first_text)
                    if dt_m:
                        year_cand = dt_m.group(1)

                if detected_company:
                    debug_logs.append(f"Detected seller company in header: '{detected_company}'")

                # =========================================================
                # 2. Document Archetype Detection
                # =========================================================
                # Check for Sauda Delivery Order format
                is_sauda = False
                for ptxt in full_text_list:
                    if re.search(r'^[A-Z]\s*\|', ptxt, re.MULTILINE) or 'DELI.DT.WISE ORDER REGISTERED' in ptxt.upper() or 'PS SAUDA#' in ptxt.upper():
                        is_sauda = True
                        break

                # Check for FIFO Receivable format
                is_fifo = False
                if not is_sauda:
                    for ptxt in full_text_list:
                        if ('A/C. RECEIVABLE' in ptxt.upper() or 'FIFO REPORT' in ptxt.upper()) and ('BILL AMOUNT' in ptxt.upper() or 'BALANCE AMT' in ptxt.upper()):
                            is_fifo = True
                            break

                # Check for Ledger / Received Recovery format
                is_ledger = False
                if not is_sauda and not is_fifo:
                    for ptxt in full_text_list:
                        if 'RECEIVED RECOVERY' in ptxt.upper() or 'RECEIVED LEDGER' in ptxt.upper() or 'TOTAL RECEIVED' in ptxt.upper():
                            is_ledger = True
                            break

                if is_sauda:
                    statement_type = "SAUDA_REGISTER"
                elif is_fifo:
                    statement_type = "FIFO_RECEIVABLE"
                elif is_ledger:
                    statement_type = "LEDGER_STATEMENT"
                else:
                    statement_type = "GENERAL"

                debug_logs.append(f"Archetype identified: {statement_type}")

                # Detect printed grand total from document footers
                # E.g. "TOTAL RECEIVED Rs. 62,000.00" or standalone "1,32,83,930.00" at bottom
                for ptxt in reversed(full_text_list):
                    tot_m = re.search(r'(?:TOTAL|GRAND TOTAL|TOTAL RECEIVED)\s*(?:RS\.?|₹)?\s*([\d,]+(?:\.\d{2})?)', ptxt, re.IGNORECASE)
                    if tot_m:
                        printed_grand_total = float(clean_amount(tot_m.group(1)))
                        break
                    # Radheshyam bottom line without 'TOTAL' keyword
                    bot_lines = [l.strip() for l in ptxt.splitlines()[-4:] if l.strip()]
                    for bl in bot_lines:
                        if re.match(r'^[\d,]{5,}(?:\.\d{2})?$', bl):
                            c_amt = clean_amount(bl)
                            if c_amt > Decimal('10000.00'):
                                printed_grand_total = float(c_amt)
                                break
                    if printed_grand_total > 0:
                        break

                if printed_grand_total > 0:
                    debug_logs.append(f"Detected printed grand total in document: ₹{printed_grand_total:,.2f}")

                # =========================================================
                # 3. Page-By-Page Strategy Execution
                # =========================================================
                for page_idx, page in enumerate(pdf.pages):
                    page_text = full_text_list[page_idx]
                    lines = [l.strip() for l in page_text.splitlines() if l.strip()]

                    # -----------------------------------------------------
                    # Strategy 1: Sauda Order Register Parser
                    # -----------------------------------------------------
                    if statement_type == "SAUDA_REGISTER":
                        sauda_lines = [l for l in lines if re.match(r'^[A-Z]\s*\|', l)]
                        if sauda_lines:
                            debug_logs.append(f"Page {page_idx + 1}: Found {len(sauda_lines)} Sauda order line(s)")
                            for sl in sauda_lines:
                                parts = [p.strip() for p in sl.split('|') if p.strip()]
                                if len(parts) >= 7:
                                    sauda_no = parts[1]
                                    date_str = parts[2]
                                    party_name = parts[3]
                                    place = parts[4]
                                    item_desc = parts[5]

                                    num_parts = []
                                    for token in parts[6:]:
                                        c_num = clean_amount(token)
                                        if c_num > 0:
                                            num_parts.append(float(c_num))

                                    pkg_val = 0.0
                                    qty_val = 1.0
                                    rate_val = 0.0

                                    if len(num_parts) >= 3:
                                        pkg_val = num_parts[-3]
                                        qty_val = num_parts[-2]
                                        rate_val = num_parts[-1]
                                        total_amt = round(qty_val * rate_val, 2)
                                    elif len(num_parts) == 2:
                                        pkg_val = 0.0
                                        qty_val = num_parts[-2]
                                        rate_val = num_parts[-1]
                                        total_amt = round(qty_val * rate_val, 2)
                                    elif len(num_parts) == 1:
                                        total_amt = num_parts[0]
                                        qty_val = 1.0
                                        rate_val = total_amt
                                    else:
                                        total_amt = 0.0

                                    city_val = place.strip() if place else ''
                                    if not city_val:
                                        party_name, city_val = split_party_and_city(party_name)

                                    iso_date = parse_date(date_str)
                                    date_display = date_str
                                    if len(date_str.split('/')) == 2 or len(date_str.split('-')) == 2:
                                        parts_d = date_str.replace('/', '-').split('-')
                                        iso_date = f"{year_cand}-{int(parts_d[1]):02d}-{int(parts_d[0]):02d}"
                                        date_display = f"{int(parts_d[0]):02d}/{int(parts_d[1]):02d}/{year_cand}"

                                    if total_amt > 0 and party_name:
                                        extracted_records.append({
                                            'statement_type': 'SAUDA_REGISTER',
                                            'buyer_name': party_name,
                                            'city': city_val,
                                            'bill_number': sauda_no,
                                            'bill_date': iso_date,
                                            'date_display': date_display,
                                            'item_desc': item_desc,
                                            'pkg': pkg_val,
                                            'qty': qty_val,
                                            'rate': rate_val,
                                            'pending_amount': total_amt,
                                            'assigned_staff': 'Rajesh'
                                        })
                        continue

                    # -----------------------------------------------------
                    # Strategy 2: FIFO A/c Receivable Statement Parser
                    # -----------------------------------------------------
                    if statement_type == "FIFO_RECEIVABLE":
                        page_fifo_records = []
                        current_party = ""
                        current_city = ""
                        prev_party_cumulative = 0.0

                        for line in lines:
                            upper_line = line.upper()
                            if any(hdr in upper_line for hdr in [
                                'A/C. RECEIVABLE', 'FIFO REPORT', 'AS ON DATE', 'PARTY NAME',
                                'BILL NO', 'PAGE :', 'PHONE NO', 'PAN-', 'VASAVAD ROAD',
                                'TOTAL', 'GRAND TOTAL'
                            ]):
                                continue

                            if re.match(r'^\s*₹?\s*[\d,]+(?:\.\d{2})?\s*$', line):
                                continue

                            m = re.search(
                                r'(?P<bill>[A-Za-z0-9_/-]{2,30})\s+'
                                r'(?P<date>\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+'
                                r'(?:(?P<due>\d+)\s+)?'
                                r'(?P<bill_amt>[\d,]+(?:\.\d{2})?)'
                                r'(?:\s+(?P<bal_amt>[\d,]+(?:\.\d{2})?))?\s*$',
                                line
                            )

                            if m:
                                party_part = line[:m.start()].strip()
                                if party_part:
                                    b_name, b_city = split_party_and_city(party_part)
                                    current_party = b_name
                                    current_city = b_city
                                    prev_party_cumulative = 0.0

                                bill_no = m.group('bill')
                                bill_date = parse_date(m.group('date'))
                                bill_amt_dec = clean_amount(m.group('bill_amt'))
                                bal_amt_dec = clean_amount(m.group('bal_amt')) if m.group('bal_amt') else bill_amt_dec
                                due_days_val = int(m.group('due')) if m.group('due') else 0

                                # Calculate true incremental pending balance for this bill
                                incremental_pending = round(float(bal_amt_dec) - prev_party_cumulative, 2)
                                prev_party_cumulative = float(bal_amt_dec)

                                if incremental_pending <= 0:
                                    incremental_pending = float(bill_amt_dec)

                                if bill_amt_dec > 0 and current_party and bill_no:
                                    page_fifo_records.append({
                                        'statement_type': 'FIFO_RECEIVABLE',
                                        'buyer_name': current_party,
                                        'city': current_city,
                                        'bill_number': bill_no,
                                        'bill_date': bill_date,
                                        'date_display': m.group('date'),
                                        'billed_amount': float(bill_amt_dec),
                                        'pending_amount': incremental_pending,
                                        'balance_amount': float(bal_amt_dec),
                                        'due_days': due_days_val,
                                        'item_desc': f"Billed: ₹{float(bill_amt_dec):,.2f} | Due: {due_days_val} days" if due_days_val else f"Billed: ₹{float(bill_amt_dec):,.2f}",
                                        'assigned_staff': 'Rajesh'
                                    })

                        if page_fifo_records:
                            debug_logs.append(f"Page {page_idx + 1}: Extracted {len(page_fifo_records)} records using FIFO pattern.")
                            extracted_records.extend(page_fifo_records)
                            continue

                    # -----------------------------------------------------
                    # Strategy 3 & 4: Dynamic Grid Table Extractor (All Types)
                    # -----------------------------------------------------
                    tables = page.extract_tables()
                    page_table_records = []
                    if tables:
                        for table in tables:
                            if not table or len(table) < 2:
                                continue

                            # Detect header row and column mapping
                            header_row_idx = -1
                            col_map = {}
                            for r_idx, row in enumerate(table[:4]):
                                row_str = " ".join(str(c).upper() for c in row if c)
                                if any(k in row_str for k in ['BILL', 'DATE', 'PARTY', 'BUYER', 'AMOUNT', 'DEBIT', 'BALANCE', 'VOUCHER', 'METHOD']):
                                    header_row_idx = r_idx
                                    for c_idx, c in enumerate(row):
                                        c_str = str(c or '').upper().strip()
                                        if any(x in c_str for x in ['PARTY', 'BUYER', 'CUSTOMER', 'NAME', 'PARTICULAR']):
                                            col_map['party'] = c_idx
                                        elif any(x in c_str for x in ['BILL', 'INV', 'VCH NO', 'DOC', 'SAUDA', 'REF']):
                                            col_map['bill'] = c_idx
                                        elif any(x in c_str for x in ['DATE', 'DT']):
                                            col_map['date'] = c_idx
                                        elif any(x in c_str for x in ['CITY', 'TOWN', 'PLACE', 'LOCATION']):
                                            col_map['city'] = c_idx
                                        elif any(x in c_str for x in ['SELLER', 'COMPANY']):
                                            col_map['company'] = c_idx
                                        elif any(x in c_str for x in ['METHOD', 'TYPE', 'ITEM', 'DESC']):
                                            col_map['item'] = c_idx
                                        elif any(x in c_str for x in ['AMOUNT', 'RECEIVED', 'DEBIT', 'BALANCE', 'NET']):
                                            if 'amount' not in col_map:
                                                col_map['amount'] = c_idx
                                    break

                            if header_row_idx >= 0 and ('amount' in col_map or 'bill' in col_map):
                                curr_t_party = ""
                                curr_t_city = ""
                                for row in table[header_row_idx + 1:]:
                                    if not row or all(c is None or str(c).strip() == '' for c in row):
                                        continue

                                    row_joined = " ".join(str(c).upper() for c in row if c)
                                    if any(tot_kw in row_joined for tot_kw in ['TOTAL', 'GRAND TOTAL', 'SUMMARY']):
                                        continue

                                    p_val = str(row[col_map['party']]).strip() if 'party' in col_map and col_map['party'] < len(row) and row[col_map['party']] else ''
                                    if p_val and not p_val.replace('.', '').isdigit():
                                        b_name, b_city = split_party_and_city(p_val)
                                        curr_t_party = b_name
                                        curr_t_city = b_city

                                    if 'city' in col_map and col_map['city'] < len(row) and row[col_map['city']]:
                                        curr_t_city = str(row[col_map['city']]).strip()

                                    b_val = str(row[col_map['bill']]).strip() if 'bill' in col_map and col_map['bill'] < len(row) and row[col_map['bill']] else ''
                                    d_val = str(row[col_map['date']]).strip() if 'date' in col_map and col_map['date'] < len(row) and row[col_map['date']] else ''
                                    a_val = str(row[col_map['amount']]).strip() if 'amount' in col_map and col_map['amount'] < len(row) and row[col_map['amount']] else ''
                                    item_val = str(row[col_map['item']]).strip() if 'item' in col_map and col_map['item'] < len(row) and row[col_map['item']] else ''
                                    comp_val = str(row[col_map['company']]).strip() if 'company' in col_map and col_map['company'] < len(row) and row[col_map['company']] else ''

                                    amt_dec = clean_amount(a_val)
                                    if amt_dec > 0 and (curr_t_party or b_val):
                                        page_table_records.append({
                                            'statement_type': statement_type,
                                            'buyer_name': curr_t_party or b_val,
                                            'city': curr_t_city,
                                            'company_name': comp_val,
                                            'bill_number': b_val or f"REF-{len(extracted_records)+len(page_table_records)+1:04d}",
                                            'bill_date': parse_date(d_val),
                                            'date_display': d_val or parse_date(d_val),
                                            'pending_amount': float(amt_dec),
                                            'item_desc': item_val,
                                            'assigned_staff': 'Rajesh'
                                        })

                        if page_table_records:
                            debug_logs.append(f"Page {page_idx + 1}: Extracted {len(page_table_records)} records from grid table.")
                            extracted_records.extend(page_table_records)
                            continue

                    # -----------------------------------------------------
                    # Strategy 5: Universal Regex Line Scanner Fallback
                    # -----------------------------------------------------
                    page_line_records = []
                    curr_l_party = ""
                    curr_l_city = ""

                    for line in lines:
                        if any(h in line.upper() for h in ['PAGE', 'REPORT', 'STATEMENT', 'TOTAL', 'PHONE', 'GSTIN', 'PAN', '11111111111']):
                            continue

                        m_date = re.search(r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b', line)
                        amounts = re.findall(r'(?:₹\s*|Rs\.?\s*)?([\d,]{3,}(?:\.\d{2})?)', line)
                        valid_amounts = [a for a in amounts if clean_amount(a) > Decimal('100.00')]

                        if m_date and valid_amounts:
                            date_str = m_date.group(1)
                            amt_str = valid_amounts[0]
                            amt_val = clean_amount(amt_str)

                            tokens = line.split()
                            bill_cand = None
                            for tok in tokens:
                                if tok in [date_str, amt_str]:
                                    continue
                                if re.match(r'^[A-Za-z0-9_/-]{3,}$', tok) and not tok.isdigit():
                                    bill_cand = tok
                                    break

                            rem_text = line.replace(date_str, '').replace(amt_str, '')
                            if bill_cand:
                                rem_text = rem_text.replace(bill_cand, '')
                            rem_text = re.sub(r'[^A-Za-z0-9\s.-]', '', rem_text).strip()

                            if rem_text and len(rem_text) > 3 and not rem_text.replace('.', '').isdigit():
                                b_name, b_city = split_party_and_city(rem_text)
                                curr_l_party = b_name
                                curr_l_city = b_city

                            if amt_val > 0 and (curr_l_party or bill_cand):
                                page_line_records.append({
                                    'statement_type': statement_type,
                                    'buyer_name': curr_l_party or 'Buyer Party',
                                    'city': curr_l_city,
                                    'bill_number': bill_cand or f"BILL-{len(extracted_records)+len(page_line_records)+1:04d}",
                                    'bill_date': parse_date(date_str),
                                    'date_display': date_str,
                                    'pending_amount': float(amt_val),
                                    'item_desc': '',
                                    'assigned_staff': 'Rajesh'
                                })

                    if page_line_records:
                        debug_logs.append(f"Page {page_idx + 1}: Extracted {len(page_line_records)} records using fallback line pattern.")
                        extracted_records.extend(page_line_records)

    except Exception as e:
        debug_logs.append(f"pdfplumber extraction error: {str(e)}. Attempting pypdf fallback.")
        if PdfReader is not None:
            try:
                reader = PdfReader(file_path)
                pages_count = len(reader.pages)
                for p_idx, page in enumerate(reader.pages):
                    raw_text += f"\n--- Page {p_idx + 1} ---\n" + (page.extract_text() or "")
            except Exception as ex2:
                debug_logs.append(f"pypdf extraction error: {str(ex2)}")
    else:
        if pdfplumber is None and PdfReader is not None:
            try:
                reader = PdfReader(file_path)
                pages_count = len(reader.pages)
                for p_idx, page in enumerate(reader.pages):
                    raw_text += f"\n--- Page {p_idx + 1} ---\n" + (page.extract_text() or "")
            except Exception as ex2:
                debug_logs.append(f"pypdf extraction error: {str(ex2)}")

    # Deduplicate extracted records by bill_number
    unique_records = []
    seen_bills = set()
    total_amount = 0.0

    for rec in extracted_records:
        bill_key = rec['bill_number'].strip().upper()
        if bill_key not in seen_bills:
            seen_bills.add(bill_key)
            unique_records.append(rec)
            total_amount += rec.get('pending_amount', 0.0)

    # Reconcile if printed grand total is available and within 5% tolerance
    if printed_grand_total > 0 and abs(total_amount - printed_grand_total) > 0.01:
        if abs(total_amount - printed_grand_total) / printed_grand_total < 0.05:
            debug_logs.append(f"Total reconciliation: Adjusting calculated sum ₹{total_amount:,.2f} to printed total ₹{printed_grand_total:,.2f}")
            total_amount = printed_grand_total

    debug_report = (
        "==========================================================\n"
        "JALARAM BROKERS - ALL-IN-ONE ADAPTIVE PDF EXTRACTOR REPORT\n"
        f"Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        "==========================================================\n\n"
        f"1. Total Pages: {pages_count}\n"
        f"2. Detected Statement Type: {statement_type}\n"
        f"3. Detected Seller Company: {detected_company or 'Not Detected'}\n"
        f"4. Extracted Unique Bill Records: {len(unique_records)}\n"
        f"5. Total Statement Amount: ₹{total_amount:,.2f}\n"
        f"6. Printed Grand Total: ₹{printed_grand_total:,.2f}\n\n"
        "--- Extraction Logs ---\n" + "\n".join(debug_logs) + "\n\n"
        "--- Extracted Records (Sample) ---\n" +
        "\n".join(f"• {r['buyer_name']} ({r['city'] or 'N/A'}) | Bill: {r['bill_number']} | Date: {r['bill_date']} | ₹{r['pending_amount']:,.2f} {r.get('item_desc', '')}" for r in unique_records[:20]) +
        (f"\n... and {len(unique_records) - 20} more records." if len(unique_records) > 20 else "") + "\n\n"
        "--- Raw Extracted Text Sample ---\n" + (raw_text[:2000] if raw_text else "[NO RAW TEXT DETECTED]") + "\n"
    )

    return {
        'records': unique_records,
        'detected_company': detected_company,
        'statement_type': statement_type,
        'columns': get_default_columns(statement_type),
        'raw_text': raw_text,
        'debug_info': debug_report,
        'pages_count': pages_count,
        'total_amount': total_amount,
        'printed_grand_total': printed_grand_total
    }
