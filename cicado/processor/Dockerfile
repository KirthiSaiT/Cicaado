FROM python:3.9-slim

ENV DEBIAN_FRONTEND=noninteractive

# Install system packages including steganography tools
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        ruby \
        ruby-dev \
        default-jdk \
        git \
        wget \
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
        pngcheck && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install steganography tools
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        steghide \
        binwalk && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install zsteg gem with specific version to avoid compatibility issues
RUN gem install zsteg -v 0.2.12

# Install Python dependencies
RUN pip install --no-cache-dir flask pillow pymongo dnspython

# Create app directory
WORKDIR /app

# Copy application files
COPY . .

# Download stegsolve.jar with fallback options
RUN wget -O /usr/local/bin/stegsolve.jar https://github.com/Giotino/stegsolve/releases/download/v1.0/stegsolve.jar || \
    wget -O /usr/local/bin/stegsolve.jar https://raw.githubusercontent.com/b3nj5m1n/StegSolve/master/StegSolve.jar || \
    echo "Could not download stegsolve.jar, continuing without it"

# Set proper permissions for stegsolve.jar
RUN chmod +x /usr/local/bin/stegsolve.jar || echo "Could not set permissions for stegsolve.jar"

EXPOSE 5000

CMD ["python", "app.py"]