import logging
from dataclasses import dataclass
from time import perf_counter

import httpx
from fastapi import HTTPException, status

from app.config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class OllamaGenerationError(Exception):
    status_code: int
    detail: str
    retryable: bool = False


def _generation_timeout() -> httpx.Timeout:
    return httpx.Timeout(
        connect=settings.ollama_connect_timeout_seconds,
        read=settings.ollama_timeout_seconds,
        write=settings.ollama_connect_timeout_seconds,
        pool=settings.ollama_connect_timeout_seconds,
    )


def _request_payload(model: str, prompt: str) -> dict:
    return {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "keep_alive": settings.ollama_keep_alive,
        "options": {
            "num_predict": settings.ollama_num_predict,
            "temperature": 0.2,
        },
    }


def _candidate_models() -> list[str]:
    models = [settings.ollama_model]
    if settings.ollama_fallback_model and settings.ollama_fallback_model not in models:
        models.append(settings.ollama_fallback_model)
    return models


def _generate_once(prompt: str, model: str) -> str:
    payload = _request_payload(model, prompt)
    endpoint = f"{settings.ollama_base_url.rstrip('/')}/api/generate"
    started_at = perf_counter()

    try:
        with httpx.Client(timeout=_generation_timeout()) as client:
            response = client.post(endpoint, json=payload)
            response.raise_for_status()
    except httpx.TimeoutException as exc:
        elapsed = perf_counter() - started_at
        logger.warning("Ollama model %s timed out after %.2fs", model, elapsed)
        raise OllamaGenerationError(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=(
                f'Ollama model "{model}" timed out while generating a response. '
                "The model may still be loading into memory."
            ),
            retryable=True,
        ) from exc
    except httpx.RequestError as exc:
        logger.exception("Unable to connect to Ollama at %s", endpoint)
        raise OllamaGenerationError(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Ollama service is unavailable. Please ensure Ollama is running locally.",
            retryable=False,
        ) from exc
    except httpx.HTTPStatusError as exc:
        status_code = exc.response.status_code
        logger.exception("Ollama returned an error response for model %s: %s", model, exc.response.text)
        detail = "Ollama returned an unexpected error response."
        retryable = False
        if status_code == status.HTTP_404_NOT_FOUND:
            detail = f'Ollama model "{model}" is not available locally.'
            retryable = True
        raise OllamaGenerationError(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=detail,
            retryable=retryable,
        ) from exc

    data = response.json()
    generated_text = data.get("response", "").strip()
    if not generated_text:
        raise OllamaGenerationError(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Ollama returned an empty response.",
            retryable=False,
        )

    elapsed = perf_counter() - started_at
    logger.info("Ollama model %s responded in %.2fs", model, elapsed)
    return generated_text


def generate_with_ollama(prompt: str) -> str:
    models = _candidate_models()
    last_error: OllamaGenerationError | None = None

    for index, model in enumerate(models):
        try:
            return _generate_once(prompt, model)
        except OllamaGenerationError as exc:
            last_error = exc
            should_retry = exc.retryable and index < len(models) - 1
            if should_retry:
                next_model = models[index + 1]
                logger.warning(
                    "Retrying Ollama generation with fallback model %s after %s failed: %s",
                    next_model,
                    model,
                    exc.detail,
                )
                continue
            raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    if last_error is not None:
        raise HTTPException(status_code=last_error.status_code, detail=last_error.detail)

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Ollama generation failed unexpectedly.",
    )
