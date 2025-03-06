from flask import Flask, send_from_directory, request, jsonify, Response
from flask_cors import CORS
import os
import json
import datetime
from openai import OpenAI
from config.config import API_CONFIG, AI_ASSISTANT_CONFIG

app = Flask(__name__)
CORS(app)

# 设置静态文件目录
static_dir = os.path.dirname(os.path.abspath(__file__))

# 初始化OpenAI客户端
client = OpenAI(api_key=API_CONFIG["key"], base_url=API_CONFIG["base_url"])

# 设置日志文件路径
log_dir = os.path.join(static_dir, 'logs')
if not os.path.exists(log_dir):
    os.makedirs(log_dir)

def log_chat(user_input, ai_response):
    """记录对话日志"""
    timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    log_file = os.path.join(log_dir, f"{datetime.datetime.now().strftime('%Y-%m-%d')}.log")
    
    with open(log_file, 'a', encoding='utf-8') as f:
        f.write(f"\n[{timestamp}] User: {user_input}\n")
        f.write(f"[{timestamp}] Assistant: {ai_response}\n")

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
        
        # 添加系统提示词到消息列表开头
        messages.insert(0, {
            "role": "system",
            "content": AI_ASSISTANT_CONFIG["system_prompt"]
        })
        
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            stream=True
        )
        
        def generate():
            full_response = ""
            for chunk in response:
                if chunk.choices[0].delta.content is not None:
                    content = chunk.choices[0].delta.content
                    full_response += content
                    yield f"data: {json.dumps({'success': True, 'message': content})}\n\n"
            # 记录完整的对话
            log_chat(messages[-1]['content'], full_response)
        
        return Response(generate(), mimetype='text/event-stream')
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)