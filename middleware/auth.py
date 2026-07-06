import os
import jwt
from functools import wraps
from flask import request, jsonify, g

# Fetch JWT_SECRET from environment or use a default secure fallback
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-super-secret-jwt-key-change-this-in-production')

def token_required(f):
    """Decorator to authenticate requests using JWT."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # Check authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header:
            parts = auth_header.split(' ')
            if len(parts) == 2 and parts[0].lower() == 'bearer':
                token = parts[1]

        if not token:
            return jsonify({'error': 'Access denied. No token provided.'}), 401

        try:
            # Decode the JWT token
            decoded = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            # Store user details in Flask request global context `g`
            g.user = decoded
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Invalid or expired authentication token.'}), 403
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid or expired authentication token.'}), 403

        return f(*args, **kwargs)
    return decorated

def require_role(role):
    """Decorator to restrict access to specific roles ('client' or 'admin')."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(g, 'user') or g.user.get('role') != role:
                return jsonify({'error': f'Access denied. Requires {role} privileges.'}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator
