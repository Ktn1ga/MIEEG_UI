import asyncio
import websockets
import socket
import json

class DeviceClient:
    def __init__(self, device_host='127.0.0.1', device_port=8000, server_url='ws://8.134.73.183:8765', game_port=8766):
        self.device_host = device_host
        self.device_port = device_port
        self.server_url = server_url
        self.game_port = game_port
        self.device_socket = None
        self.game_clients = set()
        self.game_server = None

    async def connect_to_device(self):
        while True:
            try:
                self.device_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                self.device_socket.connect((self.device_host, self.device_port))
                print(f"Connected to device at {self.device_host}:{self.device_port}")
                return True
            except Exception as e:
                print(f"Failed to connect to device: {e}")
                print("Retrying device connection in 5 seconds...")
                await asyncio.sleep(5)

    async def read_device_data(self):
        try:
            data = self.device_socket.recv(1024)
            return data
        except Exception as e:
            print(f"Error reading from device: {e}")
            print("Device connection lost, attempting to reconnect...")
            self.device_socket.close()
            await self.connect_to_device()
            return None

    async def send_data_to_server(self, websocket, data):
        try:
            message = {
                'type': 'data',
                'content': data.hex()
            }
            await websocket.send(json.dumps(message))
            response = await websocket.recv()
            print(f"Received classification result: {response}")
            # 将分类结果转发给游戏客户端
            try:
                classification_result = json.loads(response)
                if isinstance(classification_result, dict) and 'classification' in classification_result:
                    game_message = {
                        'type': 'classification',
                        'result': classification_result['classification']
                    }
                    await self.broadcast_game_message(json.dumps(game_message))
            except json.JSONDecodeError:
                print("Invalid classification result format")
            return True
        except Exception as e:
            print(f"Error sending data to server: {e}")
            return False

    async def handle_game_client(self, websocket):
        try:
            self.game_clients.add(websocket)
            async for message in websocket:
                print(f"Game server received message: {message}")
                await self.broadcast_game_message(message)
        except websockets.exceptions.ConnectionClosed:
            print("Game client connection closed")
        finally:
            self.game_clients.remove(websocket)

    async def broadcast_game_message(self, message):
        if self.game_clients:
            await asyncio.gather(
                *[client.send(message) for client in self.game_clients]
            )

    async def start_game_server(self):
        self.game_server = await websockets.serve(
            self.handle_game_client,
            '127.0.0.1',
            self.game_port
        )
        print(f"Game server started at ws://127.0.0.1:{self.game_port}")

    async def handle_game_input(self, websocket):
        while True:
            try:
                async with websockets.connect(f'ws://127.0.0.1:{self.game_port}') as game_websocket:
                    print("Connected to game server for input handling")
                    message = {
                        'type': 'label',
                        'content': -1
                    }
                    await websocket.send(json.dumps(message))
                    
                    async for message in game_websocket:
                        try:
                            print(f"Client received game message: {message}")
                            data = json.loads(message)
                            if data['type'] == 'keypress':
                                label = 0 if data['direction'] == 'left' else 1
                                message = {
                                    'type': 'label',
                                    'content': label
                                }
                                print(f"Client sending label to server: {message}")
                                await websocket.send(json.dumps(message))
                        except json.JSONDecodeError:
                            print("Invalid game input format")
                            message = {
                                'type': 'label',
                                'content': -1
                            }
                            await websocket.send(json.dumps(message))
            except Exception as e:
                print(f"Error handling game input: {e}")
                try:
                    message = {
                        'type': 'label',
                        'content': -1
                    }
                    await websocket.send(json.dumps(message))
                except Exception as send_error:
                    print(f"Error sending failure label: {send_error}")
                await asyncio.sleep(1)

    async def run(self):
        # 启动游戏服务器
        await self.start_game_server()

        while True:
            if not await self.connect_to_device():
                continue

            try:
                async with websockets.connect(self.server_url) as websocket:
                    print(f"Connected to server at {self.server_url}")
                    
                    game_input_task = asyncio.create_task(self.handle_game_input(websocket))
                    
                    try:
                        while True:
                            data = await self.read_device_data()
                            if data:
                                if not await self.send_data_to_server(websocket, data):
                                    break
                            await asyncio.sleep(0.1)
                    except Exception as e:
                        print(f"Error in main loop: {e}")
                    finally:
                        game_input_task.cancel()
                        try:
                            await game_input_task
                        except asyncio.CancelledError:
                            pass

            except websockets.exceptions.ConnectionClosed:
                print("Connection to server lost. Attempting to reconnect in 5 seconds...")
                await asyncio.sleep(5)
            except Exception as e:
                print(f"Unexpected error: {e}")
                print("Attempting to reconnect in 5 seconds...")
                await asyncio.sleep(5)

    def close(self):
        if self.device_socket:
            self.device_socket.close()
        if self.game_server:
            self.game_server.close()

if __name__ == "__main__":
    client = DeviceClient(
        device_host='127.0.0.1',
        device_port=8000,
        server_url='ws://127.0.0.1:8765',
        game_port=8766
    )

    try:
        asyncio.get_event_loop().run_until_complete(client.run())
    except KeyboardInterrupt:
        print("Shutting down client...")
        client.close()