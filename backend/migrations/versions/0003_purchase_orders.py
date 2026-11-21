"""Purchase orders and linked stock movements."""
from alembic import op
revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None

def upgrade():
    op.execute('''CREATE TABLE purchase_orders (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, business_id bigint NOT NULL REFERENCES businesses(id), supplier_id bigint NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','received')), created_at timestamptz NOT NULL DEFAULT now(), received_at timestamptz, created_by bigint NOT NULL, UNIQUE (business_id,id), FOREIGN KEY (business_id,supplier_id) REFERENCES suppliers(business_id,id), FOREIGN KEY (business_id,created_by) REFERENCES business_memberships(business_id,user_id))''')
    op.execute('''CREATE TABLE purchase_order_items (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, business_id bigint NOT NULL, order_id bigint NOT NULL, product_id bigint NOT NULL, quantity numeric(18,2) NOT NULL CHECK (quantity>0), unit_cost numeric(18,2) NOT NULL CHECK (unit_cost>=0), UNIQUE (order_id,product_id), FOREIGN KEY (business_id,order_id) REFERENCES purchase_orders(business_id,id), FOREIGN KEY (business_id,product_id) REFERENCES products(business_id,id))''')
    op.execute('ALTER TABLE stock_movements ADD COLUMN purchase_order_id bigint, ADD CONSTRAINT stock_movement_order_fk FOREIGN KEY (business_id,purchase_order_id) REFERENCES purchase_orders(business_id,id)')

def downgrade():
    op.execute('ALTER TABLE stock_movements DROP CONSTRAINT stock_movement_order_fk, DROP COLUMN purchase_order_id')
    op.execute('DROP TABLE purchase_order_items')
    op.execute('DROP TABLE purchase_orders')
