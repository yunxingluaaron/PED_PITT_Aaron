from flask import Blueprint

# Create main API blueprint
api = Blueprint('api', __name__)

# Import route modules BEFORE they're needed
# This ensures all routes are registered before the blueprint is registered with the app
import app.api.chat
import app.api.questions
import app.api.versions
import app.api.files

def init_app(app):
    """
    Initialize API routes after the app is created.
    """
    # Register the blueprint with the app AFTER all routes have been defined
    app.register_blueprint(api, url_prefix='/api')
    
    return app