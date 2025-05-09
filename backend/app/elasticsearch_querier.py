## app\elasticsearch_querier.py

import json
import os
import logging
import pickle
import faiss
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple
from elasticsearch import Elasticsearch
from openai import OpenAI
from sentence_transformers import SentenceTransformer
from app import real_conversation_analysis as rca


# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize the embedding model
embedding_model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

class ElasticsearchQuerier:
    def __init__(self,
                 es_host: str = 'localhost',
                 es_port: int = 9200,
                 index_name: str = 'ped_literature_3_files_01_01_2025'):
        """
        Initialize Elasticsearch connection, OpenAI client, and conversation data.
        
        Args:
            es_host: Elasticsearch host
            es_port: Elasticsearch port
            index_name: Name of the Elasticsearch index
        """
        try:
            self.es = Elasticsearch(
                hosts=[f"http://{es_host}:{es_port}"],
                basic_auth=('elastic', os.getenv('ES_PASSWORD', 'Lyx19930115'))
            )
            if not self.es.ping():
                raise ConnectionError("Could not connect to Elasticsearch")
                
            self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            if not os.getenv("OPENAI_API_KEY"):
                raise ValueError("OpenAI API key not found in environment variables")

            self.grok_client = OpenAI(api_key=os.getenv("XAI_API_KEY"),
            base_url="https://api.x.ai/v1")
            if not os.getenv("XAI_API_KEY"):
                raise ValueError("xAI API key not found in environment variables")
                    
            self.index_name = index_name
            logger.info(f"Successfully initialized ElasticsearchQuerier with index: {index_name}")
            
            # Initialize conversation data
            self.conversation_data_loaded = False
            self.df = None
            self.question_embeddings = None
            
            # Initialize style templates if method exists
            if hasattr(self, '_initialize_style_templates'):
                self._initialize_style_templates()
                
            # Try to load data using predefined path
            self._load_default_conversation_data()
                
        except Exception as e:
            logger.error(f"Error initializing ElasticsearchQuerier: {str(e)}")
            raise
    
    def _load_default_conversation_data(self):
        """
        Load conversation data from the default location in the project structure.
        """
        try:
            # Determine data path based on project structure
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            data_path = os.path.join(base_dir, 'app', 'step2', 'recovered_utf8_for_excel.csv')
            
            if os.path.exists(data_path):
                logger.info(f"Found default conversation data at {data_path}")
                self.load_conversation_data(data_path)
            else:
                # Try alternative path if first one doesn't exist
                alt_data_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'step2', 'recovered_utf8_for_excel.csv')
                if os.path.exists(alt_data_path):
                    logger.info(f"Found default conversation data at alternative path {alt_data_path}")
                    self.load_conversation_data(alt_data_path)
                else:
                    logger.warning(f"Default conversation data not found at {data_path} or {alt_data_path}")
        except Exception as e:
            logger.error(f"Error loading default conversation data: {str(e)}")
    
    def load_conversation_data(self, data_path: str):
        """
        Load conversation data and embeddings.
        
        Args:
            data_path: Path to the CSV data file
        """
        if not os.path.exists(data_path):
            logger.error(f"Data path does not exist: {data_path}")
            self.conversation_data_loaded = False
            return
            
        try:
            logger.info(f"Loading conversation data from {data_path}")
            self.df, self.question_embeddings = self._initialize_data(data_path)
            self.conversation_data_loaded = True
            logger.info(f"Successfully loaded conversation data: {len(self.df)} conversations")
        except Exception as e:
            logger.error(f"Error loading conversation data: {str(e)}")
            self.conversation_data_loaded = False
    
    def _initialize_data(self, data_path: str):
        """
        Initialize data and embeddings.
        
        Args:
            data_path: Path to the CSV data file
            
        Returns:
            Tuple of (df, question_embeddings)
        """
        # Define paths for caching
        embedding_path = os.path.join(os.path.dirname(data_path), 'embeddings.npy')
        metadata_path = os.path.join(os.path.dirname(data_path), 'metadata.pkl')
        
        try:
            # Load dataset
            df = pd.read_csv(data_path, on_bad_lines='warn')
            
            # Clean data
            df = df.dropna(subset=['department', 'ask', 'answer'])
            df['department'] = df['department'].str.strip()
            df['ask'] = df['ask'].str.strip()
            df['answer'] = df['answer'].str.strip()
            
            # Define top departments if you still want to filter
            top_departments = [
                '内科', '耳鼻喉科', '营养保健科', '消化内科', '新生儿科',
                '外科', '儿科急诊', '眼科', '骨科'
            ]
            
            # Filter dataset
            df = df[df['department'].isin(top_departments)]
            
            # Add index column
            df['index'] = range(len(df))
            
            # Load or create embeddings
            if os.path.exists(embedding_path) and os.path.exists(metadata_path):
                logging.info(f"Loading precomputed embeddings from {embedding_path}")
                question_embeddings = np.load(embedding_path)
                with open(metadata_path, 'rb') as f:
                    metadata = pickle.load(f)
                df = pd.DataFrame(metadata)
            else:
                # Generate embeddings
                logging.info("Generating embeddings for questions")
                question_embeddings = embedding_model.encode(df['ask'].tolist(), show_progress_bar=True, batch_size=128)
                
                # Save embeddings and metadata
                np.save(embedding_path, question_embeddings)
                metadata = df.to_dict('records')
                with open(metadata_path, 'wb') as f:
                    pickle.dump(metadata, f)
                logging.info(f"Saved embeddings to {embedding_path} and metadata to {metadata_path}")
            
            return df, question_embeddings
        
        except Exception as e:
            logging.error(f"Error initializing data: {str(e)}")
            raise

    def get_embedding(self, text: str) -> list:
        """Get embedding for a query text."""
        try:
            response = self.openai_client.embeddings.create(
                model="text-embedding-ada-002",
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            raise

    def get_first_n_words(self, text: str, n: int = 20) -> str:
        """Get first n words from a text."""
        try:
            words = text.split()
            return ' '.join(words[:n]) + ('...' if len(words) > n else '')
        except Exception as e:
            logger.error(f"Error processing text preview: {str(e)}")
            return text[:100] + '...'

    def keyword_search(self, query_text: str, top_k: int = 10) -> List[Dict[str, Any]]:
        """Basic keyword search focusing only on original_text."""
        try:
            query = {
                "size": top_k,
                "query": {
                    "match": {
                        "original_text": {
                            "query": query_text,
                            "operator": "or"
                        }
                    }
                }
            }
            
            response = self.es.search(index=self.index_name, body=query)
            logger.debug(f"Keyword search completed for query: {query_text}")
            return self._process_results(response)
            
        except Exception as e:
            logger.error(f"Error in keyword search: {str(e)}")
            raise

    def semantic_search(self, query_text: str, top_k: int = 10) -> List[Dict[str, Any]]:
        """Semantic search with error handling."""
        try:
            query_embedding = self.get_embedding(query_text)
            
            query = {
                "size": top_k,
                "query": {
                    "script_score": {
                        "query": {"match_all": {}},
                        "script": {
                            "source": "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
                            "params": {"query_vector": query_embedding}
                        }
                    }
                }
            }
            
            response = self.es.search(index=self.index_name, body=query)
            logger.debug(f"Semantic search completed for query: {query_text}")
            return self._process_results(response)
            
        except Exception as e:
            logger.error(f"Error in semantic search: {str(e)}")
            raise

    def _process_results(self, response: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Process search results with source grouping."""
        try:
            grouped_results = {}
            
            for hit in response['hits']['hits']:
                source = hit['_source']
                source_info = source.get('source', {'title': 'Unknown', 'page_number': 0})
                source_key = f"{source_info.get('title', 'Unknown')}_{source_info.get('page_number', 0)}"
                
                # Initialize source group if not exists
                if source_key not in grouped_results:
                    grouped_results[source_key] = {
                        'score': round(hit['_score'], 3),
                        'source': source_info,
                        'text_preview': self.get_first_n_words(source.get('original_text', '')),
                        'relationships': [],
                        'original_text': source.get('original_text', '')  # Keep full text for reranking
                    }
                
                # Add relationships for this source
                relationships = source.get('relationships', [])
                if relationships:
                    for rel in relationships:
                        relationship = {
                            'subject': rel.get('subject', 'N/A'),
                            'predicate': rel.get('predicate', 'N/A'),
                            'object': rel.get('object', 'N/A')
                        }
                        if relationship not in grouped_results[source_key]['relationships']:
                            grouped_results[source_key]['relationships'].append(relationship)
                
            # Convert grouped results to list
            return list(grouped_results.values())
            
        except Exception as e:
            logger.error(f"Error processing search results: {str(e)}")
            raise

    def rerank_results(self, keyword_results: list, semantic_results: list, alpha: float = 0.2, 
                    top_k: int = None) -> List[Dict[str, Any]]:
        """Rerank results with source grouping preservation and debug printing."""
        try:
            def normalize_scores(results):
                if not results:
                    return []
                scores = [float(result['score']) for result in results]
                max_score = max(scores)
                min_score = min(scores)
                score_range = max_score - min_score if max_score != min_score else 1.0
                
                print(f"\nScore Normalization Details:")
                print(f"Max Score: {max_score}")
                print(f"Min Score: {min_score}")
                print(f"Score Range: {score_range}")
                
                normalized = [dict(result, normalized_score=(float(result['score']) - min_score) / score_range)
                            for result in results]
                
                print("\nExample of normalized result structure:")
                if normalized:
                    print("Keys in normalized result:", normalized[0].keys())
                    print("Sample normalized score:", normalized[0]['normalized_score'])
                
                return normalized

            # Print initial counts
            print(f"\nInitial Results Counts:")
            print(f"Keyword results: {len(keyword_results)}")
            print(f"Semantic results: {len(semantic_results)}")

            # Handle single result type cases
            if not keyword_results and semantic_results:
                print("\nOnly semantic results available")
                normalized = normalize_scores(semantic_results)
                final_results = normalized[:top_k] if top_k else normalized
                print("\nFinal result structure (semantic only):")
                if final_results:
                    print("Keys:", final_results[0].keys())
                return final_results
                
            elif not semantic_results and keyword_results:
                print("\nOnly keyword results available")
                normalized = normalize_scores(keyword_results)
                final_results = normalized[:top_k] if top_k else normalized
                print("\nFinal result structure (keyword only):")
                if final_results:
                    print("Keys:", final_results[0].keys())
                return final_results

            # Normalize scores
            print("\nNormalizing keyword results:")
            normalized_keyword = normalize_scores(keyword_results)
            print("\nNormalizing semantic results:")
            normalized_semantic = normalize_scores(semantic_results)

            # Combine results using source as key
            combined_results = {}
            print("\nCombining results by source:")
            
            for result in normalized_keyword + normalized_semantic:
                source_key = f"{result['source']['title']}_{result['source']['page_number']}"
                
                if source_key not in combined_results:
                    combined_results[source_key] = result.copy()
                    combined_results[source_key]['keyword_score'] = 0.0
                    combined_results[source_key]['semantic_score'] = 0.0
                
                if result in normalized_keyword:
                    combined_results[source_key]['keyword_score'] = result['normalized_score']
                if result in normalized_semantic:
                    combined_results[source_key]['semantic_score'] = result['normalized_score']
                
                # Calculate final score
                combined_results[source_key]['final_score'] = (
                    alpha * combined_results[source_key]['keyword_score'] +
                    (1 - alpha) * combined_results[source_key]['semantic_score']
                )

            # Print combined results structure
            # print("\nCombined Results Structure:")
            # if combined_results:
            #     sample_key = next(iter(combined_results))
            #     print("\nSample source key:", sample_key)
            #     print("Keys in combined result:", combined_results[sample_key].keys())
            #     print("\nSample values for first result:")
            #     for key, value in combined_results[sample_key].items():
            #         print(f"{key}: {value}")

            # Sort and limit results
            reranked = sorted(combined_results.values(), key=lambda x: x['final_score'], reverse=True)
            final_results = reranked[:top_k] if top_k else reranked

            # Print final structure
            print("\nFinal Reranked Results Structure:")
            print(f"Number of results: {len(final_results)}")
            if final_results:
                print("Keys in final result:", final_results[0].keys())
            #     print("\nExample of first result:")
            #     for key, value in final_results[0].items():
            #         print(f"{key}: {value}")

            return final_results
            
        except Exception as e:
            logger.error(f"Error in reranking: {str(e)}")
        raise

    def hybrid_search(self, query_text: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Hybrid search with improved results grouping."""
        try:
            # Get results from both methods
            keyword_results = self.keyword_search(query_text, top_k=top_k*2)
            semantic_results = self.semantic_search(query_text, top_k=top_k*2)
            
            # Rerank and return results
            return self.rerank_results(
                keyword_results=keyword_results,
                semantic_results=semantic_results,
                alpha=0.2,
                top_k=top_k
            )
            
        except Exception as e:
            logger.error(f"Error in hybrid search: {str(e)}")
            raise
    
    def _generate_system_messages(self, parameters: dict) -> List[Dict[str, str]]:
        """Generate structured system messages with style instructions."""
        selected_styles = {
            category: self.style_map[category][value]
            for category, value in parameters.items()
        }
        
        # Base system message with role definition
        base_system = {
            "role": "system",
            "content": """You are Dr. Aaron Lu, a pediatrician with expertise in child development. 
            You must strictly adhere to the communication style specified in these instructions."""
        }

        # Style-specific system message
        style_content = []
        for category, style in selected_styles.items():
            style_content.extend([
                f"\n{category.upper()} REQUIREMENTS:",
                f"- Follow this style: {style['description']}",
                "Required language patterns:",
                *[f"- {marker}" for marker in style['markers']],
                f"Reference example: {style['example']}"
            ])

        style_system = {
            "role": "system",
            "content": "\n".join(style_content)
        }

        # Format requirements system message
        format_system = {
            "role": "system",
            "content": """FORMAT REQUIREMENTS:
            - Use clear Markdown formatting with proper spacing
            - Include blank lines before and after headers
            - Use level 2 headers (##) for main sections
            - Use level 3 headers (###) for subsections
            - Separate paragraphs with blank lines
            - Citations: (Source: [Title], Page [number])
            - Multiple citations separated by semicolons"""
        }

        return [base_system, style_system, format_system]   
    

    def process_search_results(self, results: List[Dict], query: str, parameters: dict = None) -> Dict[str, Any]:
        """
        Process search results with enhanced style control and conversation analysis.
        
        Args:
            results: List of search results
            query: The parent's query
            parameters: Dictionary of style parameters
            
        Returns:
            Dictionary with processed results including detailed and simplified analysis
        """
        import traceback
        
        parameters = parameters or {
            'tone': 'balanced',
            'detailLevel': 'moderate',
            'empathy': 'moderate',
            'professionalStyle': 'clinicallyBalanced',
            'conversation_action': 'continue'
        }

        parent_name = parameters.get('parent_name', '')

        conversation_action = parameters.get('conversation_action', 'continue')
        
        logger.info(f"From the process search results, the Processing search with parameters: {parameters}")
        logger.info(f"Parent name for response: {parent_name}")

        text_content = []
        sources = set()
        for result in results:
            text_snippet = {
                'text': result['original_text'],
                'source': f"{result['source']['title']} (Page {result['source']['page_number']})"
            }
            text_content.append(text_snippet)
            sources.add(text_snippet['source'])

        formatted_text = "\n".join([
            f"[{snippet['source']}]: {snippet['text']}" 
            for snippet in text_content
        ])

        try:
            filtered_parameters = {k: v for k, v in parameters.items() 
                                if k in ['tone', 'detailLevel', 'empathy', 'professionalStyle']}
            messages = self._generate_system_messages(filtered_parameters)
            
            user_message = {
                "role": "user",
                "content": f"""You have a parent named {parent_name}, who is asking questions about: {query} regarding their child.

                    Below is the RELEVANT MEDICAL INFORMATION that you have discovered in relation to their query:
                    {formatted_text}

                    Now you will write a message to {parent_name}, ensuring it follows these communication requirements from the system prompts to demonstrate thorough care and professionalism as a pediatric doctor.

                    REQUIREMENTS:
        0. Begin with **"Dear {parent_name},"** and write from the perspective of **Dr. Aaron Lu**, a pediatrician.
        1. Maintain the specified communication style consistently throughout your response.
        2. **Cite EVERY piece of medical information** using the format **(Source: [article name], Page [number]).**
        3. If multiple sources support a statement, cite all relevant sources.
        4. Present your response in **Markdown format**, using:
        - **Heading levels** (`#`, `##`, `###`) for main sections and sub-sections
        - **Line breaks** between paragraphs
        - **Bullet points** where appropriate
        5. Use only the information from the provided sources. If information is not available, clearly state that.
        6. Open your message with an **appropriate emotional acknowledgment** based on the specified empathy level.
        7. Organize your response to progress logically from **acknowledgment → explanation → recommendations**.
        8. End with a **closing** that reflects the specified tone and empathy level."""
            }
            
            messages.append(user_message)
            temperature = 0.3

            # Call the Grok API
            logger.info("Calling Grok API to generate response")
            completion = self.grok_client.chat.completions.create(
                model="grok-3-latest",
                messages=messages,
                temperature=temperature
            )
            
            response_text = completion.choices[0].message.content
            detailed_analysis = response_text
            logger.info(f"Generated detailed response with style parameters: {filtered_parameters}")
            
            simple_analysis = None
            if self.conversation_data_loaded:
                logger.info("Conversation data is loaded. Attempting to retrieve similar conversations...")
                try:
                    conversation_examples = rca.retrieve_conversations(
                        query=query,
                        df=self.df,
                        question_embeddings=self.question_embeddings,
                        top_k=5,
                        final_k=3
                    )
                    
                    logger.info(f"Retrieved {len(conversation_examples)} conversation examples")
                    
                    logger.info("Generating response using rca.generate_response")
                    simple_analysis = rca.generate_response(
                        query=query,
                        textbook_info=detailed_analysis,
                        examples=conversation_examples,
                        language="neutral",
                        parent_name=parent_name,
                        conversation_action=conversation_action
                    )
                    
                    logger.info("Successfully generated response using real conversation analysis")
                    
                except Exception as e:
                    logger.error(f"Error in real conversation analysis: {str(e)}")
                    logger.error(f"Error traceback: {traceback.format_exc()}")
                    simple_analysis = "Error generating simplified analysis based on real conversations."
            else:
                logger.warning("Conversation data not loaded. Skipping real conversation analysis.")
                
        except Exception as e:
            logger.error(f"Grok API error: {str(e)}")
            logger.error(f"Error traceback: {traceback.format_exc()}")
            detailed_analysis = "Error generating analysis. Please try again."
            simple_analysis = None

        metadata = {
            'num_results': len(results),
            'num_sources': len(sources),
            'style_parameters': filtered_parameters,
        }
        
        if parent_name:
            metadata['parent_name'] = parent_name

        result = {
            'text_content': text_content,
            'sources': list(sources),
            'analysis': detailed_analysis,
            'metadata': metadata
        }
        
        if simple_analysis:
            result['simple_analysis'] = simple_analysis
        logger.info(f"Generated simple analysis: {simple_analysis}")
        return result
# Remove the create_chat_messages method since we're now handling it directly
# in the process_search_results method to avoid potential issues


    def _initialize_style_templates(self):
        """
        Initialize comprehensive style templates with distinct characteristics.
        These templates are designed for pediatricians addressing concerned parents
        about their children's health situations.
        """

        self.style_map = {
    'tone': {
        'friendly': {
            'description': (
                "Adopt a warm, reassuring style that fosters a personal connection with parents or guardians. "
                "Use welcoming language and inclusive pronouns (e.g., 'we' or 'together') to build trust. "
                "Aim to convey empathy and genuine concern for the child's well-being while explaining medical details."
            ),
            'markers': [
                "Use a friendly, approachable tone and first-person pronouns such as 'I' or 'we'",
                "Include gentle phrases (e.g., 'you know,' 'let’s see') to put parents at ease",
                "Offer brief, relatable anecdotes or stories to illustrate points",
                "Rephrase technical terms or clarify them in plain language when first introduced",
                "Acknowledge the emotional concerns parents may have in a caring but non-patronizing way"
            ],
            'example': (
                "I understand it can be scary to see your child feeling unwell, especially if it seems to happen frequently. "
                "Remember, you’re not alone, and there are steps we can take together to help your child feel better. "
                "Let’s discuss each symptom and find practical ways to manage them."
            )
        },
        'balanced': {
            'description': (
                "Blend a professional, knowledgeable tone with an approachable manner. "
                "This style offers enough technical depth to reassure parents of your expertise, "
                "while remaining accessible and easy to follow. Aim for clarity and empathy without extensive informality."
            ),
            'markers': [
                "Maintain a measured, informed tone that balances professional and accessible language",
                "Introduce medical terms alongside concise, plain-language definitions",
                "Use calm, reassuring language to instill confidence without being overly casual",
                "Encourage questions and clarify complex areas without overwhelming detail",
                "Acknowledge that parents may feel worried while offering balanced reassurance"
            ],
            'example': (
                "Certain pediatric conditions can lead to frequent infections or discomfort. While it may sound concerning, "
                "there are evidence-based treatments and preventive measures that can help. Let’s explore these step by step."
            )
        },
        'formal': {
            'description': (
                "Present information in a structured, authoritative manner, using precise medical terminology "
                "and a more formal register. This style positions you as a subject-matter expert who communicates "
                "complex details systematically and objectively."
            ),
            'markers': [
                "Use advanced medical terms and formal phrasing",
                "Prefer a third-person perspective or passive constructions (e.g., 'it is recommended')",
                "Employ transitional phrases like 'furthermore,' 'in addition,' or 'moreover' to structure discourse",
                "Maintain a respectful distance and professional tone, focusing on clear, factual statements",
                "Clarify intricate concepts thoroughly, anticipating the need for explicit definitions"
            ],
            'example': (
                "A comprehensive pediatric assessment often involves both physical examination and developmental screening. "
                "Furthermore, adherence to immunization schedules has been correlated with a reduced incidence of common childhood illnesses."
            )
        }
    },

    'detailLevel': {
        'brief': {
            'description': (
                "Provide concise answers that focus on essential information. Ideal for busy parents needing quick insights without depth."
            ),
            'markers': [
                "Quick, essential overviews only",
                "Limit details to key actions or conclusions",
                "Avoid in-depth background",
                "Use direct, brief sentences",
                "Minimize technical terms"
            ],
            'example': (
                "To support your child's health, ensure regular check-ups, maintain recommended vaccinations, and monitor any changes in their symptoms."
            )
        },
        'moderate': {
            'description': (
                "Balance conciseness with enough detail to give clarity. Explain recommendations clearly, providing some medical background to help parents understand their importance."
            ),
            'markers': [
                "Brief explanations of important concepts",
                "Use examples to clarify crucial points",
                "Discuss treatment effectiveness briefly",
                "Outline actionable steps for home care",
                "Provide context to anticipate common questions"
            ],
            'example': (
                "During a typical pediatric visit, we check growth and development milestones to ensure your child is progressing normally. "
                "Staying consistent with vaccinations helps protect against common illnesses and supports overall well-being."
            )
        },
        'comprehensive': {
            'description': (
                "Provide thorough explanations, including various aspects of the condition, treatment options, and long-term strategies. "
                "Suitable for parents seeking an in-depth understanding."
            ),
            'markers': [
                "In-depth discussion of underlying mechanisms or causes",
                "Cite studies and guidelines",
                "Compare different treatment strategies",
                "Discuss potential complications and prevention",
                "Suggest considering comprehensive care options"
            ],
            'example': (
                "Certain pediatric conditions may be influenced by genetic factors and environmental triggers, "
                "leading to recurring symptoms. Management strategies could include specialized therapies, routine check-ups, "
                "and tailored home interventions. Research published in leading pediatric journals supports early intervention "
                "as a key factor in improving long-term outcomes."
            )
        }
    },

    'empathy': {
        'low': {
            'description': (
                "Keep the focus strictly on objective information with minimal emotional language. "
                "This style may be appropriate for parents who prioritize data, research, and direct solutions "
                "over personal reassurance."
            ),
            'markers': [
                "Emphasize clinical outcomes, data, and treatment effectiveness",
                "Use impersonal or third-person constructions (e.g., 'the child may experience...')",
                "Avoid empathetic phrases or mentions of emotional impact",
                "Present facts in a detached, matter-of-fact way",
                "Limit reassurance to short statements of efficacy or results"
            ],
            'example': (
                "Studies indicate that children receiving regular developmental screenings have fewer missed diagnoses. "
                "Adhering to treatment protocols is correlated with improved outcomes for conditions such as asthma or eczema."
            )
        },
        'moderate': {
            'description': (
                "Blend practical guidance with an understanding tone. Offer empathy and reassurance in moderation, "
                "acknowledging the emotional toll on parents while remaining focused on actionable steps. "
                "This style suits parents who need both information and a touch of emotional support."
            ),
            'markers': [
                "Offer concise reassurance or acknowledgment of emotional concerns",
                "Use a calm, composed tone when discussing sensitive topics",
                "Focus on factual steps while occasionally validating feelings",
                "Provide logical explanations tied to practical benefits",
                "Encourage parents to stay hopeful but also realistic"
            ],
            'example': (
                "I know it can feel overwhelming when your child experiences frequent colds. "
                "However, maintaining a consistent handwashing routine, a balanced diet, and regular check-ups can greatly reduce both the frequency and severity of these illnesses."
            )
        },
        'high': {
            'description': (
                "Prioritize emotional support and reassurance in your communication. This style is particularly appropriate "
                "for parents who feel anxious or overwhelmed and benefit from consistent empathy. Stress that their feelings "
                "are valid and that help is available."
            ),
            'markers': [
                "Use language that frequently validates parents’ worries and emotional state",
                "Reassure them that they are doing their best for their child",
                "Incorporate comforting phrases to normalize their fears and anxieties",
                "Acknowledge emotional burden and emphasize partnership in the child’s care",
                "Balance emotional support with appropriate medical guidance"
            ],
            'example': (
                "I truly understand how concerning it can be when your little one is feeling unwell. "
                "It’s never easy watching them struggle, but please remember that you’re already taking important steps by asking questions and seeking care. "
                "We’ll work together to find the best approach for your child’s needs."
            )
        }
    },

    'professionalStyle': {
        'laypersonFriendly': {
            'description': (
                "Use plain language and familiar analogies that even those without medical backgrounds can grasp. "
                "Strive to simplify complex medical ideas, ensuring parents feel comfortable and confident asking "
                "follow-up questions without feeling intimidated."
            ),
            'markers': [
                "Use everyday examples (e.g., comparing the body to a machine that sometimes needs a tune-up)",
                "Avoid excessive medical jargon; if used, provide simple definitions immediately",
                "Break down complex processes into step-by-step explanations",
                "Confirm understanding by encouraging feedback or questions from parents",
                "Emphasize collaboration in caring for the child"
            ],
            'example': (
                "Think of your child’s immune system like a protective shield. Sometimes, that shield gets weak, and germs can sneak in, causing illness. "
                "Let’s talk about the ways we can help strengthen that shield, like good nutrition, plenty of rest, and regular handwashing."
            )
        },
        'clinicallyBalanced': {
            'description': (
                "Combine the use of standard medical terminology with clear, accessible explanations. "
                "This approach reassures parents of your expertise while ensuring they can follow along "
                "without feeling lost in technical details."
            ),
            'markers': [
                "Introduce and define medical terms in plain language",
                "Use a structured approach, starting with basic concepts before building to more complex ones",
                "Reference well-known guidelines or therapies, explaining how they work in everyday situations",
                "Encourage parents to ask questions about any terms or concepts that remain unclear",
                "Include general clinical data or research in a digestible format"
            ],
            'example': (
                "If your child often experiences ear infections, known medically as otitis media, we can manage them by using appropriate antibiotics, "
                "ensuring follow-up exams, and possibly exploring preventive measures if infections are recurrent."
            )
        },
        'technical': {
            'description': (
                "Employ advanced medical terminology and in-depth physiological or clinical explanations. "
                "Best suited for discussions with parents who have a strong medical background or a desire "
                "for highly detailed scientific information."
            ),
            'markers': [
                "Use specialized medical vocabulary (e.g., 'inflammatory response', 'pathophysiology')",
                "Include references to relevant clinical guidelines or research findings where applicable",
                "Discuss treatment protocols in detail, including dosing considerations and scientific rationale",
                "Highlight potential comorbidities or complications with clinical specificity",
                "Include possible future developments or ongoing clinical trials if applicable"
            ],
            'example': (
                "Recurrent otitis media can lead to complications such as tympanic membrane perforation or conductive hearing loss. "
                "Current guidelines suggest a watch-and-wait approach for mild symptoms, followed by antibiotic therapy when clinically indicated, "
                "to mitigate antibiotic resistance. For persistent cases, tympanostomy tubes may be considered."
            )
        }
    }
}

