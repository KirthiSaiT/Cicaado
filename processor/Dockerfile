FROM python:3.9-slim

ENV DEBIAN_FRONTEND=noninteractive

# 1. Base build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential git wget file binutils \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 2. Ruby + minimal image libs for zsteg
RUN apt-get update && apt-get install -y --no-install-recommends \
        ruby-full zlib1g-dev libpng-dev libjpeg-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 3. Core forensics + stego tools
RUN apt-get update && apt-get install -y --no-install-recommends \
        exiftool pngcheck foremost steghide binwalk dnsutils \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 4. OCR
RUN apt-get update && apt-get install -y --no-install-recommends \
        tesseract-ocr tesseract-ocr-eng \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 5. Go compiler (needed only for jsteg)
RUN apt-get update && apt-get install -y --no-install-recommends golang \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

ENV GOPATH=/root/go
ENV PATH=$PATH:/root/go/bin

# 6. jsteg — small binary, minimal deps
RUN go install github.com/lukechampine/jsteg/cmd/jsteg@latest || echo "jsteg failed, skipping"

# 7. stegseek (rockyou.txt built-in)
RUN wget -q -O /tmp/stegseek.deb \
        https://github.com/RickdeJager/stegseek/releases/download/v0.6/stegseek_0.6-1.deb \
    && apt-get update -qq && apt-get install -y /tmp/stegseek.deb \
    && rm -f /tmp/stegseek.deb && apt-get clean && rm -rf /var/lib/apt/lists/* \
    || echo "stegseek failed, skipping"

# 8. outguess
RUN apt-get update \
    && (apt-get install -y --no-install-recommends outguess || echo "outguess not available") \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 9. zsteg gem
RUN gem install zsteg -v 0.2.10 --no-document

# 10. Media + signal analysis tools
RUN apt-get update && apt-get install -y --no-install-recommends \
        xxd zbar-tools imagemagick sox ffmpeg mediainfo multimon-ng p7zip-full \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 11. Python dependencies
RUN pip install --no-cache-dir \
    flask flask-cors pillow pymongo \
    dnspython colorama requests \
    beautifulsoup4 shodan boto3 \
    google-search-results python-whois gunicorn

# 12. stegoveritas (needs p7zip installed above)
RUN pip install --no-cache-dir stegoveritas || echo "stegoveritas failed, skipping"

WORKDIR /app
COPY . .

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--threads", "4", "--timeout", "600", "app:app"]
