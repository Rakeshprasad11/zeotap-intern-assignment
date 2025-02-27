# app.py
"""
Main application for CDP Support Chatbot
Handles web interface and integration with CDP support agents
"""

from flask import Flask, request, jsonify, render_template
import os
from segment_support import SegmentSupportAgent

app = Flask(__name__)

# Initialize CDP support agents
segment_agent = None
mparticle_agent = None
lytics_agent = None
zeotap_agent = None

def initialize_agents():
    """
    Initialize all CDP support agents
    """
    global segment_agent, mparticle_agent, lytics_agent, zeotap_agent
    
    # Get OpenAI API key from environment
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("Warning: OPENAI_API_KEY environment variable not set")
    
    # Initialize Segment agent
    segment_agent = SegmentSupportAgent(api_key=api_key)
    
    # TODO: Initialize other CDP agents
    # mparticle_agent = mParticleAgent(api_key=api_key)
    # lytics_agent = LyticsAgent(api_key=api_key)
    # zeotap_agent = ZeotapAgent(api_key=api_key)

@app.route('/')
def index():
    """
    Render the main chat interface
    """
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    """
    Handle chat API requests
    """
    try:
        data = request.json
        question = data.get('message', '')
        
        # Skip empty questions
        if not question.strip():
            return jsonify({'response': 'Please ask a question.'})
        
        # Identify which CDP the question is about
        cdp = identify_cdp(question)
        
        # Handle CDP-specific questions
        if cdp == 'segment':
            if segment_agent is None or segment_agent.retriever is None:
                return jsonify({'response': 'Segment support is not initialized. Please check the server logs.'})
            
            response = segment_agent.answer_question(question)
        elif cdp == 'mparticle':
            # TODO: Implement mParticle agent
            response = "Support for mParticle questions is coming soon."
        elif cdp == 'lytics':
            # TODO: Implement Lytics agent
            response = "Support for Lytics questions is coming soon."
        elif cdp == 'zeotap':
            # TODO: Implement Zeotap agent
            response = "Support for Zeotap questions is coming soon."
        elif cdp == 'comparison':
            # TODO: Implement cross-CDP comparison
            response = "Cross-CDP comparison is coming soon."
        else:
            response = "I'm a CDP support chatbot. Please ask a question about Segment, mParticle, Lytics, or Zeotap. For example: 'How do I set up a new source in Segment?'"
        
        return jsonify({'response': response})
    
    except Exception as e:
        print(f"Error processing request: {str(e)}")
        return jsonify({'response': f"I encountered an error: {str(e)}"})

def identify_cdp(question):
    """
    Identify which CDP the question is about
    
    Args:
        question (str): User question
        
    Returns:
        str: Identified CDP or None
    """
    question_lower = question.lower()
    
    # Check for explicit CDP mentions
    if 'segment' in question_lower:
        return 'segment'
    elif 'mparticle' in question_lower or 'm particle' in question_lower:
        return 'mparticle'
    elif 'lytics' in question_lower:
        return 'lytics'
    elif 'zeotap' in question_lower:
        return 'zeotap'
    
    # Check for comparison questions
    comparison_indicators = ['compare', 'difference', 'versus', 'vs', 'better']
    if any(indicator in question_lower for indicator in comparison_indicators):
        cdp_count = sum(1 for cdp in ['segment', 'mparticle', 'lytics', 'zeotap'] if cdp in question_lower)
        if cdp_count >= 2:
            return 'comparison'
    
    # TODO: Implement more sophisticated CDP identification based on terminology
    
    # Default to None if no CDP can be identified
    return None

if __name__ == '__main__':
    # Initialize agents before starting the app
    initialize_agents()
    
    # Start the Flask app
    app.run(debug=True)
