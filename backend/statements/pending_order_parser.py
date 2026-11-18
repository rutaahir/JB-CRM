import re
import os
import hashlib
from datetime import datetime, date
from decimal import Decimal
from django.utils import timezone

try:
    import pdfplumber
except ImportError:
    pdfplumber = None

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

from contacts.models import Contact
from products.models import Product
from statements.models import PartyAlias, UploadedStatement

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

def clean_dec(val):
    if val is None or val == '':
        return Decimal('0.00')
    cleaned = re.sub(r'[^\d.]', '', str(val).replace(',', ''))
    try:
        return Decimal(cleaned) if cleaned else Decimal('0.00')
    except Exception:
        return Decimal('0.00')

def parse_order_date(d_str):
    if not d_str:
        return timezone.now().strftime('%Y-%m-%d')
    d_clean = str(d_str).strip().replace('/', '-')
    for fmt in ['%d-%m-%y', '%d-%m-%Y', '%Y-%m-%d', '%d.%m.%Y', '%d.%m.%y']:
        try:
            return datetime.strptime(d_clean, fmt).strftime('%Y-%m-%d')
        except ValueError:
            pass
    return timezone.now().strftime('%Y-%m-%d')

def match_contact(raw_party_name, city=""):
    """
    3-tier contact resolver:
    1. Check PartyAlias table (remembered mappings)
    2. Exact match in Contact master (case-insensitive)
    3. City-assisted or normalized substring match
    Returns dict: { 'id': int|None, 'code': str, 'name': str, 'is_new': bool, 'confidence': float }
    """
    if not raw_party_name:
        return {'id': None, 'code': '', 'name': '', 'is_new': True, 'confidence': 0.0}

    clean_raw = raw_party_name.strip()

    # Tier 1: Check saved alias
    alias = PartyAlias.objects.filter(raw_name__iexact=clean_raw).select_related('contact').first()
    if alias and alias.contact:
        return {
            'id': alias.contact.id,
            'code': alias.contact.code,
            'name': alias.contact.name,
            'city': alias.contact.city,
            'is_new': False,
            'confidence': 1.0,
            'source': 'alias'
        }

    # Tier 2: Check exact match on Contact.name
    exact = Contact.objects.filter(name__iexact=clean_raw).first()
    if exact:
        return {
            'id': exact.id,
            'code': exact.code,
            'name': exact.name,
            'city': exact.city,
            'is_new': False,
            'confidence': 0.98,
            'source': 'exact'
        }

    # Tier 3: Check stripped common suffixes
    norm = re.sub(r'\b(TRADING CO|TRADERS|STORE|AGRO|ENTERPRISE|CATTLE FEED|CATTALE FEED|PASHU AAHAR|FOOD)\b', '', clean_raw, flags=re.IGNORECASE).strip()
    if norm and len(norm) >= 4:
        cand = Contact.objects.filter(name__icontains=norm).first()
        if cand:
            return {
                'id': cand.id,
                'code': cand.code,
                'name': cand.name,
                'city': cand.city,
                'is_new': False,
                'confidence': 0.80,
                'source': 'normalized'
            }

    # City match
    if city:
        city_cand = Contact.objects.filter(city__iexact=city).first()
        if city_cand and (clean_raw.lower() in city_cand.name.lower() or city_cand.name.lower() in clean_raw.lower()):
            return {
                'id': city_cand.id,
                'code': city_cand.code,
                'name': city_cand.name,
                'city': city_cand.city,
                'is_new': False,
                'confidence': 0.85,
                'source': 'city_match'
            }

    return {
        'id': None,
        'code': '',
        'name': '',
        'city': city,
        'is_new': True,
        'confidence': 0.0,
        'source': 'none'
    }

def match_product(raw_product_name):
    if not raw_product_name:
        return None, "MAIZE CAKE"
    clean_p = raw_product_name.strip()
    prod = Product.objects.filter(name__iexact=clean_p).first()
    if prod:
        return prod, prod.name
    # Fuzzy match
    for p in Product.objects.filter(is_active=True):
        if p.name.lower() in clean_p.lower() or clean_p.lower() in p.name.lower():
            return p, p.name
    return None, clean_p


# =========================================================================
# Format 1: Standard Table Line Parser (PDF 1)
# DATE PARTY NAME city BROKER PRODUCT TOTAL BAG RATE DISPATCH BAG PENDING BAG
# =========================================================================

def parse_standard_line_regex(line):
    line = line.strip()
    if not line or 'PARTY NAME' in line or 'PENDING BAG' in line:
        return None

    m_date = re.match(r'^(\d{2}[-/.]\d{2}[-/.]\d{2,4})\s+(.+)$', line)
    if not m_date:
        return None

    raw_date = m_date.group(1)
    rest = m_date.group(2).strip()

    tokens = rest.split()
    num_indices = []
    for idx in range(len(tokens) - 1, -1, -1):
        tok = tokens[idx]
        if re.search(r'\d', tok) and not re.search(r'[a-zA-Z]{3,}', tok):
            num_indices.append(idx)
        else:
            break

    if not num_indices or len(num_indices) < 2:
        return None

    num_indices.reverse()
    first_num_idx = num_indices[0]

    number_tokens = tokens[first_num_idx:]
    text_tokens = tokens[:first_num_idx]
    text_part = ' '.join(text_tokens)

    total_bag = clean_dec(number_tokens[0])
    rate = clean_dec(number_tokens[1]) if len(number_tokens) > 1 else Decimal('0.00')
    if len(number_tokens) >= 4:
        dispatch_bag = clean_dec(number_tokens[2])
        pending_bag = clean_dec(number_tokens[3])
    elif len(number_tokens) == 3:
        dispatch_bag = Decimal('0.00')
        pending_bag = clean_dec(number_tokens[2])
    else:
        dispatch_bag = Decimal('0.00')
        pending_bag = Decimal('0.00')

    last_jalaram_idx = text_part.upper().rfind('JALARAM')
    if last_jalaram_idx != -1:
        before_broker = text_part[:last_jalaram_idx].strip()
        broker = 'JALARAM'
        product_name = text_part[last_jalaram_idx + len('JALARAM'):].strip() or 'MAIZE CAKE'
    else:
        prod_matches = list(re.finditer(r'\b(MAIZE CAKE|MAKAI KHOL|KAPAS KHOL|COTTON CAKE|HOMINY FEED|PELLET|WHEAT BRAN|FEED)\b', text_part, flags=re.IGNORECASE))
        if prod_matches:
            last_p = prod_matches[-1]
            before_prod = text_part[:last_p.start()].strip()
            product_name = text_part[last_p.start():].strip()
            words_bp = before_prod.split()
            broker = words_bp[-1] if len(words_bp) > 0 else 'JALARAM'
            before_broker = ' '.join(words_bp[:-1])
        else:
            words = text_part.split()
            product_name = words[-1] if len(words) >= 1 else 'MAIZE CAKE'
            broker = words[-2] if len(words) >= 2 else 'JALARAM'
            before_broker = ' '.join(words[:-2]) if len(words) >= 3 else text_part

    b_words = before_broker.split()
    if len(b_words) > 1:
        city = b_words[-1]
        party_name = ' '.join(b_words[:-1])
    else:
        party_name = before_broker
        city = ''

    return {
        'date': parse_order_date(raw_date),
        'party_name': party_name,
        'city': city,
        'broker': broker,
        'product': product_name,
        'total_bag': float(total_bag),
        'rate': float(rate),
        'dispatch_bag': float(dispatch_bag),
        'pending_bag': float(pending_bag),
    }


# =========================================================================
# Format 2: B.H. Agri Export - Partywise Pending List (PDF 4)
# Header: Partywise List (Sec. Unit-Pending)
# Party name on standalone line, orders start with MOB/...
# =========================================================================

def parse_bh_agri_pending(lines):
    rows = []
    curr_party = ""

    for line in lines:
        line_clean = line.strip()
        if not line_clean:
            continue
        if any(h in line_clean.upper() for h in [
            'ORDER NO.', 'TOTAL', 'PARTYWISE LIST', 'PAGE :', 'TAL-PADDHARI', 'FROM DATE'
        ]):
            continue

        m_order = re.search(
            r'^(?P<ord>MOB/\d+)\s+'
            r'(?P<date>\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+'
            r'(?P<prod>.*?)\s+'
            r'(?P<nums>[\d.,\s]+)$',
            line_clean
        )

        if m_order:
            nums = [float(clean_dec(x)) for x in m_order.group('nums').split() if clean_dec(x) > 0]
            ord_qty = nums[0] if len(nums) >= 1 else 0.0
            if len(nums) >= 4:
                pend_qty = nums[1]
                deliv_qty = nums[2]
                rate = nums[3]
            elif len(nums) == 3:
                pend_qty = nums[1]
                deliv_qty = 0.0
                rate = nums[2]
            else:
                pend_qty = ord_qty
                deliv_qty = 0.0
                rate = 0.0

            p_name, p_city = split_party_and_city(curr_party)
            rows.append({
                'date': parse_order_date(m_order.group('date')),
                'party_name': p_name or curr_party or 'Buyer Party',
                'city': p_city,
                'broker': 'JALARAM',
                'product': m_order.group('prod').strip() or 'CATTLE FEED CAKE',
                'total_bag': ord_qty,
                'rate': rate,
                'dispatch_bag': deliv_qty,
                'pending_bag': pend_qty,
            })
        else:
            if not re.search(r'\d{3,}', line_clean):
                curr_party = line_clean.strip()

    return rows


# =========================================================================
# Format 3: Radheshyam Industries - Default Format (Sec. Unit-Pending) (PDF 3)
# Order Date | Order No | Party Name | Product Name | Order BAGS | Delivered BAGS | Amount
# =========================================================================

def parse_radheshyam_pending(lines):
    rows = []

    for line in lines:
        line_clean = line.strip()
        if not line_clean:
            continue
        if any(h in line_clean.upper() for h in [
            'DEFAULT FORMAT', 'PAGE :', 'TOTAL', 'ORDER DATE', 'FROM DATE', 'BABRA'
        ]):
            continue

        m = re.search(r'^(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+([\d.,\s]+)$', line_clean)
        if m:
            d_str = m.group(1)
            mid_text = m.group(2).strip()
            nums = [float(clean_dec(x)) for x in m.group(3).split() if clean_dec(x) > 0]

            if len(nums) >= 2:
                order_bags = nums[0]
                amt = nums[-1]
                deliv = nums[1] if len(nums) >= 3 else 0.0
                rate = round(amt / order_bags, 2) if order_bags > 0 else 0.0
                pend = order_bags - deliv
            else:
                order_bags = nums[0] if nums else 0.0
                amt = 0.0
                deliv = 0.0
                rate = 0.0
                pend = order_bags

            # Separate party and product
            p_m = re.search(r'\b(OIL CACK|MAIZE CAKE|CATTLE FEED|FEED|KAPAS)\b', mid_text, re.IGNORECASE)
            if p_m:
                raw_p = mid_text[:p_m.start()].strip()
                prod_name = mid_text[p_m.start():].strip()
            else:
                raw_p = mid_text
                prod_name = "CATTLE FEED"

            party_n, city_n = split_party_and_city(raw_p)

            rows.append({
                'date': parse_order_date(d_str),
                'party_name': party_n or raw_p,
                'city': city_n,
                'broker': 'JALARAM',
                'product': prod_name,
                'total_bag': order_bags,
                'rate': rate,
                'dispatch_bag': deliv,
                'pending_bag': pend,
            })

    return rows


# =========================================================================
# Format 4: Akash Agro Industries - Pending Sales (PDF 8)
# S | SAUDA# | DATE | PARTY | PLACE | ITEM DESC | TIN | PKG | QTY.KG. | RATE | DELIVERY
# =========================================================================

def parse_akash_pending_sales(lines, year_cand):
    rows = []

    for line in lines:
        line_clean = line.strip()
        if not re.match(r'^[A-Z]\s*\|', line_clean):
            continue

        parts = [p.strip() for p in line_clean.split('|') if p.strip()]
        if len(parts) >= 7:
            sauda_no = parts[1]
            date_str = parts[2]
            party = parts[3]
            city = parts[4]
            prod = parts[5]

            nums = [float(clean_dec(tok)) for tok in parts[6:] if clean_dec(tok) > 0]
            if len(nums) >= 2:
                qty = nums[-2]
                rate = nums[-1]
            else:
                qty = nums[0] if nums else 0.0
                rate = 0.0

            # Construct full date
            if len(date_str.split('/')) == 2 or len(date_str.split('-')) == 2:
                parts_d = date_str.replace('/', '-').split('-')
                full_date = f"{year_cand}-{int(parts_d[1]):02d}-{int(parts_d[0]):02d}"
            else:
                full_date = parse_order_date(date_str)

            rows.append({
                'date': full_date,
                'party_name': party,
                'city': city,
                'broker': 'JALARAM',
                'product': prod,
                'total_bag': qty,
                'rate': rate,
                'dispatch_bag': 0.0,
                'pending_bag': qty,
            })

    return rows


# =========================================================================
# Multi-Format Adaptive Pending Orders Pipeline
# =========================================================================

def extract_rows_from_text(raw_text):
    """
    Takes extracted text from PDF or direct OCR paste and runs adaptive format detection.
    """
    lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
    upper_raw = raw_text.upper()

    # Look for year in header
    year_cand = str(datetime.today().year)
    dt_m = re.search(r'\b(?:\d{1,2}[/-]\d{1,2}[/-])(\d{4})\b', raw_text[:500])
    if dt_m:
        year_cand = dt_m.group(1)

    # Archetype 1: B.H. Agri Export Pending List
    if 'PARTYWISE LIST' in upper_raw or 'TAL-PADDHARI' in upper_raw or re.search(r'\bMOB/\d+\b', raw_text):
        res = parse_bh_agri_pending(lines)
        if res:
            return res

    # Archetype 2: Akash Agro Pending Sales
    if 'DELI.DT.WISE ORDER REGISTERED' in upper_raw or re.search(r'^[A-Z]\s*\|', raw_text, re.MULTILINE):
        res = parse_akash_pending_sales(lines, year_cand)
        if res:
            return res

    # Archetype 3: Radheshyam Pending Orders
    if 'DEFAULT FORMAT (SEC. UNIT-PENDING)' in upper_raw or 'ORDER BAGS DELIVERED BAGS' in upper_raw:
        res = parse_radheshyam_pending(lines)
        if res:
            return res

    # Archetype 4: Standard Pending Orders (PDF 1)
    standard_rows = []
    for line in lines:
        parsed = parse_standard_line_regex(line)
        if parsed:
            standard_rows.append(parsed)
    if standard_rows:
        return standard_rows

    # Fallback: Try each parser in sequence
    for parser_fn in [parse_bh_agri_pending, parse_radheshyam_pending]:
        try:
            cand = parser_fn(lines)
            if cand:
                return cand
        except Exception:
            continue

    return []


def extract_and_compare_pending_orders(pdf_path_or_bytes, company_contact=None, company_name='', report_date=None, current_statement_id=None, raw_ocr_override=None):
    """
    Main extraction and comparison pipeline.
    1. Extracts raw text from PDF file OR accepts raw OCR text.
    2. Runs adaptive format parser to extract order rows.
    3. Resolves each party against Contact master and products against Product master.
    4. Calculates aging (Days Pending).
    5. Compares with prior report for autopilot tracking.
    """
    today_dt = timezone.now().date()
    if isinstance(report_date, str):
        try:
            report_date = datetime.strptime(report_date, '%Y-%m-%d').date()
        except Exception:
            report_date = today_dt
    elif not report_date:
        report_date = today_dt

    raw_text = ""
    extracted_rows = []

    # If raw OCR text provided
    if raw_ocr_override and raw_ocr_override.strip():
        raw_text = raw_ocr_override.strip()
        extracted_rows = extract_rows_from_text(raw_text)

    # If string is passed in pdf_path_or_bytes that contains newlines or is not a file
    elif isinstance(pdf_path_or_bytes, str) and ('\n' in pdf_path_or_bytes or not os.path.exists(pdf_path_or_bytes)):
        raw_text = pdf_path_or_bytes.strip()
        extracted_rows = extract_rows_from_text(raw_text)

    # Read from PDF file
    elif pdf_path_or_bytes and os.path.exists(pdf_path_or_bytes):
        if pdfplumber:
            try:
                with pdfplumber.open(pdf_path_or_bytes) as pdf:
                    for p in pdf.pages:
                        raw_text += (p.extract_text() or '') + "\n"
                    # Try table extraction first
                    extracted_rows = extract_rows_from_text(raw_text)
            except Exception as e:
                raw_text += f"\npdfplumber error: {e}"

        if not extracted_rows and PdfReader:
            try:
                reader = PdfReader(pdf_path_or_bytes)
                for p in reader.pages:
                    raw_text += (p.extract_text() or '') + "\n"
                extracted_rows = extract_rows_from_text(raw_text)
            except Exception as e:
                raw_text += f"\npypdf error: {e}"

    # Process and enrich each row
    enriched_rows = []
    total_pending_bags = Decimal('0.00')
    total_dispatch_bags = Decimal('0.00')
    total_order_bags = Decimal('0.00')
    matched_parties_count = 0
    new_parties_count = 0

    aging_less_15 = 0
    aging_15_30 = 0
    aging_over_30 = 0

    for idx, row in enumerate(extracted_rows):
        o_date_str = row.get('date') or today_dt.strftime('%Y-%m-%d')
        try:
            o_date = datetime.strptime(o_date_str, '%Y-%m-%d').date()
            days_pending = max((today_dt - o_date).days, 0)
        except Exception:
            days_pending = 0

        if days_pending < 15:
            aging_less_15 += 1
        elif days_pending <= 30:
            aging_15_30 += 1
        else:
            aging_over_30 += 1

        # Match contact
        raw_party = row.get('party_name', '')
        raw_city = row.get('city', '')
        contact_info = match_contact(raw_party, raw_city)

        if contact_info.get('is_new'):
            new_parties_count += 1
        else:
            matched_parties_count += 1

        # Match product
        raw_prod = row.get('product', '')
        prod_obj, prod_name = match_product(raw_prod)

        # Bag math
        p_bags = Decimal(str(row.get('pending_bag', 0)))
        d_bags = Decimal(str(row.get('dispatch_bag', 0)))
        t_bags = Decimal(str(row.get('total_bag', 0)))

        total_pending_bags += p_bags
        total_dispatch_bags += d_bags
        total_order_bags += t_bags

        # Daily status
        if p_bags <= 0 and d_bags > 0:
            status = 'Completed'
        elif d_bags > 0 and p_bags > 0:
            status = 'Dispatch Due'
        else:
            status = 'Pending'

        enriched_rows.append({
            'row_id': idx + 1,
            'date': o_date_str,
            'days_pending': days_pending,
            'party_name': raw_party,
            'city': raw_city or contact_info.get('city', ''),
            'broker': row.get('broker', 'JALARAM'),
            'product': prod_name,
            'product_id': prod_obj.id if prod_obj else None,
            'total_bag': float(t_bags),
            'rate': float(row.get('rate', 0.0)),
            'dispatch_bag': float(d_bags),
            'pending_bag': float(p_bags),
            'status': status,
            'contact_id': contact_info.get('id'),
            'contact_code': contact_info.get('code', ''),
            'contact_name': contact_info.get('name', ''),
            'is_new_party': contact_info.get('is_new', True),
            'match_confidence': contact_info.get('confidence', 0.0),
            'comparison_status': 'UNCHANGED',
            'previous_pending_bag': None,
        })

    # Summary
    summary = {
        'total_orders': len(enriched_rows),
        'total_order_bags': float(total_order_bags),
        'total_pending_bags': float(total_pending_bags),
        'total_dispatched_bags': float(total_dispatch_bags),
        'matched_parties_count': matched_parties_count,
        'new_parties_count': new_parties_count,
        'aging_brackets': {
            'less_than_15_days': aging_less_15,
            'days_15_to_30': aging_15_30,
            'over_30_days': aging_over_30,
        }
    }

    # Comparison with previous statement for same company
    comparison_data = {
        'has_previous_comparison': False,
        'completed_orders_count': 0,
        'partially_dispatched_count': 0,
        'new_orders_count': 0,
        'unchanged_orders_count': len(enriched_rows),
    }

    prior_stmt = None
    if company_contact:
        prior_stmt = UploadedStatement.objects.filter(
            company_contact=company_contact,
            statement_type='PENDING_ORDER',
            status__in=[UploadedStatement.STATUS_EXTRACTED, UploadedStatement.STATUS_VERIFIED]
        ).exclude(id=current_statement_id).order_by('-uploaded_at').first()
    elif company_name:
        prior_stmt = UploadedStatement.objects.filter(
            company_name__iexact=company_name,
            statement_type='PENDING_ORDER',
            status__in=[UploadedStatement.STATUS_EXTRACTED, UploadedStatement.STATUS_VERIFIED]
        ).exclude(id=current_statement_id).order_by('-uploaded_at').first()

    if prior_stmt and prior_stmt.extracted_data:
        prior_rows = prior_stmt.extracted_data
        prior_map = {
            f"{r.get('party_name', '').strip().lower()}::{r.get('product', '').strip().lower()}": r
            for r in prior_rows
        }

        completed_cnt = 0
        partial_cnt = 0
        new_cnt = 0
        unchanged_cnt = 0

        for row in enriched_rows:
            key = f"{row['party_name'].strip().lower()}::{row['product'].strip().lower()}"
            prior_r = prior_map.get(key)
            if not prior_r:
                row['comparison_status'] = 'NEW_ORDER'
                new_cnt += 1
            else:
                prev_p = Decimal(str(prior_r.get('pending_bag', 0)))
                curr_p = Decimal(str(row.get('pending_bag', 0)))
                row['previous_pending_bag'] = float(prev_p)
                if curr_p == 0:
                    row['comparison_status'] = 'COMPLETED'
                    completed_cnt += 1
                elif curr_p < prev_p:
                    row['comparison_status'] = 'PARTIALLY_DISPATCHED'
                    partial_cnt += 1
                else:
                    row['comparison_status'] = 'UNCHANGED'
                    unchanged_cnt += 1

        comparison_data = {
            'has_previous_comparison': True,
            'previous_statement_id': prior_stmt.id,
            'previous_statement_date': prior_stmt.uploaded_at.strftime('%d-%m-%Y'),
            'completed_orders_count': completed_cnt,
            'partially_dispatched_count': partial_cnt,
            'new_orders_count': new_cnt,
            'unchanged_orders_count': unchanged_cnt,
        }

    return enriched_rows, summary, comparison_data, raw_text
