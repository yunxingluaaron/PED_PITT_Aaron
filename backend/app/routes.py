from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from .models import User, db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/auth/register', methods=['POST'])
def register():
    data = request.get_json()

    # Validate input
    if not all(k in data for k in ('name', 'email', 'password')):
        return jsonify({'error': 'Missing required fields'}), 400

    # Check if user already exists
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 400

    # Create new user
    user = User(
        name=data['name'],
        email=data['email']
    )
    user.set_password(data['password'])

    db.session.add(user)
    db.session.commit()

    # Create access token
    access_token = create_access_token(identity=user.email)

    return jsonify({
        'token': access_token,
        'user': user.to_dict()
    }), 201

@auth_bp.route('/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        # Add logging to debug
        print("Login attempt for:", data.get('email'))

        # Validate input
        if not all(k in data for k in ('email', 'password')):
            return jsonify({'error': 'Missing required fields'}), 400

        # Check user credentials
        user = User.query.filter_by(email=data['email']).first()
        if not user:
            return jsonify({'error': 'Invalid email or password'}), 401

        # Add logging for password check
        print("User found, checking password")
        
        if not user.check_password(data['password']):
            return jsonify({'error': 'Invalid email or password'}), 401

        # Create access token
        access_token = create_access_token(identity=user.email)

        return jsonify({
            'token': access_token,
            'user': user.to_dict()
        })
    except Exception as e:
        print("Login error:", str(e))  # Add error logging
        return jsonify({'error': 'Server error occurred'}), 500

@auth_bp.route('/auth/user', methods=['GET'])
@jwt_required()
def get_user():
    current_user_email = get_jwt_identity()
    user = User.query.filter_by(email=current_user_email).first()
    return jsonify(user.to_dict())