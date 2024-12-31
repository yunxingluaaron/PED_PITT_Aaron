import json
from elasticsearch import Elasticsearch
from openai import OpenAI
from dotenv import load_dotenv
import os
import logging
from typing import List, Dict, Any

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ElasticsearchQuerier:
    def __init__(self,
                 es_host: str = 'localhost',
                 es_port: int = 9200,
                 index_name: str = 'scd_literature'):
        """Initialize Elasticsearch connection and OpenAI client."""
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
                
            self.index_name = index_name
            logger.info(f"Successfully initialized ElasticsearchQuerier with index: {index_name}")

            self._initialize_style_templates()
            
        except Exception as e:
            logger.error(f"Error initializing ElasticsearchQuerier: {str(e)}")
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

    def _initialize_style_templates(self):
        """Initialize comprehensive style templates with distinct characteristics."""
        self.style_map = {
            'tone': {
                'friendly': {
                    'description': "Use casual, warm language with first-person pronouns and conversational phrases.",
                    'markers': [
                        "Use 'I' and 'we' pronouns frequently",
                        "Include conversational transitions like 'you see,' and 'let me explain'",
                        "Break down complex terms immediately after using them"
                    ],
                    'example': "I want to help you understand what's happening with your child's condition. You see, when we talk about sickle cell disease..."
                },
                'balanced': {
                    'description': "Blend professional expertise with accessible explanations.",
                    'markers': [
                        "Balance technical terms with plain language explanations",
                        "Use measured, clear language",
                        "Maintain professional distance while being approachable"
                    ],
                    'example': "Sickle cell disease affects the red blood cells. This means that the cells that carry oxygen through the body become shaped like crescents instead of their normal round shape."
                },
                'formal': {
                    'description': "Employ academic language and structured medical discourse.",
                    'markers': [
                        "Use precise medical terminology",
                        "Maintain third-person perspective",
                        "Employ formal transition phrases and discourse markers"
                    ],
                    'example': "Clinical manifestations of sickle cell disease include vaso-occlusive events characterized by acute pain episodes."
                }
            },
            'detailLevel': {
                'brief': {
                    'description': "Provide essential points only with minimal elaboration.",
                    'markers': [
                        "Focus on key takeaways",
                        "Limit background information",
                        "Use concise sentence structures"
                    ],
                    'example': "The primary treatment goals are pain management and prevention of complications."
                },
                'moderate': {
                    'description': "Balance detail with accessibility.",
                    'markers': [
                        "Provide context for key points",
                        "Include relevant examples",
                        "Explain common considerations"
                    ],
                    'example': "Pain management involves both preventive measures and acute treatment. Common preventive strategies include staying hydrated and avoiding extreme temperatures."
                },
                'comprehensive': {
                    'description': "Deliver thorough explanations with scientific depth.",
                    'markers': [
                        "Include detailed medical explanations",
                        "Discuss multiple aspects of each point",
                        "Provide extensive context and implications"
                    ],
                    'example': "Pain management in sickle cell disease involves a multi-faceted approach, including both pharmacological and non-pharmacological interventions. The pharmacological approach typically begins with..."
                }
            },
            'empathy': {
                'low': {
                    'description': "Focus on clinical information with minimal emotional language.",
                    'markers': [
                        "Emphasize data and outcomes",
                        "Use objective language",
                        "Minimize emotional reassurance"
                    ],
                    'example': "Research indicates that regular hydration reduces the frequency of pain crises by approximately 40%."
                },
                'moderate': {
                    'description': "Balance emotional support with practical guidance.",
                    'markers': [
                        "Acknowledge concerns briefly",
                        "Include occasional reassurance",
                        "Focus primarily on actionable information"
                    ],
                    'example': "While these symptoms can be concerning, there are several effective management strategies available. Let's focus on the practical steps you can take."
                },
                'high': {
                    'description': "Prioritize emotional support and reassurance.",
                    'markers': [
                        "Lead with emotional validation",
                        "Include frequent reassurance",
                        "Acknowledge and normalize feelings"
                    ],
                    'example': "I understand how overwhelming and scary these symptoms must be for you and your child. It's completely normal to feel worried, and I want you to know that we're here to support you every step of the way."
                }
            },
            'professionalStyle': {
                'laypersonFriendly': {
                    'description': "Use simple terms and everyday analogies.",
                    'markers': [
                        "Avoid medical jargon",
                        "Use everyday analogies",
                        "Explain concepts using familiar references"
                    ],
                    'example': "Think of blood cells like tiny boats carrying oxygen through rivers in your body. In sickle cell disease, these boats become shaped more like crescents."
                },
                'clinicallyBalanced': {
                    'description': "Blend medical terminology with accessible explanations.",
                    'markers': [
                        "Use medical terms with immediate explanations",
                        "Balance technical accuracy with clarity",
                        "Include both scientific and lay terminology"
                    ],
                    'example': "Vaso-occlusive crises - episodes where blood vessels become blocked by sickle-shaped cells - can cause severe pain."
                },
                'technical': {
                    'description': "Use advanced medical terminology and concepts.",
                    'markers': [
                        "Employ specialized medical vocabulary",
                        "Include detailed physiological explanations",
                        "Reference specific medical processes"
                    ],
                    'example': "The pathophysiology involves polymerization of deoxygenated hemoglobin S, leading to erythrocyte sickling and subsequent vaso-occlusion."
                }
            }
        }

    def process_search_results(self, results: List[Dict], query: str, parameters: dict = None) -> Dict[str, Any]:
        """Process search results with enhanced styling and OpenAI analysis."""
        text_content = []
        sources = set()
        
        # Default parameters with slightly higher temperature for style variation
        parameters = parameters or {
            'tone': 'balanced',
            'detailLevel': 'moderate',
            'empathy': 'moderate',
            'professionalStyle': 'clinicallyBalanced'
        }

        logger.info(f"Processing search with parameters: {parameters}")

        # Process search results
        for result in results:
            text_snippet = {
                'text': result['text_preview'],
                'source': f"{result['source']['title']} (Page {result['source']['page_number']})"
            }
            text_content.append(text_snippet)
            sources.add(text_snippet['source'])

        formatted_text = "\n".join([
            f"[{snippet['source']}]: {snippet['text']}" 
            for snippet in text_content
        ])

        # Get enhanced style instructions
        style_instructions = self._generate_enhanced_style_instructions(parameters)
        
        # Create a more structured prompt
        prompt = self._create_structured_prompt(query, formatted_text, style_instructions)

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": f"You are an expert medical professional specializing in sickle cell disease. "
                                 f"Maintain the following communication style consistently:\n\n{style_instructions}\n\n"
                                 f"Every piece of information must be supported by specific citations from the provided sources."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3  # Allow for style variation while maintaining accuracy
            )
            analysis = response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error in OpenAI analysis: {str(e)}")
            analysis = "Error generating analysis. Please try again."

        return {
            'text_content': text_content,
            'sources': list(sources),
            'analysis': analysis,
            'metadata': {
                'num_results': len(results),
                'num_sources': len(sources),
                'style_parameters': parameters
            }
        }

    def _generate_enhanced_style_instructions(self, parameters: dict) -> str:
        """Generate detailed style instructions with examples."""
        selected_styles = {
            category: self.style_map[category][value]
            for category, value in parameters.items()
        }
        
        instructions = []
        
        for category, style in selected_styles.items():
            instructions.extend([
                f"\n{category.upper()} STYLE GUIDELINES:",
                f"Description: {style['description']}",
                "Key Language Markers:",
                *[f"- {marker}" for marker in style['markers']],
                f"Example: {style['example']}"
            ])

        # Add style combination guidance
        tone_level = parameters['tone']
        empathy_level = parameters['empathy']
        detail_level = parameters['detailLevel']
        
        instructions.append("\nSTYLE INTEGRATION GUIDELINES:")
        instructions.append(f"- Combine {tone_level} tone with {empathy_level} empathy level")
        instructions.append(f"- Maintain {detail_level} detail level throughout")
        instructions.append("- Ensure all medical information is accurately cited")
        
        return "\n".join(instructions)

    def _create_structured_prompt(self, query: str, formatted_text: str, style_instructions: str) -> str:
        """Create a structured prompt with clear sections."""
        return f"""
PATIENT QUESTION:
"{query}"

COMMUNICATION STYLE REQUIREMENTS:
{style_instructions}

RELEVANT MEDICAL INFORMATION:
{formatted_text}

RESPONSE REQUIREMENTS:
1. Maintain the specified communication style consistently throughout your response.
2. Cite EVERY piece of medical information using the format: (Source: [article name], Page [number])
3. If multiple sources support a statement, cite all relevant sources.
4. Break your response into clear paragraphs for readability.
5. Only use information from the provided sources - clearly state if information is not available.
6. Begin with appropriate emotional acknowledgment based on the specified empathy level.
7. Structure your response with clear progression from acknowledgment to explanation to recommendations.
8. End with appropriate closing based on the specified tone and empathy level.

Please provide your response following these guidelines while maintaining medical accuracy and appropriate citations.
"""