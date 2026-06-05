FROM python:3.9-slim

ENV DEBIAN_FRONTEND=noninteractive

# 1. Base system tools and compilers
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        git \
        wget \
        file \
        binutils \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 2. Graphics, image rendering, and Ruby dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ruby-full \
        zlib1g-dev \
        libpng-dev \
        libjpeg-dev \
        libwebp-dev \
        libfreetype6-dev \
        liblcms2-dev \
        libopenjp2-7-dev \
        libtiff5-dev \
        libharfbuzz-dev \
        libfribidi-dev \
        libxcb1-dev \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 3. Java Runtime (Needed for legacy stegsolve.jar)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        default-jdk \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 4. Stego, Forensics, and Network packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        exiftool \
        pngcheck \
        foremost \
        steghide \
        binwalk \
        dnsutils \
        nmap \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 5. OCR libraries (Tesseract)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        tesseract-ocr \
        tesseract-ocr-eng \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 6. Go compiler setup (Heavy compiler cached separately)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        golang \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Configure Go paths
ENV GOPATH=/root/go
ENV PATH=$PATH:/root/go/bin

# 7. Compile Go Recon tools individually (Compiling one-by-one keeps memory load low and caches each tool)
RUN go install github.com/projectdiscovery/httpx/cmd/httpx@latest
RUN go install github.com/lc/gau/v2/cmd/gau@latest
RUN go install github.com/tomnomnom/gf@latest
RUN go install github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
RUN go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

# Download and configure Gf-Patterns
RUN git clone https://github.com/1ndianl33t/Gf-Patterns /tmp/Gf-Patterns && \
    mkdir -p ~/.gf && \
    cp /tmp/Gf-Patterns/*.json ~/.gf && \
    rm -rf /tmp/Gf-Patterns

# 8. Install stegseek from GitHub deb
RUN (wget -q -O /tmp/stegseek.deb https://github.com/RickdeJager/stegseek/releases/download/v0.6/stegseek_0.6-1.deb && \
    apt-get update -qq && \
    apt-get install -y /tmp/stegseek.deb && \
    rm -f /tmp/stegseek.deb && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*) || echo "stegseek install failed, continuing without it"

# 9. Install stegdetect from old Ubuntu releases pool
RUN wget -q -O /tmp/stegdetect.deb http://old-releases.ubuntu.com/ubuntu/pool/universe/s/stegdetect/stegdetect_0.6-6_amd64.deb && \
    apt-get update -qq && \
    apt-get install -y --no-install-recommends wamerican && \
    dpkg -i /tmp/stegdetect.deb || (apt-get install -f -y && dpkg -i /tmp/stegdetect.deb) && \
    rm -f /tmp/stegdetect.deb && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 10. Install outguess
RUN apt-get update && \
    apt-get install -y --no-install-recommends outguess || \
    echo "outguess not available in repos, continuing without it"

# 11. Install zsteg cleanly with compatible Ruby version
RUN gem install zsteg -v 0.2.10 --no-document

# Verify zsteg works
RUN ruby -v && gem list zsteg

# 12. Additional CTF forensic tools
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        xxd \
        zbar-tools \
        imagemagick \
        sox \
        ffmpeg \
        ssdeep \
        mediainfo \
        multimon-ng \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# jsteg — Go-based JPEG LSB steganography detector
RUN go install github.com/lukechampine/jsteg/cmd/jsteg@latest || \
    echo "jsteg install failed, continuing without it"

# 13. Install Python dependencies (stego + recon)
RUN pip install --no-cache-dir flask flask-cors pillow pymongo dnspython colorama requests beautifulsoup4 shodan boto3 google-search-results python-whois gunicorn

# 14. stegoveritas — comprehensive CTF steg checker (separate layer for cache)
RUN pip install --no-cache-dir stegoveritas || echo "stegoveritas install failed, continuing without it"

# Create app directory
WORKDIR /app

# stegseek has rockyou.txt built into the binary — no external download needed

# Copy application files
COPY . .

# Download stegsolve.jar
RUN wget -O /usr/local/bin/stegsolve.jar https://github.com/Giotino/stegsolve/releases/download/v1.0/stegsolve.jar || \
    wget -O /usr/local/bin/stegsolve.jar https://raw.githubusercontent.com/b3nj5m1n/StegSolve/master/StegSolve.jar || \
    echo "Could not download stegsolve.jar, continuing without it"

# Set permissions for stegsolve.jar
RUN chmod +x /usr/local/bin/stegsolve.jar || echo "Could not set permissions for stegsolve.jar"

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--threads", "4", "--timeout", "600", "app:app"]