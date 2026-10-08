"""Tests for loose LLM JSON parsing and provider-error handling."""

import httpx
import pytest
from anthropic import APIStatusError

import app.services.llm as llm_module
from app.errors import LLMError, LLMFormatError
from app.services.llm import parse_json_loose


def test_fenced_json_parses_t11():
    text = '```json\n{"opportunities": [{"title": "Tailor"}]}\n```'
    assert parse_json_loose(text) == {"opportunities": [{"title": "Tailor"}]}


def test_prose_wrapped_json_parses():
    text = 'Here is the result:\n{"opportunities": []}\nHope this helps!'
    assert parse_json_loose(text) == {"opportunities": []}


def test_array_instead_of_object_rejected():
    with pytest.raises(LLMFormatError):
        parse_json_loose('[{"title": "Tailor"}]')


@pytest.mark.parametrize("text", ["", "   ", "```\n```", "no braces here"])
def test_empty_or_braceless_rejected(text):
    with pytest.raises(LLMFormatError):
        parse_json_loose(text)


def _fake_ok_client(stop_reason="end_turn", text='{"ok": true}'):
    class Block:
        type = "text"

    class Usage:
        input_tokens = 1
        output_tokens = 2

    class Resp:
        content = [Block()]
        usage = Usage()

    block = Block()
    block.text = text
    resp = Resp()
    resp.content = [block]
    resp.stop_reason = stop_reason

    class Messages:
        def __init__(self):
            self.calls: list[dict] = []

        async def create(self, **kwargs):
            self.calls.append(kwargs)
            return resp

    class Client:
        def __init__(self):
            self.messages = Messages()

    client = Client()
    return client


async def test_truncated_max_tokens_raises_format_error(monkeypatch):
    monkeypatch.setattr(llm_module, "get_client", lambda: _fake_ok_client("max_tokens"))
    with pytest.raises(LLMFormatError, match="cut off"):
        await llm_module.ask_text("s", "u", 10)


def _status_error(message: str, status: int) -> APIStatusError:
    request = httpx.Request("POST", "https://api.test/v1/messages")
    return APIStatusError(
        message, response=httpx.Response(status, text=message, request=request), body=None
    )


class _TextBlock:
    type = "text"

    def __init__(self, text):
        self.text = text


class _Usage:
    input_tokens = 1
    output_tokens = 2


class _OkResp:
    content = [_TextBlock('{"ok": true}')]
    usage = _Usage()
    stop_reason = "end_turn"


async def test_temperature_400_retries_once_without_temperature(monkeypatch):
    seen: list[dict] = []

    class Messages:
        async def create(self, **kwargs):
            seen.append(kwargs)
            if len(seen) == 1:
                raise _status_error("temperature is not supported", 400)
            return _OkResp()

    class Client:
        messages = Messages()

    monkeypatch.setattr(llm_module, "get_client", lambda: Client())
    text = await llm_module._call("s", "u", 50, 0.2, "t")
    assert text == '{"ok": true}'
    assert len(seen) == 2
    assert "temperature" in seen[0] and "temperature" not in seen[1]


async def test_non_temperature_400_raises_without_retry(monkeypatch):
    seen: list[dict] = []

    class Messages:
        async def create(self, **kwargs):
            seen.append(kwargs)
            raise _status_error("invalid model specified", 400)

    class Client:
        messages = Messages()

    monkeypatch.setattr(llm_module, "get_client", lambda: Client())
    with pytest.raises(LLMError):
        await llm_module._call("s", "u", 50, 0.2, "t")
    assert len(seen) == 1
