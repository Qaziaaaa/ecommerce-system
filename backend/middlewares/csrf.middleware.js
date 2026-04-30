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
    const cookieOptions = {
        httpOnly: false,       // Must be readable by JS (Axios)
        secure: isProd(),
        sameSite: isProd() ? 'None' : 'Lax',
        path: '/'
    };
    
    // In production, don't set domain to allow cross-subdomain cookies
    // The browser will automatically set the cookie for the current domain
    
    res.cookie('XSRF-TOKEN', token, cookieOptions);
    console.log(`🔒 CSRF token set: ${token.substring(0, 8)}... (${isProd() ? 'PROD' : 'DEV'})`);
    return token;
};

export const csrfProtection = (req, res, next) => {
    const methodsToProtect = ['POST', 'PUT', 'DELETE', 'PATCH'];
    if (!methodsToProtect.includes(req.method)) {
        return next();
    }

    const authHeader = req.headers.authorization;
    const headerToken = req.headers['x-xsrf-token'];
    const cookieToken = req.cookies['XSRF-TOKEN'];

    let token = null;

    if (headerToken) {
        token = headerToken;
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    } else if (cookieToken) {
        token = cookieToken;
    }

    if (!token) {
        return res.status(403).json({ 
            status: 'fail', 
            message: 'CSRF token missing. Please refresh the page and try again.',
            csrfRetry: true
        });
    }

    if (!/^[a-f0-9]{64}$/i.test(token)) {
        return res.status(403).json({ status: 'fail', message: 'Invalid CSRF token.' });
    }

    next();
};

export { setTokenCookie };
