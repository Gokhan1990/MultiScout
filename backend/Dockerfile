FROM python:3.12-slim
WORKDIR /app
COPY . .
RUN pip install fastapi uvicorn playwright beautifulsoup4 httpx
RUN playwright install chromium
RUN playwright install-deps chromium
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
