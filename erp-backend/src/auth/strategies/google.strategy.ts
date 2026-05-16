import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(private readonly configService: ConfigService) {
        const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
        const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
        const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:3001/auth/google/callback';

        if (!clientID || !clientSecret) {
            console.warn('[GoogleStrategy] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured');
        }

        super({
            clientID: clientID || '',
            clientSecret: clientSecret || '',
            callbackURL,
            scope: ['email', 'profile'],
        });
    }

    // Override authorizationParams to force account selection
    authorizationParams(): { [key: string]: string } {
        return {
            prompt: 'select_account',
        };
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: VerifyCallback,
    ): Promise<any> {
        const { id, name, emails, photos } = profile;

        const user = {
            provider: 'google',
            providerId: id,
            email: emails[0].value,
            firstName: name.givenName,
            lastName: name.familyName,
            picture: photos?.[0]?.value,
            accessToken,
        };

        done(null, user);
    }
}
