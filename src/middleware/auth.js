const jwt = require('jwt-simple');

// JWT Middleware
const authMiddleware = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(401).send({ error: 'No token provided.' });
    }

    try {
        const secret = 'your_secret_key'; // Replace with your secret
        const decoded = jwt.decode(token, secret);
        req.userId = decoded.id;
        next();
    } catch (error) {
        return res.status(401).send({ error: 'Invalid token.' });
    }
};

module.exports = authMiddleware;
