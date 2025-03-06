from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
import os
from openai import OpenAI

app = Flask(__name__)
CORS(app)

# 设置静态文件目录
static_dir = os.path.dirname(os.path.abspath(__file__))

# 初始化OpenAI客户端
client = OpenAI(api_key="sk-e516aff6451140aab2a21bb2517109a3", base_url="https://api.deepseek.com")

@app.route('/')
def index():
    return send_from_directory(static_dir, 'index.html')

@app.route('/<path:path>')
def serve_file(path):
    return send_from_directory(static_dir, path)

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        messages = data.get('messages', [])
        
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            stream=False
        )
        
        return jsonify({
            'success': True,
            'message': response.choices[0].message.content
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)