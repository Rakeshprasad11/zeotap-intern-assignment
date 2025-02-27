# CDP Support Chatbot

A chatbot designed to answer "how-to" questions related to Customer Data Platforms (CDPs): Segment, mParticle, Lytics, and Zeotap.

## Features

- **CDP-Specific Support**: Answers questions about Segment, mParticle, Lytics, and Zeotap
- **Documentation Extraction**: Automatically retrieves and indexes official documentation
- **"How-to" Question Answering**: Provides step-by-step instructions for common tasks
- **Cross-CDP Comparisons**: Compares functionality between different CDPs (bonus feature)
- **Web Interface**: Clean, responsive UI for interacting with the chatbot

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/cdp-support-chatbot.git
cd cdp-support-chatbot
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up your OpenAI API key:
```bash
export OPENAI_API_KEY="your-api-key-here"
# On Windows: set OPENAI_API_KEY=your-api-key-here
```

## Usage

1. Index the documentation (first time only):
```bash
python index_docs.py
```

2. Run the application:
```bash
python app.py
```

3. Open your browser and navigate to:
```
http://localhost:5000
```

4. Start asking "how-to" questions about any of the supported CDPs!

## Example Questions

- "How do I set up a new source in Segment?"
- "How can I create a user profile in mParticle?"
- "How do I build an audience segment in Lytics?"
- "How can I integrate my data with Zeotap?"
- "How does Segment's audience creation process compare to Lytics'?"

## Project Structure

```
cdp-support-chatbot/
├── app.py                 # Main Flask application
├── segment_support.py     # Segment CDP support agent
├── mparticle_support.py   # mParticle CDP support agent
├── lytics_support.py      # Lytics CDP support agent
├── zeotap_support.py      # Zeotap CDP support agent
├── comparison.py          # Cross-CDP comparison handler
├── index_docs.py          # Documentation indexing script
├── data/                  # Vector databases storage
├── templates/             # HTML templates
│   └── index.html         # Chat interface
├── static/                # Static assets
│   └── styles.css         # CSS styles
├── requirements.txt       # Dependencies
└── README.md              # This file
```

## Technologies Used

- **Flask**: Web framework
- **LangChain**: For document processing and retrieval
- **ChromaDB**: Vector database for document storage
- **OpenAI Embeddings**: For semantic search
- **BeautifulSoup**: For document crawling and parsing

## Implementation Details

### Document Indexing

The system crawls the official documentation of each CDP and indexes it using a vector database. This enables semantic search to find the most relevant documentation sections for each question.

### Question Processing

The chatbot identifies which CDP the question is about, determines if it's a "how-to" question, and routes it to the appropriate support agent.

### Response Generation

The system retrieves relevant documentation sections and generates a clear, step-by-step response to guide users on how to accomplish their task.

## Extensions and Future Work

- Advanced search capabilities for more complex questions
- Multi-language support
- User feedback integration for continuous improvement
- Documentation update monitoring to keep information current

## License

MIT License
