import socket
import threading
import time
import random
import struct

class DeviceSimulator:
    def __init__(self, host='127.0.0.1', port=8000):
        self.host = host
        self.port = port
        self.server_socket = None
        self.clients = []
        self.running = False

    def generate_eeg_data(self):
        """生成模拟的脑电数据"""
        # 生成8通道的模拟数据，每个通道产生一个-100到100之间的随机值
        channels = 8
        data = [random.uniform(-100, 100) for _ in range(channels)]
        # 将数据打包成二进制格式（8个浮点数）
        return struct.pack('8f', *data)

    def handle_client(self, client_socket, address):
        """处理单个客户端连接"""
        print(f"新客户端连接: {address}")
        try:
            while self.running:
                data = self.generate_eeg_data()
                client_socket.send(data)
                time.sleep(0.1)  # 每100ms发送一次数据
        except Exception as e:
            print(f"客户端 {address} 连接错误: {e}")
        finally:
            client_socket.close()
            if client_socket in self.clients:
                self.clients.remove(client_socket)
            print(f"客户端 {address} 断开连接")

    def start(self):
        """启动设备模拟器"""
        self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.server_socket.bind((self.host, self.port))
        self.server_socket.listen(5)
        self.running = True

        print(f"设备模拟器启动在 {self.host}:{self.port}")

        try:
            while self.running:
                client_socket, address = self.server_socket.accept()
                self.clients.append(client_socket)
                # 为每个客户端创建一个新线程
                client_thread = threading.Thread(
                    target=self.handle_client,
                    args=(client_socket, address)
                )
                client_thread.daemon = True
                client_thread.start()
        except KeyboardInterrupt:
            print("正在关闭设备模拟器...")
        finally:
            self.stop()

    def stop(self):
        """停止设备模拟器"""
        self.running = False
        # 关闭所有客户端连接
        for client in self.clients:
            try:
                client.close()
            except:
                pass
        self.clients.clear()
        # 关闭服务器socket
        if self.server_socket:
            self.server_socket.close()

if __name__ == "__main__":
    # 创建并启动设备模拟器
    simulator = DeviceSimulator()
    try:
        simulator.start()
    except KeyboardInterrupt:
        print("\n接收到退出信号，正在关闭...")
        simulator.stop()