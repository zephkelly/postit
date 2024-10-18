export default defineNuxtConfig({
    compatibilityDate: '2024-04-03',
    devtools: { enabled: false },
    // devServer: {
    //     host: '127.0.0.1',
    // },

    typescript: {
        strict: true,
    },

    modules: ['nuxt-auth-utils'],
    runtimeConfig: {
        session: {
            maxAge: 60 * 60 * 24 * 7
        },
        databaseConnectionString: process.env.POSTGRES_CONNECTION_STRING,
        oauth: {
            google: {
                clientId: process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID,
                clientSecret: process.env.NUXT_OAUTH_GOOGLE_CLIENT_SECRET,
                redirectURL: process.env.NUXT_OAUTH_GOOGLE_REDIRECT_URL
            }
        }
    },

    nitro: {
        routeRules: {
            '/api/**': { cors: true, headers: { 'access-control-allow-methods': 'GET,POST' } },
        },
    },
})