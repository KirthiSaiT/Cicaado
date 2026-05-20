FROM python:3.9-slim

ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        ruby-full \
        default-jdk \
        git \
        wget \
        file \
        binutils \
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
        exiftool \
        pngcheck \
        foremost \
        steghide \
        binwalk \
        golang \
        dnsutils \
        nmap && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Go tools for recon
# Install Go tools for recon
ENV GOPATH=/root/go
ENV PATH=$PATH:/root/go/bin
RUN go install github.com/projectdiscovery/httpx/cmd/httpx@latest && \
    go install github.com/lc/gau/v2/cmd/gau@latest && \
    go install github.com/tomnomnom/gf@latest && \
    go install github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest && \
    go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

# Download and configure Gf-Patterns
RUN git clone https://github.com/1ndianl33t/Gf-Patterns /tmp/Gf-Patterns && \
    mkdir -p ~/.gf && \
    cp /tmp/Gf-Patterns/*.json ~/.gf && \
    rm -rf /tmp/Gf-Patterns

# Install stegseek from GitHub release (not in apt repos) — entirely optional
RUN (wget -q -O /tmp/stegseek.deb https://github.com/RickdeJager/stegseek/releases/download/v0.6/stegseek_0.6-1.deb && \
    apt-get update -qq && \
    apt-get install -y /tmp/stegseek.deb && \
    rm -f /tmp/stegseek.deb && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*) || echo "stegseek install failed, continuing without it"

# Install outguess (optional)
RUN apt-get update && \
    apt-get install -y --no-install-recommends outguess || \
    echo "outguess not available in repos, continuing without it"

# Install zsteg cleanly with compatible Ruby version
RUN gem install zsteg -v 0.2.10 --no-document

# Verify zsteg works
RUN ruby -v && gem list zsteg

# Install Python dependencies (stego + recon)
RUN pip install --no-cache-dir flask flask-cors pillow pymongo dnspython colorama requests beautifulsoup4 shodan boto3 google-search-results python-whois

# Create app directory
WORKDIR /app

# Create wordlists directory
RUN mkdir -p /processor/wordlists

# Download rockyou.txt — optional, stegseek falls back to built-in dict if missing
RUN wget -q -O /processor/wordlists/rockyou.txt \
        https://github.com/brannondorsey/naive-hashcat/releases/download/data/rockyou.txt || \
    wget -q -O /processor/wordlists/rockyou.txt \
        https://github.com/danielmiessler/SecLists/raw/master/Passwords/Leaked-Databases/rockyou.txt.tar.gz || \
    echo "Warning: rockyou.txt unavailable — stegseek will use built-in fallback dict"

# Copy application files
COPY . .

# Download stegsolve.jar
RUN wget -O /usr/local/bin/stegsolve.jar https://github.com/Giotino/stegsolve/releases/download/v1.0/stegsolve.jar || \
    wget -O /usr/local/bin/stegsolve.jar https://raw.githubusercontent.com/b3nj5m1n/StegSolve/master/StegSolve.jar || \
    echo "Could not download stegsolve.jar, continuing without it"

# Set permissions for stegsolve.jar
RUN chmod +x /usr/local/bin/stegsolve.jar || echo "Could not set permissions for stegsolve.jar"

EXPOSE 5000

CMD ["python", "app.py"]