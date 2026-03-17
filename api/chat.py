import json
import os
from http.server import BaseHTTPRequestHandler
from typing import Any

import requests

DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "").strip()
DEFAULT_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
TIMEOUT_SECONDS = 90


def build_json_response(handler: BaseHTTPRequestHandler, status_code: int, payload: dict[str, Any]) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status_code)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self) -> None:
        build_json_response(self, 200, {"ok": True})

    def do_POST(self) -> None:
        if not DEEPSEEK_API_KEY:
            build_json_response(
                self,
                500,
                {"error": "服务端未配置 DEEPSEEK_API_KEY，请先在 Vercel 环境变量里添加。"},
            )
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(content_length)
            data = json.loads(raw_body.decode("utf-8")) if raw_body else {}

            messages = data.get("messages")
            temperature = data.get("temperature", 0.9)

            if not isinstance(messages, list) or not messages:
                build_json_response(self, 400, {"error": "请求体里必须提供非空 messages 数组。"})
                return

            response = requests.post(
                DEEPSEEK_API_URL,
                headers={
                    "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": DEFAULT_MODEL,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": 4096,
                    "stream": False,
                },
                timeout=TIMEOUT_SECONDS,
            )

            try:
                result = response.json()
            except ValueError:
                build_json_response(self, 502, {"error": "上游返回了无法解析的响应。"})
                return

            if not response.ok:
                error_message = (
                    result.get("error", {}).get("message")
                    if isinstance(result.get("error"), dict)
                    else result.get("error")
                ) or f"DeepSeek 请求失败，状态码 {response.status_code}"
                build_json_response(self, response.status_code, {"error": error_message, "raw": result})
                return

            text = ""
            choices = result.get("choices", [])
            if choices:
                message = choices[0].get("message", {})
                text = (message.get("content") or "").strip()

            if not text:
                build_json_response(self, 502, {"error": "模型响应成功，但没有拿到文本内容。", "raw": result})
                return

            build_json_response(
                self,
                200,
                {
                    "text": text,
                    "model": result.get("model", DEFAULT_MODEL),
                    "usage": result.get("usage", {}),
                },
            )
        except requests.Timeout:
            build_json_response(self, 504, {"error": "请求 DeepSeek 超时，请稍后重试。"})
        except Exception as exc:  # noqa: BLE001
            build_json_response(self, 500, {"error": f"服务端异常：{exc}"})
