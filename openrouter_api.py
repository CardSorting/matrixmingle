import os
import requests
import json

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

def generate_character_response(character, user_message):
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    
    system_prompt = f"You are roleplaying as {character.name}. Here's your character description: {character.description}"
    for key, value in character.attributes.items():
        system_prompt += f"\n{key.capitalize()}: {value}"
    
    data = {
        "model": "openai/gpt-3.5-turbo",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        "stream": True
    }
    
    try:
        response = requests.post(OPENROUTER_API_URL, headers=headers, json=data, stream=True)
        response.raise_for_status()
        
        for line in response.iter_lines():
            if line:
                line = line.decode('utf-8')
                if line.startswith('data: '):
                    json_str = line[6:]
                    if json_str != '[DONE]':
                        try:
                            chunk = json.loads(json_str)
                            if 'choices' in chunk and len(chunk['choices']) > 0:
                                token = chunk['choices'][0]['delta'].get('content', '')
                                if token:
                                    yield token
                        except json.JSONDecodeError:
                            print(f"Error decoding JSON: {json_str}")
    except requests.exceptions.RequestException as e:
        print(f"Error calling OpenRouter API: {e}")
        yield "I'm sorry, I'm having trouble responding right now. Please try again later."