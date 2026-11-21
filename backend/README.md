# URUS inventory API

Use Python 3.11 or later. Install dependencies with `pip install -r backend/requirements.txt`.
Create a PostgreSQL database. Set `DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST/DATABASE`
and run `alembic -c backend/alembic.ini upgrade head` to apply migrations. Set
`FIREBASE_PROJECT_ID`, configure Firebase application credentials, and run
`flask --app 'backend.app:create_app()' run` from the repository root.

Users register with Firebase Authentication. The first verified token creates
their local profile, and `POST /api/v1/businesses` creates a business and its
owner membership in one transaction. Users can create multiple businesses.
Send the Firebase ID token as `Authorization: Bearer <token>` and select an
authorized business with `X-Business-ID`. `/api/v1/me` does not require the
business header. Decimal values in responses are JSON strings.

Products accept `name`, `sku`, `category_id`, `supplier_id`, `unit`, `stock`,
`reorder_level`, `cost_price`, and optional `expiry_date` (ISO date).
Stock movements accept `action` (`in` or `out`), positive `quantity`, and
`reason`. Product deletion archives the product. Initial stock and direct
stock edits are recorded as movements. Changing a product's unit does not
convert its quantities; avoid changing it after recording stock.

Product lists accept `search`, `category_id`, `status` (`in`, `low`, `out`),
`limit` (1–500, default 100), and `offset`. Import endpoints
`POST /api/v1/imports/products/preview` and `/commit` accept `{ "rows": [...] }`.
Each row has product fields but uses category and supplier names instead of IDs.
Preview reports errors with one-based row numbers. Commit revalidates all rows,
rejects the whole request on error, and creates missing categories and suppliers.

The Flask application also serves the frontend. Configure `FIREBASE_WEB_CONFIG`
as the JSON web app configuration from Firebase (including `apiKey`,
`authDomain`, and `projectId`), enable email/password authentication, and add
the frontend domain to Firebase authorized domains. The web configuration is
public; do not put service account credentials in it. Firebase ID tokens are
verified using Google's public certificates and the configured project ID.
Local `urus_dev` and
`urus_test` databases were created for this workspace using Unix socket peer
authentication; `postgresql+psycopg:///urus_dev` is the local development URL.
Set `TEST_DATABASE_URL=postgresql+psycopg:///urus_test` and run
`python -m pytest backend/tests` for PostgreSQL integration tests. The database
must already have migrations applied. Tests create and remove their own records.

The inventory frontend uses the API for products, movements, categories,
suppliers, and Excel import/export. It does not migrate localStorage data.
The dashboard displays actual inventory totals and stock movement history.
Orders and reports remain prototypes; roles are not enforced beyond membership.

Suppliers support contact name, phone, email, address, notes and archive status.
`GET /api/v1/suppliers/{id}` includes linked active products; `PATCH` updates
the supplier and `DELETE` archives it. `GET /api/v1/movements` accepts `from`
and `to` ISO dates in the business time zone and `limit`/`offset` pagination.
Movement and inventory exports represent current available data; they do not
reconstruct historical valuation. The inventory export includes an information
sheet with business, currency and generation time.

For local use, place `DATABASE_URL`, `FIREBASE_PROJECT_ID`, and the public JSON
`FIREBASE_WEB_CONFIG` in an untracked `.env` file using shell assignment syntax,
then run `bash backend/run-dev.sh` and open `http://127.0.0.1:5000/` on the
same machine. The script listens only on localhost and is for development.
Never store service-account keys in the repository or in the web config.
