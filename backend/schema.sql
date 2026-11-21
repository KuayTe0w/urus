-- Initial PostgreSQL schema. Authentication is provided by Firebase Auth.
CREATE TABLE businesses (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text NOT NULL CHECK (length(trim(name)) > 0),
    currency char(3) NOT NULL,
    timezone text NOT NULL
);

CREATE TABLE users (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    firebase_uid text NOT NULL UNIQUE,
    email text
);

CREATE TABLE business_memberships (
    business_id bigint NOT NULL REFERENCES businesses(id),
    user_id bigint NOT NULL REFERENCES users(id),
    role text NOT NULL,
    PRIMARY KEY (business_id, user_id)
);

CREATE TABLE categories (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id bigint NOT NULL REFERENCES businesses(id),
    name text NOT NULL CHECK (length(trim(name)) > 0),
    UNIQUE (business_id, id)
);
CREATE UNIQUE INDEX categories_business_name ON categories (business_id, lower(trim(name)));

CREATE TABLE suppliers (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id bigint NOT NULL REFERENCES businesses(id),
    name text NOT NULL CHECK (length(trim(name)) > 0),
    UNIQUE (business_id, id)
);
CREATE UNIQUE INDEX suppliers_business_name ON suppliers (business_id, lower(trim(name)));

CREATE TABLE products (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id bigint NOT NULL REFERENCES businesses(id),
    name text NOT NULL CHECK (length(trim(name)) > 0),
    sku text NOT NULL CHECK (length(trim(sku)) > 0),
    category_id bigint NOT NULL,
    supplier_id bigint NOT NULL,
    unit text NOT NULL,
    stock numeric(18,2) NOT NULL DEFAULT 0 CHECK (stock >= 0),
    reorder_level numeric(18,2) NOT NULL CHECK (reorder_level >= 0),
    cost_price numeric(18,2) NOT NULL CHECK (cost_price >= 0),
    expiry_date date,
    archived_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (business_id, id),
    FOREIGN KEY (business_id, category_id) REFERENCES categories(business_id, id),
    FOREIGN KEY (business_id, supplier_id) REFERENCES suppliers(business_id, id)
);
CREATE UNIQUE INDEX products_business_sku ON products (business_id, lower(trim(sku)));

CREATE TABLE stock_movements (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id bigint NOT NULL,
    product_id bigint NOT NULL,
    actor_id bigint NOT NULL,
    quantity_delta numeric(18,2) NOT NULL CHECK (quantity_delta <> 0),
    reason text NOT NULL CHECK (length(trim(reason)) > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (business_id, product_id) REFERENCES products(business_id, id),
    FOREIGN KEY (business_id, actor_id) REFERENCES business_memberships(business_id, user_id)
);
CREATE INDEX stock_movements_product_time ON stock_movements (business_id, product_id, created_at DESC);
