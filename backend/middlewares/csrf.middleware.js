/**
 * SIMPLE DOUBLE-SUBMIT COOKIE PATTERN
 * 
 * Logic:
 * 1. Backend sets 'XSRF-TOKEN' cookie.
 * 2. Axios reads cookie and sends 'X-XSRF-TOKEN' header.
 * 3. Backend ensures they match exactly.
 */
export const csrfProtection = (req, res, next) => {
    const methodsToProtect = ['POST', 'PUT', 'DELETE', 'PATCH'];
    if (!methodsToProtect.includes(req.method)) {
        return next();
    }

    const cookieToken = req.cookies['XSRF-TOKEN'];
    const headerToken = req.headers['x-xsrf-token'];

    if (!cookieToken || !headerToken) {
        return res.status(403).json({ status: 'fail', message: 'CSRF token missing' });
    }

    if (cookieToken !== headerToken) {
        return res.status(403).json({ status: 'fail', message: 'Invalid CSRF token match' });
    }

    next();
};
