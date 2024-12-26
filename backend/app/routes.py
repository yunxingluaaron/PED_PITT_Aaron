from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from .models import User, db


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
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        # Validate request data
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({'message': 'No message provided'}), 400
        
        message = data['message']
        conversation_id = data.get('conversation_id')
        
        # Get or create conversation
        if conversation_id:
            conversation = Conversation.query.filter_by(
                conversation_id=conversation_id,
                user_id=user_id
            ).first()
            if not conversation:
                return jsonify({'message': 'Conversation not found'}), 404
        else:
            conversation_id = str(uuid.uuid4())
            conversation = Conversation(
                conversation_id=conversation_id,
                user_id=user_id
            )
            db.session.add(conversation)
            db.session.commit()
        
        # Generate answer using ElasticsearchQuerier
        hybrid_results = es_querier.hybrid_search(message)
        analysis_results = es_querier.process_search_results(
            results=hybrid_results,
            query=message
        )
        
        # Save message and response
        new_message = Message(
            conversation_id=conversation.id,
            content=message,
            response=analysis_results['analysis'],
            metadata=analysis_results['metadata'],
            sources=analysis_results['sources'],
            relationships=[rel for result in hybrid_results 
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
        
    except Exception as e:
        logger.error(f"Error in submit_question: {str(e)}")
        db.session.rollback()
        return jsonify({'message': 'Internal server error'}), 500

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