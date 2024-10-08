import speakeasy from 'speakeasy';

// Generate a secret key
// this returns a secret key that we will use to generate the QR code & onces the user enters the token, we will use this secret key to verify the token, after which we save it as 2fa in user model
export const generateTwoFactorAuth = () => {
        const secret = speakeasy.generateSecret();
        return secret;
}
// Verify the token
// secret is the secret key we get from generateTwoFactorAuth, token is the token the user enters
export const verifyTwoFactorAuth = (secret, token) => {
        const verified = speakeasy.totp.verify({
                secret: secret,
                encoding: 'base32',
                token: token,
                window: 1
        });
        return verified;
}
// Generate a URL for the QR code
// secret we get from generateTwoFactorAuth, username is the user's email, issuer is the name of the our app "NTSMETRICS"

export const generateTwoFactorAuthUrl = (secret, username, issuer) => {
        const otpauth_url = speakeasy.otpauthURL({
                secret,
                label: username,
                issuer: issuer
        });
        return otpauth_url;
}
