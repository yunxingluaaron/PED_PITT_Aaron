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

    def process_search_results(self, results: list, query: str) -> Dict[str, Any]:
        """Process search results and get OpenAI analysis with specific citations."""
        text_content = []
        sources = set()

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

        prompt = f"""
        Based on the provided medical information, answer the patient's question as follows:

        Question: "{query}"

        Relevant Information (with sources):
        {formatted_text}

        Important Rules for Your Response:
        1. Act as a compassionate, kind and knowledgeable doctor with expertise in sickle cell disease.
        2. For EVERY piece of information or recommendation you provide, you MUST cite the specific source 
           immediately after that information in parentheses.
        3. Format your citations like this: (Source: [article name], Page [number])
        4. If multiple sources support a statement, cite all relevant sources.
        5. Your response should be clear and directly related to the patient's question.
        6. Only use information from the provided text - if information is not available, state that clearly.
        7. Break your response into clear paragraphs, with each statement properly cited.
        8. Avoid making any statements without a citation.
        """

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4-turbo",
                messages=[
                    {"role": "system", "content": "You are an expert medical professional. Provide clear, compassionate advice with specific citations for EVERY piece of information."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.0
            )
            analysis = response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error getting OpenAI analysis: {str(e)}")
            analysis = "Error generating analysis. Please try again."

        return {
            'text_content': text_content,
            'sources': list(sources),
            'analysis': analysis,
            'metadata': {
                'num_results': len(results),
                'num_sources': len(sources)
            }
        }