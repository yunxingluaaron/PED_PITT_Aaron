from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.database import db
from app.models import User, Conversation, Message
from app.models import VersionHistory, Question
from app.elasticsearch_querier import ElasticsearchQuerier
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime
import uuid
import logging

# Import the blueprint directly
from app.api import api

# Set up logging
logger = logging.getLogger(__name__)

# Initialize ElasticsearchQuerier
es_querier = ElasticsearchQuerier()

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

        # Extract parameters from request
        parameters = data.get('parameters', {
            'tone': 'balanced',
            'detailLevel': 'moderate',
            'empathy': 'moderate',
            'professionalStyle': 'clinicallyBalanced'
        })

        # Extract parent name from request
        parent_name = data.get('parent_name', '')
        logger.info(f"Parent name received: {parent_name}")

        # Add parent_name to parameters if provided
        if parent_name:
            parameters['parent_name'] = parent_name

        logger.info(f"in the chat api, the tuning parameters is {parameters}")

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
                conversation_id=conversation.id,
                parent_name=parent_name
            )
            db.session.add(new_question)
            db.session.flush()

            # Generate answer with parameters
            try:
                hybrid_results = es_querier.hybrid_search(message)
                analysis_results = es_querier.process_search_results(
                    results=hybrid_results,
                    query=message,
                    parameters=parameters
                )
            except Exception as e:
                logger.error(f"Search/Analysis error: {str(e)}", exc_info=True)
                return jsonify({'error': 'Error processing question'}), 500

            # Save message and response
            new_message = Message(
                conversation_id=conversation.id,
                content=message,
                response=analysis_results['simple_analysis'],
                detailed_response = analysis_results['analysis'],
                response_metadata=analysis_results['metadata'],
                source_data=analysis_results['sources'],
                relationship_data=[rel for result in hybrid_results 
                             for rel in result.get('relationships', [])],
                parent_name=parent_name
            )
            db.session.add(new_message)

            # Create version history entries
            user_version = VersionHistory(
                question_id=new_question.id,
                content=message,
                type='user',
                timestamp=datetime.utcnow(),
                parent_name=parent_name
            )
            db.session.add(user_version)

            ai_version = VersionHistory(
                question_id=new_question.id,
                content=analysis_results['simple_analysis'],
                type='ai',
                timestamp=datetime.utcnow(),
                parent_name=parent_name
            )
            db.session.add(ai_version)

            db.session.commit()

            # Prepare response with both detailed and simple analysis
            response_data = {
                'conversation_id': conversation_id,
                'question_id': new_question.id,
                'detailed_response': analysis_results['analysis'],  # 返回详细分析
                'simple_response': analysis_results['simple_analysis'],  # 返回简洁分析
                'sources': analysis_results['sources'],
                'metadata': analysis_results['metadata'],
                'relationships': [rel for result in hybrid_results 
                                for rel in result.get('relationships', [])],
                'text_content': analysis_results['text_content'],
                'ai_version_id': ai_version.id,
                'user_version_id': user_version.id,
                'parent_name': parent_name
            }

            return jsonify(response_data)

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
            'simple_response': msg.response,
            'detailed_response': msg.detailed_response,
            'metadata': msg.response_metadata,
            'sources': msg.source_data,
            'relationships': msg.relationship_data,
            'created_at': msg.created_at.isoformat(),
            'parent_name': msg.parent_name
        } for msg in messages]
        
        return jsonify({
            'conversation_id': conversation_id,
            'messages': messages_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error in get_conversation: {str(e)}")
        return jsonify({'message': 'Internal server error'}), 500