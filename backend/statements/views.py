from rest_framework import views, permissions, status
from rest_framework.response import Response
from django.db import transaction
from decimal import Decimal
import hashlib
import os

from .models import UploadedStatement, PartyAlias
from .pdf_parser import extract_pdf_data
from sellers.models import Seller
from buyers.models import Buyer
from products.models import Product, Category
from deals.models import Deal
from recoveries.models import RecoveryRecord


def match_party(raw_name, city=""):
    """
    3-tier party resolver:
    1. Check PartyAlias table (remembered mappings)
    2. Check exact match on Buyer.company_name
    3. Check substring / normalized match
    Returns (matched_buyer, confidence)
    """
    if not raw_name:
        return None, 0.0

    clean_raw = raw_name.strip()

    # Tier 1: Check saved alias
    alias = PartyAlias.objects.filter(raw_name__iexact=clean_raw).select_related('buyer').first()
    if alias and alias.buyer:
        return alias.buyer, 1.0

    # Tier 2: Check exact match
    exact = Buyer.objects.filter(company_name__iexact=clean_raw).first()
    if exact:
        return exact, 0.95

    # If city is combined, try stripping city
    if city and clean_raw.lower().endswith(city.lower()):
        stripped = clean_raw[:-len(city)].strip()
        exact_stripped = Buyer.objects.filter(company_name__iexact=stripped).first()
        if exact_stripped:
            return exact_stripped, 0.90

    # Tier 3: Substring / partial match
    lower_raw = clean_raw.lower()
    for buyer in Buyer.objects.all():
        b_name = buyer.company_name.lower()
        if b_name == lower_raw:
            return buyer, 0.95
        if b_name in lower_raw or lower_raw in b_name:
            return buyer, 0.75

    return None, 0.0


class UploadAndExtractStatementView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        uploaded_file = request.FILES.get('file')
        seller_id = request.data.get('seller_id')

        if not uploaded_file:
            return Response({'error': 'No file was provided.'}, status=status.HTTP_400_BAD_REQUEST)

        if not uploaded_file.name.lower().endswith('.pdf'):
            return Response({'error': 'Only PDF files are supported.'}, status=status.HTTP_400_BAD_REQUEST)

        # Compute SHA-256 hash of file contents
        file_bytes = uploaded_file.read()
        uploaded_file.seek(0)
        file_hash = hashlib.sha256(file_bytes).hexdigest()

        # Check for duplicate previously uploaded file
        existing = UploadedStatement.objects.filter(file_hash=file_hash).first()
        is_duplicate = False
        duplicate_msg = ''
        if existing:
            is_duplicate = True
            duplicate_msg = f"Notice: This exact file was already uploaded on {existing.uploaded_at.strftime('%d-%m-%Y')} as '{existing.filename}' (Status: {existing.status})."

        seller = None
        if seller_id:
            try:
                seller = Seller.objects.get(id=seller_id)
            except Seller.DoesNotExist:
                pass

        statement = UploadedStatement.objects.create(
            seller=seller,
            seller_name=seller.company_name if seller else '',
            file=uploaded_file,
            filename=uploaded_file.name,
            file_size=uploaded_file.size,
            file_hash=file_hash,
            status=UploadedStatement.STATUS_PENDING
        )

        try:
            result = extract_pdf_data(statement.file.path)
            raw_records = result.get('records', [])
            statement.raw_text = result.get('raw_text', '')
            statement.error_details = result.get('debug_info', '')
            stmt_type = result.get('statement_type', 'GENERAL')
            statement.statement_type = stmt_type

            # Check if company detected in PDF
            detected_company_name = result.get('detected_company', '').strip()
            if detected_company_name and not seller:
                matched_seller = Seller.objects.filter(company_name__iexact=detected_company_name).first()
                if not matched_seller:
                    for s in Seller.objects.all():
                        if s.company_name.lower() in detected_company_name.lower() or detected_company_name.lower() in s.company_name.lower():
                            matched_seller = s
                            break
                if not matched_seller:
                    matched_seller = Seller.objects.create(
                        company_name=detected_company_name,
                        address='Extracted from statement header',
                        phone='9999999999',
                        whatsapp='9999999999',
                        email='office@' + detected_company_name.lower().replace(' ', '').replace('.', '')[:12] + '.com'
                    )
                seller = matched_seller
                statement.seller = seller
                statement.seller_name = seller.company_name

            # Run party matching on every record
            enriched_records = []
            for r in raw_records:
                buyer_str = str(r.get('buyer_name', '')).strip()
                city_str = str(r.get('city', '')).strip()
                matched_buyer, conf = match_party(buyer_str, city_str)
                r_copy = dict(r)
                r_copy['matched_buyer_id'] = matched_buyer.id if matched_buyer else None
                r_copy['matched_buyer_name'] = matched_buyer.company_name if matched_buyer else ''
                r_copy['match_confidence'] = conf
                enriched_records.append(r_copy)

            statement.extracted_data = enriched_records
            statement.status = UploadedStatement.STATUS_EXTRACTED
            summary_info = {
                'records_count': len(enriched_records),
                'total_amount': float(result.get('total_amount', 0.0)),
                'printed_grand_total': float(result.get('printed_grand_total', 0.0)),
                'statement_type': stmt_type,
                'detected_company': detected_company_name,
                'is_duplicate': is_duplicate,
                'duplicate_notice': duplicate_msg
            }
            statement.summary = summary_info
            statement.save()

            return Response({
                'success': True,
                'statement_id': statement.id,
                'file_hash': file_hash,
                'is_duplicate': is_duplicate,
                'duplicate_notice': duplicate_msg,
                'seller_id': seller.id if seller else None,
                'seller_name': seller.company_name if seller else detected_company_name,
                'detected_company': detected_company_name,
                'statement_type': stmt_type,
                'columns': result.get('columns', []),
                'filename': statement.filename,
                'records_count': len(enriched_records),
                'total_amount': float(result.get('total_amount', 0.0)),
                'printed_grand_total': float(result.get('printed_grand_total', 0.0)),
                'records': enriched_records,
                'raw_text': result.get('raw_text', ''),
                'message': f"Successfully extracted {len(enriched_records)} records from {statement.filename}."
            })
        except Exception as e:
            statement.status = UploadedStatement.STATUS_FAILED
            statement.error_details = str(e)
            statement.save()
            return Response({
                'success': False,
                'error': f"PDF Extraction Error: {str(e)}",
                'statement_id': statement.id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SaveVerifiedRecordsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            statement = UploadedStatement.objects.get(pk=pk)
        except UploadedStatement.DoesNotExist:
            return Response({'error': 'Statement record not found'}, status=status.HTTP_404_NOT_FOUND)

        records = request.data.get('records', [])
        if not records:
            return Response({'error': 'No records provided to save'}, status=status.HTTP_400_BAD_REQUEST)

        save_target = request.data.get('target', 'AUTO')  # 'DEALS', 'RECOVERIES', or 'AUTO'
        target_seller_id = request.data.get('seller_id')
        seller = None
        if target_seller_id:
            try:
                seller = Seller.objects.get(id=target_seller_id)
            except Seller.DoesNotExist:
                pass
        if not seller:
            seller = statement.seller

        seller_name = seller.company_name if seller else (statement.seller_name or 'Jalaram Mill Partner')

        # Auto-create fallback category
        default_cat, _ = Category.objects.get_or_create(name='Cattle Feed / પશુ આહાર')

        saved_deals = 0
        saved_recoveries = 0
        skipped = 0

        with transaction.atomic():
            for row in records:
                bill_no = str(row.get('bill_number', '')).strip()
                raw_buyer_str = str(row.get('buyer_name', '')).strip()
                buyer_id = row.get('buyer_id') or row.get('matched_buyer_id')
                city = str(row.get('city', '')).strip()
                bill_date = row.get('bill_date')
                item_desc = str(row.get('item_desc', '')).strip() or 'Cotton Cake / Cattle Feed'
                qty = int(Decimal(str(row.get('qty', 0) or 0)))
                rate = Decimal(str(row.get('rate', 0) or 0))
                amount = Decimal(str(row.get('pending_amount', 0) or row.get('billed_amount', 0) or 0))

                if not bill_no or not raw_buyer_str:
                    continue

                # 1. Resolve Buyer: use buyer_id if provided, else company_name, else create new
                buyer_obj = None
                if buyer_id:
                    buyer_obj = Buyer.objects.filter(id=buyer_id).first()

                if not buyer_obj:
                    buyer_obj = Buyer.objects.filter(company_name__iexact=raw_buyer_str).first()

                if not buyer_obj:
                    buyer_obj = Buyer.objects.create(
                        company_name=raw_buyer_str,
                        address=f"{city}, Gujarat" if city else "Gujarat",
                        phone="9898000000",
                        whatsapp="9898000000",
                        email=f"contact@{raw_buyer_str.lower().replace(' ', '')[:10]}.in"
                    )

                # 2. Save alias mapping so subsequent imports recognize this name
                if raw_buyer_str and raw_buyer_str.lower() != buyer_obj.company_name.lower():
                    PartyAlias.objects.get_or_create(
                        raw_name=raw_buyer_str,
                        defaults={'buyer': buyer_obj}
                    )

                # Determine target: Sauda deals or recovery bills
                stmt_type = statement.statement_type
                if save_target == 'DEALS' or (save_target == 'AUTO' and stmt_type == 'SAUDA_REGISTER'):
                    # Save as Sauda Deal
                    if Deal.objects.filter(deal_number=bill_no).exists():
                        skipped += 1
                        continue

                    # Product lookup or auto-creation
                    prod_obj = Product.objects.filter(name__iexact=item_desc).first()
                    if not prod_obj:
                        prod_obj = Product.objects.create(
                            name=item_desc,
                            category=default_cat,
                            seller=seller,
                            packaging=str(row.get('pkg', '50 kg Bag')),
                            price=rate if rate > 0 else Decimal('1500.00'),
                            price_unit='Per Bag'
                        )

                    Deal.objects.create(
                        statement=statement,
                        deal_number=bill_no,
                        date=bill_date,
                        seller=seller,
                        seller_name=seller_name,
                        buyer=buyer_obj,
                        buyer_name=buyer_obj.company_name,
                        buyer_city=city,
                        product=prod_obj,
                        product_name=item_desc,
                        packaging=str(row.get('pkg', '50 kg Bag')),
                        quantity=qty,
                        rate=rate,
                        rate_unit='Per Bag',
                        gross_amount=amount,
                        brokerage_type='PER_UNIT',
                        brokerage_rate=Decimal('5.00'),
                        brokerage_from='SELLER',
                        brokerage_total=Decimal(qty) * Decimal('5.00'),
                        status='BOOKED',
                        delivery_terms=city or 'Gujarat Station',
                        notes='Imported from PDF Statement: ' + statement.filename
                    )
                    saved_deals += 1

                    # Also create corresponding recovery record linked to statement
                    if not RecoveryRecord.objects.filter(bill_number=bill_no, seller=seller).exists():
                        RecoveryRecord.objects.create(
                            statement=statement,
                            seller=seller,
                            seller_name=seller_name,
                            buyer=buyer_obj,
                            buyer_name=buyer_obj.company_name,
                            buyer_city=city,
                            buyer_phone=buyer_obj.whatsapp or buyer_obj.phone,
                            bill_number=bill_no,
                            bill_date=bill_date,
                            due_days=buyer_obj.credit_days or 15,
                            billed_amount=amount,
                            balance_amount=amount,
                            status='PENDING',
                            notes=item_desc
                        )
                        saved_recoveries += 1

                else:
                    # Save as Recovery Record with duplicate check
                    if RecoveryRecord.objects.filter(bill_number=bill_no, seller=seller, bill_date=bill_date).exists():
                        skipped += 1
                        continue

                    due_days = int(row.get('due_days', buyer_obj.credit_days or 15) or 15)
                    RecoveryRecord.objects.create(
                        statement=statement,
                        seller=seller,
                        seller_name=seller_name,
                        buyer=buyer_obj,
                        buyer_name=buyer_obj.company_name,
                        buyer_city=city,
                        buyer_phone=buyer_obj.whatsapp or buyer_obj.phone,
                        bill_number=bill_no,
                        bill_date=bill_date,
                        due_days=due_days,
                        billed_amount=Decimal(str(row.get('billed_amount', amount))),
                        balance_amount=amount,
                        status='PENDING',
                        notes=item_desc
                    )
                    saved_recoveries += 1

            statement.status = UploadedStatement.STATUS_SAVED
            statement.save()

        msg = f"Successfully imported: {saved_deals} Sauda Deals, {saved_recoveries} Recovery Bills. ({skipped} skipped duplicates)."
        return Response({
            'success': True,
            'saved_deals': saved_deals,
            'saved_recoveries': saved_recoveries,
            'skipped': skipped,
            'message': msg
        })


class RollbackStatementView(views.APIView):
    """
    1-Click Rollback: Deletes all Deals and Recovery Bills imported from this statement,
    and marks the statement status as ROLLED_BACK.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            statement = UploadedStatement.objects.get(pk=pk)
        except UploadedStatement.DoesNotExist:
            return Response({'error': 'Statement not found'}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            deals_deleted = statement.deals.all().delete()[0]
            recoveries_deleted = statement.recovery_records.all().delete()[0]

            statement.status = UploadedStatement.STATUS_ROLLED_BACK
            statement.save()

        return Response({
            'success': True,
            'message': f"Statement #{statement.id} '{statement.filename}' rolled back successfully. Removed {deals_deleted} Deals and {recoveries_deleted} Recovery Bills.",
            'deals_deleted': deals_deleted,
            'recoveries_deleted': recoveries_deleted
        })


class PartyAliasView(views.APIView):
    """
    Endpoint to view and create party alias mappings.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        aliases = PartyAlias.objects.select_related('buyer', 'seller').all()[:100]
        data = [{
            'id': a.id,
            'raw_name': a.raw_name,
            'buyer_id': a.buyer.id if a.buyer else None,
            'buyer_name': a.buyer.company_name if a.buyer else '',
            'created_at': a.created_at
        } for a in aliases]
        return Response(data)

    def post(self, request):
        raw_name = request.data.get('raw_name', '').strip()
        buyer_id = request.data.get('buyer_id')

        if not raw_name or not buyer_id:
            return Response({'error': 'raw_name and buyer_id are required'}, status=status.HTTP_400_BAD_REQUEST)

        buyer = Buyer.objects.filter(id=buyer_id).first()
        if not buyer:
            return Response({'error': 'Buyer not found'}, status=status.HTTP_404_NOT_FOUND)

        alias, created = PartyAlias.objects.update_or_create(
            raw_name=raw_name,
            defaults={'buyer': buyer}
        )

        return Response({
            'success': True,
            'id': alias.id,
            'raw_name': alias.raw_name,
            'buyer_id': buyer.id,
            'buyer_name': buyer.company_name,
            'created': created
        })


class StatementListView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        statements = UploadedStatement.objects.all()[:50]
        data = [{
            'id': s.id,
            'filename': s.filename,
            'file_size': s.file_size,
            'file_hash': s.file_hash,
            'statement_type': s.statement_type,
            'seller_name': s.seller_name,
            'status': s.status,
            'uploaded_at': s.uploaded_at,
            'summary': s.summary
        } for s in statements]
        return Response(data)
