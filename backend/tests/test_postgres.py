import os
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4
import pytest
from sqlalchemy import text
from backend.app import create_app

@pytest.fixture
def context():
    url = os.getenv('TEST_DATABASE_URL')
    if not url:
        pytest.skip('Set TEST_DATABASE_URL to a migrated PostgreSQL test database')
    uid = 'test-' + uuid4().hex
    app = create_app({'TESTING': True, 'DATABASE_URL': url, 'TOKEN_VERIFIER': lambda token: {'uid': token}})
    engine = app.extensions['db_engine']
    with engine.begin() as conn:
        b = conn.execute(text("INSERT INTO businesses(name,currency,timezone) VALUES (:name,'BND','UTC') RETURNING id"), {'name':uid}).scalar_one()
        u = conn.execute(text('INSERT INTO users(firebase_uid) VALUES (:uid) RETURNING id'), {'uid':uid}).scalar_one()
        conn.execute(text("INSERT INTO business_memberships VALUES (:b,:u,'owner')"), {'b':b,'u':u})
    yield app, {'Authorization': 'Bearer ' + uid, 'X-Business-ID': str(b)}
    with engine.begin() as conn:
        for table in ('stock_movements','purchase_order_items','purchase_orders','product_suppliers','products','categories','suppliers','business_memberships'):
            conn.execute(text(f'DELETE FROM {table} WHERE business_id=:b'), {'b':b})
        conn.execute(text('DELETE FROM users WHERE id=:u'), {'u':u})
        conn.execute(text('DELETE FROM businesses WHERE id=:b'), {'b':b})
    engine.dispose()


def test_import_and_concurrent_stock(context):
    app, headers = context
    client = app.test_client()
    row = {'name':'Milk', 'sku':'MILK', 'category':'Dairy', 'supplier':'Farm', 'unit':'cartons', 'stock':5, 'reorder_level':2, 'cost_price':'1.50', 'expiry_date':'2027-01-01'}
    assert client.post('/api/v1/imports/products/preview', headers=headers, json={'rows':[row]}).json['valid'] == 1
    assert client.post('/api/v1/imports/products/commit', headers=headers, json={'rows':[row]}).status_code == 201
    assert client.post('/api/v1/imports/products/commit', headers=headers, json={'rows':[row]}).status_code == 400
    p = client.get('/api/v1/products', headers=headers).json[0]
    assert p['expiry_date'] == '2027-01-01'
    def remove(_):
        with app.test_client() as c:
            return c.post(f"/api/v1/products/{p['id']}/movements", headers=headers, json={'action':'out','quantity':4,'reason':'Usage'}).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(remove, range(2))) == [201, 409]
    p = client.get(f"/api/v1/products/{p['id']}", headers=headers).json
    assert p['stock'] == '1.00'
    movements = client.get(f"/api/v1/products/{p['id']}/movements", headers=headers).json
    assert len(movements) == 2
    activity = client.get('/api/v1/dashboard/activity', headers=headers).json
    assert len(activity) == 2
    assert activity[0]['name'] == 'Milk'
    assert activity[0]['reason'] == 'Usage'
    summary = client.get('/api/v1/dashboard/summary', headers=headers).json
    assert summary['inventory_value'] == '1.5000'
    assert summary['low_stock'] == 1


def test_registration_and_business_creation():
    url = os.getenv('TEST_DATABASE_URL')
    if not url:
        pytest.skip('Set TEST_DATABASE_URL to a migrated PostgreSQL test database')
    uid = 'registration-' + uuid4().hex
    shop_name = 'New shop ' + uid
    app = create_app({'TESTING':True, 'DATABASE_URL':url, 'TOKEN_VERIFIER':lambda token: {'uid':token}})
    engine = app.extensions['db_engine']
    client = app.test_client()
    headers = {'Authorization':'Bearer '+uid}
    try:
        assert client.post('/api/v1/businesses', json={}).status_code == 401
        assert client.get('/api/v1/me', headers=headers).json['businesses'] == []
        assert client.post('/api/v1/businesses', headers=headers, json={'name':shop_name,'currency':'BND','timezone':'Bad/Zone'}).status_code == 400
        result = client.post('/api/v1/businesses', headers=headers, json={'name':shop_name,'currency':'bnd','timezone':'Asia/Brunei'})
        assert result.status_code == 201
        assert result.json['role'] == 'owner'
        assert result.json['currency'] == 'BND'
        businesses = client.get('/api/v1/me', headers=headers).json['businesses']
        assert len(businesses) == 1 and businesses[0]['id'] == result.json['id']
        headers['X-Business-ID'] = str(result.json['id'])
        assert client.get('/api/v1/products', headers=headers).json == []
        headers['Authorization'] = 'Bearer stranger-' + uid
        assert client.get('/api/v1/products', headers=headers).status_code == 403
    finally:
        with engine.begin() as conn:
            conn.execute(text('DELETE FROM business_memberships WHERE user_id IN (SELECT id FROM users WHERE firebase_uid IN (:uid,:other))'), {'uid':uid,'other':'stranger-'+uid})
            conn.execute(text('DELETE FROM businesses WHERE name=:name'), {'name':shop_name})
            conn.execute(text('DELETE FROM users WHERE firebase_uid IN (:uid,:other)'), {'uid':uid,'other':'stranger-'+uid})
        engine.dispose()


def test_business_settings_require_owner(context):
    app, headers = context
    client = app.test_client()
    business_id = headers['X-Business-ID']
    data = {'name':'Updated name','currency':'MYR','timezone':'Asia/Kuala_Lumpur'}
    response = client.patch(f'/api/v1/businesses/{business_id}', headers=headers, json=data)
    assert response.status_code == 200
    assert response.json['name'] == data['name']
    assert client.get('/api/v1/me', headers=headers).json['businesses'][0]['currency'] == 'MYR'
    assert client.patch(f'/api/v1/businesses/{business_id}', headers=headers, json={**data,'timezone':'Invalid/Zone'}).status_code == 400
    stranger = {'Authorization':'Bearer stranger-' + uuid4().hex}
    assert client.patch(f'/api/v1/businesses/{business_id}', headers=stranger, json=data).status_code == 403
    with app.extensions['db_engine'].begin() as conn:
        conn.execute(text('DELETE FROM users WHERE firebase_uid=:uid'), {'uid': stranger['Authorization'][7:]})


def test_supplier_and_movement_journal(context):
    app, headers = context
    client = app.test_client()
    supplier = client.post('/api/v1/suppliers', headers=headers, json={'name':'Supplier','phone':'+673 123','notes':'deliver mornings'})
    assert supplier.status_code == 201
    supplier_id = supplier.json['id']
    category = client.post('/api/v1/categories', headers=headers, json={'name':'Food'}).json
    product = {'name':'Item','sku':'SKU-1','category_id':category['id'],'supplier_id':supplier_id,'stock':'5','unit':'pcs','reorder_level':'2','cost_price':'3'}
    result = client.post('/api/v1/products', headers=headers, json=product)
    assert result.status_code == 201
    detail = client.get(f'/api/v1/suppliers/{supplier_id}', headers=headers).json
    assert detail['supplier']['phone'] == '+673 123'
    assert detail['products'][0]['sku'] == 'SKU-1'
    report = client.get('/api/v1/reports/inventory', headers=headers)
    assert report.status_code == 200
    assert len(report.json['items']) == 1
    assert report.json['items'][0]['estimated_value'] == '15.0000'
    assert report.json['items'][0]['supplier_id'] == supplier_id
    assert report.json['items'][0]['supplier_archived_at'] is None
    updated = client.patch(f'/api/v1/suppliers/{supplier_id}', headers=headers, json={'name':'Updated','email':'vendor@example.com'})
    assert updated.status_code == 200
    assert updated.json['email'] == 'vendor@example.com'
    entries = client.get('/api/v1/movements?limit=1&offset=0', headers=headers).json
    assert len(entries) == 1 and entries[0]['sku'] == 'SKU-1'
    assert client.delete(f'/api/v1/suppliers/{supplier_id}', headers=headers).status_code == 204
    assert client.patch(f'/api/v1/suppliers/{supplier_id}', headers=headers, json={'name':'Changed'}).status_code == 409
    assert client.post('/api/v1/products', headers=headers, json={**product,'sku':'SKU-2'}).status_code == 400
    assert client.get(f'/api/v1/suppliers/{supplier_id}', headers=headers).json['products'][0]['sku'] == 'SKU-1'
    assert client.post(f'/api/v1/suppliers/{supplier_id}/restore', headers=headers).status_code == 200
    assert client.patch(f'/api/v1/suppliers/{supplier_id}', headers=headers, json={'name':'Restored'}).status_code == 200
    assert client.post('/api/v1/products', headers=headers, json={**product,'sku':'SKU-2'}).status_code == 201


def test_purchase_order_concurrent_receipt(context):
    app, headers = context
    client = app.test_client()
    supplier = client.post('/api/v1/suppliers', headers=headers, json={'name':'Vendor'}).json
    category = client.post('/api/v1/categories', headers=headers, json={'name':'Category'}).json
    product = client.post('/api/v1/products', headers=headers, json={'name':'Item','sku':'PO-ITEM','category_id':category['id'],'supplier_id':supplier['id'],'stock':0,'unit':'pcs','reorder_level':0,'cost_price':1}).json
    order = client.post('/api/v1/purchase-orders', headers=headers, json={'supplier_id':supplier['id'],'items':[{'product_id':product['id'],'quantity':4,'unit_cost':2}]})
    assert order.status_code == 201
    other = client.post('/api/v1/suppliers', headers=headers, json={'name':'Alternative'}).json
    payload = {'supplier_id':other['id'],'items':[{'product_id':product['id'],'quantity':1,'unit_cost':2}]}
    assert client.post('/api/v1/purchase-orders', headers=headers, json=payload).status_code == 400
    result = client.patch(f"/api/v1/products/{product['id']}", headers=headers, json={'supplier_ids':[other['id']]})
    assert result.status_code == 200
    listed = client.get('/api/v1/products', headers=headers).json[0]
    assert set(listed['supplier_ids']) == {supplier['id'], other['id']}
    assert client.put(f"/api/v1/products/{product['id']}/suppliers/{other['id']}", headers=headers).status_code == 204
    assert client.post('/api/v1/purchase-orders', headers=headers, json=payload).status_code == 201
    assert client.delete(f"/api/v1/products/{product['id']}/suppliers/{supplier['id']}", headers=headers).status_code == 409
    assert client.delete(f"/api/v1/products/{product['id']}/suppliers/{other['id']}", headers=headers).status_code == 204
    assert client.post('/api/v1/purchase-orders', headers=headers, json=payload).status_code == 400
    order_id = order.json['id']
    def receive(_):
        with app.test_client() as c:
            return c.post(f'/api/v1/purchase-orders/{order_id}/receive', headers=headers).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(receive, range(2))) == [200, 409]
    assert client.get(f"/api/v1/products/{product['id']}", headers=headers).json['stock'] == '4.00'
    assert len(client.get(f"/api/v1/products/{product['id']}/movements", headers=headers).json) == 1
    assert client.get(f'/api/v1/purchase-orders/{order_id}', headers=headers).json['order']['status'] == 'received'
    report = client.get('/api/v1/reports/purchases?status=received', headers=headers)
    assert report.status_code == 200
    assert len(report.json) == 1 and report.json[0]['id'] == order_id
    assert report.json[0]['total'] == '8.0000'
    assert client.get('/api/v1/reports/purchases?from=2026-02-02&to=2026-02-01', headers=headers).status_code == 400
    assert client.get('/api/v1/reports/purchases').status_code == 401
