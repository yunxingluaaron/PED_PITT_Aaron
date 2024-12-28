from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from .models import User, db
from sqlalchemy.exc import SQLAlchemyError


########## 关于 回答功能的 api ###########

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.database import db
from app.models import User, Conversation, Message
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

@api.route('/chat', methods=['POST'])
@jwt_required()
def submit_question():
    try:
        # Get user ID from JWT token
        user_id = get_jwt_identity()
        logger.info(f"Processing chat request for user ID: {user_id}")

        # Validate request data
        data = request.get_json()

        logger.info(f"in the chat api, the data is {data}")


        if not data or 'message' not in data:
            logger.warning("Missing message in request")
            return jsonify({'error': 'Message is required'}), 400

        # Get user
        user = User.query.get(user_id)
        if not user:
            logger.error(f"User not found for ID: {user_id}")
            return jsonify({'error': 'User not found'}), 404

        message = data['message']
        conversation_id = data.get('conversation_id')

        # Handle conversation
        try:
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
                db.session.commit()
                logger.info(f"Created new conversation: {conversation_id}")

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
            db.session.commit()

            # Prepare response
            response_data = {
                'conversation_id': conversation_id,
                'detailed_response': analysis_results['analysis'],
                'sources': analysis_results['sources'],
                'metadata': analysis_results['metadata'],
                'relationships': [rel for result in hybrid_results 
                                for rel in result.get('relationships', [])],
                'text_content': analysis_results['text_content']
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