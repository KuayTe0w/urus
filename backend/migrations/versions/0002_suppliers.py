"""Supplier contact details and archive status."""
from alembic import op
revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None

def upgrade():
    op.execute('ALTER TABLE suppliers ADD COLUMN contact_name text, ADD COLUMN phone text, ADD COLUMN email text, ADD COLUMN address text, ADD COLUMN notes text, ADD COLUMN archived_at timestamptz')

def downgrade():
    op.execute('ALTER TABLE suppliers DROP COLUMN archived_at, DROP COLUMN notes, DROP COLUMN address, DROP COLUMN email, DROP COLUMN phone, DROP COLUMN contact_name')
