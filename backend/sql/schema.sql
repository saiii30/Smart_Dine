-- Smart Dine PostgreSQL schema (reference DDL; SQLAlchemy create_all is authoritative)

CREATE TABLE IF NOT EXISTS branches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(256) NOT NULL UNIQUE,
    full_name VARCHAR(256) NOT NULL,
    hashed_password VARCHAR(256) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'WAITER',
    branch_id INTEGER REFERENCES branches(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS dining_tables (
    id SERIAL PRIMARY KEY,
    table_number VARCHAR(32) NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 4,
    status VARCHAR(32) NOT NULL DEFAULT 'available',
    zone VARCHAR(128),
    qr_token VARCHAR(64) NOT NULL UNIQUE,
    pos_x DOUBLE PRECISION NOT NULL DEFAULT 40,
    pos_y DOUBLE PRECISION NOT NULL DEFAULT 40,
    branch_id INTEGER REFERENCES branches(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(128) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(256) NOT NULL,
    description TEXT,
    price DOUBLE PRECISION NOT NULL DEFAULT 0,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    image_url VARCHAR(512),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    is_veg BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    table_id INTEGER REFERENCES dining_tables(id),
    waiter_id VARCHAR(36) REFERENCES users(id),
    branch_id INTEGER REFERENCES branches(id),
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    special_instructions TEXT,
    customer_name VARCHAR(256),
    subtotal DOUBLE PRECISION NOT NULL DEFAULT 0,
    tax_rate DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    discount_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DOUBLE PRECISION NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    special_instructions TEXT
);

CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount DOUBLE PRECISION NOT NULL,
    tax_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    discount_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    payment_method VARCHAR(64) NOT NULL,
    split_label VARCHAR(64),
    meta JSONB,
    paid_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    name VARCHAR(256) NOT NULL,
    quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
    unit VARCHAR(32) NOT NULL DEFAULT 'kg',
    reorder_level DOUBLE PRECISION NOT NULL DEFAULT 5,
    branch_id INTEGER REFERENCES branches(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(256) NOT NULL,
    contact_email VARCHAR(256),
    contact_phone VARCHAR(64),
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
    branch_id INTEGER REFERENCES branches(id),
    total_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    notes TEXT,
    lines JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(256) NOT NULL,
    role VARCHAR(64) NOT NULL,
    email VARCHAR(256),
    contact_number VARCHAR(64),
    branch_id INTEGER REFERENCES branches(id),
    user_id VARCHAR(36) REFERENCES users(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    work_date DATE NOT NULL,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    rating INTEGER NOT NULL,
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
