"""Allow products to have multiple suppliers."""
from alembic import op
revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None

def upgrade():
    op.execute('''CREATE TABLE product_suppliers (business_id bigint NOT NULL, product_id bigint NOT NULL, supplier_id bigint NOT NULL, PRIMARY KEY (business_id,product_id,supplier_id), FOREIGN KEY (business_id,product_id) REFERENCES products(business_id,id), FOREIGN KEY (business_id,supplier_id) REFERENCES suppliers(business_id,id))''')
    op.execute('INSERT INTO product_suppliers (business_id,product_id,supplier_id) SELECT business_id,id,supplier_id FROM products')
    op.execute('''CREATE FUNCTION sync_primary_product_supplier() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN INSERT INTO product_suppliers (business_id,product_id,supplier_id) VALUES (NEW.business_id,NEW.id,NEW.supplier_id) ON CONFLICT DO NOTHING; RETURN NEW; END $$''')
    op.execute('CREATE TRIGGER product_primary_supplier_sync AFTER INSERT OR UPDATE OF supplier_id ON products FOR EACH ROW EXECUTE FUNCTION sync_primary_product_supplier()')

def downgrade():
    op.execute('DROP TRIGGER product_primary_supplier_sync ON products')
    op.execute('DROP FUNCTION sync_primary_product_supplier()')
    op.execute('DROP TABLE product_suppliers')
