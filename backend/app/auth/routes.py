from flask import jsonify, request
from flask_cors import cross_origin
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from . import auth_bp
from ..database import db 
from ..models import User
import bcrypt

def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

def verify_password(password, hashed):
    return bcrypt.checkpw(password.encode('utf-8'), hashed)

def generate_token(user_id, email):
    return create_access_token(identity=email)

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

        # Validate required fields
        if not all(k in data for k in ('name', 'email', 'password')):
            return jsonify({'error': 'Missing required fields'}), 400

        # Check if user already exists
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already registered'}), 400

        # Create new user
        hashed_password = hash_password(data['password'])
        new_user = User(
            name=data['name'],
            email=data['email'],
            password_hash=hashed_password
        )

        # Save to database
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
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
@cross_origin()
def login():
    try:
        data = request.get_json()

        # Validate required fields
        if not all(k in data for k in ('email', 'password')):
            return jsonify({'error': 'Missing required fields'}), 400

        # Find user
        user = User.query.filter_by(email=data['email']).first()
        if not user or not verify_password(data['password'], user.password_hash):
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
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    try:
        current_user_email = get_jwt_identity()
        user = User.query.filter_by(email=current_user_email).first()
        
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
        user = User.query.filter_by(email=current_user_email).first()
        
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