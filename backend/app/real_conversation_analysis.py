import json
import re
import os
import logging
from typing import List, Dict, Any, Tuple
from elasticsearch import Elasticsearch
from openai import OpenAI
from dotenv import load_dotenv
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss
import jieba
import pickle
from sklearn.cluster import KMeans
from collections import Counter


# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize embedding model
embedding_model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

# File paths for local storage
embedding_path = './step2/embeddings.npy'
metadata_path = './step2/metadata.pkl'
faiss_index_path = './step2/faiss_index.bin'

# REUSED FUNCTIONS FROM ORIGINAL CODE

def retrieve_conversations(query: str, df: pd.DataFrame, question_embeddings: np.ndarray, 
                          top_k: int = 5, final_k: int = 3) -> List[Tuple[str, str]]:
    """
    Retrieve top conversation examples for a query using FAISS to search all conversations.
    
    Args:
        query: Patient's question
        df: DataFrame with conversations
        question_embeddings: Embeddings of questions
        top_k: Initial number of similar questions to retrieve
        final_k: Final number of diverse examples to return
    
    Returns:
        List of (question, answer) tuples
    """
    # Check if data is loaded
    if df is None or question_embeddings is None:
        logger.error("Conversation data not provided. Cannot retrieve conversations.")
        return []
    
    # Generate query embedding
    query_emb = embedding_model.encode([query])[0]
    query_emb = query_emb / np.linalg.norm(query_emb)  # Normalize
    logger.info(f"Generated query embedding for: {query}")
    
    # Search with Faiss across all embeddings
    dimension = question_embeddings.shape[1]
    faiss_index = faiss.IndexFlatIP(dimension)
    
    # Normalize all embeddings
    normalized_embeddings = question_embeddings.copy()
    faiss.normalize_L2(normalized_embeddings)
    
    # Add to index and search
    faiss_index.add(normalized_embeddings)
    distances, indices = faiss_index.search(query_emb.reshape(1, -1), top_k)
    
    # Extract candidates
    candidates = []
    print("\n=== Retrieved Candidates ===")
    for idx, global_idx in enumerate(indices[0]):
        question = df.iloc[global_idx]['ask']
        answer = df.iloc[global_idx]['answer']
        print(f"Candidate {idx+1}: Index={global_idx}, Question={question}")
        candidates.append((question, answer, global_idx))  # Store index with tuple
    logger.info(f"Retrieved {len(candidates)} candidates")
    
    # Apply diversity (MMR approximation)
    selected = []
    candidate_embeddings = normalized_embeddings[indices[0]]
    
    while candidates and len(selected) < final_k:
        if not selected:
            # Select first candidate as starting point
            question, answer, global_idx = candidates[0]
            selected.append((question, answer, global_idx))
            candidates.pop(0)
            candidate_embeddings = candidate_embeddings[1:]
            continue
        
        # Compute max similarity to selected
        similarities = []
        for i, cand_emb in enumerate(candidate_embeddings):
            # Calculate similarity between this candidate and each selected item
            selected_embs = normalized_embeddings[[s[2] for s in selected]]
            # Get maximum similarity score
            max_sim = np.max(np.dot(cand_emb.reshape(1, -1), selected_embs.T))
            similarities.append((i, max_sim))
        
        # Pick least similar candidate
        if similarities:
            min_sim_idx = min(similarities, key=lambda x: x[1])[0]
            question, answer, global_idx = candidates[min_sim_idx]
            selected.append((question, answer, global_idx))
            candidates.pop(min_sim_idx)
            candidate_embeddings = np.delete(candidate_embeddings, min_sim_idx, axis=0)
    
    # Print final selected examples
    print("\n=== Final Selected Examples ===")
    for i, (question, _, global_idx) in enumerate(selected):
        print(f"Selected {i+1}: Index={global_idx}, Question={question}")
    
    logger.info(f"Retrieved {len(selected)} diverse examples")
    
    # Return only (question, answer) tuples
    return [(question, answer) for question, answer, _ in selected[:final_k]]

def extract_max_length(length_str):
    """Extract the maximum length from a string like '100-150 words'."""
    try:
        digits = re.findall(r'\d+', length_str)
        return int(digits[-1]) if digits else 150  # Use last number (e.g., 150 from "100-150")
    except Exception:
        logging.warning(f"Failed to parse length: {length_str}")
        return 150  # Realistic default

def get_response_template(template_type: str, language: str = "neutral") -> Dict:
    """
    Retrieve predefined response templates based on query type.
    
    Args:
        template_type: Type of template to retrieve ('urgent', 'reassuring', 'detailed', 'simple', 'standard')
        language: Language for the template
        
    Returns:
        Dict containing template parameters
    """
    templates = {
        "urgent": {
            "tone": ["directive", "clear", "serious"],
            "formality": "formal",
            "phrasing": {"sentence_length": 10, "jargon_level": 1},
            "engagement": {"questions": 0, "personalization": 2, "empathy": 1},
            "structure": "answer_first"
        },
        "reassuring": {
            "tone": ["reassuring", "empathetic", "supportive"],
            "formality": "neutral",
            "phrasing": {"sentence_length": 14, "jargon_level": 0},
            "engagement": {"questions": 1, "personalization": 3, "empathy": 3},
            "structure": "reassure_first"
        },
        "detailed": {
            "tone": ["informative", "thorough", "educational"],
            "formality": "formal",
            "phrasing": {"sentence_length": 16, "jargon_level": 2},
            "engagement": {"questions": 0, "personalization": 1, "empathy": 1},
            "structure": "mixed"
        },
        "simple": {
            "tone": ["positive", "clear", "conversational"],
            "formality": "casual",
            "phrasing": {"sentence_length": 8, "jargon_level": 0},
            "engagement": {"questions": 1, "personalization": 2, "empathy": 2},
            "structure": "answer_first"
        },
        "standard": {
            "tone": ["professional", "balanced", "helpful"],
            "formality": "neutral",
            "phrasing": {"sentence_length": 12, "jargon_level": 1},
            "engagement": {"questions": 1, "personalization": 2, "empathy": 2},
            "structure": "mixed"
        }
    }
    
    # Adjust for Chinese if needed
    if language == "zh":
        for key in templates:
            templates[key]["phrasing"]["sentence_length"] = int(templates[key]["phrasing"]["sentence_length"] * 0.7)
    
    return templates.get(template_type, templates["standard"])

def call_language_model(
    prompt: str,
    example_tone: str,
    example_length: str,
    example_structure: str,
    example_phrasing: str,
    example_engagement: str,
    example_errors: str
) -> str:
    """Call the language model with the prepared prompt."""
    logging.info("Calling xAI Grok model with prompt")
    
    try:
        client = OpenAI(
            api_key=os.environ.get("XAI_API_KEY", "your_default_key_here"),
            base_url="https://api.x.ai/v1",
        )
        
        system_message = (
            f"You are a pediatrician answering a parent's question. Use *only* the medical information provided in the prompt. Please answer the final output in English."
            f"Follow the chain-of-thought steps outlined: classify the query, reason through options, and self-check for accuracy. "
            f"Respond in a {example_tone} tone, with {example_structure}, using {example_phrasing}. "
            f"Avoid {example_errors}. If the query is unrelated to the medical info, say: "
            f"'I can only answer based on the provided information. Please consult a doctor for more details.'"
        )
        
        completion = client.chat.completions.create(
            model="grok-3-latest",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,  # Slightly higher for nuanced reasoning
        )
        
        response = completion.choices[0].message.content
        
        return response
    except Exception as e:
        logging.error(f"Error calling xAI API: {str(e)}")
        return "Sorry, I can't generate a response right now. Please try again later."

def analyze_examples(examples: List[Tuple[str, str]], language: str = "neutral") -> Dict:
    """
    Use LLM to analyze example conversations for patterns and styles.
    
    Args:
        examples: List of (question, answer) tuples
        language: Language of the examples
        
    Returns:
        Dict with analysis of examples including tone, structure, intent patterns
    """
    # Default results in case the API call fails
    default_results = {
        "tone": ["professional", "balanced"],
        "structure": "mixed",
        "length": {"words": 120, "sentences": 6},
        "intent": ["informational"],
        "phrasing": {"jargon_level": 1},
        "errors": [],
    }
    
    try:
        # If no examples, return defaults
        if not examples:
            return default_results
            
        client = OpenAI(
            api_key=os.environ.get("XAI_API_KEY", "your_default_key_here"),
            base_url="https://api.x.ai/v1",
        )
        
        # Format examples for the prompt
        examples_text = ""
        for i, (question, answer) in enumerate(examples, 1):
            examples_text += f"Example {i}:\nParent: {question}\nDoctor: {answer}\n\n"
        
        # Create a system prompt that instructs LLM to analyze the examples
        system_prompt = f"""
        You are a conversation pattern analyzer specializing in medical communication.
        Analyze the provided pediatrician-parent conversations to identify patterns in:
        
        1. Tone: What are the 2-3 dominant tones used by the doctor? (e.g., reassuring, directive, educational)
        2. Structure: How are responses typically structured? (answer_first, reassure_first, mixed)
        3. Length: Average words per response and sentences per response
        4. Intent patterns: What are the common intents behind parent questions? (informational, urgent, reassurance)
        5. Phrasing: Level of medical jargon (0=none, 1=minimal with explanations, 2=moderate, 3=high)
        6. Common errors: Any problematic patterns to avoid (if any)
        
        Reply in JSON format only (valid parseable JSON) with this structure:
        {{
            "tone": ["tone1", "tone2"],
            "structure": "structure_type",
            "length": {{"words": average_word_count, "sentences": average_sentence_count}},
            "intent": ["intent1", "intent2"],
            "phrasing": {{"jargon_level": jargon_level}},
            "errors": ["error1", "error2"]
        }}
        """
        
        user_prompt = f"Analyze these pediatrician-parent conversations ({language}):\n\n{examples_text}"
        
        # Call the API
        logging.info("Calling API for examples analysis")
        completion = client.chat.completions.create(
            model="grok-3-latest",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,  # Low temperature for more consistent analysis
        )
        
        response_text = completion.choices[0].message.content
        
        # Extract JSON from the response
        json_match = re.search(r'({[\s\S]*})', response_text)
        if json_match:
            json_str = json_match.group(1)
            analysis_results = json.loads(json_str)
            
            # Validate and clean the results
            results = default_results.copy()
            
            # Update with API results
            if "tone" in analysis_results and isinstance(analysis_results["tone"], list):
                results["tone"] = analysis_results["tone"][:3]  # Limit to top 3 tones
            
            if "structure" in analysis_results:
                structure = analysis_results["structure"].lower()
                if structure in ["answer_first", "reassure_first", "mixed"]:
                    results["structure"] = structure
            
            if "length" in analysis_results and isinstance(analysis_results["length"], dict):
                if "words" in analysis_results["length"]:
                    results["length"]["words"] = max(40, min(300, int(analysis_results["length"]["words"])))
                if "sentences" in analysis_results["length"]:
                    results["length"]["sentences"] = max(2, min(15, int(analysis_results["length"]["sentences"])))
            
            if "intent" in analysis_results and isinstance(analysis_results["intent"], list):
                results["intent"] = [intent.lower() for intent in analysis_results["intent"][:3]]
            
            if "phrasing" in analysis_results and isinstance(analysis_results["phrasing"], dict):
                if "jargon_level" in analysis_results["phrasing"]:
                    results["phrasing"]["jargon_level"] = max(0, min(3, int(analysis_results["phrasing"]["jargon_level"])))
            
            if "errors" in analysis_results and isinstance(analysis_results["errors"], list):
                results["errors"] = analysis_results["errors"][:3]
            
            logging.info(f"API examples analysis results: {results}")
            return results
        else:
            logging.warning("Could not extract JSON from API examples analysis response")
            return default_results
            
    except Exception as e:
        logging.error(f"Error calling API for examples analysis: {str(e)}")
        return default_results


def extract_key_examples(examples: List[Tuple[str, str]], query: str, language: str = "neutral") -> List[Dict]:
    """
    Use LLM to identify the most relevant examples for the current query and extract insights.
    
    Args:
        examples: List of (question, answer) tuples
        query: The current query
        language: Language for analysis
        
    Returns:
        List of dictionaries containing example insights
    """
    # Default empty result if API fails
    default_insights = []
    
    try:
        # If no examples, return empty list
        if not examples:
            return default_insights
            
        client = OpenAI(
            api_key=os.environ.get("XAI_API_KEY", "your_default_key_here"),
            base_url="https://api.x.ai/v1",
        )
        
        # Format examples for the prompt
        examples_text = ""
        for i, (question, answer) in enumerate(examples, 1):
            examples_text += f"Example {i}:\nParent: {question}\nDoctor: {answer}\n\n"
        
        # Create a system prompt that instructs LLM to analyze relevance and extract insights
        system_prompt = f"""
        You are a medical communication expert. Given a new parent query and several example conversations, 
        identify which examples are most relevant to the current query and extract valuable insights from them.
        
        For each relevant example, analyze:
        1. Common medical terms between the query and example
        2. Key medical reasoning patterns from the doctor's response
        3. How similar the situation is (assign a similarity score 1-10)
        
        Consider medical terminology, symptom descriptions, age references, and emotional content when determining relevance.
        
        Reply in JSON format only (valid parseable JSON) with this structure:
        {{
            "relevant_examples": [
                {{
                    "example_number": number,
                    "common_terms": ["term1", "term2"],
                    "key_reasoning_patterns": ["pattern1", "pattern2"],
                    "similarity_score": score,
                    "useful_takeaway": "brief summary of what makes this example relevant"
                }}
            ]
        }}
        
        Limit to the top 2 most relevant examples. If none are relevant (similarity < 3), return an empty array.
        """
        
        user_prompt = f"New parent query ({language}):\n{query}\n\nPrevious conversation examples:\n\n{examples_text}"
        
        # Call the API
        logging.info("Calling API for example relevance analysis")
        completion = client.chat.completions.create(
            model="grok-3-latest",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,  # Low temperature for more consistent analysis
        )
        
        response_text = completion.choices[0].message.content
        
        # Extract JSON from the response
        json_match = re.search(r'({[\s\S]*})', response_text)
        if json_match:
            json_str = json_match.group(1)
            analysis_results = json.loads(json_str)
            
            insights = []
            if "relevant_examples" in analysis_results and isinstance(analysis_results["relevant_examples"], list):
                for example in analysis_results["relevant_examples"]:
                    if not isinstance(example, dict):
                        continue
                        
                    insight = {
                        "example_number": example.get("example_number", 0),
                        "common_terms": example.get("common_terms", []),
                        "key_phrases": example.get("key_reasoning_patterns", []),
                        "similarity_score": example.get("similarity_score", 0),
                        "useful_takeaway": example.get("useful_takeaway", "")
                    }
                    
                    # Only include examples with reasonable similarity
                    if insight["similarity_score"] >= 3:
                        insights.append(insight)
            
            # Sort by similarity score and return top 2
            insights = sorted(insights, key=lambda x: x["similarity_score"], reverse=True)[:2]
            logging.info(f"API example relevance analysis found {len(insights)} relevant examples")
            return insights
        else:
            logging.warning("Could not extract JSON from API example relevance analysis response")
            return default_insights
            
    except Exception as e:
        logging.error(f"Error calling API for example relevance analysis: {str(e)}")
        return default_insights

def preprocess_style_examples(examples: List[Tuple[str, str]], textbook_info: str = "", language: str = "neutral") -> Dict:
    """
    Preprocess style examples to extract patterns, create a style guide checklist,
    identify knowledge gaps, and generate a flowchart for doctor questioning strategy.
    
    Args:
        examples: List of (question, answer) tuples for style reference
        textbook_info: Medical information to compare with examples
        language: Language for analysis
        
    Returns:
        Dict with extracted style patterns, checklist items, knowledge gaps, and flowchart
    """
    # If no examples are provided, return default guidelines
    if not examples or len(examples) == 0:
        return {
            "structure_patterns": ["Begin with a direct answer", 
                                  "Provide context after main answer"],
            "phrasing_patterns": ["Use concise, clear language", 
                                 "Balance technical with simple terms"],
            "empathy_patterns": ["Show empathy without excess emotion", 
                                "Address concerns directly"],
            "reassurance_patterns": ["Provide factual reassurance", 
                                    "Balance honesty with support"],
            "actionable_advice": ["Give clear recommendations", 
                                 "Prioritize urgent advice"],
            "answer_structure": "answer_first",
            "typical_length": "100-150 words",
            "knowledge_gaps": [],
            "flowchart": {"nodes": [], "edges": []}
        }
    
    try:
        client = OpenAI(
            api_key=os.environ.get("XAI_API_KEY", "your_default_key_here"),
            base_url="https://api.x.ai/v1",
        )
        
        # Format examples for the prompt
        examples_text = ""
        for i, (question, answer) in enumerate(examples, 1):
            examples_text += f"Example {i}:\nParent: {question}\nDoctor: {answer}\n\n"
        
        # Create a system prompt that instructs LLM to extract patterns
        system_prompt = """
        You are an expert at analyzing communication patterns in medical conversations.
        Analyze these pediatrician-parent conversations to extract key patterns for a style guide.
        
        Extract specific patterns in these categories:
        1. Structure patterns: Response structure (e.g., "Begins with reassurance then advice")
        2. Phrasing patterns: Language patterns (e.g., "Uses 'your child' over generic terms")
        3. Empathy patterns: Empathy expression (e.g., "Acknowledges worry calmly")
        4. Reassurance patterns: Reassurance methods (e.g., "Gives specific timeframes")
        5. Actionable advice: Advice patterns (e.g., "Recommends specific fluid amounts")
        
        Also determine:
        - Answer structure: Predominant structure (answer_first, reassure_first, mixed)
        - Typical length: Approximate word count range
        
        Reply in JSON format only with this structure:
        {
            "structure_patterns": ["pattern1", "pattern2"],
            "phrasing_patterns": ["pattern1", "pattern2"],
            "empathy_patterns": ["pattern1", "pattern2"],
            "reassurance_patterns": ["pattern1", "pattern2"],
            "actionable_advice": ["pattern1", "pattern2"],
            "answer_structure": "answer_first|reassure_first|mixed",
            "typical_length": "range in words (e.g., '100-150 words')"
        }
        
        Keep each pattern description concise (under 10 words) and specific.
        """
        
        user_prompt = f"Analyze these pediatrician-parent conversations ({language}):\n\n{examples_text}"
        
        # Call the API for style patterns
        logging.info("Calling API to extract patterns from examples")
        completion = client.chat.completions.create(
            model="grok-3-latest",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
        )
        
        response_text = completion.choices[0].message.content
        
        # Extract JSON from the response
        json_match = re.search(r'({[\s\S]*})', response_text)
        if json_match:
            json_str = json_match.group(1)
            pattern_results = json.loads(json_str)
            
            # Validate the results structure
            required_keys = ["structure_patterns", "phrasing_patterns", "empathy_patterns", 
                           "reassurance_patterns", "actionable_advice", "answer_structure", "typical_length"]
            
            for key in required_keys:
                if key not in pattern_results:
                    if key.endswith("_patterns"):
                        pattern_results[key] = []
                    else:
                        pattern_results[key] = ""
            
            # Limit the number of patterns
            for key in required_keys:
                if key.endswith("_patterns") and isinstance(pattern_results[key], list):
                    pattern_results[key] = pattern_results[key][:3]
            
            # Compare examples with textbook_info for knowledge gaps
            if textbook_info:
                knowledge_gaps = compare_examples_with_textbook(examples, textbook_info, client, language)
                pattern_results["knowledge_gaps"] = knowledge_gaps
            else:
                pattern_results["knowledge_gaps"] = []
            
            # Generate flowchart for doctor questioning strategy
            flowchart = generate_conversation_flowchart(examples, client, language)
            pattern_results["flowchart"] = flowchart
            
            logging.info("Successfully extracted patterns, gaps, and flowchart")
            return pattern_results
        else:
            logging.warning("Could not extract JSON from API response")
            return {
                "structure_patterns": ["Begin with a direct answer", 
                                      "Provide context after main answer"],
                "phrasing_patterns": ["Use concise, clear language", 
                                     "Balance technical with simple terms"],
                "empathy_patterns": ["Show empathy without excess emotion", 
                                    "Address concerns directly"],
                "reassurance_patterns": ["Provide factual reassurance", 
                                        "Balance honesty with support"],
                "actionable_advice": ["Give clear recommendations", 
                                     "Prioritize urgent advice"],
                "answer_structure": "answer_first",
                "typical_length": "100-150 words",
                "knowledge_gaps": [],
                "flowchart": {"nodes": [], "edges": []}
            }
            
    except Exception as e:
        logging.error(f"Error in preprocess_style_examples: {str(e)}")
        return {
            "structure_patterns": ["Begin with a direct answer", 
                                  "Provide context after main answer"],
            "phrasing_patterns": ["Use concise, clear language", 
                                 "Balance technical with simple terms"],
            "empathy_patterns": ["Show empathy without excess emotion", 
                                "Address concerns directly"],
            "reassurance_patterns": ["Provide factual reassurance", 
                                    "Balance honesty with support"],
            "actionable_advice": ["Give clear recommendations", 
                                 "Prioritize urgent advice"],
            "answer_structure": "answer_first",
            "typical_length": "100-150 words",
            "knowledge_gaps": [],
            "flowchart": {"nodes": [], "edges": []}
        }

def compare_examples_with_textbook(examples: List[Tuple[str, str]], textbook_info: str, client, language: str = "neutral") -> List[Dict]:
    """
    Compare example conversations with textbook information to identify knowledge gaps.
    
    Args:
        examples: List of (question, answer) tuples
        textbook_info: Medical reference information
        client: OpenAI client for API calls
        language: Language for analysis
        
    Returns:
        List of dicts with identified gaps (topic, example_context, suggested_question)
    """
    try:
        examples_text = ""
        for i, (question, answer) in enumerate(examples, 1):
            examples_text += f"Example {i}:\nParent: {question}\nDoctor: {answer}\n\n"
        
        system_prompt = """
        You are an expert medical knowledge analyst specializing in pediatric healthcare.
        Compare real pediatrician-parent conversations with a reference medical textbook
        to identify important topics or scenarios in the conversations not adequately covered in the textbook.
        
        For each gap:
        1. Extract the specific medical topic or scenario
        2. Note the context from the conversation
        3. Suggest a clarifying question for the doctor
        
        Reply in JSON format only:
        {
            "knowledge_gaps": [
                {
                    "topic": "topic name (e.g., 'Infant sleep patterns')",
                    "example_context": "brief explanation (1-2 sentences)",
                    "suggested_question": "clarifying question"
                }
            ]
        }
        
        Focus on MEDICAL/HEALTH topics missing in the textbook. Limit to 5 most important gaps.
        """
        
        user_prompt = f"""
        Analyze these conversations ({language}) and compare with the textbook:
        
        CONVERSATIONS:
        {examples_text}
        
        TEXTBOOK INFORMATION:
        {textbook_info}
        
        Identify medical topics or scenarios in the conversations not covered in the textbook.
        Generate clarifying questions for each gap.
        """
        
        logging.info("Calling API to identify knowledge gaps")
        completion = client.chat.completions.create(
            model="grok-3-latest",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
        )
        
        response_text = completion.choices[0].message.content
        
        json_match = re.search(r'({[\s\S]*})', response_text)
        if json_match:
            json_str = json_match.group(1)
            gap_results = json.loads(json_str)
            knowledge_gaps = gap_results.get("knowledge_gaps", [])
            
            cleaned_gaps = []
            for gap in knowledge_gaps:
                if isinstance(gap, dict) and "topic" in gap and "example_context" in gap and "suggested_question" in gap:
                    cleaned_gaps.append({
                        "topic": gap["topic"],
                        "example_context": gap["example_context"],
                        "suggested_question": gap["suggested_question"]
                    })
            
            logging.info(f"Identified {len(cleaned_gaps)} knowledge gaps")
            return cleaned_gaps
        else:
            logging.warning("Could not extract JSON from API response for knowledge gaps")
            return []
            
    except Exception as e:
        logging.error(f"Error in compare_examples_with_textbook: {str(e)}")
        return []

def generate_conversation_flowchart(examples: List[Tuple[str, str]], client, language: str = "neutral") -> Dict:
    """
    Generate a flowchart for doctors to ask questions to identify root causes of patient queries
    based on real doctor-patient conversations.
    
    Args:
        examples: List of (question, answer) tuples
        client: OpenAI client for API calls
        language: Language for analysis
        
    Returns:
        Dict with flowchart nodes and edges
    """
    try:
        examples_text = ""
        for i, (question, answer) in enumerate(examples, 1):
            examples_text += f"Example {i}:\nParent: {question}\nDoctor: {answer}\n\n"
        
        system_prompt = """
        You are an expert in medical communication and pediatric healthcare.
        Analyze real pediatrician-parent conversations to create a flowchart guiding doctors
        on how to ask questions to identify the root causes of a patient's query.
        
        The flowchart should:
        1. Start with a broad question to understand the main symptom or concern
        2. Include follow-up questions based on patient responses
        3. Account for common patterns in the conversations (e.g., clarifying duration, severity)
        4. End with a step to provide advice or recommend further action
        
        Reply in JSON format only:
        {
            "nodes": [
                {
                    "id": "unique_id",
                    "description": "Question or action (e.g., 'Ask about symptom duration')",
                    "type": "question|action"
                }
            ],
            "edges": [
                {
                    "from": "node_id",
                    "to": "node_id",
                    "condition": "Condition for transition (e.g., 'If persistent')"
                }
            ]
        }
        
        Limit to 5-7 nodes for simplicity. Ensure questions are concise and medically relevant.
        """
        
        user_prompt = f"""
        Analyze these pediatrician-parent conversations ({language}):
        
        CONVERSATIONS:
        {examples_text}
        
        Create a flowchart for doctors to ask questions to identify root causes of patient queries.
        """
        
        logging.info("Calling API to generate conversation flowchart")
        completion = client.chat.completions.create(
            model="grok-3-latest",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
        )
        
        response_text = completion.choices[0].message.content
        
        json_match = re.search(r'({[\s\S]*})', response_text)
        if json_match:
            json_str = json_match.group(1)
            flowchart = json.loads(json_str)
            
            # Validate flowchart structure
            if "nodes" not in flowchart or "edges" not in flowchart:
                flowchart = {"nodes": [], "edges": []}
            
            # Clean and limit nodes
            cleaned_nodes = []
            for node in flowchart.get("nodes", [])[:7]:  # Limit to 7 nodes
                if isinstance(node, dict) and "id" in node and "description" in node and "type" in node:
                    cleaned_nodes.append({
                        "id": node["id"],
                        "description": node["description"],
                        "type": node["type"]
                    })
            
            # Clean edges
            cleaned_edges = []
            for edge in flowchart.get("edges", []):
                if isinstance(edge, dict) and "from" in edge and "to" in edge and "condition" in edge:
                    cleaned_edges.append({
                        "from": edge["from"],
                        "to": edge["to"],
                        "condition": edge["condition"]
                    })
            
            logging.info(f"Generated flowchart with {len(cleaned_nodes)} nodes and {len(cleaned_edges)} edges")
            return {"nodes": cleaned_nodes, "edges": cleaned_edges}
        else:
            logging.warning("Could not extract JSON from API response for flowchart")
            return {"nodes": [], "edges": []}
            
    except Exception as e:
        logging.error(f"Error in generate_conversation_flowchart: {str(e)}")
        return {"nodes": [], "edges": []}

def analyze_query_complexity_with_llm(query: str, language: str = "neutral") -> Dict:
    """
    Use LLM to intelligently analyze the complexity and urgency of a query.
    
    Args:
        query: The query text to analyze
        language: Language of the query ('neutral' for English, 'zh' for Chinese)
        
    Returns:
        Dict with complexity, urgency, and emotional scores
    """
    # Default results in case the API call fails
    default_results = {
        "complexity": 5,  # Default middle value
        "urgency": 5,
        "emotional_load": 5,
        "response_template": "standard",
        "key_medical_terms": [],
        "analysis_reasoning": ""
    }
    
    try:
        client = OpenAI(
            api_key=os.environ.get("XAI_API_KEY", "your_default_key_here"),
            base_url="https://api.x.ai/v1",
        )
        
        # Create a system prompt that instructs LLM to analyze the query
        system_prompt = f"""
        You are a pediatric medical query analyzer. Analyze the following parent query about their child's health.
        
        Score the query on three dimensions (1-10 scale):
        1. Complexity: How medically complex or detailed is the query? (1=very simple, 10=very complex)
        2. Urgency: How time-sensitive or urgent is the medical situation? (1=not urgent, 10=emergency)
        3. Emotional load: How worried or emotionally distressed is the parent? (1=calm/curious, 10=highly distressed)
        
        Also:
        - Identify key medical terms and symptoms
        - Classify into the most appropriate response template: "urgent", "reassuring", "detailed", "simple", or "standard"
        - Provide brief reasoning for your scores
        
        Reply in JSON format only (valid parseable JSON) with this structure:
        {{
            "complexity": <score 1-10>,
            "urgency": <score 1-10>,
            "emotional_load": <score 1-10>,
            "response_template": "<template_name>",
            "key_medical_terms": ["term1", "term2", ...],
            "analysis_reasoning": "<brief reasoning>"
        }}
        """
        
        user_prompt = f"Parent query ({language}): {query}"
        
        # Call the LLM API
        logging.info("Calling LLM API for query complexity analysis")
        completion = client.chat.completions.create(
            model="grok-3-latest",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,  # Low temperature for more consistent scoring
        )
        
        response_text = completion.choices[0].message.content
        
        # Extract JSON from the response
        json_match = re.search(r'({[\s\S]*})', response_text)
        if json_match:
            json_str = json_match.group(1)
            analysis_results = json.loads(json_str)
            
            # Validate and clean the results
            results = default_results.copy()
            
            # Update with API results, ensuring values are in range
            if "complexity" in analysis_results:
                results["complexity"] = max(1, min(10, int(analysis_results["complexity"])))
            
            if "urgency" in analysis_results:
                results["urgency"] = max(1, min(10, int(analysis_results["urgency"])))
            
            if "emotional_load" in analysis_results:
                results["emotional_load"] = max(1, min(10, int(analysis_results["emotional_load"])))
            
            if "response_template" in analysis_results:
                template = analysis_results["response_template"].lower()
                if template in ["urgent", "reassuring", "detailed", "simple", "standard"]:
                    results["response_template"] = template
            
            if "key_medical_terms" in analysis_results and isinstance(analysis_results["key_medical_terms"], list):
                results["key_medical_terms"] = analysis_results["key_medical_terms"]
            
            if "analysis_reasoning" in analysis_results:
                results["analysis_reasoning"] = analysis_results["analysis_reasoning"]
            
            logging.info(f"LLM API analysis results: {results}")
            return results
        else:
            logging.warning("Could not extract JSON from LLM API response")
            return default_results
            
    except Exception as e:
        logging.error(f"Error calling LLM API for query analysis: {str(e)}")
        return default_results

def generate_response(query: str, textbook_info: str, examples: List[Tuple[str, str]], 
                     language: str = "neutral", parent_name: str = "") -> str:
    """
    Generate a pediatrician's response to a parent's query using enhanced LLM-driven analysis,
    incorporating a flowchart to guide questioning strategy. The final response is always in English.
    
    Args:
        query: The parent's question
        textbook_info: Medical information to use for the response
        examples: List of (question, answer) tuples for style reference
        language: Language for analyzing examples ('neutral' for English, 'zh' for Chinese)
        
    Returns:
        A structured medical response in English
    """
    # Step 1: Analyze query complexity and characteristics
    query_analysis = analyze_query_complexity_with_llm(query, language=language)
    logging.info(f"Query complexity analysis: {query_analysis}")
    
    # Step 2: Select appropriate response template based on query analysis
    template = get_response_template(query_analysis["response_template"], language=language)
    
    # Step 3: Extract key insights from examples relevant to this query
    example_insights = extract_key_examples(examples, query, language=language)
    logging.info(f"example_insights: {example_insights}")
    
    # Step 4: Preprocess style examples to extract patterns, knowledge gaps, and flowchart
    style_patterns = preprocess_style_examples(examples, textbook_info, language=language)
    logging.info(f"style_patterns: {style_patterns}")
    
    # Step 5: Prepare the style guidelines based on the template and extracted patterns
    
    # Structure
    final_structure = template["structure"]
    if style_patterns["answer_structure"] and style_patterns["answer_structure"] != "mixed":
        final_structure = style_patterns["answer_structure"]
    
    structure_map = {
        "answer_first": "Start with a direct answer, then explain",
        "reassure_first": "Begin with reassurance, then provide advice",
        "mixed": "Respond flexibly, prioritizing clarity"
    }
    example_structure = structure_map.get(final_structure, "Respond flexibly, prioritizing clarity")
    
    # Tone
    primary_tones = template["tone"][:2]
    example_tone = ", ".join(primary_tones)
    example_tone += f", {template['formality']}"
    
    # Phrasing
    sentence_length = template["phrasing"]["sentence_length"]
    jargon_level = template["phrasing"]["jargon_level"]
    
    example_phrasing = f"Use sentences averaging {sentence_length} words"
    if jargon_level > 1:
        example_phrasing += ", balance medical terms with simple explanations"
    else:
        example_phrasing += ", minimize jargon for parent-friendly clarity"
    
    # Engagement
    example_engagement = []
    if template["engagement"]["questions"] > 0:
        example_engagement.append("Include a relevant follow-up question")
    if template["engagement"]["personalization"] > 0:
        example_engagement.append("Use personalized terms like 'your child'")
    if template["engagement"]["empathy"] > 0:
        example_engagement.append("Show subtle empathy, e.g., 'I know this can feel concerning'")
    
    # For urgent queries, reduce questions, increase directness
    if query_analysis["response_template"] == "urgent":
        if "Include a relevant follow-up question" in example_engagement:
            example_engagement.remove("Include a relevant follow-up question")
        example_engagement.append("Be direct and clear about next steps")
    
    example_engagement_str = "; ".join(example_engagement) or "Focus on clear advice"
    
    # Length from style patterns
    example_length = style_patterns.get("typical_length", "100-150 words")
    if query_analysis["complexity"] >= 7:
        if "-" in example_length:
            base, upper = example_length.split("-")
            if "words" in upper:
                upper_num = int("".join(filter(str.isdigit, upper)))
                example_length = f"{base}-{upper_num + 30} words"
    elif query_analysis["response_template"] == "urgent":
        if "-" in example_length:
            base, upper = example_length.split("-")
            if "words" in upper:
                base_num = int("".join(filter(str.isdigit, base)))
                upper_num = int("".join(filter(str.isdigit, upper)))
                example_length = f"{base_num}-{min(upper_num, base_num + 50)} words"
    
    # Error avoidance
    example_errors = "Avoid speculative or outdated advice"
    
    # Extract insights from relevant examples
    example_insights_text = ""
    if example_insights:
        example_insights_text = "Relevant insights from similar queries: "
        for i, insight in enumerate(example_insights):
            takeaway = insight.get("useful_takeaway", "")
            if takeaway:
                example_insights_text += f"{i+1}) {takeaway}. "
    
    # Convert style patterns to checklist format
    style_checklist = {
        "structure": ", ".join([f"'{pattern}'" for pattern in style_patterns.get("structure_patterns", [])[:2]]),
        "phrasing": ", ".join([f"'{pattern}'" for pattern in style_patterns.get("phrasing_patterns", [])[:2]]),
        "empathy": ", ".join([f"'{pattern}'" for pattern in style_patterns.get("empathy_patterns", [])[:2]]),
        "reassurance": ", ".join([f"'{pattern}'" for pattern in style_patterns.get("reassurance_patterns", [])[:2]]),
        "advice": ", ".join([f"'{pattern}'" for pattern in style_patterns.get("actionable_advice", [])[:2]])
    }
    
    # Format knowledge gaps for inclusion in the prompt
    knowledge_gaps_text = ""
    if style_patterns.get("knowledge_gaps"):
        knowledge_gaps_text = "Topics from previous conversations that may require clarification if not covered in medical information:\n"
        for i, gap in enumerate(style_patterns["knowledge_gaps"][:5], 1):
            topic = gap.get("topic", "")
            question = gap.get("suggested_question", "")
            if topic and question:
                knowledge_gaps_text += f"   {i}. If parent asks about '{topic}' and textbook lacks info, consider asking: '{question}'\n"
    
    # Format flowchart for inclusion in the prompt
    flowchart_text = ""
    if style_patterns.get("flowchart", {}).get("nodes"):
        flowchart_text = "Flowchart for Questioning Strategy:\n"
        flowchart_text += "Follow this sequence to identify the root cause of the parent's query:\n"
        for node in style_patterns["flowchart"]["nodes"]:
            flowchart_text += f"   - Node {node['id']}: {node['description']} (Type: {node['type']})\n"
        flowchart_text += "\nTransitions between nodes:\n"
        for edge in style_patterns["flowchart"]["edges"]:
            flowchart_text += f"   - From Node {edge['from']} to Node {edge['to']}: {edge['condition']}\n"
        flowchart_text += "\nUse this flowchart to structure clarifying questions, starting with the first question node and following transitions based on the parent's response or query vagueness.\n"
    
    avoid_terms = (f"We're here to support you and your child or children's name\n"
                   f"Let's address your concerns...\n")
    
    # Step 6: Create enhanced prompt with style patterns, knowledge gaps, and flowchart
    prompt = (
        f"You are an experienced pediatrician answering a parent's question. Address the parent as '{parent_name}' if provided, otherwise just directly with reply message"

        f"Your tone is {example_tone}, like a trusted doctor who is clear and supportive.\n\n"
        
        f"Follow this detailed reasoning process internally (but do not reveal your chain-of-thought to the parent):\n"
        
        f"1. **Classify the Query**: Is it informational, urgent, or seeking reassurance?\n"
        
        f"2. **Extract Key Medical Keywords**: Identify the main medical terms and concerns in the parent's question.\n"
        
        f"3. **Recall Provided Medical Info**: Use only the data from 'Medical Information' below if it answers the question.\n"
        f"   - If the question is unrelated, politely decline.\n"
        f"   - If any relevant points are missing in the 'Medical Information', note them.\n"
        
        f"4. **Follow Flowchart for Clarification**: If the query is vague or lacks details, use the 'Flowchart for Questioning Strategy' below to ask clarifying questions:\n"
        f"{flowchart_text}\n"
        f"   - Start with the first question node and proceed based on the transitions (edges) that match the parent's response or query context.\n"
        f"   - If the flowchart suggests a question but the query already provides sufficient details, skip to providing advice.\n"
        
        f"5. **Consider Knowledge Gaps**: Review the list of topics that commonly require clarification:\n"
        f"{knowledge_gaps_text}\n"
        f"   - If the parent's question relates to one of these topics but lacks details, ask the suggested clarifying question.\n"
        f"   - If multiple clarifying questions could apply, prioritize the most relevant one from the flowchart or knowledge gaps.\n"
        
        f"6. **Reason Through Options**: If necessary info is missing, ask for clarification based on the flowchart or knowledge gaps. "
        f"For example, if the parent does not mention the age of their child, or if specific symptom details would change your advice.\n"
        
        f"7. **Style Guide Checklist**:\n"
        f"   - Structure: {style_checklist['structure']}\n"
        f"   - Phrasing: {style_checklist['phrasing']}\n" 
        f"   - Empathy: {style_checklist['empathy']}\n"
        f"   - Reassurance: {style_checklist['reassurance']}\n"
        f"   - Advice: {style_checklist['advice']}\n"
        
        f"8. **Formulate Answer**: Provide a concise response ({example_length}) that is {example_structure}, "
        f"using {example_phrasing} and including {example_engagement_str}.\n"
        
        f"9. **Self-Check**: Ensure the answer avoids {example_errors}, stays aligned with the medical info, "
        f"and matches the query's intent. Avoid revealing your internal reasoning.\n\n"
        
        f"**Medical Information**:\n{textbook_info}\n\n"
        
        f"Parent Question: {query}\n"
        
        f"Respond in clear, simple English, regardless of the analysis language ({language}). "
        f"Use the medical information provided to answer the query. "
        f"If the query is vague, ask for details (e.g., 'How old is your child?') based on the flowchart, "
        f"ensuring the question is in English. "
        f"Assume a typical pediatric scenario only if the flowchart or medical info supports it. "
        f"Avoid AI-like verbosity or generic empathy (e.g., 'I understand your concern', {avoid_terms})."
    )
    
    # Step 7: Call Language Model
    try:
        response = call_language_model(
            prompt=prompt,
            example_tone=example_tone,
            example_length=example_length,
            example_structure=example_structure,
            example_phrasing=example_phrasing,
            example_engagement=example_engagement_str,
            example_errors=example_errors,
        )
        return response
    except Exception as e:
        logging.error(f"Language model error: {e}")
        return "Sorry, I can't generate a response right now. Please try again later."


# Export the main functions for external use
__all__ = [
    'generate_response',
    'generate_simple_analysis',
    'retrieve_conversations',
]