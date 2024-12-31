from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.database import db
from app.models import User, Question, VersionHistory, Conversation, Message
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime
import uuid
import logging
########## 关于 回答功能的 api ###########

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.database import db
from app.models import User, Conversation, Message
from app.models import VersionHistory, Question
from app.schemas import MessageBase, MessageResponse
from app.elasticsearch_querier import ElasticsearchQuerier
import uuid
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create blueprint
api = Blueprint('api', __name__)



# Initialize ElasticsearchQuerier
es_querier = ElasticsearchQuerier()

# Updated submit_question route
@api.route('/chat', methods=['POST'])
@jwt_required()
def submit_question():
    try:
        user_id = get_jwt_identity()
        logger.info(f"Processing chat request for user ID: {user_id}")

        data = request.get_json()
        logger.info(f"in the chat api, the data is {data}")

        if not data or 'message' not in data:
            logger.warning("Missing message in request")
            return jsonify({'error': 'Message is required'}), 400

        user = User.query.get(user_id)
        if not user:
            logger.error(f"User not found for ID: {user_id}")
            return jsonify({'error': 'User not found'}), 404

        message = data['message']
        conversation_id = data.get('conversation_id')

        try:
            # Handle conversation
            if conversation_id:
                conversation = Conversation.query.filter_by(
                    conversation_id=conversation_id,
                    user_id=user_id
                ).first()
                if not conversation:
                    logger.warning(f"Conversation not found: {conversation_id}")
                    return jsonify({'error': 'Conversation not found'}), 404
            else:
                conversation_id = str(uuid.uuid4())
                conversation = Conversation(
                    conversation_id=conversation_id,
                    user_id=user_id
                )
                db.session.add(conversation)
                db.session.flush()

            # Create question record
            new_question = Question(
                user_id=user_id,
                content=message,
                conversation_id=conversation.id
            )
            db.session.add(new_question)
            db.session.flush()

            # Generate answer
            try:
                hybrid_results = es_querier.hybrid_search(message)
                analysis_results = es_querier.process_search_results(
                    results=hybrid_results,
                    query=message
                )
            except Exception as e:
                logger.error(f"Search/Analysis error: {str(e)}", exc_info=True)
                return jsonify({'error': 'Error processing question'}), 500

            # Save message and response
            new_message = Message(
                conversation_id=conversation.id,
                content=message,
                response=analysis_results['analysis'],
                response_metadata=analysis_results['metadata'],
                source_data=analysis_results['sources'],
                relationship_data=[rel for result in hybrid_results 
                             for rel in result.get('relationships', [])]
            )
            db.session.add(new_message)

            # Create version history entries
            user_version = VersionHistory(
                question_id=new_question.id,
                content=message,
                type='user',
                timestamp=datetime.utcnow()
            )
            db.session.add(user_version)

            ai_version = VersionHistory(
                question_id=new_question.id,
                content=analysis_results['analysis'],
                type='ai',
                timestamp=datetime.utcnow()
            )
            db.session.add(ai_version)

            db.session.commit()

            # Prepare response
            response_data = {
                'conversation_id': conversation_id,
                'question_id': new_question.id,  # Make sure this is included
                'detailed_response': analysis_results['analysis'],
                'sources': analysis_results['sources'],
                'metadata': analysis_results['metadata'],
                'relationships': [rel for result in hybrid_results 
                                for rel in result.get('relationships', [])],
                'text_content': analysis_results['text_content'],
                # Add these fields for proper version tracking
                'ai_version_id': ai_version.id,
                'user_version_id': user_version.id
            }

            return jsonify(response_data), 200

        except SQLAlchemyError as e:
            logger.error(f"Database error: {str(e)}", exc_info=True)
            db.session.rollback()
            return jsonify({'error': 'Database error occurred'}), 500

    except Exception as e:
        logger.error(f"Chat endpoint error: {str(e)}", exc_info=True)
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500
    


@api.route('/conversations/<conversation_id>', methods=['GET'])
@jwt_required()
def get_conversation(conversation_id):
    try:
        user_id = get_jwt_identity()
        
        conversation = Conversation.query.filter_by(
            conversation_id=conversation_id,
            user_id=user_id
        ).first()
        
        if not conversation:
            return jsonify({'message': 'Conversation not found'}), 404
        
        messages = Message.query.filter_by(
            conversation_id=conversation.id
        ).order_by(Message.created_at.asc()).all()
        
        messages_data = [{
            'content': msg.content,
            'response': msg.response,
            'metadata': msg.metadata,
            'sources': msg.sources,
            'relationships': msg.relationships,
            'created_at': msg.created_at.isoformat()
        } for msg in messages]
        
        return jsonify({
            'conversation_id': conversation_id,
            'messages': messages_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error in get_conversation: {str(e)}")
        return jsonify({'message': 'Internal server error'}), 500
    

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

# Add new endpoint for updating version
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
    
    # Add this new endpoint to get full question details
@api.route('/questions/<int:question_id>', methods=['GET'])
@jwt_required()
def get_question_details(question_id):
    logger.info(f"🔍 Getting question details for ID: {question_id}")
    try:
        user_id = get_jwt_identity()
        logger.info(f"👤 User ID: {user_id}")
        
        # Join with Message to get the response data
        question = Question.query.filter_by(
            id=question_id,
            user_id=user_id
        ).first()
        
        if not question:
            logger.warning(f"❌ Question not found for ID: {question_id}")
            return jsonify({'error': 'Question not found'}), 404
            
        logger.info(f"📝 Found question: {question.content}")
        
        # Get the associated message for this question
        message = Message.query.filter_by(
            conversation_id=question.conversation_id,
            content=question.content
        ).first()
        
        if not message:
            logger.warning(f"❌ Message not found for question ID: {question_id}")
            return jsonify({'error': 'Message not found'}), 404
            
        logger.info(f"💬 Found associated message with response length: {len(str(message.response)) if message.response else 0}")
        
        question_data = {
            'id': question.id,
            'content': question.content,
            'created_at': question.created_at.isoformat(),
            'conversation_id': question.conversation_id,
            'response': message.response,
            'source_data': message.source_data,
            'response_metadata': message.response_metadata
        }
        
        logger.info(f"📦 Returning question data with fields: {list(question_data.keys())}")
        logger.debug(f"📦 Full question data: {question_data}")
        
        return jsonify(question_data), 200
        
    except Exception as e:
        logger.error(f"💥 Error in get_question_details: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500