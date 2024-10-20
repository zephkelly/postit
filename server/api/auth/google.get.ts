import { getUserByEmail } from "@/server/utils/database/user"
import { VerificationStatus, Provider, isRegisteredUser, isUnregisteredUser } from "@/types/auth"
import { type User } from '#auth-utils'

export default defineOAuthGoogleEventHandler({
    config: {
        authorizationParams: {
            access_type: 'offline'
        },
    },
    async onSuccess(event, { user, tokens }) {
        const existingUser: User | null = await getUserByEmail(event, user.email)
        console.log('google user', user)
        if (existingUser === null) {
            await setUserSession(event, {
                user: {
                    id: null,
                    display_name: null,
                    picture: user.picture,
                    provider: Provider.Google,
                    provider_id: user.sub,
                    email: user.email,
                },
                secure: {
                    expires_in: tokens.expires_in,
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token,
                    verification_status: VerificationStatus.Pending,
                },
                loggedInAt: Date.now(),
            }, {
                maxAge: 60 * 60 // 1 hour 
            })
            
            return sendRedirect(event, '/register')
        }


        if (isRegisteredUser(existingUser) === false) {
            return sendRedirect(event, '/register')
        }

        await setUserSession(event, {
            user: {
                id: existingUser.id,
                picture: user.picture,
                display_name: existingUser?.display_name,
                provider: Provider.Google,
                provider_id: existingUser.provider_id,
            },
            secure: {
                expires_in: tokens.expires_in,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                verification_status: VerificationStatus.VerifiedBasic,
            },
            loggedInAt: Date.now(),
        })

        return sendRedirect(event, '/')
    },
    onError(event, error) {
        console.error('Error logging in with Google:', error)
        return sendRedirect(event, '/login')
    }
})