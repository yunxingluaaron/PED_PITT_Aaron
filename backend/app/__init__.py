from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from app.database import db
from app.config import config
import os
from datetime import datetime
import logging
import json

# Initialize extensions
jwt = JWTManager()

def create_app(config_name=None):
    # Create and configure the app
    app = Flask(__name__)
    
    # Load configuration
    if not config_name:
        config_name = os.getenv('FLASK_ENV', 'default')
    app.config.from_object(config[config_name])
    
    # Set up logging
    logging.basicConfig(
        level=logging.DEBUG if app.config['DEBUG'] else logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger(__name__)
    
    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    
    # Configure CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:3000"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "expose_headers": ["Content-Range", "X-Total-Count"],
            "supports_credentials": True,
            "allow_credentials": True
        }
    })
    
    # JWT configuration
    @jwt.token_in_blocklist_loader
    def check_if_token_is_revoked(jwt_header, jwt_payload):
        jti = jwt_payload["jti"]
        # Implement token blocklist check here if needed
        return False
    
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({
            'status': 401,
            'error': 'The token has expired',
            'message': 'Please log in again.'
        }), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({
            'status': 401,
            'error': 'Invalid token',
            'message': 'Invalid authentication token provided'
        }), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({
            'status': 401,
            'error': 'Authorization required',
            'message': 'Authentication token is missing'
        }), 401
    
    # Register error handlers
    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({
            'status': 404,
            'error': 'Not Found',
            'message': 'The requested resource was not found'
        }), 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({
            'status': 500,
            'error': 'Internal Server Error',
            'message': 'An unexpected error has occurred'
        }), 500
    
    # Register blueprints
    from app.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    
    # Import API blueprint initialization function
    # This pattern avoids circular imports
    from app.api import api, init_app as init_api
    
    # Initialize API with the app
    init_api(app)
    
    # Create database tables
    with app.app_context():
        try:
            db.create_all()
            logger.info('Database tables created successfully')
        except Exception as e:
            logger.error(f'Error creating database tables: {str(e)}')
            raise
    
    # Add health check endpoint
    @app.route('/health')
    def health_check():
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'environment': app.config['ENV'],
            'debug': app.debug
        })
    
    logger.info(f'Application created successfully in {config_name} mode')
    return app