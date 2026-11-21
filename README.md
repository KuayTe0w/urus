# URUS

URUS is a multi-business inventory application. The frontend uses HTML, CSS and
JavaScript. The API is Flask with PostgreSQL and Firebase Authentication.

- `frontend/` contains the frontend pages, styles, scripts and assets.
- `backend/app.py` contains the API; `backend/migrations/` contains Alembic migrations.
- `backend/README.md` documents local API setup and database requirements.
- `deploy/` contains deployment and operations guidance.

## Team workflow

Create a branch from the latest `main`, make changes, and open a pull request.
Review API contracts and database migrations together when frontend and backend
changes overlap. Never commit `.env`, credentials, database dumps or real
customer data. The current test project uses a separate preview database and
backend with shared Firebase Authentication. Use a separate Firebase project,
Authentication and database for the future production environment.

Production uses Firebase Hosting, Cloud Run and Cloud SQL. Production deployment
must be performed by an authorized maintainer after review. Hosting previews
should target an isolated staging Firebase project and a staging backend; a
preview site alone does not isolate the backend or data.
