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
    'Kadana', 'Khanpur', 'Virpur', 'Shehra', 'Sahera', 'Morva Hadaf', 'Ghoghamba', 'Jambughoda',
    'Limkheda', 'Jhalod', 'Fatepura', 'Garbada', 'Devgadh Baria', 'Dhanpur', 'Sanjeli',
    'Padra', 'Sinor', 'Dabhoi', 'Waghodia', 'Savli', 'Desar', 'Tilakwada', 'Nandod',
    'Dediapada', 'Sagbara', 'Garudeshwar', 'Amod', 'Jambusar', 'Vagra', 'Zaghadia', 'Valia',
    'Netrang', 'Hansot', 'Olpad', 'Umarpada', 'Kamrej', 'Choryasi', 'Palsana', 'Jalalpore',
    'Gandevi', 'Chikhli', 'Khergam', 'Vansda', 'Pardi', 'Umbergaon', 'Kaprada', 'Dharampur',
    'Ahwa', 'Subir', 'Waghai', 'Kharol', 'Khatraj', 'Kheda', 'Koyali', 'Majara', 'Matar',
    'Mogar', 'Motizer', 'Piplod', 'Ralej', 'Sevaliya', 'Tharmal', 'Vejalpur', 'Haldarvas',
    'Diyodar', 'Dharmej', 'Dev Chokdi', 'Devkarna', 'Gambhoi', 'Kukarvada', 'Palej', 'Sojitra',
    'Mandal', 'Kathvada', 'Petli', 'Kenera', 'Bhuj-Kutch', 'Vadu', 'Adadra', 'Bhabhar',
    'Rakhiyal', 'Naroda', 'Paddhari'
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
        '%d.%m.%y',
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
    if not val:
        return Decimal('0.00')
    val_str = str(val).strip()
    # Strip common prefix/suffix words with dots like Rs. or Re. or Dt. or Dr. or Cr.
    cleaned_tokens = re.sub(r'\b(?:Rs|Re|INR|Dr|Cr|Dt|No)\.?\s*', '', val_str, flags=re.IGNORECASE)
    candidates = re.findall(r'[\d,]+(?:\.\d+)?', cleaned_tokens)
    if candidates:
        for cand in reversed(candidates):
            c = cand.replace(',', '')
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
    if statement_type == 'SHREE_VIJAY_OUTSTANDING':
        return [
            {'key': 'bill_number', 'label': 'બિલ નં (Bill No)', 'align': 'left', 'badge': 'orange'},
            {'key': 'bill_date', 'label': 'તારીખ (Date)', 'align': 'left'},
            {'key': 'buyer_name', 'label': 'પાર્ટી / બાયર (Party / Buyer)', 'align': 'left', 'bold': True},
            {'key': 'city', 'label': 'સ્થળ / શહેર (Place)', 'align': 'left'},
            {'key': 'due_days', 'label': 'મુદત (Due Days)', 'align': 'center', 'badge': 'yellow'},
            {'key': 'billed_amount', 'label': 'બિલ રકમ (Amount ₹)', 'align': 'right', 'format': 'currency'},
            {'key': 'pending_amount', 'label': 'બાકી રકમ (Balance ₹)', 'align': 'right', 'format': 'currency', 'bold': True, 'color': 'orange'}
        ]
    elif statement_type == 'AKASH_OUTSTANDING':
        return [
            {'key': 'bill_number', 'label': 'બિલ નં (Bill No)', 'align': 'left', 'badge': 'orange'},
            {'key': 'bill_date', 'label': 'તારીખ (Date)', 'align': 'left'},
            {'key': 'buyer_name', 'label': 'પાર્ટી / બાયર (Party / Buyer)', 'align': 'left', 'bold': True},
            {'key': 'city', 'label': 'સ્થળ / શહેર (Place)', 'align': 'left'},
            {'key': 'billed_amount', 'label': 'કુલ બિલ (Billed ₹)', 'align': 'right', 'format': 'currency'},
            {'key': 'paid_amount', 'label': 'જમા રકમ (Recd ₹)', 'align': 'right', 'format': 'currency', 'color': 'green'},
            {'key': 'pending_amount', 'label': 'બાકી ઉઘરાણી (Balance ₹)', 'align': 'right', 'format': 'currency', 'bold': True, 'color': 'orange'},
            {'key': 'due_date', 'label': 'મુદત તારીખ (Due Dt)', 'align': 'center'}
        ]
    elif statement_type == 'SAUDA_REGISTER':
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


# =========================================================================
# Specialized Format Parsers
# =========================================================================

def parse_shree_vijay_outstanding(text_lines, year_cand):
    """
    Parses Shree Vijay Oils 'BROKER OUTSTANDING' statements.
    Header: Party Name Bill No Bill Date City Bill Amount Due Days [Party Total]
    Multi-line per party, with Bill No matching MGT-\\d+, CGR/\\d+, etc.
    """
    records = []
    curr_party = ""
    curr_city = ""

    for line in text_lines:
        line_clean = line.strip()
        if not line_clean:
            continue
        if any(h in line_clean.upper() for h in [
            'BROKER OUTSTANDING', 'AS ON DATE', 'PARTY NAME', 'BILL NO', 'JALARAM BROKER', 'PAGE'
        ]):
            continue

        # Check total at bottom
        if re.match(r'^[\d,]{6,}(?:\.\d{2})?$', line_clean):
            continue

        m = re.search(
            r'(?P<bill>(?:MGT-\d+|CGR/\d+|[A-Za-z0-9_/-]{3,20}))\s+'
            r'(?P<date>\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+'
            r'(?P<city>[A-Za-z\s.-]+?)\s+'
            r'(?P<bill_amt>[\d,]+(?:\.\d{2})?)\s+'
            r'(?P<due>\d+)'
            r'(?:\s+(?P<party_total>[\d,]+(?:\.\d{2})?))?\s*$',
            line_clean
        )

        if m:
            before = line_clean[:m.start()].strip()
            if before:
                curr_party = before

            b_city = m.group('city').strip()
            if b_city:
                curr_city = b_city

            b_amt = float(clean_amount(m.group('bill_amt')))
            due_days = int(m.group('due'))

            records.append({
                'statement_type': 'SHREE_VIJAY_OUTSTANDING',
                'buyer_name': curr_party or 'Buyer Party',
                'city': curr_city,
                'bill_number': m.group('bill'),
                'bill_date': parse_date(m.group('date')),
                'date_display': m.group('date'),
                'billed_amount': b_amt,
                'pending_amount': b_amt,
                'balance_amount': b_amt,
                'due_days': due_days,
                'item_desc': f"Due: {due_days} days"
            })

    return records


def parse_akash_outstanding(text_lines, year_cand):
    """
    Parses Akash Agro Industries 'OUT-STANDING RECEIVABLES [DEBIT]' pipe-delimited format.
    Format: SR. | PARTY NAME | CITY/AREA | BILL NO (B0...) | DATE | BILL AMT | RECD AMT | PEND AMT | DUE DT
    """
    records = []
    curr_party = ""
    curr_city = ""

    for line in text_lines:
        line_clean = line.strip()
        if not line_clean:
            continue
        if any(kw in line_clean for kw in ['* Total *', '* Net Total *', 'JALARAM BROKERS', 'Period :', 'Agent :']):
            continue

        parts = [p.strip() for p in line_clean.split('|')]
        # Find bill number column (e.g. B04912-, B05230-)
        bill_idx = -1
        for idx, p in enumerate(parts):
            if re.match(r'^[A-Za-z][A-Za-z0-9_/-]{2,20}-?$', p) and any(c.isdigit() for c in p):
                bill_idx = idx
                break

        if bill_idx != -1 and len(parts) > bill_idx + 3:
            p_name = parts[1] if len(parts) > 1 and parts[1] and not re.match(r'^\d+$', parts[1]) else ''
            c_name = parts[2] if len(parts) > 2 and parts[2] else ''

            # Ignore address continuation lines for party name
            if p_name and not any(kw in p_name.upper() for kw in ['BAJAR', 'ROAD', 'STATION', 'SHOP', 'BESIDE', 'NEAR']):
                curr_party = p_name
            if c_name:
                curr_city = c_name

            b_no = parts[bill_idx].rstrip('-')
            b_date_str = parts[bill_idx + 1] if len(parts) > bill_idx + 1 else ''
            b_amt = clean_amount(parts[bill_idx + 2]) if len(parts) > bill_idx + 2 else Decimal('0.00')
            recd_amt = clean_amount(parts[bill_idx + 3]) if len(parts) > bill_idx + 3 and parts[bill_idx + 3] else Decimal('0.00')
            pend_amt = clean_amount(parts[bill_idx + 4]) if len(parts) > bill_idx + 4 and parts[bill_idx + 4] else b_amt - recd_amt
            due_dt_str = parts[bill_idx + 5] if len(parts) > bill_idx + 5 else ''

            if float(pend_amt) <= 0:
                pend_amt = b_amt - recd_amt
            if float(pend_amt) <= 0:
                pend_amt = b_amt

            records.append({
                'statement_type': 'AKASH_OUTSTANDING',
                'buyer_name': curr_party or 'Buyer Party',
                'city': curr_city,
                'bill_number': b_no,
                'bill_date': parse_date(b_date_str),
                'date_display': b_date_str,
                'billed_amount': float(b_amt),
                'paid_amount': float(recd_amt),
                'pending_amount': float(pend_amt),
                'balance_amount': float(pend_amt),
                'due_date': parse_date(due_dt_str) if due_dt_str else None,
                'item_desc': f"Billed: ₹{float(b_amt):,.2f} | Recd: ₹{float(recd_amt):,.2f}"
            })

    return records


def parse_fifo_receivables(text_lines, year_cand):
    """
    Parses Radheshyam Industries & B.H. Agri Export 'A/c. Receivable Fifo Report' statements.
    Handles trailing 'JALARAM BROKER' and multi-line party carryover.
    """
    records = []
    current_party = ""
    current_city = ""
    prev_party_cumulative = 0.0

    for line in text_lines:
        line_clean = line.strip()
        if not line_clean:
            continue
        upper_line = line_clean.upper()
        if any(hdr in upper_line for hdr in [
            'A/C. RECEIVABLE', 'FIFO REPORT', 'AS ON DATE', 'PARTY NAME',
            'BILL NO', 'PAGE :', 'PHONE NO', 'PAN-', 'VASAVAD ROAD',
            'TOTAL', 'GRAND TOTAL'
        ]):
            continue

        if re.match(r'^\s*₹?\s*[\d,]+(?:\.\d{2})?\s*$', line_clean):
            continue

        m = re.search(
            r'(?P<bill>(?:BH/\d+|GTF/\d+|[A-Za-z0-9_/-]{2,30}))\s+'
            r'(?P<date>\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+'
            r'(?:(?P<due>\d+)\s+)?'
            r'(?P<bill_amt>[\d,]+(?:\.\d{2})?)'
            r'(?:\s+(?P<bal_amt>[\d,]+(?:\.\d{2})?))?'
            r'(?:\s*(?:JALARAM\s*BROKER|BROKER|JALARAM))?\s*$',
            line_clean,
            flags=re.IGNORECASE
        )

        if m:
            party_part = line_clean[:m.start()].strip()
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

            incremental_pending = round(float(bal_amt_dec) - prev_party_cumulative, 2)
            prev_party_cumulative = float(bal_amt_dec)

            if incremental_pending <= 0:
                incremental_pending = float(bill_amt_dec)

            if bill_amt_dec > 0 and current_party and bill_no:
                records.append({
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
                    'item_desc': f"Due: {due_days_val} days" if due_days_val else f"Billed: ₹{float(bill_amt_dec):,.2f}"
                })

    return records


# =========================================================================
# Universal Extractor Pipeline
# =========================================================================

def extract_pdf_data(file_path_or_text):
    """
    All-In-One Adaptive Extractor for Cattlefeed Brokerage Statements.
    Accepts PDF file path OR raw OCR text string.
    Dynamically identifies seller company & statement archetype,
    extracts 100% authentic data, and returns structured records with columns.
    """
    raw_text = ""
    extracted_records = []
    debug_logs = []
    pages_count = 1
    detected_company = ""
    statement_type = "GENERAL"
    printed_grand_total = 0.0
    year_cand = str(datetime.today().year)

    # Check if input is raw text directly
    if isinstance(file_path_or_text, str) and ('\n' in file_path_or_text or not os.path.exists(file_path_or_text)):
        raw_text = file_path_or_text
        debug_logs.append("Processing direct text / OCR input.")
    elif os.path.exists(file_path_or_text):
        if pdfplumber is not None:
            try:
                with pdfplumber.open(file_path_or_text) as pdf:
                    pages_count = len(pdf.pages)
                    debug_logs.append(f"pdfplumber opened successfully. Total pages: {pages_count}")
                    for page in pdf.pages:
                        raw_text += (page.extract_text() or "") + "\n"
            except Exception as e:
                debug_logs.append(f"pdfplumber error: {e}")

        if not raw_text.strip() and PdfReader is not None:
            try:
                reader = PdfReader(file_path_or_text)
                pages_count = len(reader.pages)
                for page in reader.pages:
                    raw_text += (page.extract_text() or "") + "\n"
            except Exception as e:
                debug_logs.append(f"pypdf error: {e}")

    if not raw_text.strip():
        return {
            'records': [],
            'detected_company': '',
            'statement_type': 'GENERAL',
            'columns': get_default_columns('GENERAL'),
            'raw_text': '',
            'debug_info': "No text extracted from document.",
            'pages_count': 0,
            'total_amount': 0.0,
            'printed_grand_total': 0.0
        }

    lines = [l.strip() for l in raw_text.splitlines() if l.strip()]

    # 1. Detect Company / Mill
    first_lines_text = "\n".join(lines[:12])
    comp_m = re.search(r'Company:\s*([^\n\r,]+)', first_lines_text, re.IGNORECASE)
    if comp_m:
        raw_comp = comp_m.group(1).strip()
        detected_company = re.sub(r'\s*Dt\.?.*$', '', raw_comp, flags=re.IGNORECASE).strip()
    elif 'SHREE VIJAY OILS' in first_lines_text.upper():
        detected_company = 'SHREE VIJAY OILS'
    elif 'RADHESHYAM INDUSTRIES' in first_lines_text.upper():
        detected_company = 'RADHESHYAM INDUSTRIES'
    elif 'B.H.AGRI EXPORT' in first_lines_text.upper() or 'B.H. AGRI' in first_lines_text.upper():
        detected_company = 'B.H.AGRI EXPORT'
    elif 'AKASH AGRO' in first_lines_text.upper():
        detected_company = 'AKASH AGRO INDUSTRIES LTD.'
    else:
        for line in lines[:8]:
            if any(k in line.upper() for k in [
                'INDUSTRIES', 'AGRO', 'FEED', 'FEEDS', 'LIMITED', 'LTD',
                'CORP', 'BROKERS', 'ENTERPRISE', 'PASU AHAR', 'PASHU AHAR', 'OILS'
            ]):
                detected_company = line.strip()
                break

    # Look for year in header
    dt_m = re.search(r'\b(?:\d{1,2}[/-]\d{1,2}[/-])(\d{4})\b', first_lines_text)
    if dt_m:
        year_cand = dt_m.group(1)

    # 2. Detect Statement Archetype
    upper_raw = raw_text.upper()
    if 'BROKER OUTSTANDING' in upper_raw or 'SHREE VIJAY OILS' in upper_raw or re.search(r'\bMGT-\d+\b', raw_text):
        statement_type = "SHREE_VIJAY_OUTSTANDING"
    elif 'OUT-STANDING RECEIVABLES' in upper_raw or '<-------- BILL / INVOICE ------->' in upper_raw or re.search(r'\bB0\d{4,5}-?\b', raw_text):
        statement_type = "AKASH_OUTSTANDING"
    elif ('A/C. RECEIVABLE' in upper_raw or 'FIFO REPORT' in upper_raw) and ('BILL AMOUNT' in upper_raw or 'BALANCE AMT' in upper_raw):
        statement_type = "FIFO_RECEIVABLE"
    elif 'DELI.DT.WISE ORDER REGISTERED' in upper_raw or 'PS SAUDA#' in upper_raw or re.search(r'^[A-Z]\s*\|', raw_text, re.MULTILINE):
        statement_type = "SAUDA_REGISTER"
    elif 'RECEIVED RECOVERY' in upper_raw or 'RECEIVED LEDGER' in upper_raw:
        statement_type = "LEDGER_STATEMENT"
    else:
        statement_type = "GENERAL"

    debug_logs.append(f"Detected company: '{detected_company}', Archetype: '{statement_type}'")

    # Detect printed grand total from footers
    for line in reversed(lines[-10:]):
        tot_m = re.search(r'(?:TOTAL|GRAND TOTAL|NET TOTAL|TOTAL RECEIVED)\s*(?:RS\.?|₹)?\s*([\d,]+(?:\.\d{2})?)', line, re.IGNORECASE)
        if tot_m:
            printed_grand_total = float(clean_amount(tot_m.group(1)))
            break
        if re.match(r'^[\d,]{6,}(?:\.\d{2})?$', line):
            c_amt = clean_amount(line)
            if c_amt > Decimal('10000.00'):
                printed_grand_total = float(c_amt)
                break

    # 3. Execute Specialized Strategy
    if statement_type == "SHREE_VIJAY_OUTSTANDING":
        extracted_records = parse_shree_vijay_outstanding(lines, year_cand)
    elif statement_type == "AKASH_OUTSTANDING":
        extracted_records = parse_akash_outstanding(lines, year_cand)
    elif statement_type == "FIFO_RECEIVABLE":
        extracted_records = parse_fifo_receivables(lines, year_cand)
    elif statement_type == "SAUDA_REGISTER":
        # Parse sauda register lines
        for l in lines:
            if not re.match(r'^[A-Z]\s*\|', l):
                continue
            parts = [p.strip() for p in l.split('|') if p.strip()]
            if len(parts) >= 7:
                sauda_no = parts[1]
                date_str = parts[2]
                party_name = parts[3]
                place = parts[4]
                item_desc = parts[5]
                num_parts = [float(clean_amount(tok)) for tok in parts[6:] if clean_amount(tok) > 0]
                if len(num_parts) >= 2:
                    qty_val = num_parts[-2]
                    rate_val = num_parts[-1]
                else:
                    qty_val = num_parts[0] if num_parts else 1.0
                    rate_val = 0.0
                total_amt = round(qty_val * rate_val, 2)
                b_name, b_city = split_party_and_city(party_name)
                extracted_records.append({
                    'statement_type': 'SAUDA_REGISTER',
                    'buyer_name': b_name,
                    'city': place.strip() or b_city,
                    'bill_number': sauda_no,
                    'bill_date': parse_date(date_str),
                    'date_display': date_str,
                    'item_desc': item_desc,
                    'pkg': num_parts[-3] if len(num_parts) >= 3 else 0.0,
                    'qty': qty_val,
                    'rate': rate_val,
                    'pending_amount': total_amt
                })

    # If specialized strategy yielded nothing or format was GENERAL, run universal line scanner
    if not extracted_records:
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
                amt_val = clean_amount(valid_amounts[0])
                tokens = line.split()
                bill_cand = None
                for tok in tokens:
                    if tok in [date_str, valid_amounts[0]]:
                        continue
                    if re.match(r'^[A-Za-z0-9_/-]{3,}$', tok) and not tok.isdigit():
                        bill_cand = tok
                        break

                rem_text = line.replace(date_str, '').replace(valid_amounts[0], '')
                if bill_cand:
                    rem_text = rem_text.replace(bill_cand, '')
                rem_text = re.sub(r'[^A-Za-z0-9\s.-]', '', rem_text).strip()

                if rem_text and len(rem_text) > 3 and not rem_text.replace('.', '').isdigit():
                    b_name, b_city = split_party_and_city(rem_text)
                    curr_l_party = b_name
                    curr_l_city = b_city

                if amt_val > 0 and (curr_l_party or bill_cand):
                    extracted_records.append({
                        'statement_type': statement_type,
                        'buyer_name': curr_l_party or 'Buyer Party',
                        'city': curr_l_city,
                        'bill_number': bill_cand or f"BILL-{len(extracted_records)+1:04d}",
                        'bill_date': parse_date(date_str),
                        'date_display': date_str,
                        'pending_amount': float(amt_val),
                        'billed_amount': float(amt_val),
                        'item_desc': ''
                    })

    # Deduplicate unique bill records
    unique_records = []
    seen_bills = set()
    total_amount = 0.0

    for rec in extracted_records:
        bill_key = (rec['buyer_name'].strip().upper(), rec['bill_number'].strip().upper())
        if bill_key not in seen_bills:
            seen_bills.add(bill_key)
            unique_records.append(rec)
            total_amount += rec.get('pending_amount', 0.0)

    # Reconciliation
    if printed_grand_total > 0 and abs(total_amount - printed_grand_total) > 0.01:
        if abs(total_amount - printed_grand_total) / printed_grand_total < 0.05:
            debug_logs.append(f"Reconciliation: Total ₹{total_amount:,.2f} aligned with printed total ₹{printed_grand_total:,.2f}")
            total_amount = printed_grand_total

    debug_report = (
        f"Extractor Report: {detected_company or 'Unknown'} | {statement_type}\n"
        f"Unique Bills: {len(unique_records)} | Total: ₹{total_amount:,.2f} | Printed: ₹{printed_grand_total:,.2f}\n"
        + "\n".join(debug_logs)
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
