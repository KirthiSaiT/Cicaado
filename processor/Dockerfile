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
        stegseek \
        binwalk && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install outguess (optional)
RUN apt-get update && \
    apt-get install -y --no-install-recommends outguess || \
    echo "outguess not available in repos, continuing without it"

# Install zsteg cleanly with compatible Ruby version
RUN gem install zsteg -v 0.2.10 --no-document

# Verify zsteg works
RUN ruby -v && gem list zsteg

# Install Python dependencies
RUN pip install --no-cache-dir flask pillow pymongo dnspython

# Create app directory
WORKDIR /app

# Create wordlists directory
RUN mkdir -p /processor/wordlists

# Download rockyou.txt directly (so we don't need to commit it to Git)
RUN wget -O /processor/wordlists/rockyou.txt https://github.com/brannondorsey/naive-hashcat/releases/download/data/rockyou.txt

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