-- Run in Supabase SQL editor
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    organization VARCHAR(255),
    role VARCHAR(50) DEFAULT 'analyst',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    preferences JSONB DEFAULT '{}'
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Insert default admin user (change password after first login)
INSERT INTO users (email, password_hash, full_name, organization, role)
VALUES (
    'admin@sekakama.org',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQVqhN8pLjR7VqKqZvqZr9R2a',  -- password: admin123
    'System Administrator',
    'Seka Kama Conservancy',
    'admin'
) ON CONFLICT (email) DO NOTHING;