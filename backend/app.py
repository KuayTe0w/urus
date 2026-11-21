"""URUS inventory API. All business data is scoped to an authenticated membership."""
import os
import json
from pathlib import Path
from decimal import Decimal, InvalidOperation
from functools import wraps
from datetime import date, datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
import cachecontrol
import requests
from flask import Flask, g, jsonify, request, send_from_directory
from flask.json.provider import DefaultJSONProvider
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError
from werkzeug.exceptions import HTTPException


def create_app(config=None):
    app = Flask(__name__)
    class JSONProvider(DefaultJSONProvider):
        @staticmethod
        def default(value):
            if isinstance(value, (date, datetime)):
                return value.isoformat()
            return DefaultJSONProvider.default(value)
    app.json = JSONProvider(app)
    app.config.update(DATABASE_URL=os.getenv('DATABASE_URL'), FIREBASE_PROJECT_ID=os.getenv('FIREBASE_PROJECT_ID'), FIREBASE_WEB_CONFIG=os.getenv('FIREBASE_WEB_CONFIG', '{}'))
    if config:
        app.config.update(config)
    if not app.config['DATABASE_URL']:
        raise RuntimeError('DATABASE_URL is required')
    engine = create_engine(app.config['DATABASE_URL'], pool_pre_ping=True)
    app.extensions['db_engine'] = engine
    certificate_session = cachecontrol.CacheControl(requests.Session())
    certificate_request = google_requests.Request(session=certificate_session)

    @app.get('/api/config')
    def frontend_config():
        try:
            config = json.loads(app.config['FIREBASE_WEB_CONFIG'])
        except (ValueError, TypeError):
            return jsonify(error='Invalid Firebase web configuration'), 503
        if not isinstance(config, dict) or not config.get('apiKey') or not config.get('projectId') or not config.get('authDomain'):
            return jsonify(error='Firebase web configuration is missing'), 503
        return jsonify(config)

    @app.get('/')
    def home():
        return send_from_directory(Path(__file__).resolve().parents[1] / 'frontend', 'index.html')

    @app.get('/<any(inventory.html, dashboard.html, orders.html, reports.html, onboarding.html, settings.html, suppliers.html, movements.html):page>')
    def page(page):
        return send_from_directory(Path(__file__).resolve().parents[1] / 'frontend', page)

    @app.get('/assets/<path:filename>')
    def assets(filename):
        return send_from_directory(Path(__file__).resolve().parents[1] / 'frontend' / 'assets', filename)

    def authenticate(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            header = request.headers.get('Authorization', '')
            if not header.startswith('Bearer '):
                return jsonify(error='Authentication required'), 401
            try:
                verifier = app.config.get('TOKEN_VERIFIER')
                if verifier:
                    claims = verifier(header[7:])
                else:
                    if not app.config['FIREBASE_PROJECT_ID']:
                        raise RuntimeError('Firebase project ID is not configured')
                    claims = id_token.verify_firebase_token(header[7:], certificate_request, audience=app.config['FIREBASE_PROJECT_ID'])
                uid = claims.get('uid') or claims['sub']
            except (ValueError, KeyError):
                return jsonify(error='Invalid authentication token'), 401
            except Exception:
                app.logger.exception('Firebase token verification failed')
                return jsonify(error='Authentication service unavailable'), 503
            if not isinstance(uid, str) or not uid or len(uid) > 128:
                return jsonify(error='Invalid authentication token'), 401
            with engine.begin() as conn:
                user = conn.execute(text('SELECT id FROM users WHERE firebase_uid=:uid'), {'uid': uid}).mappings().first()
                if not user:
                    conn.execute(text('INSERT INTO users (firebase_uid) VALUES (:uid) ON CONFLICT (firebase_uid) DO NOTHING'), {'uid': uid})
                    user = conn.execute(text('SELECT id FROM users WHERE firebase_uid=:uid'), {'uid': uid}).mappings().one()
            g.user_id = user['id']
            return fn(*args, **kwargs)
        return wrapper

    def scoped(fn):
        @authenticate
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                business_id = int(request.headers.get('X-Business-ID', ''))
            except ValueError:
                return jsonify(error='X-Business-ID is required'), 400
            with engine.connect() as conn:
                membership = conn.execute(text('SELECT 1 FROM business_memberships WHERE business_id=:b AND user_id=:u'), {'b': business_id, 'u': g.user_id}).first()
            if not membership:
                return jsonify(error='Forbidden'), 403
            g.business_id = business_id
            return fn(*args, **kwargs)
        return wrapper

    @app.errorhandler(ValueError)
    def bad_request(error):
        return jsonify(error=str(error)), 400

    @app.errorhandler(IntegrityError)
    def conflict(error):
        return jsonify(error='Duplicate value or invalid reference'), 409

    @app.errorhandler(HTTPException)
    def http_error(error):
        if request.path.startswith('/api/'):
            return jsonify(error=error.description), error.code
        return error

    @app.errorhandler(Exception)
    def server_error(error):
        app.logger.exception('Unhandled request error')
        return jsonify(error='Internal server error'), 500

    def body():
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            raise ValueError('Expected a JSON object')
        return data

    def number(value, name, positive=False):
        try:
            n = Decimal(str(value))
            if not n.is_finite() or n < 0 or (positive and n == 0) or n.as_tuple().exponent < -2 or n >= Decimal('10000000000000000'):
                raise ValueError()
            return n
        except (InvalidOperation, ValueError):
            raise ValueError(f'Invalid {name}')

    def required(data, key):
        value = data.get(key)
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f'{key} is required')
        return value.strip()

    @app.get('/api/v1/me')
    @authenticate
    def me():
        with engine.connect() as conn:
            rows = conn.execute(text('SELECT b.id, b.name, b.currency, b.timezone, m.role FROM businesses b JOIN business_memberships m ON m.business_id=b.id WHERE m.user_id=:u ORDER BY b.id'), {'u': g.user_id}).mappings().all()
        return jsonify(user_id=g.user_id, businesses=[dict(r) for r in rows])

    @app.post('/api/v1/businesses')
    @authenticate
    def create_business():
        data = body()
        name = required(data, 'name')
        currency = required(data, 'currency').upper()
        timezone = required(data, 'timezone')
        if len(name) > 120:
            raise ValueError('Business name must be 120 characters or fewer')
        if currency not in {'BND', 'IDR', 'KHR', 'LAK', 'MMK', 'MYR', 'PHP', 'SGD', 'THB', 'VND', 'USD'}:
            raise ValueError('Unsupported currency')
        try:
            ZoneInfo(timezone)
        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError('Invalid time zone')
        with engine.begin() as conn:
            business = conn.execute(text('INSERT INTO businesses (name, currency, timezone) VALUES (:name, :currency, :timezone) RETURNING id, name, currency, timezone'), {'name': name, 'currency': currency, 'timezone': timezone}).mappings().one()
            conn.execute(text("INSERT INTO business_memberships (business_id, user_id, role) VALUES (:b, :u, 'owner')"), {'b': business['id'], 'u': g.user_id})
        return jsonify({**dict(business), 'role': 'owner'}), 201

    @app.patch('/api/v1/businesses/<int:business_id>')
    @authenticate
    def update_business(business_id):
        data = body()
        name = required(data, 'name')
        currency = required(data, 'currency').upper()
        timezone = required(data, 'timezone')
        if len(name) > 120:
            raise ValueError('Business name must be 120 characters or fewer')
        if currency not in {'BND', 'IDR', 'KHR', 'LAK', 'MMK', 'MYR', 'PHP', 'SGD', 'THB', 'VND', 'USD'}:
            raise ValueError('Unsupported currency')
        try:
            ZoneInfo(timezone)
        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError('Invalid time zone')
        with engine.begin() as conn:
            member = conn.execute(text('SELECT role FROM business_memberships WHERE business_id=:b AND user_id=:u'), {'b':business_id,'u':g.user_id}).scalar_one_or_none()
            if member != 'owner':
                return jsonify(error='Only the business owner can change settings'), 403
            row = conn.execute(text('UPDATE businesses SET name=:name,currency=:currency,timezone=:timezone WHERE id=:b RETURNING id,name,currency,timezone'), {'name':name,'currency':currency,'timezone':timezone,'b':business_id}).mappings().one()
        return jsonify(dict(row))

    @app.route('/api/v1/<kind>', methods=['GET', 'POST'])
    @scoped
    def master(kind):
        if kind not in ('categories', 'suppliers'):
            return jsonify(error='Not found'), 404
        with engine.begin() as conn:
            if request.method == 'POST':
                data = body(); name = required(data, 'name')
                params = {'b': g.business_id, 'name': name}
                if kind == 'suppliers':
                    for field in ('contact_name', 'phone', 'email', 'address', 'notes'):
                        value = data.get(field)
                        if value is not None and not isinstance(value, str): raise ValueError(f'Invalid {field}')
                        if value and len(value.strip()) > 1000: raise ValueError(f'{field} is too long')
                        params[field] = value.strip() if value and value.strip() else None
                    row = conn.execute(text('INSERT INTO suppliers (business_id,name,contact_name,phone,email,address,notes) VALUES (:b,:name,:contact_name,:phone,:email,:address,:notes) RETURNING id,name'), params).mappings().one()
                else:
                    row = conn.execute(text('INSERT INTO categories (business_id,name) VALUES (:b,:name) RETURNING id,name'), params).mappings().one()
                return jsonify(dict(row)), 201
            fields = 'id,name,contact_name,phone,email,address,notes,archived_at' if kind == 'suppliers' else 'id,name'
            rows = conn.execute(text(f'SELECT {fields} FROM {kind} WHERE business_id=:b ORDER BY name'), {'b': g.business_id}).mappings().all()
            return jsonify([dict(r) for r in rows])

    @app.route('/api/v1/suppliers/<int:supplier_id>', methods=['GET', 'PATCH', 'DELETE'])
    @scoped
    def supplier_detail(supplier_id):
        params = {'b': g.business_id, 'id': supplier_id}
        with engine.begin() as conn:
            row = conn.execute(text('SELECT * FROM suppliers WHERE business_id=:b AND id=:id FOR UPDATE'), params).mappings().first()
            if not row: return jsonify(error='Not found'), 404
            if request.method == 'GET':
                items = conn.execute(text('SELECT p.id,p.name,p.sku,p.stock,p.unit FROM products p JOIN product_suppliers ps ON ps.business_id=p.business_id AND ps.product_id=p.id WHERE ps.business_id=:b AND ps.supplier_id=:id AND p.archived_at IS NULL ORDER BY p.name'), params).mappings().all()
                return jsonify(supplier=dict(row), products=[dict(item) for item in items])
            if request.method == 'DELETE':
                conn.execute(text('UPDATE suppliers SET archived_at=COALESCE(archived_at,now()) WHERE business_id=:b AND id=:id'), params)
                return '', 204
            data = body()
            if row['archived_at'] is not None: return jsonify(error='Archived supplier cannot be edited'), 409
            params['name'] = required(data, 'name')
            for field in ('contact_name', 'phone', 'email', 'address', 'notes'):
                value = data.get(field)
                if value is not None and not isinstance(value, str): raise ValueError(f'Invalid {field}')
                if value and len(value.strip()) > 1000: raise ValueError(f'{field} is too long')
                params[field] = value.strip() if value and value.strip() else None
            updated = conn.execute(text('UPDATE suppliers SET name=:name,contact_name=:contact_name,phone=:phone,email=:email,address=:address,notes=:notes WHERE business_id=:b AND id=:id RETURNING *'), params).mappings().one()
            return jsonify(dict(updated))

    @app.post('/api/v1/suppliers/<int:supplier_id>/restore')
    @scoped
    def restore_supplier(supplier_id):
        with engine.begin() as conn:
            row = conn.execute(text('UPDATE suppliers SET archived_at=NULL WHERE business_id=:b AND id=:id RETURNING id,name,archived_at'), {'b':g.business_id,'id':supplier_id}).mappings().first()
        if not row: return jsonify(error='Not found'), 404
        return jsonify(dict(row))

    @app.route('/api/v1/products/<int:product_id>/suppliers/<int:supplier_id>', methods=['PUT', 'DELETE'])
    @scoped
    def product_supplier(product_id, supplier_id):
        params = {'b':g.business_id, 'product':product_id, 'supplier':supplier_id}
        with engine.begin() as conn:
            product = conn.execute(text('SELECT supplier_id,archived_at FROM products WHERE business_id=:b AND id=:product FOR UPDATE'), params).mappings().first()
            supplier = conn.execute(text('SELECT archived_at FROM suppliers WHERE business_id=:b AND id=:supplier FOR UPDATE'), params).mappings().first()
            if not product or not supplier: return jsonify(error='Product or supplier not found'),404
            if request.method == 'PUT':
                if product['archived_at'] or supplier['archived_at']: return jsonify(error='Product or supplier is archived'),409
                conn.execute(text('INSERT INTO product_suppliers (business_id,product_id,supplier_id) VALUES (:b,:product,:supplier) ON CONFLICT DO NOTHING'), params)
            else:
                if product['supplier_id'] == supplier_id: return jsonify(error='Cannot remove the primary supplier'),409
                conn.execute(text('DELETE FROM product_suppliers WHERE business_id=:b AND product_id=:product AND supplier_id=:supplier'),params)
        return '',204

    @app.route('/api/v1/purchase-orders', methods=['GET', 'POST'])
    @scoped
    def purchase_orders():
        with engine.begin() as conn:
            if request.method == 'GET':
                rows = conn.execute(text('''SELECT o.id,o.status,o.created_at,o.received_at,s.name AS supplier_name,
                    COALESCE(sum(i.quantity*i.unit_cost),0) AS total FROM purchase_orders o
                    JOIN suppliers s ON s.business_id=o.business_id AND s.id=o.supplier_id
                    JOIN purchase_order_items i ON i.order_id=o.id AND i.business_id=o.business_id
                    WHERE o.business_id=:b GROUP BY o.id,s.name ORDER BY o.id DESC LIMIT 500'''), {'b':g.business_id}).mappings().all()
                return jsonify([dict(row) for row in rows])
            data=body()
            try: supplier_id=int(data.get('supplier_id'))
            except (TypeError,ValueError): raise ValueError('Invalid supplier')
            lines=data.get('items')
            if not isinstance(lines,list) or not 1 <= len(lines) <= 100: raise ValueError('Order requires 1 to 100 items')
            supplier=conn.execute(text('SELECT id FROM suppliers WHERE business_id=:b AND id=:id AND archived_at IS NULL'), {'b':g.business_id,'id':supplier_id}).first()
            if not supplier: raise ValueError('Supplier not found or archived')
            normalized=[]; seen=set()
            for item in lines:
                if not isinstance(item,dict): raise ValueError('Invalid order item')
                try: product_id=int(item.get('product_id'))
                except (TypeError,ValueError): raise ValueError('Invalid product')
                if product_id in seen: raise ValueError('Duplicate product in order')
                seen.add(product_id)
                product=conn.execute(text('SELECT id FROM products WHERE business_id=:b AND id=:id AND archived_at IS NULL'), {'b':g.business_id,'id':product_id}).first()
                if not product: raise ValueError('Product not found or archived')
                linked=conn.execute(text('SELECT 1 FROM product_suppliers WHERE business_id=:b AND supplier_id=:s AND product_id=:p'), {'b':g.business_id,'s':supplier_id,'p':product_id}).first()
                if not linked: raise ValueError('Product is not linked to this supplier')
                normalized.append({'product_id':product_id,'quantity':number(item.get('quantity'),'quantity',True),'unit_cost':number(item.get('unit_cost'),'unit_cost')})
            order_id=conn.execute(text('INSERT INTO purchase_orders(business_id,supplier_id,created_by) VALUES (:b,:s,:u) RETURNING id'), {'b':g.business_id,'s':supplier_id,'u':g.user_id}).scalar_one()
            for item in normalized:
                conn.execute(text('INSERT INTO purchase_order_items(business_id,order_id,product_id,quantity,unit_cost) VALUES (:b,:o,:product_id,:quantity,:unit_cost)'), dict(item,b=g.business_id,o=order_id))
            return jsonify(id=order_id,status='pending'),201

    @app.get('/api/v1/purchase-orders/<int:order_id>')
    @scoped
    def purchase_order(order_id):
        params={'b':g.business_id,'id':order_id}
        with engine.connect() as conn:
            order=conn.execute(text('SELECT o.*,s.name AS supplier_name FROM purchase_orders o JOIN suppliers s ON s.business_id=o.business_id AND s.id=o.supplier_id WHERE o.business_id=:b AND o.id=:id'),params).mappings().first()
            if not order: return jsonify(error='Not found'),404
            items=conn.execute(text('SELECT i.id,i.product_id,i.quantity,i.unit_cost,p.name,p.sku,p.unit FROM purchase_order_items i JOIN products p ON p.business_id=i.business_id AND p.id=i.product_id WHERE i.business_id=:b AND i.order_id=:id ORDER BY i.id'),params).mappings().all()
        return jsonify(order=dict(order),items=[dict(item) for item in items])

    @app.post('/api/v1/purchase-orders/<int:order_id>/receive')
    @scoped
    def receive_purchase_order(order_id):
        params={'b':g.business_id,'id':order_id,'actor':g.user_id}
        with engine.begin() as conn:
            order=conn.execute(text('SELECT status FROM purchase_orders WHERE business_id=:b AND id=:id FOR UPDATE'),params).mappings().first()
            if not order: return jsonify(error='Not found'),404
            if order['status'] != 'pending': return jsonify(error='Order has already been received'),409
            items=conn.execute(text('SELECT product_id,quantity FROM purchase_order_items WHERE business_id=:b AND order_id=:id ORDER BY product_id'),params).mappings().all()
            for item in items:
                p=dict(params,product=item['product_id'],quantity=item['quantity'])
                result=conn.execute(text('UPDATE products SET stock=stock+:quantity,updated_at=now() WHERE business_id=:b AND id=:product AND archived_at IS NULL RETURNING id'),p).first()
                if not result: raise ValueError('Cannot receive an order containing an archived product')
                conn.execute(text("INSERT INTO stock_movements (business_id,product_id,actor_id,quantity_delta,reason,purchase_order_id) VALUES (:b,:product,:actor,:quantity,'Supplier Delivery',:id)"),p)
            conn.execute(text("UPDATE purchase_orders SET status='received',received_at=now() WHERE business_id=:b AND id=:id"),params)
        return jsonify(id=order_id,status='received')

    @app.get('/api/v1/movements')
    @scoped
    def all_movements():
        params = {'b':g.business_id}
        try:
            params['limit'] = int(request.args.get('limit', 200))
            params['offset'] = int(request.args.get('offset', 0))
            if not 1 <= params['limit'] <= 500 or params['offset'] < 0: raise ValueError()
        except ValueError:
            raise ValueError('Invalid pagination')
        query = '''SELECT m.id,m.created_at,m.quantity_delta,m.reason,m.actor_id,u.email,p.name,p.sku,p.unit
                   FROM stock_movements m JOIN products p ON p.business_id=m.business_id AND p.id=m.product_id
                   JOIN users u ON u.id=m.actor_id WHERE m.business_id=:b'''
        for key, op in (('from', '>='), ('to', '<')):
            value = request.args.get(key)
            if value:
                try: parsed = date.fromisoformat(value)
                except ValueError: raise ValueError(f'Invalid {key} date')
                if key == 'to':
                    from datetime import timedelta
                    parsed += timedelta(days=1)
                query += f' AND m.created_at {op} (CAST(:{key} AS date)::timestamp AT TIME ZONE (SELECT timezone FROM businesses WHERE id=:b))'
                params[key] = parsed
        rows = None
        with engine.connect() as conn:
            rows = conn.execute(text(query + ' ORDER BY m.created_at DESC,m.id DESC LIMIT :limit OFFSET :offset'), params).mappings().all()
        return jsonify([dict(row) for row in rows])

    def clean_product(data):
        from datetime import date
        result = {k: required(data, k) for k in ('name', 'sku', 'unit')}
        for key in ('category_id', 'supplier_id'):
            try:
                result[key] = int(data[key])
                if result[key] <= 0: raise ValueError()
            except (KeyError, ValueError, TypeError):
                raise ValueError(f'Invalid {key}')
        for key in ('stock', 'reorder_level', 'cost_price'):
            result[key] = number(data.get(key), key)
        try:
            expiry = data.get('expiry_date')
            result['expiry_date'] = expiry if isinstance(expiry, date) else date.fromisoformat(expiry) if expiry else None
        except (TypeError, ValueError):
            raise ValueError('Invalid expiry_date')
        return result

    def validate_import(conn, rows):
        if not isinstance(rows, list) or not rows or len(rows) > 5000:
            raise ValueError('rows must contain between 1 and 5000 items')
        existing = {r[0].strip().lower() for r in conn.execute(text('SELECT sku FROM products WHERE business_id=:b'), {'b': g.business_id})}
        seen = set()
        validated, errors = [], []
        for index, row in enumerate(rows, 1):
            try:
                if not isinstance(row, dict):
                    raise ValueError('Expected a JSON object')
                category = required(row, 'category')
                supplier = required(row, 'supplier')
                if len(category) > 60 or len(supplier) > 100:
                    raise ValueError('Category or supplier name is too long')
                normalized = dict(row, category_id=1, supplier_id=1)
                p = clean_product(normalized)
                if p['unit'] not in ('pcs', 'cartons', 'boxes', 'bags', 'bottles', 'kg', 'g', 'litres', 'ml', 'trays', 'packs'):
                    raise ValueError('Invalid unit')
                sku = p['sku'].lower()
                if sku in existing or sku in seen:
                    raise ValueError('SKU already exists or is duplicated in the import')
                seen.add(sku)
                p.update(category=category, supplier=supplier)
                validated.append(p)
            except ValueError as error:
                errors.append({'row': index, 'error': str(error)})
        return validated, errors

    @app.post('/api/v1/imports/products/<operation>')
    @scoped
    def import_products(operation):
        if operation not in ('preview', 'commit'):
            return jsonify(error='Not found'), 404
        rows = body().get('rows')
        with engine.begin() as conn:
            valid, errors = validate_import(conn, rows)
            if operation == 'preview':
                return jsonify(total=len(rows), valid=len(valid), errors=errors)
            if errors:
                return jsonify(error='Import validation failed', errors=errors), 400
            for p in valid:
                p.update(b=g.business_id, actor=g.user_id)
                for table, key in (('categories', 'category'), ('suppliers', 'supplier')):
                    conn.execute(text(f'INSERT INTO {table} (business_id,name) VALUES (:b, :name) ON CONFLICT DO NOTHING'), {'b': g.business_id, 'name': p[key]})
                    p[key + '_id'] = conn.execute(text(f'SELECT id FROM {table} WHERE business_id=:b AND lower(trim(name))=lower(trim(:name))'), {'b': g.business_id, 'name': p[key]}).scalar_one()
                archived = conn.execute(text('SELECT archived_at FROM suppliers WHERE business_id=:b AND id=:supplier_id'), p).scalar_one()
                if archived is not None: raise ValueError('An imported supplier is archived')
                product_id = conn.execute(text('''INSERT INTO products (business_id,name,sku,category_id,supplier_id,unit,stock,reorder_level,cost_price,expiry_date)
                    VALUES (:b,:name,:sku,:category_id,:supplier_id,:unit,:stock,:reorder_level,:cost_price,:expiry_date) RETURNING id'''), p).scalar_one()
                if p['stock']:
                    conn.execute(text("INSERT INTO stock_movements (business_id,product_id,actor_id,quantity_delta,reason) VALUES (:b,:id,:actor,:stock,'Initial stock')"), dict(p, id=product_id))
            return jsonify(imported=len(valid)), 201

    def set_product_suppliers(conn, product_id, primary_id, values):
        if values is None: return
        if not isinstance(values, list) or len(values) > 100: raise ValueError('Invalid suppliers')
        try: ids = {int(value) for value in values} | {primary_id}
        except (ValueError, TypeError): raise ValueError('Invalid suppliers')
        existing = {row[0] for row in conn.execute(text('SELECT supplier_id FROM product_suppliers WHERE business_id=:b AND product_id=:p'), {'b':g.business_id,'p':product_id})}
        for supplier_id in ids:
            supplier = conn.execute(text('SELECT archived_at FROM suppliers WHERE business_id=:b AND id=:s'), {'b':g.business_id,'s':supplier_id}).first()
            if not supplier or (supplier[0] is not None and supplier_id not in existing): raise ValueError('Supplier not found or archived')
            conn.execute(text('INSERT INTO product_suppliers (business_id,product_id,supplier_id) VALUES (:b,:p,:s) ON CONFLICT DO NOTHING'), {'b':g.business_id,'p':product_id,'s':supplier_id})
        for supplier_id in existing - ids:
            conn.execute(text('DELETE FROM product_suppliers WHERE business_id=:b AND product_id=:p AND supplier_id=:s'), {'b':g.business_id,'p':product_id,'s':supplier_id})

    @app.route('/api/v1/products', methods=['GET', 'POST'])
    @scoped
    def products():
        with engine.begin() as conn:
            if request.method == 'POST':
                data = body(); p = clean_product(data); p.update(b=g.business_id, actor=g.user_id)
                supplier = conn.execute(text('SELECT archived_at FROM suppliers WHERE business_id=:b AND id=:supplier_id'), p).first()
                if supplier and supplier[0] is not None: raise ValueError('Supplier is archived')
                row = conn.execute(text('''INSERT INTO products (business_id,name,sku,category_id,supplier_id,unit,stock,reorder_level,cost_price,expiry_date)
                    VALUES (:b,:name,:sku,:category_id,:supplier_id,:unit,:stock,:reorder_level,:cost_price,:expiry_date) RETURNING *'''), p).mappings().one()
                set_product_suppliers(conn, row['id'], p['supplier_id'], data.get('supplier_ids'))
                if p['stock']:
                    conn.execute(text("INSERT INTO stock_movements (business_id,product_id,actor_id,quantity_delta,reason) VALUES (:b,:id,:actor,:stock,'Initial stock')"), dict(p, id=row['id']))
                return jsonify(dict(row)), 201
            try:
                limit = int(request.args.get('limit', 100))
                offset = int(request.args.get('offset', 0))
                category = request.args.get('category_id')
                category = int(category) if category else None
                if not 1 <= limit <= 500 or offset < 0 or (category is not None and category <= 0):
                    raise ValueError()
            except ValueError:
                raise ValueError('Invalid pagination or category')
            status = request.args.get('status')
            conditions = {'in': 'stock > reorder_level AND stock > 0',
                          'low': 'stock > 0 AND stock <= reorder_level', 'out': 'stock = 0'}
            if status and status not in conditions:
                raise ValueError('Invalid status')
            query = 'SELECT products.*, ARRAY(SELECT ps.supplier_id FROM product_suppliers ps WHERE ps.business_id=products.business_id AND ps.product_id=products.id ORDER BY ps.supplier_id) AS supplier_ids FROM products WHERE business_id=:b AND archived_at IS NULL'
            params = {'b': g.business_id, 'limit': limit, 'offset': offset}
            if category is not None:
                query += ' AND category_id=:category'
                params['category'] = category
            search = request.args.get('search', '').strip()
            if search:
                query += " AND (strpos(lower(name), lower(:search)) > 0 OR strpos(lower(sku), lower(:search)) > 0)"
                params['search'] = search
            if status:
                query += ' AND ' + conditions[status]
            rows = conn.execute(text(query + ' ORDER BY id LIMIT :limit OFFSET :offset'), params).mappings().all()
            return jsonify([dict(r) for r in rows])

    @app.route('/api/v1/products/<int:product_id>', methods=['GET', 'PATCH', 'DELETE'])
    @scoped
    def product(product_id):
        with engine.begin() as conn:
            params = {'b': g.business_id, 'id': product_id, 'actor': g.user_id}
            old = conn.execute(text('SELECT * FROM products WHERE business_id=:b AND id=:id AND archived_at IS NULL FOR UPDATE'), params).mappings().first()
            if not old: return jsonify(error='Not found'), 404
            if request.method == 'GET': return jsonify(dict(old))
            if request.method == 'DELETE':
                conn.execute(text('UPDATE products SET archived_at=now(), updated_at=now() WHERE business_id=:b AND id=:id'), params)
                return '', 204
            incoming = body(); data = dict(old); data.update(incoming); p = clean_product(data); p.update(params)
            if p['supplier_id'] != old['supplier_id']:
                supplier = conn.execute(text('SELECT archived_at FROM suppliers WHERE business_id=:b AND id=:supplier_id'), p).first()
                if supplier and supplier[0] is not None: raise ValueError('Supplier is archived')
            row = conn.execute(text('''UPDATE products SET name=:name,sku=:sku,category_id=:category_id,supplier_id=:supplier_id,unit=:unit,stock=:stock,
                reorder_level=:reorder_level,cost_price=:cost_price,expiry_date=:expiry_date,updated_at=now() WHERE business_id=:b AND id=:id RETURNING *'''), p).mappings().one()
            set_product_suppliers(conn, product_id, p['supplier_id'], incoming.get('supplier_ids'))
            delta = p['stock'] - old['stock']
            if delta:
                conn.execute(text("INSERT INTO stock_movements (business_id,product_id,actor_id,quantity_delta,reason) VALUES (:b,:id,:actor,:delta,'Manual correction')"), dict(p, delta=delta))
            return jsonify(dict(row))

    @app.route('/api/v1/products/<int:product_id>/movements', methods=['GET', 'POST'])
    @scoped
    def movements(product_id):
        params = {'b': g.business_id, 'id': product_id, 'actor': g.user_id}
        with engine.begin() as conn:
            product = conn.execute(text('SELECT stock FROM products WHERE business_id=:b AND id=:id AND archived_at IS NULL FOR UPDATE'), params).mappings().first()
            if not product: return jsonify(error='Not found'), 404
            if request.method == 'GET':
                rows = conn.execute(text('SELECT id,quantity_delta,reason,actor_id,created_at FROM stock_movements WHERE business_id=:b AND product_id=:id ORDER BY id DESC'), params).mappings().all()
                return jsonify([dict(r) for r in rows])
            data = body(); action = data.get('action')
            if action not in ('in', 'out'): raise ValueError('Invalid action')
            quantity = number(data.get('quantity'), 'quantity', True)
            delta = quantity if action == 'in' else -quantity
            if product['stock'] + delta < 0: return jsonify(error='Insufficient stock'), 409
            params.update(delta=delta, reason=required(data, 'reason'))
            conn.execute(text('UPDATE products SET stock=stock+:delta,updated_at=now() WHERE business_id=:b AND id=:id'), params)
            row = conn.execute(text('INSERT INTO stock_movements (business_id,product_id,actor_id,quantity_delta,reason) VALUES (:b,:id,:actor,:delta,:reason) RETURNING *'), params).mappings().one()
            return jsonify(dict(row)), 201

    @app.get('/api/v1/reports/purchases')
    @scoped
    def purchase_report():
        params = {'b': g.business_id}
        query = '''SELECT o.id,o.created_at,o.received_at,o.status,s.name AS supplier,
            sum(i.quantity * i.unit_cost) AS total FROM purchase_orders o
            JOIN suppliers s ON s.business_id=o.business_id AND s.id=o.supplier_id
            JOIN purchase_order_items i ON i.business_id=o.business_id AND i.order_id=o.id
            WHERE o.business_id=:b'''
        dates = {}
        for key in ('from', 'to'):
            value = request.args.get(key)
            if value:
                try: dates[key] = date.fromisoformat(value)
                except ValueError: raise ValueError(f'Invalid {key} date')
        if 'from' in dates and 'to' in dates and dates['from'] > dates['to']:
            raise ValueError('Start date must not be after end date')
        if 'from' in dates:
            query += " AND o.created_at >= (CAST(:start_date AS date)::timestamp AT TIME ZONE (SELECT timezone FROM businesses WHERE id=:b))"
            params['start_date'] = dates['from']
        if 'to' in dates:
            query += " AND o.created_at < ((CAST(:end_date AS date) + 1)::timestamp AT TIME ZONE (SELECT timezone FROM businesses WHERE id=:b))"
            params['end_date'] = dates['to']
        status = request.args.get('status')
        if status:
            if status not in ('pending', 'received'): raise ValueError('Invalid status')
            query += ' AND o.status=:status'; params['status'] = status
        with engine.connect() as conn:
            rows = conn.execute(text(query + ' GROUP BY o.id,s.name ORDER BY o.created_at DESC,o.id DESC'), params).mappings().all()
        return jsonify([dict(row) for row in rows])

    @app.get('/api/v1/reports/inventory')
    @scoped
    def inventory_report():
        with engine.connect() as conn:
            business = conn.execute(text('SELECT name,currency,timezone FROM businesses WHERE id=:b'), {'b':g.business_id}).mappings().one()
            rows = conn.execute(text('''SELECT p.id,p.name,p.sku,c.name AS category,s.name AS supplier,s.id AS supplier_id,s.archived_at AS supplier_archived_at,p.stock,p.unit,
                p.reorder_level,p.cost_price,p.expiry_date,p.stock*p.cost_price AS estimated_value
                FROM products p JOIN categories c ON c.business_id=p.business_id AND c.id=p.category_id
                JOIN suppliers s ON s.business_id=p.business_id AND s.id=p.supplier_id
                WHERE p.business_id=:b AND p.archived_at IS NULL ORDER BY p.name,p.id'''), {'b':g.business_id}).mappings().all()
        generated_at = datetime.now(ZoneInfo(business['timezone']))
        return jsonify(business=dict(business),generated_at=generated_at.isoformat(),items=[dict(row) for row in rows])

    @app.get('/api/v1/dashboard/summary')
    @scoped
    def summary():
        with engine.connect() as conn:
            row = conn.execute(text('''SELECT count(*) AS total_products, count(*) FILTER (WHERE stock=0) AS out_of_stock,
                count(*) FILTER (WHERE stock>0 AND stock<=reorder_level) AS low_stock,
                COALESCE(sum(stock*cost_price),0) AS inventory_value FROM products WHERE business_id=:b AND archived_at IS NULL'''), {'b': g.business_id}).mappings().one()
        return jsonify(dict(row))

    @app.get('/api/v1/dashboard/activity')
    @scoped
    def activity():
        with engine.connect() as conn:
            rows = conn.execute(text('SELECT m.id,m.product_id,p.name,m.quantity_delta,m.reason,m.actor_id,m.created_at FROM stock_movements m JOIN products p ON p.business_id=m.business_id AND p.id=m.product_id WHERE m.business_id=:b ORDER BY m.id DESC LIMIT 50'), {'b': g.business_id}).mappings().all()
        return jsonify([dict(r) for r in rows])

    return app
