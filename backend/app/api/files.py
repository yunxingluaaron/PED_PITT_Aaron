from flask import request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
import os
import logging
from functools import wraps

# Import the blueprint directly
from app.api import api

# Set up logging
logger = logging.getLogger(__name__)

# Define decorator locally to avoid circular imports
def cors_preflight(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method == 'OPTIONS':
            resp = current_app.make_default_options_response()
            headers = {
                'Access-Control-Allow-Origin': 'http://localhost:3000',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Allow-Credentials': 'true'
            }
            for key, value in headers.items():
                resp.headers[key] = value
            return resp
        return f(*args, **kwargs)
    return decorated_function

@api.route('/pdf/<path:filename>', methods=['GET', 'OPTIONS'])
@cors_preflight
@jwt_required(optional=True)
def serve_pdf(filename):
    """
    Serve PDF files with proper logging and error handling
    """
    try:
        user_id = get_jwt_identity()
        logger.info(f"🔍 PDF request received for: {filename}")
        logger.info(f"👤 User requesting PDF: {user_id}")

        if not user_id:
            logger.error("❌ No authenticated user found")
            response = jsonify({'error': 'Authentication required'})
            response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            return response, 401

        # Clean and format the filename
        clean_filename = os.path.basename(filename)
        if not clean_filename.lower().endswith('.pdf'):
            clean_filename += '.pdf'

        # Get the absolute path to the pdfs directory
        pdf_dir = os.path.abspath(os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(current_app.root_path))),
            'backend',  # Added this to match your structure
            'pdfs'
        ))

        # Create full file path
        file_path = os.path.join(pdf_dir, clean_filename)
        logger.info(f"📄 Looking for PDF at: {file_path}")

        # Debug: List files in directory
        logger.info(f"📚 Files in directory: {os.listdir(pdf_dir)}")

        # Security check - ensure the path is within the pdfs directory
        if not os.path.commonpath([os.path.abspath(file_path), pdf_dir]).startswith(pdf_dir):
            logger.error(f"🚫 Attempted path traversal: {filename}")
            return jsonify({'error': 'Invalid file path'}), 400

        # Check if file exists
        if not os.path.isfile(file_path):
            logger.error(f"❌ PDF not found at path: {file_path}")
            response = jsonify({'error': 'PDF not found'})
            response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            return response, 404

        logger.info(f"✅ Serving PDF from: {file_path}")

        # Send file with proper headers
        response = send_file(
            file_path,
            mimetype='application/pdf',
            as_attachment=False,
            download_name=clean_filename
        )

        # Add CORS headers
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        
        # Cache control
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'

        return response

    except Exception as e:
        logger.error(f"💥 Error serving PDF {filename}: {str(e)}", exc_info=True)
        response = jsonify({
            'error': 'Server error',
            'details': str(e)
        })
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response, 500