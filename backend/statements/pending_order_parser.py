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
    # e.g., 'SHREEJI KIRANA STORE' -> 'SHREEJI' or removing 'TRADING CO', 'PASHU AAHAR'
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

    # Also check if city is attached to party name
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

def parse_line_regex(line):
    """
    Parses a single text line matching the mill format:
    DATE PARTY NAME city BROKER PRODUCT TOTAL BAG RATE DISPATCH BAG PENDING BAG
    """
    line = line.strip()
    if not line or 'PARTY NAME' in line or 'PENDING BAG' in line:
        return None

    # 1. Match Date at start
    m_date = re.match(r'^(\d{2}[-/.]\d{2}[-/.]\d{2,4})\s+(.+)$', line)
    if not m_date:
        return None

    raw_date = m_date.group(1)
    rest = m_date.group(2).strip()

    # 2. Extract numeric tail from the right
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

    # 3. Look for broker: we use the LAST occurrence of JALARAM (in case party has Jalaram in name)
    last_jalaram_idx = text_part.upper().rfind('JALARAM')
    if last_jalaram_idx != -1:
        before_broker = text_part[:last_jalaram_idx].strip()
        broker = 'JALARAM'
        product_name = text_part[last_jalaram_idx + len('JALARAM'):].strip() or 'MAIZE CAKE'
    else:
        # Check known products
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

    # In before_broker: last word is city
    b_words = before_broker.split()
    if len(b_words) > 1:
        city = b_words[-1]
        party_name = ' '.join(b_words[:-1])
    else:
        party_name = before_broker
        city = ''

    parsed_date_str = parse_order_date(raw_date)

    return {
        'date': parsed_date_str,
        'party_name': party_name,
        'city': city,
        'broker': broker,
        'product': product_name,
        'total_bag': float(total_bag),
        'rate': float(rate),
        'dispatch_bag': float(dispatch_bag),
        'pending_bag': float(pending_bag),
    }

def extract_rows_from_pdfplumber(pdf):
    extracted_rows = []
    
    # Try structured table extraction across all pages
    for page in pdf.pages:
        tables = page.extract_tables() or []
        for table in tables:
            if not table or len(table) < 2:
                continue
            
            # Find header row
            header_idx = -1
            col_map = {}
            for row_i, row in enumerate(table[:5]):
                row_str = ' '.join([str(c or '').upper() for c in row])
                if 'PARTY' in row_str or 'PENDING' in row_str or 'TOTAL' in row_str:
                    header_idx = row_i
                    for c_i, cell in enumerate(row):
                        cell_u = str(cell or '').upper().strip()
                        if 'DATE' in cell_u:
                            col_map['date'] = c_i
                        elif 'PARTY' in cell_u:
                            col_map['party'] = c_i
                        elif 'CITY' in cell_u:
                            col_map['city'] = c_i
                        elif 'BROKER' in cell_u:
                            col_map['broker'] = c_i
                        elif 'PRODUCT' in cell_u:
                            col_map['product'] = c_i
                        elif 'TOTAL' in cell_u:
                            col_map['total_bag'] = c_i
                        elif 'RATE' in cell_u:
                            col_map['rate'] = c_i
                        elif 'DISPATCH' in cell_u:
                            col_map['dispatch_bag'] = c_i
                        elif 'PENDING' in cell_u:
                            col_map['pending_bag'] = c_i
                    break
            
            if header_idx != -1 and 'party' in col_map and 'pending_bag' in col_map:
                for row in table[header_idx + 1:]:
                    if not row or not any(row):
                        continue
                    p_name = str(row[col_map['party']] or '').strip()
                    if not p_name or p_name.upper() in ['TOTAL', 'SUBTOTAL']:
                        continue
                    
                    d_val = str(row[col_map.get('date', 0)] or '').strip() if 'date' in col_map else ''
                    city_val = str(row[col_map.get('city', 0)] or '').strip() if 'city' in col_map else ''
                    broker_val = str(row[col_map.get('broker', 0)] or '').strip() if 'broker' in col_map else 'JALARAM'
                    prod_val = str(row[col_map.get('product', 0)] or '').strip() if 'product' in col_map else 'MAIZE CAKE'
                    
                    t_bag = clean_dec(row[col_map.get('total_bag', 0)]) if 'total_bag' in col_map else Decimal('0.00')
                    r_val = clean_dec(row[col_map.get('rate', 0)]) if 'rate' in col_map else Decimal('0.00')
                    d_bag = clean_dec(row[col_map.get('dispatch_bag', 0)]) if 'dispatch_bag' in col_map else Decimal('0.00')
                    p_bag = clean_dec(row[col_map.get('pending_bag', 0)]) if 'pending_bag' in col_map else Decimal('0.00')

                    extracted_rows.append({
                        'date': parse_order_date(d_val),
                        'party_name': p_name,
                        'city': city_val,
                        'broker': broker_val,
                        'product': prod_val,
                        'total_bag': float(t_bag),
                        'rate': float(r_val),
                        'dispatch_bag': float(d_bag),
                        'pending_bag': float(p_bag),
                    })
                    
        # If no tables found or extracted few rows, fallback to line-by-line text on this page
        if not extracted_rows:
            text = page.extract_text() or ''
            for line in text.split('\n'):
                parsed = parse_line_regex(line)
                if parsed:
                    extracted_rows.append(parsed)

    return extracted_rows


def extract_and_compare_pending_orders(pdf_path_or_bytes, company_contact=None, company_name='', report_date=None, current_statement_id=None):
    """
    Main extraction and comparison pipeline.
    1. Parses PDF into rows
    2. Matches each row with Contact master & Product master
    3. Calculates aging (Days Pending)
    4. Compares with the most recent prior statement for the same company / mill
    5. Returns (rows, summary, comparison_data, raw_text)
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

    if pdfplumber:
        try:
            with pdfplumber.open(pdf_path_or_bytes) as pdf:
                for p in pdf.pages:
                    raw_text += (p.extract_text() or '') + "\n"
                extracted_rows = extract_rows_from_pdfplumber(pdf)
        except Exception as e:
            raw_text += f"\npdfplumber error: {e}"

    if not extracted_rows and PdfReader:
        try:
            reader = PdfReader(pdf_path_or_bytes)
            for p in reader.pages:
                raw_text += (p.extract_text() or '') + "\n"
            for line in raw_text.split('\n'):
                parsed = parse_line_regex(line)
                if parsed:
                    extracted_rows.append(parsed)
        except Exception as e:
            raw_text += f"\npypdf error: {e}"

    # Also handle if raw string OCR was passed directly
    if not extracted_rows and isinstance(pdf_path_or_bytes, str) and '\n' in pdf_path_or_bytes:
        raw_text = pdf_path_or_bytes
        for line in raw_text.split('\n'):
            parsed = parse_line_regex(line)
            if parsed:
                extracted_rows.append(parsed)

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

        # Aging brackets
        if days_pending < 15:
            aging_less_15 += 1
        elif days_pending <= 30:
            aging_15_30 += 1
        else:
            aging_over_30 += 1

        # Match Contact
        c_res = match_contact(row.get('party_name', ''), row.get('city', ''))
        if not c_res['is_new']:
            matched_parties_count += 1
        else:
            new_parties_count += 1

        # Match Product
        prod_obj, prod_name = match_product(row.get('product', ''))

        t_bag = Decimal(str(row.get('total_bag', 0)))
        d_bag = Decimal(str(row.get('dispatch_bag', 0)))
        p_bag = Decimal(str(row.get('pending_bag', 0)))

        total_order_bags += t_bag
        total_dispatch_bags += d_bag
        total_pending_bags += p_bag

        # Default order status
        if p_bag <= 0:
            row_status = 'Completed'
        elif days_pending > 20:
            row_status = 'Dispatch Due'
        else:
            row_status = 'Pending'

        enriched = {
            'row_id': idx + 1,
            'date': o_date_str,
            'party_name': row.get('party_name', ''),
            'city': row.get('city', '') or c_res.get('city', ''),
            'broker': row.get('broker', 'JALARAM'),
            'product': prod_name,
            'product_id': prod_obj.id if prod_obj else None,
            'total_bag': float(t_bag),
            'rate': float(row.get('rate', 0)),
            'dispatch_bag': float(d_bag),
            'pending_bag': float(p_bag),
            'days_pending': days_pending,
            'status': row_status,
            'contact_id': c_res.get('id'),
            'contact_code': c_res.get('code', ''),
            'contact_name': c_res.get('name', ''),
            'is_new_party': c_res.get('is_new', True),
            'match_confidence': c_res.get('confidence', 0.0),
            'comparison_status': 'PENDING',  # Will be refined during comparison
            'comparison_notes': '',
        }
        enriched_rows.append(enriched)

    # ----------------------------------------------------
    # Old vs New PDF Comparison Logic
    # ----------------------------------------------------
    prev_stmt = None
    stmt_qs = UploadedStatement.objects.filter(
        statement_type='PENDING_ORDER'
    ).exclude(status='FAILED')
    if current_statement_id:
        stmt_qs = stmt_qs.exclude(id=current_statement_id)

    if company_contact:
        prev_stmt = stmt_qs.filter(company_contact=company_contact).order_by('-report_date', '-uploaded_at').first()
    elif company_name:
        prev_stmt = stmt_qs.filter(company_name__iexact=company_name).order_by('-report_date', '-uploaded_at').first()

    comparison_data = {
        'has_previous_comparison': False,
        'previous_statement_id': None,
        'previous_statement_date': None,
        'new_orders_count': len(enriched_rows),
        'completed_orders_count': 0,
        'partially_dispatched_count': 0,
        'unchanged_orders_count': 0,
        'completed_removed_orders': [],
    }

    if prev_stmt and prev_stmt.extracted_data:
        comparison_data['has_previous_comparison'] = True
        comparison_data['previous_statement_id'] = prev_stmt.id
        comparison_data['previous_statement_date'] = prev_stmt.report_date.strftime('%Y-%m-%d')

        prev_rows = prev_stmt.extracted_data or []
        # Index previous rows by composite key: (normalized_party, date, normalized_product)
        def make_key(r):
            p = re.sub(r'\s+', '', (r.get('party_name') or '').lower())
            d = str(r.get('date') or '')
            pr = re.sub(r'\s+', '', (r.get('product') or '').lower())
            return f"{p}|{d}|{pr}"

        prev_map = {make_key(r): r for r in prev_rows if isinstance(r, dict)}
        seen_prev_keys = set()

        new_count = 0
        completed_count = 0
        partial_count = 0
        unchanged_count = 0

        for r in enriched_rows:
            k = make_key(r)
            if k in prev_map:
                seen_prev_keys.add(k)
                prev_r = prev_map[k]
                prev_pending = Decimal(str(prev_r.get('pending_bag', 0)))
                curr_pending = Decimal(str(r.get('pending_bag', 0)))
                prev_dispatch = Decimal(str(prev_r.get('dispatch_bag', 0)))
                curr_dispatch = Decimal(str(r.get('dispatch_bag', 0)))

                if curr_pending <= Decimal('0.00'):
                    r['comparison_status'] = 'COMPLETED'
                    r['comparison_notes'] = 'Order completed (0 bags pending)'
                    r['status'] = 'Completed'
                    completed_count += 1
                elif curr_pending < prev_pending or curr_dispatch > prev_dispatch:
                    diff_disp = curr_dispatch - prev_dispatch
                    r['comparison_status'] = 'PARTIALLY_DISPATCHED'
                    r['comparison_notes'] = f"Dispatched +{diff_disp} bags since last report"
                    partial_count += 1
                else:
                    r['comparison_status'] = 'UNCHANGED'
                    r['comparison_notes'] = 'No change since last report'
                    unchanged_count += 1
            else:
                r['comparison_status'] = 'NEW_ORDER'
                r['comparison_notes'] = 'New order added in today’s report'
                new_count += 1

        # Check for orders in previous report that are missing in today's report
        # (This means they were fully dispatched and cleared off the pending list)
        completed_removed = []
        for k, prev_r in prev_map.items():
            if k not in seen_prev_keys:
                if Decimal(str(prev_r.get('pending_bag', 0))) > 0:
                    cleared_row = dict(prev_r)
                    cleared_row['pending_bag'] = 0.0
                    cleared_row['status'] = 'Completed'
                    cleared_row['comparison_status'] = 'COMPLETED'
                    cleared_row['comparison_notes'] = 'Dispatched and cleared from mill pending list'
                    completed_removed.append(cleared_row)
                    completed_count += 1

        comparison_data['new_orders_count'] = new_count
        comparison_data['completed_orders_count'] = completed_count
        comparison_data['partially_dispatched_count'] = partial_count
        comparison_data['unchanged_orders_count'] = unchanged_count
        comparison_data['completed_removed_orders'] = completed_removed

    summary = {
        'total_orders': len(enriched_rows),
        'total_pending_bags': float(total_pending_bags),
        'total_dispatched_bags': float(total_dispatch_bags),
        'total_order_bags': float(total_order_bags),
        'matched_parties_count': matched_parties_count,
        'new_parties_count': new_parties_count,
        'aging': {
            'less_15_days': aging_less_15,
            'between_15_30_days': aging_15_30,
            'over_30_days': aging_over_30,
        },
        'comparison': comparison_data,
    }

    return enriched_rows, summary, comparison_data, raw_text
