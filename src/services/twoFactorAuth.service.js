import speakeasy from 'speakeasy';

// Generate a secret key
export const generateTwoFactorAuth = () => {
        const secret = speakeasy.generateSecret();
        console.log(secret);
        return secret;
        }
// Verify the token
export const verifyTwoFactorAuth = (secret, token) => {
        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 1
        });
        console.log(verified);
        return verified;
        }
// Generate a URL for the QR code
export const generateTwoFactorAuthUrl = (secret, username, issuer) => {
        const otpauth_url = speakeasy.otpauthURL({
            secret,
            label: username,
            issuer: issuer
        });
        console.log(otpauth_url);
        return otpauth_url;
        }

// generateTwoFactorAuth();
// const secret1 = "NREDG2DOJYWHCV3FJ4ZGIKJ4NESES23ROJIGCLDZMMYGQKCXGZTQ";
// const token1 = "168972"
// verifyTwoFactorAuth(secret1, token1);
// const username = "testuser";
// const issuer = "testissuer";
// generateTwoFactorAuthUrl(secret1, username, issuer);