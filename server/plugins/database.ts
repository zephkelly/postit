import pg from 'pg'

declare module 'nitropack' {
    interface NitroApp {
        database: pg.Pool
    }
}

export default defineNitroPlugin(async (nitroApp) => {
    const config = useRuntimeConfig()

    const pool = new pg.Pool({
        connectionString: config.databaseConnectionString,
        ssl: {
            rejectUnauthorized: false
        }
    })

    // Test connection
    try {
        const client = await pool.connect()
        console.log('Connected to the database')
        client.release()
    }
    catch (err) {
        console.error('Error connecting to the database', err)
        throw err
    }

    async function createTablesIfNotExist() {
        const client = await pool.connect()
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS private.users (
                    id BIGSERIAL PRIMARY KEY,
                    username TEXT NOT NULL,
                    picture TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    CONSTRAINT users_username_key
                    UNIQUE (username)
                );
                    
                CREATE TABLE IF NOT EXISTS private.user_providers (
                    id BIGSERIAL PRIMARY KEY,
                    user_id BIGINT NOT NULL,
                    provider TEXT NOT NULL,
                    provider_id TEXT NOT NULL,
                    provider_email TEXT NOT NULL,
                    password TEXT DEFAULT NULL,
                    provider_verified BOOLEAN DEFAULT FALSE,
                    is_primary BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    
                    CONSTRAINT fk_user
                        FOREIGN KEY (user_id)
                        REFERENCES private.users(id)
                        ON DELETE CASCADE,
                    CONSTRAINT user_providers_provider_provider_id_key
                        UNIQUE (provider, provider_id),
                    -- Ensure only one primary provider per user
                    CONSTRAINT one_primary_per_user
                        EXCLUDE USING btree (user_id WITH =)
                        WHERE (is_primary = true)
                );
            `)
            
                // CREATE OR REPLACE FUNCTION find_linked_providers(
                //     search_email TEXT,
                //     search_provider TEXT DEFAULT NULL
                // )
                // RETURNS TABLE (
                //     user_id BIGINT,
                //     provider TEXT,
                //     provider_email TEXT,
                //     is_primary BOOLEAN,
                //     provider_verified BOOLEAN
                // ) AS $$
                // BEGIN
                //     RETURN QUERY
                //     WITH base_users AS (
                //         SELECT DISTINCT up.user_id
                //         FROM private.user_providers up
                //         WHERE up.provider_email = search_email
                //         AND (search_provider IS NULL OR up.provider = search_provider)
                //     )
                //     SELECT 
                //         up.user_id,
                //         up.provider,
                //         up.provider_email,
                //         up.is_primary,
                //         up.provider_verified
                //     FROM base_users bu
                //     JOIN private.user_providers up ON up.user_id = bu.user_id
                //     ORDER BY up.is_primary DESC, up.created_at;
                // END;
                // $$ LANGUAGE plpgsql;
                // CREATE TABLE IF NOT EXISTS private.auth_tokens (
                //     id BIGSERIAL PRIMARY KEY,
                //     user_id BIGINT NOT NULL,
                //     token_type TEXT NOT NULL,
                //     token TEXT NOT NULL,
                //     purpose TEXT NOT NULL,
                //     provider TEXT,
                //     provider_email TEXT,
                //     verification_attempts INT DEFAULT 0,      -- For tracking wrong guesses for THIS specific token
                //     last_verification_attempt TIMESTAMP WITH TIME ZONE,
                //     expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                //     used_at TIMESTAMP WITH TIME ZONE,
                //     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                
                //     CONSTRAINT fk_user
                //         FOREIGN KEY (user_id)
                //         REFERENCES private.users(id)
                //         ON DELETE CASCADE,
                    
                //     CONSTRAINT auth_tokens_token_key
                //         UNIQUE (token),
                    
                //     CONSTRAINT valid_token_type
                //         CHECK (token_type IN ('otp', 'access_token', 'verification_link')),
                    
                //     CONSTRAINT not_expired
                //         CHECK (expires_at > created_at),

                //     -- Ensure only one active token per user/purpose
                //     CONSTRAINT one_active_token_per_purpose
                //         UNIQUE (user_id, purpose) 
                // );

                // CREATE TABLE IF NOT EXISTS private.rate_limits (
                //     id BIGSERIAL PRIMARY KEY,
                //     user_id BIGINT NOT NULL,
                //     limit_type TEXT NOT NULL,  -- e.g., 'OTP_CREATION'
                //     attempt_count INT DEFAULT 0,
                //     window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                //     cooldown_until TIMESTAMP WITH TIME ZONE,
                //     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                //     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                
                //     CONSTRAINT fk_user
                //         FOREIGN KEY (user_id)
                //         REFERENCES private.users(id)
                //         ON DELETE CASCADE,
                    
                //     CONSTRAINT unique_user_rate_limit
                //         UNIQUE (user_id, limit_type)
                // );

            console.log('Tables created or already exist')
        }
        catch (err) {
            console.error('Error creating tables', err)
            throw err
        }
        finally {
            client.release()
        }
    }

    await createTablesIfNotExist()

    nitroApp.database = pool
})