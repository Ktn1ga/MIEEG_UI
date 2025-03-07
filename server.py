from flask import Flask, send_from_directory, request, jsonify, Response, redirect
from flask_cors import CORS
import os
import json
import datetime
import secrets
from openai import OpenAI
from config.config import API_CONFIG, AI_ASSISTANT_CONFIG, SERVER_CONFIG
from functools import wraps
import re

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

# 管理员密码
ADMIN_PASSWORD = "ksx123"
# 有效的token列表
valid_tokens = set()

def generate_token():
    """生成安全的随机token"""
    return secrets.token_urlsafe(32)

def check_admin_password(password):
    """检查管理员密码"""
    return password == ADMIN_PASSWORD

def admin_required(f):
    """管理员权限装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': '未授权访问'}), 401
        
        token = auth_header.split(' ')[1]
        if token not in valid_tokens:
            return jsonify({'success': False, 'error': '无效或过期的token'}), 401
            
        return f(*args, **kwargs)
    return decorated_function

def log_chat(user_input, ai_response):
    """记录对话日志"""
    timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    log_file = os.path.join(log_dir, f"{datetime.datetime.now().strftime('%Y-%m-%d')}.log")
    
    # 获取用户IP地址
    ip_address = request.remote_addr
    
    # 确保输入是字符串
    if user_input is None:
        user_input = "无内容"
    if ai_response is None:
        ai_response = "无回复"
    
    if not isinstance(user_input, str):
        user_input = str(user_input)
    if not isinstance(ai_response, str):
        ai_response = str(ai_response)
    
    # 截断过长的回复，避免日志文件过大
    max_length = 500  # 减少最大记录长度
    truncated_user = user_input[:max_length] + "..." if len(user_input) > max_length else user_input
    truncated_ai = ai_response[:max_length] + "..." if len(ai_response) > max_length else ai_response
    
    try:
        with open(log_file, 'a', encoding='utf-8') as f:
            # 简化日志格式
            f.write(f"[{timestamp}] IP: {ip_address} | 对话 | 用户: {truncated_user} | AI: {truncated_ai}\n")
        
        print(f"已记录对话 - 用户: {truncated_user[:30]}... AI: {truncated_ai[:30]}...")
    except Exception as e:
        print(f"记录对话时出错: {str(e)}")
        # 尝试使用备用方法记录
        try:
            with open(log_file, 'a', encoding='utf-8') as f:
                f.write(f"[{timestamp}] IP: {ip_address} | 错误 | 记录对话失败: {str(e)}\n")
        except:
            pass

def log_action(action, details="", success=True):
    """记录系统操作日志"""
    timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    log_file = os.path.join(log_dir, f"{datetime.datetime.now().strftime('%Y-%m-%d')}.log")
    
    # 获取用户IP地址
    ip_address = request.remote_addr
    
    # 记录操作状态
    status = "成功" if success else "失败"
    
    with open(log_file, 'a', encoding='utf-8') as f:
        f.write(f"[{timestamp}] IP: {ip_address} | 操作: {action} | 状态: {status} | {details}\n")

@app.route('/')
def index():
    log_action("访问首页", "用户访问系统首页")
    return send_from_directory(static_dir, 'index.html')

@app.route('/<path:path>')
def serve_file(path):
    # 记录特定页面的访问
    if path.endswith('.html'):
        page_name = path.split('/')[-1].replace('.html', '')
        log_action("访问页面", f"用户访问页面: {page_name}")
    return send_from_directory(static_dir, path)

@app.route('/admin')
def admin_login():
    log_action("访问管理登录", "用户尝试访问管理员登录页面")
    return send_from_directory(static_dir, 'admin.html')

@app.route('/admin/logs')
def admin_logs():
    # 检查是否有有效的会话cookie
    session_cookie = request.cookies.get('admin_session')
    if not session_cookie or session_cookie not in valid_tokens:
        # 如果没有有效的会话，重定向到登录页面
        log_action("访问日志页面", "未授权访问被拒绝", False)
        return redirect('/admin')
    
    log_action("访问日志页面", "管理员访问日志查看页面")
    return send_from_directory(static_dir, 'admin_logs.html')

@app.route('/api/logs')
@admin_required
def get_logs():
    try:
        date = request.args.get('date', datetime.datetime.now().strftime('%Y-%m-%d'))
        ip_filter = request.args.get('ip', '')  # 获取IP过滤参数
        log_file = os.path.join(log_dir, f"{date}.log")
        
        if not os.path.exists(log_file):
            log_action("查看日志", f"查看日期: {date}, 日志文件不存在")
            return jsonify({
                'success': True,
                'logs': f"没有找到 {date} 的日志记录"
            })
        
        with open(log_file, 'r', encoding='utf-8') as f:
            logs = f.read()
        
        # 如果指定了IP过滤，则只返回包含该IP的日志行
        if ip_filter:
            filtered_logs = []
            for line in logs.split('\n'):
                if f"IP: {ip_filter}" in line:
                    filtered_logs.append(line)
            logs = '\n'.join(filtered_logs)
            log_action("查看日志", f"查看日期: {date}, 过滤IP: {ip_filter}, 日志长度: {len(logs)} 字符")
        else:
            log_action("查看日志", f"查看日期: {date}, 日志长度: {len(logs)} 字符")
        
        # 获取所有不同的IP地址
        ip_addresses = set()
        for line in logs.split('\n'):
            ip_match = re.search(r'IP: ([\d\.]+) \|', line)
            if ip_match:
                ip_addresses.add(ip_match.group(1))
        
        return jsonify({
            'success': True,
            'logs': logs,
            'ip_addresses': sorted(list(ip_addresses))  # 返回排序后的IP地址列表
        })
    except Exception as e:
        log_action("查看日志", f"发生错误: {str(e)}", False)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/logs/clear', methods=['POST'])
@admin_required
def clear_logs():
    try:
        date = request.json.get('date', datetime.datetime.now().strftime('%Y-%m-%d'))
        log_file = os.path.join(log_dir, f"{date}.log")
        
        if not os.path.exists(log_file):
            log_action("清空日志", f"清空日期: {date}, 日志文件不存在", False)
            return jsonify({
                'success': False,
                'message': f"没有找到 {date} 的日志记录"
            })
        
        # 清空日志文件
        with open(log_file, 'w', encoding='utf-8') as f:
            f.write(f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] IP: {request.remote_addr} | 系统 | 日志已被管理员清空\n")
        
        log_action("清空日志", f"成功清空日期: {date} 的日志")
        return jsonify({
            'success': True,
            'message': f"已成功清空 {date} 的日志记录"
        })
    except Exception as e:
        log_action("清空日志", f"发生错误: {str(e)}", False)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        print("收到登录请求")
        data = request.json
        password = data.get('password')
        print(f"密码长度: {len(password) if password else 0}")
        
        if not password:
            print("未提供密码")
            log_action("登录", "未提供密码", False)
            return jsonify({
                'success': False,
                'error': '请输入密码'
            }), 400
            
        if check_admin_password(password):
            print("密码验证成功")
            token = generate_token()
            valid_tokens.add(token)
            print(f"生成token: {token[:10]}...")
            
            # 创建响应对象
            response = jsonify({
                'success': True,
                'token': token
            })
            
            # 设置会话cookie，过期时间为1小时
            response.set_cookie('admin_session', token, httponly=True, secure=False, 
                               samesite='Lax', max_age=3600)
            print("设置cookie完成")
            
            log_action("登录", "管理员登录成功")
            return response
        else:
            print("密码验证失败")
            log_action("登录", "密码错误", False)
            return jsonify({
                'success': False,
                'error': '密码错误'
            }), 401
    except Exception as e:
        print(f"登录过程中发生错误: {str(e)}")
        log_action("登录", f"发生错误: {str(e)}", False)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/logout', methods=['POST'])
@admin_required
def logout():
    try:
        auth_header = request.headers.get('Authorization')
        token = auth_header.split(' ')[1]
        
        # 从有效token列表中移除
        if token in valid_tokens:
            valid_tokens.remove(token)
            
        # 创建响应对象
        response = jsonify({'success': True})
        
        # 清除会话cookie
        response.delete_cookie('admin_session')
        
        log_action("退出登录", "管理员退出登录成功")
        return response
    except Exception as e:
        log_action("退出登录", f"发生错误: {str(e)}", False)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        messages = data.get('messages', [])
        
        # 获取用户提问
        user_message = messages[-1]['content'] if messages else "空消息"
        
        # 添加系统提示词到消息列表开头
        messages.insert(0, {
            "role": "system",
            "content": AI_ASSISTANT_CONFIG["system_prompt"]
        })
        
        # 创建一个变量来存储完整的响应
        full_response = []
        
        # 保存当前请求的IP地址，以便在流式响应中使用
        ip_address = request.remote_addr
        
        response = client.chat.completions.create(
            model=API_CONFIG["model"],
            messages=messages,
            stream=True
        )
        
        def generate():
            nonlocal full_response
            try:
                for chunk in response:
                    if chunk.choices[0].delta.content is not None:
                        content = chunk.choices[0].delta.content
                        full_response.append(content)
                        yield f"data: {json.dumps({'success': True, 'message': content})}\n\n"
                
                # 将所有块合并为完整响应
                complete_response = ''.join(full_response)
                
                # 记录完整的对话
                try:
                    timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    log_file = os.path.join(log_dir, f"{datetime.datetime.now().strftime('%Y-%m-%d')}.log")
                    
                    # 截断过长的内容
                    max_length = 500  # 减少最大记录长度
                    truncated_user = user_message[:max_length] + "..." if len(user_message) > max_length else user_message
                    truncated_ai = complete_response[:max_length] + "..." if len(complete_response) > max_length else complete_response
                    
                    # 简化日志格式，只记录一条包含用户提问和AI回答的日志
                    with open(log_file, 'a', encoding='utf-8') as f:
                        f.write(f"[{timestamp}] IP: {ip_address} | 对话 | 用户: {truncated_user} | AI: {truncated_ai}\n")
                    
                except Exception as log_error:
                    print(f"记录对话时出错: {str(log_error)}")
            except Exception as e:
                print(f"生成响应时出错: {str(e)}")
                # 如果出错，记录错误信息
                try:
                    timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    log_file = os.path.join(log_dir, f"{datetime.datetime.now().strftime('%Y-%m-%d')}.log")
                    with open(log_file, 'a', encoding='utf-8') as f:
                        f.write(f"[{timestamp}] IP: {ip_address} | 错误 | 用户: {user_message[:100]}... | 错误: {str(e)}\n")
                except:
                    pass
        
        return Response(generate(), mimetype='text/event-stream')
    except Exception as e:
        error_message = str(e)
        # 简化错误日志记录
        try:
            timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            log_file = os.path.join(log_dir, f"{datetime.datetime.now().strftime('%Y-%m-%d')}.log")
            with open(log_file, 'a', encoding='utf-8') as f:
                f.write(f"[{timestamp}] IP: {request.remote_addr} | 错误 | 用户: {messages[-1]['content'][:100] if messages else '未知'} | 错误: {error_message}\n")
        except:
            pass
        return jsonify({
            'success': False,
            'error': error_message
        }), 500

@app.route('/api/test-log', methods=['GET'])
@admin_required
def test_log():
    """测试日志记录功能的路由"""
    try:
        # 测试用户提问和AI回复的记录
        test_user_input = "这是一条测试用户提问"
        test_ai_response = "这是一条测试AI回复，用于验证日志记录功能是否正常工作。"
        
        # 记录测试对话
        log_chat(test_user_input, test_ai_response)
        
        # 记录测试操作
        log_action("测试", "测试日志记录功能", True)
        
        return jsonify({
            'success': True,
            'message': '测试日志已记录，请查看日志文件'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(host=SERVER_CONFIG["host"], port=SERVER_CONFIG["port"], debug=SERVER_CONFIG["debug"])