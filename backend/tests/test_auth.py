from sqlalchemy import text
from backend.app import create_app


def test_auth_and_business_isolation(tmp_path):
    app = create_app({'TESTING': True, 'DATABASE_URL': f'sqlite:///{tmp_path}/test.db',
                      'TOKEN_VERIFIER': lambda token: {'uid': token}})
    with app.extensions['db_engine'].begin() as conn:
        for sql in (
            'CREATE TABLE users (id INTEGER PRIMARY KEY, firebase_uid TEXT NOT NULL)',
            'CREATE TABLE business_memberships (business_id INTEGER, user_id INTEGER, role TEXT)',
            'CREATE TABLE categories (id INTEGER PRIMARY KEY, business_id INTEGER, name TEXT)',
            "INSERT INTO users VALUES (1, 'user1'), (2, 'user2')",
            "INSERT INTO business_memberships VALUES (10, 1, 'owner'), (20, 2, 'owner')",
            "INSERT INTO categories VALUES (1,10,'Private'), (2,20,'Other')",
        ):
            conn.execute(text(sql))
    client = app.test_client()
    assert client.get('/api/v1/categories').status_code == 401
    headers = {'Authorization': 'Bearer user1', 'X-Business-ID': '20'}
    assert client.get('/api/v1/categories', headers=headers).status_code == 403
    headers['X-Business-ID'] = '10'
    response = client.get('/api/v1/categories', headers=headers)
    assert response.status_code == 200
    assert response.json == [{'id': 1, 'name': 'Private'}]
    assert client.post('/api/v1/categories', headers=headers, json={'name': '   '}).status_code == 400


def test_import_preview_validation_and_isolation(tmp_path):
    app = create_app({'TESTING': True, 'DATABASE_URL': f'sqlite:///{tmp_path}/test.db',
                      'TOKEN_VERIFIER': lambda token: {'uid': token}})
    with app.extensions['db_engine'].begin() as conn:
        for sql in (
            'CREATE TABLE users (id INTEGER PRIMARY KEY, firebase_uid TEXT)',
            'CREATE TABLE business_memberships (business_id INTEGER, user_id INTEGER, role TEXT)',
            'CREATE TABLE products (business_id INTEGER, sku TEXT)',
            "INSERT INTO users VALUES (1, 'user1')",
            "INSERT INTO business_memberships VALUES (10,1,'owner')",
            "INSERT INTO products VALUES (10,'EXISTING'), (20,'OTHER')",
        ):
            conn.execute(text(sql))
    client = app.test_client()
    headers = {'Authorization': 'Bearer user1', 'X-Business-ID': '10'}
    row = {'name': 'Milk', 'sku': 'other', 'category': 'Dairy', 'supplier': 'Farm',
           'stock': 3, 'unit': 'cartons', 'reorder_level': 2, 'cost_price': '1.25'}
    response = client.post('/api/v1/imports/products/preview', headers=headers, json={'rows': [row, dict(row, sku='EXISTING'), row]})
    assert response.status_code == 200
    assert response.json['valid'] == 1
    assert [x['row'] for x in response.json['errors']] == [2, 3]
    response = client.post('/api/v1/imports/products/commit', headers=headers, json={'rows': [dict(row, stock=-1)]})
    assert response.status_code == 400
    with app.extensions['db_engine'].connect() as conn:
        assert conn.execute(text('SELECT count(*) FROM products')).scalar_one() == 2


def test_firebase_token_verified_without_application_credentials(tmp_path, monkeypatch):
    import datetime
    import time
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.x509.oid import NameOID
    from google.auth import jwt
    from google.auth.crypt import RSASigner
    from google.oauth2 import id_token
    import backend.app as module
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, 'test')])
    cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key())
            .serial_number(1).not_valid_before(datetime.datetime.utcnow()-datetime.timedelta(days=1))
            .not_valid_after(datetime.datetime.utcnow()+datetime.timedelta(days=1)).sign(key, hashes.SHA256()))
    pem = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
    now = int(time.time())
    signer = RSASigner.from_string(pem, key_id='test-key')
    def token(audience):
        return jwt.encode(signer, {'aud':audience,'iss':'https://securetoken.google.com/'+audience,'sub':'user1','iat':now,'exp':now+3600}).decode()
    import json
    class Response:
        status = 200
        data = json.dumps({'test-key':cert.public_bytes(serialization.Encoding.PEM).decode()}).encode()
    real_verify = id_token.verify_firebase_token
    monkeypatch.setattr(module.id_token, 'verify_firebase_token', lambda value, request, audience: real_verify(value, lambda *args, **kwargs: Response(), audience=audience))
    app = create_app({'TESTING':True, 'DATABASE_URL':f'sqlite:///{tmp_path}/auth.db', 'FIREBASE_PROJECT_ID':'test-project'})
    with app.extensions['db_engine'].begin() as conn:
        conn.execute(text('CREATE TABLE users (id INTEGER PRIMARY KEY, firebase_uid TEXT)'))
        conn.execute(text('CREATE TABLE businesses (id INTEGER PRIMARY KEY, name TEXT, currency TEXT, timezone TEXT)'))
        conn.execute(text('CREATE TABLE business_memberships (business_id INTEGER, user_id INTEGER, role TEXT)'))
        conn.execute(text("INSERT INTO users VALUES (1,'user1')"))
    client=app.test_client()
    assert client.get('/api/v1/me', headers={'Authorization':'Bearer '+token('test-project')}).status_code == 200
    assert client.get('/api/v1/me', headers={'Authorization':'Bearer '+token('other-project')}).status_code == 401
