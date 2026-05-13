import jwt from 'jsonwebtoken';

const JWT_SECRET = "super-secret-key"; // краще винести в .env

export default function auth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1]; // "Bearer TOKEN"

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // тепер req.user.id доступний
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }
}