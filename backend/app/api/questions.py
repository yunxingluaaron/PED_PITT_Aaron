from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.database import db
from app.models import Question, Message, VersionHistory
import logging

# Import the blueprint directly
from app.api import api

# Set up logging
logger = logging.getLogger(__name__)

@api.route('/questions', methods=['GET'])
@jwt_required()
def get_questions():
    logger.info("📋 Getting all questions")
    try:
        user_id = get_jwt_identity()
        questions = Question.query.filter_by(
            user_id=user_id,
            is_archived=False
        ).order_by(Question.created_at.desc()).all()
        
        logger.info(f"📊 Found {len(questions)} questions")
        
        questions_data = []
        for q in questions:
            # Get the associated message for each question
            message = Message.query.filter_by(
                conversation_id=q.conversation_id,
                content=q.content
            ).first()
            
            if message:
                logger.info(f"💬 Found message for question {q.id}")
            else:
                logger.warning(f"⚠️ No message found for question {q.id}")
            
            question_data = {
                'id': q.id,
                'content': q.content,
                'created_at': q.created_at.isoformat(),
                'conversation_id': q.conversation_id,
                'response': message.response if message else None,
                'source_data': message.source_data if message else None,
                'response_metadata': message.response_metadata if message else None
            }
            questions_data.append(question_data)
        
        logger.info(f"📤 Returning {len(questions_data)} questions")
        return jsonify(questions_data), 200
    except Exception as e:
        logger.error(f"💥 Error in get_questions: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500


@api.route('/questions/<int:question_id>', methods=['GET'])
@jwt_required()
def get_question_details(question_id):
    try:
        user_id = get_jwt_identity()
        logger.info(f"🔍 Getting question details for ID: {question_id}")
        logger.info(f"👤 User ID: {user_id}")

        question = Question.query.filter_by(id=question_id, user_id=user_id).first()
        if not question:
            logger.warning(f"Question not found: {question_id}")
            return jsonify({'error': 'Question not found'}), 404
        
        logger.info(f"📝 Found question: {question.content}")

        message = Message.query.filter_by(conversation_id=question.conversation_id).order_by(Message.created_at.desc()).first()
        if not message:
            logger.warning(f"No message found for question: {question_id}")
            return jsonify({'error': 'No message found for this question'}), 404

        logger.info(f"💬 Found associated message with response length: {len(message.response or '')}")

        question_data = question.to_dict()
        question_data['response'] = message.response  # simple_response
        question_data['detailed_response'] = message.detailed_response  # detailed_response
        question_data['source_data'] = message.source_data
        question_data['response_metadata'] = message.response_metadata

        logger.info(f"📦 Returning question data with fields: {list(question_data.keys())}")
        logger.debug(f"📦 Full question data: {question_data}")

        return jsonify(question_data)
    except Exception as e:
        logger.error(f"Error in get_question_details: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500


@api.route('/questions/<int:question_id>', methods=['DELETE'])
@jwt_required()
def delete_question(question_id):
    try:
        user_id = get_jwt_identity()
        
        question = Question.query.filter_by(
            id=question_id,
            user_id=user_id
        ).first()
        
        if not question:
            return jsonify({'error': 'Question not found'}), 404
            
        # Delete associated versions first
        VersionHistory.query.filter_by(question_id=question_id).delete()
        
        # Delete the question
        db.session.delete(question)
        db.session.commit()
        
        return jsonify({'message': 'Question deleted successfully'}), 200
        
    except Exception as e:
        logger.error(f"Error deleting question: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to delete question'}), 500