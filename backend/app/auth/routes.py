from flask import jsonify, request
from flask_cors import cross_origin
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from . import auth_bp
from ..database import db 
from ..models import User
import bcrypt

def hash_password(password):
    """Hash a password for storing."""
    try:
        if isinstance(password, str):
            password = password.encode('utf-8')
        return bcrypt.hashpw(password, bcrypt.gensalt())
    except Exception as e:
        print(f"Hashing error: {str(e)}")
        raise

from hashlib import scrypt
import hmac

def verify_password(password, stored_hash):
    """Verify a stored password against one provided by user"""
    try:
        # Parse the stored hash
        if not stored_hash.startswith('scrypt:'):
            return False
            
        # Split into algorithm parameters and hash parts
        algo_params, salt, hash_value = stored_hash.split('$')
        
        # Parse algorithm parameters
        _, n, r, p = algo_params.split(':')
        
        # Convert parameters to integers
        n = int(n)  # CPU/Memory cost parameter
        r = int(r)  # block size parameter
        p = int(p)  # parallelization parameter
        
        # Generate new hash with same parameters
        password_bytes = password.encode('utf-8')
        salt_bytes = salt.encode('utf-8')
        
        # Calculate new hash
        new_hash = scrypt(
            password=password_bytes,
            salt=salt_bytes,
            n=n,
            r=r,
            p=p,
            maxmem=2**30,  # 1GB max memory
            dklen=64  # match your hash length
        ).hex()
        
        # Compare hashes using constant-time comparison
        return hmac.compare_digest(hash_value, new_hash)
        
    except Exception as e:
        print(f"Verification error: {str(e)}")
        print(f"Password type: {type(password)}")
        # Add more detailed error logging
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        return False

def generate_token(user_id, email):
    # Convert user_id to string to ensure consistent type handling
    return create_access_token(identity=str(user_id))

# Add OPTIONS method handling for preflight requests
@auth_bp.route('/login', methods=['OPTIONS'])
@cross_origin()
def handle_login_preflight():
    response = jsonify({'message': 'OK'})
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
    return response

@auth_bp.route('/register', methods=['OPTIONS'])
@cross_origin()
def handle_register_preflight():
    response = jsonify({'message': 'OK'})
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
    return response

@auth_bp.route('/me', methods=['OPTIONS'])
@cross_origin()
def handle_me_preflight():
    response = jsonify({'message': 'OK'})
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
    return response

@auth_bp.route('/logout', methods=['OPTIONS'])
@cross_origin()
def handle_logout_preflight():
    response = jsonify({'message': 'OK'})
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
    return response


@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        print("Received registration data:", data)  # Add this logging

        # Validate required fields
        required_fields = ('name', 'email', 'password')
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            print(f"Missing fields: {missing_fields}")  # Add this logging
            return jsonify({
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400

        # Add data validation
        if not data.get('email') or '@' not in data.get('email'):
            return jsonify({'error': 'Invalid email format'}), 400

        if not data.get('password') or len(data.get('password')) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400

        # Check if user already exists
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already registered'}), 400

        # Create new user
        new_user = User(
            name=data['name'],
            email=data['email']
        )
        new_user.set_password(data['password'])

        db.session.add(new_user)
        db.session.commit()

        # Generate token
        token = generate_token(new_user.id, new_user.email)

        return jsonify({
            'token': token,
            'user': {
                'id': new_user.id,
                'name': new_user.name,
                'email': new_user.email
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Registration error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
@cross_origin()
def login():
    try:
        data = request.get_json()
        print("Received login data:", data)

        user = User.query.filter_by(email=data['email']).first()
        if not user:
            return jsonify({'error': 'Invalid email or password'}), 401

        print("User found:", user is not None)
        print("Current stored hash:", repr(user.password_hash))
        print("Hash components:", user.password_hash.split('$'))
        
        # Verify password using scrypt
        is_valid = verify_password(data['password'], user.password_hash)
        print("Password verification result:", is_valid)
        
        if not is_valid:
            return jsonify({'error': 'Invalid email or password'}), 401

        # Generate token
        token = generate_token(user.id, user.email)

        return jsonify({
            'token': token,
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email
            }
        })

    except Exception as e:
        print("Login error:", str(e))
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    try:
        user_id = get_jwt_identity()
        # Convert string id back to integer
        user = User.query.filter_by(id=int(user_id)).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404

        return jsonify({
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email
            }
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    try:
        current_user_email = get_jwt_identity()
        user = User.query.filter_by(id=current_user_email).first()
        
        data = request.get_json()
        if not all(k in data for k in ('currentPassword', 'newPassword')):
            return jsonify({'error': 'Missing required fields'}), 400

        # Verify current password
        if not verify_password(data['currentPassword'], user.password_hash):
            return jsonify({'error': 'Current password is incorrect'}), 401

        # Update password
        user.password_hash = hash_password(data['newPassword'])
        db.session.commit()

        return jsonify({'message': 'Password updated successfully'})

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    # Note: With JWT, actual logout happens on the frontend by removing the token
    return jsonify({'message': 'Successfully logged out'})