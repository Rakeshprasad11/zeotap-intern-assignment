# segment_support.py
"""
Segment CDP Support Module for the CDP Support Chatbot
Handles document indexing, retrieval, and question answering for Segment CDP
"""

import requests
from bs4 import BeautifulSoup
import os
import re
from urllib.parse import urljoin

# Vector database and embedding imports
from langchain.document_loaders import WebBaseLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.vectorstores import Chroma
from langchain.embeddings import OpenAIEmbeddings
from langchain.chains import RetrievalQA
from langchain.chat_models import ChatOpenAI
from langchain.prompts import PromptTemplate


class SegmentSupportAgent:
    """
    Support agent for handling Segment CDP-specific questions
    """
    
    def __init__(self, api_key=None, persist_dir="./data/segment_docs"):
        """
        Initialize the Segment support agent
        
        Args:
            api_key (str): OpenAI API key for embeddings
            persist_dir (str): Directory to persist the vector database
        """
        self.base_url = "https://segment.com/docs/"
        self.persist_dir = persist_dir
        
        # Set OpenAI API key if provided
        if api_key:
            os.environ["OPENAI_API_KEY"] = api_key
            
        # Create embedding function
        self.embedding_function = OpenAIEmbeddings()
        
        # Check if vector database exists
        if not os.path.exists(persist_dir):
            print("Vector database not found. Please run index_documentation() first.")
            self.retriever = None
        else:
            # Load existing vector database
            self.load_vector_db()
    
    def crawl_documentation(self, max_pages=100):
        """
        Crawl Segment documentation and return a list of URLs to index
        
        Args:
            max_pages (int): Maximum number of pages to crawl
            
        Returns:
            list: List of documentation URLs
        """
        visited = set()
        to_visit = [self.base_url]
        doc_urls = []
        
        print(f"Starting crawl of Segment documentation from {self.base_url}")
        
        page_count = 0
        while to_visit and page_count < max_pages:
            url = to_visit.pop(0)
            
            if url in visited:
                continue
                
            try:
                print(f"Visiting {url}")
                response = requests.get(url, timeout=10)
                visited.add(url)
                page_count += 1
                
                if response.status_code != 200:
                    print(f"Failed to fetch {url}: Status code {response.status_code}")
                    continue
                    
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Add to doc_urls if it's a documentation page (contains useful content)
                if self._is_doc_page(soup):
                    doc_urls.append(url)
                    
                # Find links to other documentation pages
                for link in soup.find_all('a', href=True):
                    href = link['href']
                    
                    # Create absolute URL
                    if not href.startswith('http'):
                        href = urljoin(url, href)
                        
                    # Only add if it's within the Segment docs domain
                    if href.startswith(self.base_url) and href not in visited and href not in to_visit:
                        to_visit.append(href)
            
            except Exception as e:
                print(f"Error processing {url}: {str(e)}")
                
        print(f"Crawl complete. Found {len(doc_urls)} documentation pages.")
        return doc_urls
    
    def _is_doc_page(self, soup):
        """
        Check if a page is a documentation page with useful content
        
        Args:
            soup (BeautifulSoup): BeautifulSoup object of the page
            
        Returns:
            bool: True if it's a documentation page, False otherwise
        """
        # Look for common documentation page elements
        # 1. Check for article or main content tags
        article = soup.find('article') or soup.find('main')
        
        # 2. Check for headers that indicate a documentation page
        headers = soup.find_all(['h1', 'h2', 'h3'])
        
        # 3. Check for code blocks which are common in documentation
        code_blocks = soup.find_all(['pre', 'code'])
        
        # Return True if it has article content and either headers or code blocks
        return article is not None and (len(headers) > 0 or len(code_blocks) > 0)
    
    def index_documentation(self, urls=None):
        """
        Index Segment documentation and create a vector database
        
        Args:
            urls (list): List of URLs to index. If None, crawl documentation
            
        Returns:
            None
        """
        # Get URLs if not provided
        if urls is None:
            urls = self.crawl_documentation()
            
        if not urls:
            print("No URLs to index.")
            return
            
        print(f"Indexing {len(urls)} documentation pages...")
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(self.persist_dir), exist_ok=True)
        
        # Load documents
        documents = []
        for url in urls:
            try:
                loader = WebBaseLoader(url)
                documents.extend(loader.load())
            except Exception as e:
                print(f"Error loading {url}: {str(e)}")
        
        print(f"Loaded {len(documents)} documents.")
        
        # Split documents into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        
        splits = text_splitter.split_documents(documents)
        print(f"Split into {len(splits)} chunks.")
        
        # Create vector store
        vectorstore = Chroma.from_documents(
            documents=splits,
            embedding=self.embedding_function,
            persist_directory=self.persist_dir
        )
        
        # Persist to disk
        vectorstore.persist()
        print(f"Vector database created and persisted to {self.persist_dir}")
        
        # Load the retriever
        self.retriever = vectorstore.as_retriever(
            search_type="similarity",
            search_kwargs={"k": 3}
        )
    
    def load_vector_db(self):
        """
        Load the vector database from disk
        
        Returns:
            None
        """
        try:
            vectorstore = Chroma(
                persist_directory=self.persist_dir,
                embedding_function=self.embedding_function
            )
            
            self.retriever = vectorstore.as_retriever(
                search_type="similarity",
                search_kwargs={"k": 3}
            )
            
            print(f"Vector database loaded from {self.persist_dir}")
        except Exception as e:
            print(f"Error loading vector database: {str(e)}")
            self.retriever = None
    
    def get_segment_qa_chain(self):
        """
        Create a question-answering chain for Segment documentation
        
        Returns:
            RetrievalQA: QA chain for Segment documentation
        """
        if self.retriever is None:
            raise ValueError("Vector database not loaded. Run index_documentation() first.")
        
        # Create template for how-to questions
        template = """
        You are a helpful Segment CDP support assistant specialized in answering "how-to" questions.
        Use the following pieces of context to answer the question at the end.
        If you don't know the answer, just say that you don't know, don't try to make up an answer.
        Always provide step-by-step instructions when possible.
        
        Context:
        {context}
        
        Question: {question}
        
        Provide a clear, detailed answer with step-by-step instructions:
        """
        
        prompt = PromptTemplate(
            template=template,
            input_variables=["context", "question"]
        )
        
        # Create the chain
        chain = RetrievalQA.from_chain_type(
            llm=ChatOpenAI(temperature=0),
            chain_type="stuff",
            retriever=self.retriever,
            chain_type_kwargs={"prompt": prompt}
        )
        
        return chain
    
    def is_segment_question(self, question):
        """
        Check if a question is related to Segment CDP
        
        Args:
            question (str): User question
            
        Returns:
            bool: True if the question is about Segment, False otherwise
        """
        # Check for explicit mention of Segment
        if re.search(r'\bsegment\b', question.lower()):
            return True
            
        # Check for Segment-specific terminology
        segment_terms = [
            "source", "destination", "workspace", "tracking plan",
            "event", "identify", "track", "page", "group", "alias",
            "protocols", "personas", "journeys", "connections", "schema"
        ]
        
        # Count how many Segment terms are in the question
        term_count = sum(1 for term in segment_terms if re.search(rf'\b{term}\b', question.lower()))
        
        # If at least two Segment terms are found, it's likely a Segment question
        return term_count >= 2
    
    def is_how_to_question(self, question):
        """
        Check if a question is a "how-to" question
        
        Args:
            question (str): User question
            
        Returns:
            bool: True if it's a how-to question, False otherwise
        """
        how_to_patterns = [
            r'how (?:do|can|would|should) I',
            r'how to',
            r'steps to',
            r'guide for',
            r'process (?:of|for)',
            r'way to',
            r'explain how',
            r'instructions for'
        ]
        
        for pattern in how_to_patterns:
            if re.search(pattern, question.lower()):
                return True
                
        return False
    
    def answer_question(self, question):
        """
        Answer a question about Segment CDP
        
        Args:
            question (str): User question
            
        Returns:
            str: Answer to the question
        """
        # Check if it's a Segment question
        if not self.is_segment_question(question):
            return "This question doesn't appear to be related to Segment CDP. I'm specifically trained to answer questions about Segment CDP. Could you please ask a Segment-related question?"
        
        # Check if it's a how-to question
        if not self.is_how_to_question(question):
            return f"I'm designed to answer 'how-to' questions about Segment CDP. It seems you're not asking a 'how-to' question. Could you rephrase your question to ask how to accomplish something in Segment? For example: 'How do I set up a new source in Segment?'"
        
        # Get the QA chain
        try:
            chain = self.get_segment_qa_chain()
            
            # Execute the chain
            response = chain({"query": question})
            
            return response["result"]
        except Exception as e:
            return f"I encountered an error while trying to answer your question: {str(e)}. Please ensure the vector database is properly set up and try again."


# Example usage
if __name__ == "__main__":
    # Initialize the agent
    agent = SegmentSupportAgent(api_key="your-openai-api-key")
    
    # Index documentation if not already indexed
    if agent.retriever is None:
        agent.index_documentation()
    
    # Example questions
    questions = [
        "How do I set up a new source in Segment?",
        "How can I track events in my JavaScript application?",
        "What's the process for creating a tracking plan?",
        "How do I connect Segment to Google Analytics?"
    ]
    
    # Answer each question
    for question in questions:
        print(f"\nQuestion: {question}")
        answer = agent.answer_question(question)
        print(f"Answer: {answer}")
