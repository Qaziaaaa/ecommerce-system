import crypto from 'crypto';

/**
 * SIMPLE DOUBLE-SUBMIT COOKIE PATTERN
 *
 * Logic:
 * 1. Backend sets 'XSRF-TOKEN' cookie via GET /api/v1/csrf-token.
 * 2. Axios reads cookie and sends 'X-XSRF-TOKEN' header on every mutating request.
 * 3. Backend ensures cookie and header match exactly.
 *
 * Cross-domain (Vercel → Render): cookie must be SameSite=None; Secure.
 * If the cookie is missing, we issue one and return 403 so the client can retry.
 */

const isProd = () => process.env.NODE_ENV === 'production';

const setTokenCookie = (res) => {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie('XSRF-TOKEN', token, {
        httpOnly: false,       // Must be readable by JS (Axios)
        secure: isProd(),
        sameSite: isProd() ? 'None' : 'Lax',
        path: '/'
    });
    return token;
};

export const csrfProtection = (req, res, next) => {
    const methodsToProtect = ['POST', 'PUT', 'DELETE', 'PATCH'];
    if (!methodsToProtect.includes(req.method)) {
        return next();
    }

    const cookieToken = req.cookies['XSRF-TOKEN'];
    const headerToken = req.headers['x-xsrf-token'];

    // No cookie — issue one and tell client to retry
    if (!cookieToken) {
        setTokenCookie(res);
        return res.status(403).json({
            status: 'fail',
            message: 'CSRF token issued — please retry your request',
            csrfRetry: true
        });
    }

    if (!headerToken) {
        return res.status(403).json({ status: 'fail', message: 'CSRF token missing from request headers' });
    }

    if (cookieToken !== headerToken) {
        return res.status(403).json({ status: 'fail', message: 'Invalid CSRF token' });
    }

    next();
};

export { setTokenCookie };
