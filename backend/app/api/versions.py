from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.database import db
from app.models import Question, VersionHistory
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime
import logging

# Import the blueprint directly
from app.api import api

# Set up logging
logger = logging.getLogger(__name__)

@api.route('/questions/<int:question_id>/versions', methods=['POST'])
@jwt_required()
def add_version(question_id):
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        logger.info(f"Adding new version for question {question_id} by user {user_id}")
        
        question = Question.query.filter_by(id=question_id, user_id=user_id).first()
        if not question:
            logger.warning(f"Question {question_id} not found for user {user_id}")
            return jsonify({'error': 'Question not found'}), 404

        new_version = VersionHistory(
            question_id=question_id,
            content=data['content'],
            type=data.get('type', 'user'),
            timestamp=datetime.utcnow(),
            is_liked=data.get('is_liked', False),
            is_bookmarked=data.get('is_bookmarked', False)
            # Temporarily remove version_metadata until migration is complete
        )
        
        db.session.add(new_version)
        db.session.commit()
        
        logger.info(f"Successfully added new version for question {question_id}")
        return jsonify(new_version.to_dict()), 201

    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Database error in add_version: {str(e)}")
        return jsonify({'error': 'Database error'}), 500
    except Exception as e:
        logger.error(f"Error in add_version: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@api.route('/questions/<int:question_id>/versions', methods=['GET'])
@jwt_required()
def get_versions(question_id):
    try:
        user_id = get_jwt_identity()
        logger.info(f"Fetching versions for question {question_id} by user {user_id}")
        
        # Verify question exists and belongs to user
        question = Question.query.filter_by(id=question_id, user_id=user_id).first()
        if not question:
            logger.warning(f"Question {question_id} not found for user {user_id}")
            return jsonify({'error': 'Question not found'}), 404

        # Get all versions ordered by timestamp
        versions = VersionHistory.query.filter_by(question_id=question_id)\
            .order_by(VersionHistory.timestamp.desc())\
            .all()
        
        logger.info(f"Found {len(versions)} versions for question {question_id}")
        return jsonify([v.to_dict() for v in versions]), 200

    except Exception as e:
        logger.error(f"Error in get_versions: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@api.route('/questions/<int:question_id>/versions/<int:version_id>', methods=['PUT'])
@jwt_required()
def update_version(question_id, version_id):
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        logger.info(f"Updating version {version_id} for question {question_id}")
        
        # Verify question exists and belongs to user
        question = Question.query.filter_by(id=question_id, user_id=user_id).first()
        if not question:
            return jsonify({'error': 'Question not found'}), 404

        # Find the version
        version = VersionHistory.query.filter_by(
            id=version_id,
            question_id=question_id
        ).first()
        
        if not version:
            return jsonify({'error': 'Version not found'}), 404

        # Update version fields
        if 'is_liked' in data:
            version.is_liked = data['is_liked']
        if 'is_bookmarked' in data:
            version.is_bookmarked = data['is_bookmarked']
        if 'content' in data:
            version.content = data['content']
            version.timestamp = datetime.utcnow()

        db.session.commit()
        logger.info(f"Successfully updated version {version_id}")
        return jsonify(version.to_dict()), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error in update_version: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500