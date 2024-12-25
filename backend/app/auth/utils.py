import bcrypt
from flask_jwt_extended import create_access_token, get_jwt_identity, verify_jwt_in_request
from functools import wraps
from flask import jsonify
from datetime import timedelta

def hash_password(password):
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt)

def verify_password(password, hashed_password):
    """Verify a password against its hash."""
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password)

def generate_token(user_id, email):
    """Generate JWT token for a user."""
    token = create_access_token(
        identity=email,
        additional_claims={'user_id': user_id},
        expires_delta=timedelta(days=1)
    )
    return token

def admin_required():
    """Decorator to check if user is admin."""
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt_identity()
            if not claims.get('is_admin'):
                return jsonify({'msg': 'Admin access required'}), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper